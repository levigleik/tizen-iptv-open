"use client";

import {
	useInfiniteQuery,
	useIsFetching,
	useQuery,
} from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { fetchGroupedCategoryList, fetchGroupedChannelsPage } from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";
import type { GroupedChannelDto } from "@/types/iptv";

type SortMode = "default" | "title-asc" | "title-desc";

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function badgeClass(badge: string) {
	if (badge === "HDR") {
		return "bg-blue-600/90 text-white border-white/10 uppercase tracking-wider";
	}

	return "bg-black/80 text-white border-white/10 uppercase tracking-wider";
}

export default function ChannelsPage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const initialSearch = searchParams.get("search") ?? "";
	const initialGroupTitle = searchParams.get("groupTitle") ?? "";
	const initialSort = (searchParams.get("sort") as SortMode) ?? "default";

	const [mac, setMac] = useState("");
	const [selectedGroupTitle, setSelectedGroupTitle] =
		useState(initialGroupTitle);
	const [sortMode, setSortMode] = useState<SortMode>(
		["default", "title-asc", "title-desc"].includes(initialSort)
			? initialSort
			: "default",
	);
	const adult = useAppSettingsStore((state) => state.adult);

	const isSearchFetching =
		useIsFetching({
			queryKey: ["channels-grouped", mac],
		}) > 0;

	const { isOptimisticLoading, search, searchInput, setSearchInput } =
		useDebouncedSearch({
			initialValue: initialSearch,
			delayMs: 1300,
			minChars: 3,
			isFetching: isSearchFetching,
		});

	useEffect(() => {
		setMac(resolveMacAddress());
	}, []);

	useEffect(() => {
		const params = new URLSearchParams(searchParams.toString());

		if (search) {
			params.set("search", search);
		} else {
			params.delete("search");
		}

		if (selectedGroupTitle) {
			params.set("groupTitle", selectedGroupTitle);
		} else {
			params.delete("groupTitle");
		}

		if (sortMode && sortMode !== "default") {
			params.set("sort", sortMode);
		} else {
			params.delete("sort");
		}

		const current = searchParams.toString();
		const next = params.toString();

		if (current !== next) {
			router.replace(next ? `${pathname}?${next}` : pathname, {
				scroll: false,
			});
		}
	}, [pathname, router, search, searchParams, selectedGroupTitle, sortMode]);

	const { data: groupsResponse } = useQuery<{ data: string[] }>({
		queryKey: ["channels-group-list", mac, adult],
		enabled: Boolean(mac),
		queryFn: ({ signal }) =>
			fetchGroupedCategoryList(mac, "channels", adult, signal),
	});

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery({
		queryKey: ["channels-grouped", mac, search, selectedGroupTitle, adult],
		enabled: Boolean(mac),
		initialPageParam: 1,
		queryFn: ({ pageParam, signal }) =>
			fetchGroupedChannelsPage(
				mac,
				pageParam,
				24,
				adult,
				search,
				selectedGroupTitle,
				signal,
			),
		getNextPageParam: (lastPage) =>
			lastPage.pageInfo.hasNextPage
				? lastPage.pageInfo.currentPage + 1
				: undefined,
	});

	const groups = groupsResponse?.data ?? [];
	const isSearchLoading = isPending || isOptimisticLoading;
	const channels = useMemo(() => {
		const merged = data?.pages.flatMap((page) => page.data) ?? [];

		if (sortMode === "title-asc") {
			return [...merged].sort((a, b) =>
				a.title.localeCompare(b.title, "pt-BR"),
			);
		}

		if (sortMode === "title-desc") {
			return [...merged].sort((a, b) =>
				b.title.localeCompare(a.title, "pt-BR"),
			);
		}

		return merged;
	}, [data, sortMode]);

	const pageInfo = data?.pages[data.pages.length - 1]?.pageInfo;

	const openChannelDetails = (channel: GroupedChannelDto) => {
		if (!mac) return;

		const params = new URLSearchParams({
			mac,
			title: channel.title,
			search,
			groupTitle: selectedGroupTitle,
			sort: sortMode,
		});

		router.push(`/channels/details?${params.toString()}`);
	};

	return (
		<LayoutShell activeSidebarItem="live-tv">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center justify-between px-6 z-10 sticky top-0">
					<div className="flex items-center gap-4 flex-1">
						<h1 className="text-2xl font-bold tracking-tight hidden lg:block mr-6">
							Canais
						</h1>
						<div className="relative w-full max-w-md group">
							<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
								search
							</span>
							<Input
								className="w-full rounded-full bg-secondary/50 pl-10"
								onChange={(event) => setSearchInput(event.target.value)}
								placeholder="Procurar canais..."
								type="text"
								value={searchInput}
							/>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Select
							onValueChange={(value) => {
								setSelectedGroupTitle(value === "__all" ? "" : value);
							}}
							value={selectedGroupTitle || "__all"}
						>
							<SelectTrigger className="w-48 bg-card">
								<SelectValue placeholder="Todas Categorias" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all">Todas Categorias</SelectItem>
								{groups.map((group) => (
									<SelectItem key={group} value={group}>
										{group}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							onValueChange={(value) => setSortMode(value as SortMode)}
							value={sortMode}
						>
							<SelectTrigger className="w-44 bg-card">
								<SelectValue placeholder="Ordernar por" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="default">Ordernar por</SelectItem>
								<SelectItem value="title-asc">Nome (A-Z)</SelectItem>
								<SelectItem value="title-desc">Nome (Z-A)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</header>

				<div className="flex-1 flex overflow-hidden">
					<div className="w-56 border-r border-border/50 bg-background/50 overflow-y-auto hidden md:block py-6 px-4 shrink-0 hide-scrollbar">
						<h3 className="font-semibold text-xs text-muted-foreground mb-4 px-3 uppercase tracking-wider">
							Categorias
						</h3>
						<div className="space-y-1">
							<Button
								className="w-full justify-start rounded-md px-3 py-2.5 text-sm font-medium"
								onClick={() => setSelectedGroupTitle("")}
								type="button"
								variant={selectedGroupTitle ? "ghost" : "secondary"}
							>
								Todos Canais
							</Button>
							{groups.map((group) => (
								<Button
									className="w-full justify-start rounded-md px-3 py-2.5 text-sm font-medium truncate"
									key={group}
									onClick={() => setSelectedGroupTitle(group)}
									type="button"
									variant={selectedGroupTitle === group ? "secondary" : "ghost"}
								>
									{group}
								</Button>
							))}
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="text-xl font-semibold tracking-tight">
								Canais ao vivo
							</h2>
							<span className="text-sm text-muted-foreground">
								{channels.length} itens carregados
								{pageInfo ? ` · página ${pageInfo.currentPage}` : ""}
							</span>
						</div>

						{error instanceof Error ? (
							<div className="text-sm text-destructive">{error.message}</div>
						) : null}

						{isSearchLoading ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
								{Array.from({ length: 10 }).map((_, index) => (
									<Card
										className="relative flex h-36 flex-col border border-border/50 p-4"
										key={`channels-skeleton-${index}`}
									>
										<div className="mb-auto flex min-w-0 items-center gap-4">
											<Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-3/4" />
												<Skeleton className="h-3 w-1/2" />
											</div>
										</div>
										<div className="mt-3 flex items-center gap-1.5">
											<Skeleton className="h-5 w-10 rounded-full" />
											<Skeleton className="h-5 w-10 rounded-full" />
											<Skeleton className="h-5 w-8 rounded-full" />
										</div>
									</Card>
								))}
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
								{channels.map((channel) => {
									const firstVariant = channel.variants[0];
									const tags = unique(
										channel.variants.flatMap((variant) => variant.qualityTags),
									);
									const hasLegendado = channel.variants.some(
										(variant) => variant.isLegendado,
									);

									return (
										<Card
											className="group cursor-pointer relative flex flex-col border border-border/50 p-4 text-left transition-all h-36"
											key={channel.title}
											onClick={() => openChannelDetails(channel)}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													openChannelDetails(channel);
												}
											}}
											role="button"
											tabIndex={0}
										>
											<div className="flex items-center gap-4 mb-auto min-w-0">
												<div className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/50">
													{firstVariant?.tvgLogo ? (
														<Image
															alt={channel.title}
															className="w-full h-full object-cover"
															fill
															sizes="56px"
															src={firstVariant.tvgLogo}
														/>
													) : null}
												</div>
												<div className="flex-1 min-w-0">
													<h4 className="font-bold text-sm truncate text-foreground group-focus:text-primary group-hover:text-primary transition-colors">
														{channel.title}
													</h4>
													<p className="text-xs text-muted-foreground truncate mt-0.5">
														{firstVariant?.groupTitle ?? "Sem grupo"}
													</p>
												</div>
											</div>

											<div className="mt-3 flex flex-wrap gap-1.5 items-center">
												{tags.slice(0, 2).map((tag) => (
													<Badge
														className={badgeClass(tag)}
														key={`${channel.title}-${tag}`}
														variant="outline"
													>
														{tag}
													</Badge>
												))}
												{hasLegendado ? (
													<Badge
														className="bg-yellow-500/90 text-black uppercase tracking-wider"
														variant="outline"
													>
														[L]
													</Badge>
												) : null}
											</div>
										</Card>
									);
								})}
							</div>
						)}

						<div className="py-12 flex justify-center w-full">
							<Button
								variant="outline"
								disabled={!hasNextPage || isFetchingNextPage}
								onClick={() => {
									void fetchNextPage();
								}}
								type="button"
							>
								{isFetchingNextPage ? (
									<Skeleton className="h-4 w-24 bg-background/60" />
								) : hasNextPage ? (
									"Carregar Mais"
								) : (
									"Fim"
								)}
							</Button>
						</div>
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}

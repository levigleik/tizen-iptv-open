"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fetchGroupedCategoryList, fetchGroupedSeriesPage } from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";
import type { GroupedSeriesDto } from "@/types/iptv";

type SortMode = "default" | "title-asc" | "title-desc";

function countEpisodes(series: GroupedSeriesDto): number {
	return series.seasons.reduce(
		(total, season) => total + season.episodes.length,
		0,
	);
}

export default function SeriesPage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const initialSearch = searchParams.get("search") ?? "";
	const initialGroupTitle = searchParams.get("groupTitle") ?? "";
	const initialSort = (searchParams.get("sort") as SortMode) ?? "default";
	const [mac, setMac] = useState("");
	const [searchInput, setSearchInput] = useState(initialSearch);
	const [search, setSearch] = useState(initialSearch);
	const [selectedGroupTitle, setSelectedGroupTitle] =
		useState(initialGroupTitle);
	const [sortMode, setSortMode] = useState<SortMode>(
		["default", "title-asc", "title-desc"].includes(initialSort)
			? initialSort
			: "default",
	);
	const adult = useAppSettingsStore((state) => state.adult);

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
		queryKey: ["series-group-list", mac, adult],
		enabled: Boolean(mac),
		queryFn: ({ signal }) =>
			fetchGroupedCategoryList(mac, "series", adult, signal),
	});

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery({
		queryKey: ["series-grouped", mac, search, selectedGroupTitle, adult],
		enabled: Boolean(mac),
		initialPageParam: 1,
		queryFn: ({ pageParam, signal }) =>
			fetchGroupedSeriesPage(
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
	const seriesList = useMemo(() => {
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

	const openSeriesDetails = (series: GroupedSeriesDto) => {
		if (!mac) return;

		const params = new URLSearchParams({
			mac,
			title: series.title,
			search,
			groupTitle: selectedGroupTitle,
			sort: sortMode,
		});

		router.push(`/series/details?${params.toString()}`);
	};

	const applySearch = () => {
		setSearch(searchInput.trim());
	};

	return (
		<LayoutShell activeSidebarItem="series">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center justify-between px-6 z-10 sticky top-0">
					<div className="flex items-center gap-4 flex-1">
						<h1 className="text-2xl font-bold tracking-tight hidden lg:block mr-6">
							Séries
						</h1>
						<div className="relative w-full max-w-md group">
							<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
								search
							</span>
							<Input
								className="w-full rounded-full bg-secondary/50 pl-10"
								onChange={(event) => setSearchInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") applySearch();
								}}
								placeholder="Procurar séries..."
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

						<Button variant="outline" onClick={applySearch} type="button">
							Apply
						</Button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					<div className="mb-6 flex items-center justify-between">
						{/* <h2 className="text-xl font-semibold tracking-tight">
							Trending Now
						</h2> */}
						<span className="text-sm text-muted-foreground">
							{seriesList.length} itens carregados
							{pageInfo ? ` · página ${pageInfo.currentPage}` : ""}
						</span>
					</div>

					{isPending ? (
						<div className="flex items-center gap-3 text-sm text-muted-foreground">
							<LoadingSpinner size="sm" />
							Carregando séries...
						</div>
					) : null}

					{error instanceof Error ? (
						<div className="text-sm text-destructive">{error.message}</div>
					) : null}

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
						{seriesList.map((series) => {
							const firstEpisode = series.seasons[0]?.episodes[0];
							const totalEpisodes = countEpisodes(series);

							return (
								<Card
									className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
									key={series.title}
									onClick={() => openSeriesDetails(series)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											openSeriesDetails(series);
										}
									}}
									role="button"
									tabIndex={0}
								>
									<div className="movie-poster-container bg-muted">
										{firstEpisode?.tvgLogo ? (
											<Image
												alt={series.title}
												className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
												fill
												loading="lazy"
												sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 16.66vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33.33vw, 50vw"
												src={firstEpisode.tvgLogo}
											/>
										) : null}

										<div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
											<Badge
												className="bg-black/80 text-white border-white/10 uppercase tracking-wider"
												variant="outline"
											>
												{series.seasons.length}T
											</Badge>
											<Badge
												className="bg-blue-600/90 text-white border-white/10 uppercase tracking-wider"
												variant="outline"
											>
												{totalEpisodes}E
											</Badge>
										</div>

										<div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200 movie-poster-overlay flex items-center justify-center backdrop-blur-[2px]">
											<div className="h-12 w-12 rounded-full bg-primary/90 p-0 shadow-lg flex items-center justify-center">
												<span className="material-symbols-outlined text-3xl ml-1">
													play_arrow
												</span>
											</div>
										</div>
									</div>

									<div className="flex flex-col">
										<h3 className="font-medium text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors group-focus:text-primary">
											{series.title}
										</h3>
										<p className="text-xs text-muted-foreground truncate mt-0.5">
											{firstEpisode?.groupTitle ?? "Sem grupo"}
										</p>
									</div>
								</Card>
							);
						})}
					</div>

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
								<div className="flex items-center gap-2">
									<LoadingSpinner size="sm" />
									Carregando...
								</div>
							) : hasNextPage ? (
								"Carregar Mais"
							) : (
								"Fim"
							)}
						</Button>
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}

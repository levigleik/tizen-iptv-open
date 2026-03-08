"use client";

import {
	useMutation,
	useInfiniteQuery,
	useIsFetching,
	useQueryClient,
	useQuery,
} from "@tanstack/react-query";
import { useHashRouter } from "@/hooks/use-hash-router";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CatalogImage } from "@/components/iptv/catalog-image";
import { CatalogNavbar } from "@/components/iptv/catalog-navbar";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import {
	addFavorite,
	fetchFavorites,
	fetchGroupedCategoryList,
	fetchGroupedChannelsPage,
	removeFavorite,
} from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";
import type { GroupedChannelDto } from "@/types/iptv";

type SortMode = "default" | "title-asc" | "title-desc";
const ITEMS_PER_PAGE = 24;

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function badgeClass(badge: string) {
	if (badge === "HDR") {
		return "bg-blue-600/90 text-white border-white/10 uppercase tracking-wider";
	}

	return "bg-black/80 text-white border-white/10 uppercase tracking-wider";
}

function ChannelsPageContent() {
	const { navigate, pathname, searchParams } = useHashRouter();
	const initialSearch = searchParams.get("search") ?? "";
	const initialGroupTitle = searchParams.get("groupTitle") ?? "";
	const initialSort = (searchParams.get("sort") as SortMode) ?? "default";

	const [mac, setMac] = useState("");
	const [selectedGroupTitle, setSelectedGroupTitle] =
		useState(initialGroupTitle);
	const longPressHandledRef = useRef(false);
	const [sortMode, setSortMode] = useState<SortMode>(
		["default", "title-asc", "title-desc"].includes(initialSort)
			? initialSort
			: "default",
	);
	const adult = useAppSettingsStore((state) => state.adult);
	const queryClient = useQueryClient();
	const favoritesQueryKey = ["favorites", "channels", mac] as const;

	const isSearchFetching =
		useIsFetching({
			queryKey: ["channels-grouped", mac],
		}) > 0;

	const {
		isOptimisticLoading,
		search,
		searchInput,
		setSearchImmediate,
		setSearchInput,
	} = useDebouncedSearch({
		initialValue: initialSearch,
		delayMs: 1300,
		minChars: 3,
		isFetching: isSearchFetching,
	});

	const clearFilters = () => {
		setSearchImmediate("");
		setSelectedGroupTitle("");
		setSortMode("default");
	};

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
			navigate(next ? `${pathname}?${next}` : pathname);
		}
	}, [pathname, navigate, search, searchParams, selectedGroupTitle, sortMode]);

	const { data: groupsResponse } = useQuery<{ data: string[] }>({
		queryKey: ["channels-group-list", mac, adult],
		enabled: Boolean(mac),
		queryFn: ({ signal }) =>
			fetchGroupedCategoryList(mac, "channels", adult, signal),
	});

	const { data: favoritesData } = useQuery({
		queryKey: favoritesQueryKey,
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchFavorites(mac, 200, signal, ["LIVE"]),
	});

	const addFavoriteMutation = useMutation({
		mutationFn: (entryId: number) => addFavorite(mac, entryId),
		onSuccess: (favorite) => {
			queryClient.setQueryData(favoritesQueryKey, (current: unknown) => {
				const list = Array.isArray(current) ? current : [];
				const exists = list.some(
					(item) =>
						typeof item === "object" &&
						item !== null &&
						"m3uEntryId" in item &&
						(item as { m3uEntryId?: number }).m3uEntryId ===
							favorite.m3uEntryId,
				);

				if (exists) return list;
				return [favorite, ...list];
			});
		},
	});

	const removeFavoriteMutation = useMutation({
		mutationFn: (entryId: number) => removeFavorite(mac, entryId),
		onSuccess: (_removed, entryId) => {
			queryClient.setQueryData(favoritesQueryKey, (current: unknown) => {
				const list = Array.isArray(current) ? current : [];
				return list.filter((item) => {
					if (typeof item !== "object" || item === null) return true;
					if (!("m3uEntryId" in item)) return true;
					return (item as { m3uEntryId?: number }).m3uEntryId !== entryId;
				});
			});
		},
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
				ITEMS_PER_PAGE,
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
	const favoriteEntryIds = useMemo(() => {
		return new Set(
			(favoritesData ?? []).map((favorite) => favorite.m3uEntryId),
		);
	}, [favoritesData]);
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

		navigate(`/channels/details?${params.toString()}`);
	};

	const toggleChannelFavorite = async (channel: GroupedChannelDto) => {
		if (!mac) return;

		const channelFavoriteIds = channel.variants
			.map((variant) => variant.id)
			.filter((id) => favoriteEntryIds.has(id));
		const isFavorite = channelFavoriteIds.length > 0;

		try {
			if (isFavorite) {
				await Promise.all(
					channelFavoriteIds.map((entryId) =>
						removeFavoriteMutation.mutateAsync(entryId),
					),
				);
				toast.success("Removido dos favoritos", {
					description: channel.title,
				});
				return;
			}

			const entryId = channel.variants[0]?.id;
			if (!entryId) return;

			await addFavoriteMutation.mutateAsync(entryId);
			toast.success("Adicionado aos favoritos", {
				description: channel.title,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Não foi possível favoritar";
			toast.error(message);
		}
	};

	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage) return;

		const handleFocusIn = (event: FocusEvent) => {
			if (isFetchingNextPage || !hasNextPage) return;

			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			if (target.dataset.catalogItem !== "true") return;

			const grid = target.closest("[data-catalog-grid='true']");
			if (!(grid instanceof HTMLElement)) return;

			const items = Array.from(
				grid.querySelectorAll<HTMLElement>("[data-catalog-item='true']"),
			);
			if (items.length === 0) return;

			const focusedTop = target.getBoundingClientRect().top;
			const lastRowTop = items.reduce((maxTop, item) => {
				return Math.max(maxTop, item.getBoundingClientRect().top);
			}, Number.NEGATIVE_INFINITY);

			if (focusedTop < lastRowTop - 4) return;
			void fetchNextPage();
		};

		document.addEventListener("focusin", handleFocusIn);
		return () => {
			document.removeEventListener("focusin", handleFocusIn);
		};
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	useEffect(() => {
		const handleKeyUp = (event: KeyboardEvent) => {
			if (event.key === "Enter" || event.key === " ") {
				longPressHandledRef.current = false;
			}
		};

		window.addEventListener("keyup", handleKeyUp, true);
		return () => window.removeEventListener("keyup", handleKeyUp, true);
	}, []);

	return (
		<LayoutShell activeSidebarItem="live-tv">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<CatalogNavbar
					title="Canais"
					searchPlaceholder="Procurar canais..."
					searchValue={searchInput}
					onSearchChange={setSearchInput}
					onClearFilters={clearFilters}
					groups={groups}
					selectedGroupTitle={selectedGroupTitle}
					onGroupTitleChange={setSelectedGroupTitle}
					sortValue={sortMode}
					onSortValueChange={(value) => setSortMode(value as SortMode)}
					sortOptions={[
						{ label: "Ordernar por", value: "default" },
						{ label: "Nome (A-Z)", value: "title-asc" },
						{ label: "Nome (Z-A)", value: "title-desc" },
					]}
				/>

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
							<div
								className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
								data-catalog-grid="true"
							>
								{channels.map((channel, index) => {
									const firstVariant = channel.variants[0];
									const channelFavoriteIds = channel.variants
										.map((variant) => variant.id)
										.filter((id) => favoriteEntryIds.has(id));
									const isFavorite = channelFavoriteIds.length > 0;
									const tags = unique(
										channel.variants.flatMap((variant) => variant.qualityTags),
									);
									const hasLegendado = channel.variants.some(
										(variant) => variant.isLegendado,
									);
									const hasEpg = channel.variants.some(
										(variant) => (variant.epg?.length ?? 0) > 0,
									);

									return (
										<Card
											className="group cursor-pointer relative flex flex-col border border-border/50 p-4 text-left transition-all h-36"
											data-catalog-item="true"
											data-initial-focus={
												index === 0 ? "catalog-item" : undefined
											}
											key={channel.title}
											onClick={() => openChannelDetails(channel)}
											onKeyDown={(event) => {
												if (
													(event.key === "Enter" || event.key === " ") &&
													event.repeat &&
													!longPressHandledRef.current
												) {
													event.preventDefault();
													event.stopPropagation();
													longPressHandledRef.current = true;
													void toggleChannelFavorite(channel);
													return;
												}

												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													openChannelDetails(channel);
												}
											}}
											role="button"
											tabIndex={0}
										>
											{isFavorite ? (
												<div className="absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur">
													<span className="material-symbols-outlined text-lg text-rose-500">
														favorite
													</span>
												</div>
											) : null}

											{hasLegendado ? (
												<div className="absolute top-2 right-2 z-10">
													<Badge
														className="bg-yellow-500/90 text-black uppercase tracking-wider shadow-sm"
														variant="outline"
													>
														[L]
													</Badge>
												</div>
											) : null}

											<div className="flex items-center gap-4 mb-auto min-w-0">
												<div className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/50">
													<CatalogImage
														alt={channel.title}
														className="w-full h-full object-cover"
														fill
														sizes="56px"
														src={firstVariant?.tvgLogo}
													/>
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

												{hasEpg ? (
													<Badge
														className="bg-primary/20 text-primary border-primary/30 uppercase tracking-wider"
														variant="outline"
													>
														EPG
													</Badge>
												) : null}
											</div>
										</Card>
									);
								})}
								{isFetchingNextPage
									? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
											<Card
												className="relative flex h-36 flex-col border border-border/50 p-4"
												key={`channels-next-skeleton-${index}`}
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
										))
									: null}
							</div>
						)}

						<div className="py-6 text-center text-xs text-muted-foreground">
							{isFetchingNextPage
								? "Carregando mais títulos..."
								: hasNextPage
									? "Role com as setas até a última linha para carregar mais"
									: "Fim do catálogo"}
						</div>
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}

export default function ChannelsPage() {
	return <ChannelsPageContent />;
}

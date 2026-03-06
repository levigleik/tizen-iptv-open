"use client";

import {
	useMutation,
	useInfiniteQuery,
	useIsFetching,
	useQueryClient,
	useQuery,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CatalogImage } from "@/components/iptv/catalog-image";
import { CatalogNavbar } from "@/components/iptv/catalog-navbar";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import {
	addFavorite,
	fetchFavorites,
	fetchGroupedCategoryList,
	fetchGroupedSeriesPage,
	fetchRecents,
	removeFavorite,
} from "@/lib/iptv";
import {
	getSeriesAnchorEntryId,
	getSeriesKeyFromFavoriteEntry,
	getSeriesKeyFromSeriesItem,
} from "@/lib/series-favorites";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";
import type { GroupedSeriesDto } from "@/types/iptv";

type SortMode = "default" | "title-asc" | "title-desc";
const ITEMS_PER_PAGE = 24;

function countEpisodes(series: GroupedSeriesDto): number {
	return series.seasons.reduce(
		(total, season) => total + season.episodes.length,
		0,
	);
}

function SeriesPageContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
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
	const favoritesQueryKey = ["favorites", "series", mac] as const;
	const isSearchFetching =
		useIsFetching({
			queryKey: ["series-grouped", mac],
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

	const { data: recentsData } = useQuery({
		queryKey: ["series-recents", mac],
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchRecents(mac, 50, signal),
	});

	const { data: favoritesData } = useQuery({
		queryKey: favoritesQueryKey,
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchFavorites(mac, 200, signal, ["SERIES"]),
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
		queryKey: ["series-grouped", mac, search, selectedGroupTitle, adult],
		enabled: Boolean(mac),
		initialPageParam: 1,
		queryFn: ({ pageParam, signal }) =>
			fetchGroupedSeriesPage(
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
	const favoriteSeriesKeys = useMemo(() => {
		return new Set((favoritesData ?? []).map(getSeriesKeyFromFavoriteEntry));
	}, [favoritesData]);
	const isSearchLoading = isPending || isOptimisticLoading;
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

	const toggleSeriesFavorite = async (series: GroupedSeriesDto) => {
		if (!mac) return;

		const seriesKey = getSeriesKeyFromSeriesItem(series);
		const matchingFavorites = (favoritesData ?? []).filter(
			(favorite) => getSeriesKeyFromFavoriteEntry(favorite) === seriesKey,
		);
		const isFavorite = matchingFavorites.length > 0;

		try {
			if (isFavorite) {
				await Promise.all(
					matchingFavorites.map((favorite) =>
						removeFavoriteMutation.mutateAsync(favorite.m3uEntryId),
					),
				);
				toast.success("Série removida dos favoritos", {
					description: series.title,
				});
				return;
			}

			const anchorEntryId = getSeriesAnchorEntryId(series);
			if (!anchorEntryId) return;

			await addFavoriteMutation.mutateAsync(anchorEntryId);
			toast.success("Série adicionada aos favoritos", {
				description: series.title,
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
		<LayoutShell activeSidebarItem="series">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<CatalogNavbar
					title="Séries"
					searchPlaceholder="Procurar séries..."
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

					{error instanceof Error ? (
						<div className="text-sm text-destructive">{error.message}</div>
					) : null}

					{isSearchLoading ? (
						<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
							{Array.from({ length: 16 }).map((_, index) => (
								<div
									className="flex flex-col gap-2"
									key={`series-skeleton-${index}`}
								>
									<Skeleton className="aspect-2/3 w-full rounded-xl" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-4/5" />
										<Skeleton className="h-3 w-3/5" />
									</div>
								</div>
							))}
						</div>
					) : (
						<div
							className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8"
							data-catalog-grid="true"
						>
							{seriesList.map((series, index) => {
								const firstEpisode = series.seasons[0]?.episodes[0];
								const seriesKey = getSeriesKeyFromSeriesItem(series);
								const isFavorite = favoriteSeriesKeys.has(seriesKey);
								const totalEpisodes = countEpisodes(series);
								const hasProgress = series.seasons.some((season) =>
									season.episodes.some((episode) => {
										const recent = recentsData?.find((item) => {
											const recentEntryId = item.m3uEntryId ?? item.entryId;
											return recentEntryId === episode.id;
										});

										return (recent?.progressSeconds ?? 0) > 0;
									}),
								);

								return (
									<Card
										className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
										data-catalog-item="true"
										data-initial-focus={
											index === 0 ? "catalog-item" : undefined
										}
										key={series.title}
										onClick={() => openSeriesDetails(series)}
										onKeyDown={(event) => {
											if (
												(event.key === "Enter" || event.key === " ") &&
												event.repeat &&
												!longPressHandledRef.current
											) {
												event.preventDefault();
												event.stopPropagation();
												longPressHandledRef.current = true;
												void toggleSeriesFavorite(series);
												return;
											}

											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												openSeriesDetails(series);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<button
											aria-label={
												isFavorite
													? "Remover série dos favoritos"
													: "Adicionar série aos favoritos"
											}
											className="absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-rose-500"
											onClick={(event) => {
												event.stopPropagation();
												void toggleSeriesFavorite(series);
											}}
											type="button"
										>
											<span
												className={`material-symbols-outlined text-lg ${
													isFavorite ? "text-rose-500" : ""
												}`}
											>
												{isFavorite ? "favorite" : "favorite_border"}
											</span>
										</button>

										<div className="movie-poster-container bg-muted">
											<CatalogImage
												alt={series.title}
												className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
												fill
												loading="lazy"
												sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 16.66vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33.33vw, 50vw"
												src={firstEpisode?.tvgLogo}
											/>

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

											{hasProgress ? (
												<div className="absolute bottom-2 left-2">
													<Badge
														className="bg-green-600/90 text-white border-white/10 uppercase tracking-wider"
														variant="outline"
													>
														Em andamento
													</Badge>
												</div>
											) : null}

											<div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200 movie-poster-overlay flex items-center justify-center">
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
							{isFetchingNextPage
								? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
										<div
											className="flex flex-col gap-2"
											key={`series-next-skeleton-${index}`}
										>
											<Skeleton className="aspect-2/3 w-full rounded-xl" />
											<div className="space-y-2">
												<Skeleton className="h-4 w-4/5" />
												<Skeleton className="h-3 w-3/5" />
											</div>
										</div>
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
			</main>
		</LayoutShell>
	);
}

export default function SeriesPage() {
	return (
		<Suspense fallback={null}>
			<SeriesPageContent />
		</Suspense>
	);
}

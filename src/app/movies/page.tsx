"use client";

import {
	useInfiniteQuery,
	useIsFetching,
	useQuery,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CatalogImage } from "@/components/iptv/catalog-image";
import { CatalogNavbar } from "@/components/iptv/catalog-navbar";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import {
	fetchGroupedCategoryList,
	fetchGroupedMoviesPage,
	fetchRecents,
} from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";
import type { GroupedMovieDto } from "@/types/iptv";

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

function MoviesPageContent() {
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
			queryKey: ["movie-grouped", mac],
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
		queryKey: ["movie-group-list", mac, adult],
		enabled: Boolean(mac),
		queryFn: ({ signal }) =>
			fetchGroupedCategoryList(mac, "movies", adult, signal),
	});

	const { data: recentsData } = useQuery({
		queryKey: ["movie-recents", mac],
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchRecents(mac, 50, signal),
	});

	const {
		data,
		error,
		isPending,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteQuery({
		queryKey: ["movie-grouped", mac, search, selectedGroupTitle, adult],
		enabled: Boolean(mac),
		initialPageParam: 1,
		queryFn: ({ pageParam, signal }) =>
			fetchGroupedMoviesPage(
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
	const isSearchLoading = isPending || isOptimisticLoading;
	const movies = useMemo(() => {
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

	const openMovieDetails = (movie: GroupedMovieDto) => {
		if (!mac) return;

		const params = new URLSearchParams({
			mac,
			title: movie.title,
			search,
			groupTitle: selectedGroupTitle,
			sort: sortMode,
		});

		router.push(`/movies/details?${params.toString()}`);
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

	return (
		<LayoutShell activeSidebarItem="movies">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<CatalogNavbar
					title="Filmes"
					searchPlaceholder="Procurar filmes..."
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
							{movies.length} itens carregados
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
									key={`movies-skeleton-${index}`}
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
							{movies.map((movie, index) => {
								const firstVariant = movie.variants[0];
								const tags = unique(
									movie.variants.flatMap((variant) => variant.qualityTags),
								);
								const hasLegendado = movie.variants.some(
									(variant) => variant.isLegendado,
								);
								const hasProgress = movie.variants.some((variant) => {
									const recent = recentsData?.find((item) => {
										const recentEntryId = item.m3uEntryId ?? item.entryId;
										return recentEntryId === variant.id;
									});

									return (recent?.progressSeconds ?? 0) > 0;
								});

								return (
									<Card
										className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
										data-catalog-item="true"
										data-initial-focus={
											index === 0 ? "catalog-item" : undefined
										}
										key={movie.title}
										onClick={() => openMovieDetails(movie)}
										onKeyDown={(event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												openMovieDetails(movie);
											}
										}}
										role="button"
										tabIndex={0}
									>
										<div className="movie-poster-container bg-muted">
											<CatalogImage
												alt={movie.title}
												className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
												fill
												loading="lazy"
												sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 16.66vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33.33vw, 50vw"
												src={firstVariant?.tvgLogo}
											/>

											<div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
												{tags.map((badge) => (
													<Badge
														className={badgeClass(badge)}
														key={`${movie.title}-${badge}`}
														variant="outline"
													>
														{badge}
													</Badge>
												))}
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

											{hasLegendado ? (
												<div className="absolute top-2 left-2">
													<Badge
														className="bg-yellow-500/90 text-black uppercase tracking-wider"
														variant="outline"
													>
														[L]
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
												{movie.title}
											</h3>
											<p className="text-xs text-muted-foreground truncate mt-0.5">
												{firstVariant?.groupTitle ?? "Sem grupo"}
											</p>
										</div>
									</Card>
								);
							})}
							{isFetchingNextPage
								? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
										<div
											className="flex flex-col gap-2"
											key={`movies-next-skeleton-${index}`}
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

export default function MoviesPage() {
	return (
		<Suspense fallback={null}>
			<MoviesPageContent />
		</Suspense>
	);
}

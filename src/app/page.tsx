"use client";

import dynamic from "next/dynamic";
import { type ComponentType } from "react";

import { useQuery } from "@tanstack/react-query";
import { useHashRouter } from "@/hooks/use-hash-router";
import { useEffect, useMemo, useState } from "react";

import { CatalogImage } from "@/components/iptv/catalog-image";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { MobileSidebarToggle } from "@/components/iptv/mobile-sidebar-toggle";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	fetchGroupedMoviesPage,
	fetchGroupedSeriesPage,
	fetchRecents,
} from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";
import type {
	GroupedMovieDto,
	GroupedSeriesDto,
	GroupedSeriesEpisodeDto,
} from "@/types/iptv";

function countEpisodes(series: GroupedSeriesDto): number {
	return series.seasons.reduce(
		(total, season) => total + season.episodes.length,
		0,
	);
}

function formatProgressLabel(seconds: number): string {
	const safe = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(safe / 3600);
	const minutes = Math.floor((safe % 3600) / 60);
	const secs = safe % 60;

	if (hours > 0) {
		return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	}

	return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

type RecentHomeItem = {
	entryId: number;
	title: string;
	subtitle: string;
	logo?: string | null;
	category: "VOD" | "SERIES";
	progressSeconds: number;
};

export function HomeView() {
	const { navigate } = useHashRouter();
	const [mac, setMac] = useState("");
	const adult = useAppSettingsStore((state) => state.adult);

	useEffect(() => {
		setMac(resolveMacAddress());
	}, []);

	const {
		data: moviesData,
		isPending: isMoviesPending,
		error: moviesError,
	} = useQuery({
		queryKey: ["home-movies", mac, adult],
		enabled: Boolean(mac),
		queryFn: ({ signal }) =>
			fetchGroupedMoviesPage(mac, 1, 16, adult, undefined, undefined, signal),
	});

	const {
		data: seriesData,
		isPending: isSeriesPending,
		error: seriesError,
	} = useQuery({
		queryKey: ["home-series", mac, adult],
		enabled: Boolean(mac),
		queryFn: ({ signal }) =>
			fetchGroupedSeriesPage(mac, 1, 16, adult, undefined, undefined, signal),
	});

	const {
		data: recentsData,
		isPending: isRecentsPending,
		error: recentsError,
	} = useQuery({
		queryKey: ["home-recents", mac],
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchRecents(mac, 30, signal, ["VOD", "SERIES"]),
	});

	const movies = moviesData?.data ?? [];
	const seriesList = seriesData?.data ?? [];
	const isRecentsSectionLoading =
		isRecentsPending || isMoviesPending || isSeriesPending;

	const movieByEntryId = useMemo(() => {
		const map = new Map<
			number,
			{ movie: GroupedMovieDto; logo?: string | null }
		>();
		for (const movie of movies) {
			for (const variant of movie.variants) {
				map.set(variant.id, { movie, logo: variant.tvgLogo });
			}
		}
		return map;
	}, [movies]);

	const seriesByEntryId = useMemo(() => {
		const map = new Map<
			number,
			{
				series: GroupedSeriesDto;
				episode: GroupedSeriesEpisodeDto;
			}
		>();
		for (const series of seriesList) {
			for (const season of series.seasons) {
				for (const episode of season.episodes) {
					map.set(episode.id, { series, episode });
				}
			}
		}
		return map;
	}, [seriesList]);

	const recents = useMemo<RecentHomeItem[]>(() => {
		const items: RecentHomeItem[] = [];
		const seen = new Set<number>();

		for (const recent of recentsData ?? []) {
			const entryId = recent.m3uEntryId ?? recent.entryId;
			if (typeof entryId !== "number" || seen.has(entryId)) continue;

			const progressSeconds = Math.max(
				0,
				Math.floor(recent.progressSeconds ?? 0),
			);

			const movieMatch = movieByEntryId.get(entryId);
			if (movieMatch) {
				items.push({
					entryId,
					title: movieMatch.movie.title,
					subtitle: progressSeconds
						? `Retomar em ${formatProgressLabel(progressSeconds)}`
						: "Filme",
					logo: movieMatch.logo,
					category: "VOD",
					progressSeconds,
				});
				seen.add(entryId);
				continue;
			}

			const seriesMatch = seriesByEntryId.get(entryId);
			if (seriesMatch) {
				items.push({
					entryId,
					title: seriesMatch.series.title,
					subtitle: progressSeconds
						? `Retomar em ${formatProgressLabel(progressSeconds)}`
						: "Série",
					logo: seriesMatch.episode.tvgLogo,
					category: "SERIES",
					progressSeconds,
				});
				seen.add(entryId);
			}
		}

		return items.slice(0, 16);
	}, [movieByEntryId, recentsData, seriesByEntryId]);

	const openMovieDetails = (movie: GroupedMovieDto) => {
		if (!mac) return;
		const params = new URLSearchParams({
			mac,
			title: movie.title,
		});
		navigate(`/movies/details?${params.toString()}`);
	};

	const openSeriesDetails = (series: GroupedSeriesDto) => {
		if (!mac) return;
		const params = new URLSearchParams({
			mac,
			title: series.title,
		});
		navigate(`/series/details?${params.toString()}`);
	};

	const openRecent = (recent: RecentHomeItem) => {
		if (recent.category === "VOD") {
			const matched = movieByEntryId.get(recent.entryId);
			if (matched) {
				openMovieDetails(matched.movie);
			}
			return;
		}

		const matched = seriesByEntryId.get(recent.entryId);
		if (matched) {
			openSeriesDetails(matched.series);
		}
	};

	useEffect(() => {
		document.body.focus();
	}, []);

	useEffect(() => {
		if (isRecentsSectionLoading) return;

		const timerId = window.setTimeout(() => {
			window.dispatchEvent(new Event("tv-focus-request"));
		}, 100);

		return () => window.clearTimeout(timerId);
	}, [isRecentsSectionLoading]);

	return (
		<LayoutShell activeSidebarItem="home">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center gap-4 px-6 z-10 sticky top-0">
					<MobileSidebarToggle />
					<h1 className="text-2xl font-bold tracking-tight">Início</h1>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					<div className="space-y-10">
						<section>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-xl font-semibold tracking-tight">
									Recentes
								</h2>
							</div>

							{recentsError instanceof Error ? (
								<div className="text-sm text-destructive">
									{recentsError.message}
								</div>
							) : null}

							{isRecentsSectionLoading ? (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
									{Array.from({ length: 8 }).map((_, index) => (
										<div
											className="flex flex-col gap-2"
											key={`recents-skeleton-${index}`}
										>
											<Skeleton className="aspect-2/3 w-full rounded-xl" />
											<div className="space-y-2">
												<Skeleton className="h-4 w-4/5" />
												<Skeleton className="h-3 w-3/5" />
											</div>
										</div>
									))}
								</div>
							) : recents.length === 0 ? (
								<Card className="border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
									Nenhum item recente encontrado.
								</Card>
							) : (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
									{recents.map((recent, index) => (
										<Card
											className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
											data-initial-focus={
												index === 0 ? "catalog-item" : undefined
											}
											key={`recent-${recent.entryId}`}
											onClick={() => openRecent(recent)}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													openRecent(recent);
												}
											}}
											role="button"
											tabIndex={0}
										>
											<div className="movie-poster-container bg-muted">
												<CatalogImage
													alt={recent.title}
													className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
													fill
													loading="lazy"
													sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 16.66vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33.33vw, 50vw"
													src={recent.logo}
												/>

												<div className="absolute top-2 left-2">
													<Badge
														className="bg-green-600/90 text-white border-white/10 uppercase tracking-wider"
														variant="outline"
													>
														Retomar
													</Badge>
												</div>

												<div className="absolute top-2 right-2">
													<Badge
														className="bg-black/80 text-white border-white/10 uppercase tracking-wider"
														variant="outline"
													>
														{recent.category === "VOD" ? "Filme" : "Série"}
													</Badge>
												</div>

												{recent.progressSeconds > 0 ? (
													<div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
														<div
															className="h-full bg-primary"
															style={{
																width: `${Math.min(100, Math.max(8, Math.floor(recent.progressSeconds / 45)))}%`,
															}}
														/>
													</div>
												) : null}
											</div>

											<div className="flex flex-col">
												<h3 className="font-medium text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors group-focus:text-primary">
													{recent.title}
												</h3>
												<p className="text-xs text-muted-foreground truncate mt-0.5">
													{recent.subtitle}
												</p>
											</div>
										</Card>
									))}
								</div>
							)}
						</section>

						<section>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-xl font-semibold tracking-tight">Filmes</h2>
							</div>

							{moviesError instanceof Error ? (
								<div className="text-sm text-destructive">
									{moviesError.message}
								</div>
							) : null}

							{isMoviesPending ? (
								<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
									{Array.from({ length: 8 }).map((_, index) => (
										<div
											className="flex flex-col gap-2"
											key={`home-movies-skeleton-${index}`}
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
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
									{movies.map((movie, index) => {
										const firstVariant = movie.variants[0];
										const hasLegendado = movie.variants.some(
											(variant) => variant.isLegendado,
										);

										return (
											<Card
												className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
												data-initial-focus={
													recents.length === 0 && index === 0
														? "catalog-item"
														: undefined
												}
												key={`home-movie-${movie.title}`}
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

													{hasLegendado ? (
														<div className="absolute top-2 right-2 z-20">
															<Badge
																className="bg-yellow-500/90 text-black uppercase tracking-wider shadow-sm"
																variant="outline"
															>
																[L]
															</Badge>
														</div>
													) : null}
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
								</div>
							)}
						</section>

						<section>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-xl font-semibold tracking-tight">Séries</h2>
							</div>

							{seriesError instanceof Error ? (
								<div className="text-sm text-destructive">
									{seriesError.message}
								</div>
							) : null}

							{isSeriesPending ? (
								<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
									{Array.from({ length: 8 }).map((_, index) => (
										<div
											className="flex flex-col gap-2"
											key={`home-series-skeleton-${index}`}
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
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
									{seriesList.map((series, index) => {
										const firstEpisode = series.seasons[0]?.episodes[0];
										const totalEpisodes = countEpisodes(series);

										return (
											<Card
												className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
												data-initial-focus={
													recents.length === 0 &&
													movies.length === 0 &&
													index === 0
														? "catalog-item"
														: undefined
												}
												key={`home-series-${series.title}`}
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
							)}
						</section>
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}

// ============================================================================
// SPA Router Switch
// ============================================================================

const ViewFavorites = dynamic(() => import("./favorites/page"), { ssr: false });
const ViewHistory = dynamic(() => import("./history/page"), { ssr: false });
const ViewSettings = dynamic(() => import("./settings/page"), { ssr: false });
const ViewWatch = dynamic(() => import("./watch/page"), { ssr: false });
const ViewPreview = dynamic(() => import("./preview/page"), { ssr: false });
const ViewMovies = dynamic(() => import("./movies/page"), { ssr: false });
const ViewMoviesDetails = dynamic(() => import("./movies/details/page"), { ssr: false });
const ViewSeries = dynamic(() => import("./series/page"), { ssr: false });
const ViewSeriesDetails = dynamic(() => import("./series/details/page"), { ssr: false });
const ViewChannels = dynamic(() => import("./channels/page"), { ssr: false });
const ViewChannelsDetails = dynamic(() => import("./channels/details/page"), { ssr: false });
const ViewCatalog = dynamic(() => import("./catalog/page"), { ssr: false });

export default function AppRouterSwitch() {
	const { pathname } = useHashRouter();

	let ViewComponent: ComponentType = HomeView;

	if (pathname === "/favorites") ViewComponent = ViewFavorites;
	else if (pathname === "/history") ViewComponent = ViewHistory;
	else if (pathname === "/settings") ViewComponent = ViewSettings;
	else if (pathname === "/watch") ViewComponent = ViewWatch;
	else if (pathname === "/preview") ViewComponent = ViewPreview;
	else if (pathname === "/movies") ViewComponent = ViewMovies;
	else if (pathname === "/movies/details") ViewComponent = ViewMoviesDetails;
	else if (pathname === "/series") ViewComponent = ViewSeries;
	else if (pathname === "/series/details") ViewComponent = ViewSeriesDetails;
	else if (pathname === "/channels") ViewComponent = ViewChannels;
	else if (pathname === "/channels/details") ViewComponent = ViewChannelsDetails;

	return <ViewComponent />;
}

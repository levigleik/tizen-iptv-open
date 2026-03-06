"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { MobileSidebarToggle } from "@/components/iptv/mobile-sidebar-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	addFavorite,
	buildMediaProxyUrl,
	fetchFavorites,
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
import type { GroupedSeriesEpisodeDto } from "@/types/iptv";

function resolveEpisodeCode(
	episode: GroupedSeriesEpisodeDto,
	fallbackIndex: number,
): string {
	if (typeof episode.episode === "number") {
		return `E${episode.episode}`;
	}

	return `E${fallbackIndex + 1}`;
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

function SeriesDetailsPageContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const seasonQueryValue = searchParams.get("season");
	const seasonFromQuery = seasonQueryValue ? Number(seasonQueryValue) : NaN;
	const [selectedSeason, setSelectedSeason] = useState<number | null>(
		Number.isFinite(seasonFromQuery) ? seasonFromQuery : null,
	);

	const mac = searchParams.get("mac") ?? "";
	const title = searchParams.get("title") ?? "";
	const entryId = Number(searchParams.get("entryId") ?? "");
	const hasEntryId = Number.isFinite(entryId);
	const search = searchParams.get("search") ?? "";
	const groupTitle = searchParams.get("groupTitle") ?? "";
	const sort = searchParams.get("sort") ?? "";
	const adult = useAppSettingsStore((state) => state.adult);
	const queryClient = useQueryClient();
	const favoritesQueryKey = ["favorites", "series", mac] as const;

	const backParams = new URLSearchParams();
	if (search) backParams.set("search", search);
	if (groupTitle) backParams.set("groupTitle", groupTitle);
	if (sort) backParams.set("sort", sort);
	const backHref = backParams.toString()
		? `/series?${backParams.toString()}`
		: "/series";

	const { data, isPending, error } = useQuery({
		queryKey: ["series-details", mac, title, search, groupTitle, adult],
		enabled: Boolean(mac && title),
		queryFn: ({ signal }) =>
			fetchGroupedSeriesPage(
				mac,
				1,
				100,
				adult,
				title,
				groupTitle || undefined,
				signal,
			),
	});

	const { data: recentsData } = useQuery({
		queryKey: ["series-details-recents", mac],
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

	const series = useMemo(() => {
		if (!data) return null;

		if (hasEntryId) {
			const byEntryId = data.data.find((item) =>
				item.seasons.some((season) =>
					season.episodes.some((episode) => episode.id === entryId),
				),
			);

			if (byEntryId) return byEntryId;
		}

		if (!title) return null;
		const normalized = title.trim().toLowerCase();

		const exact = data.data.find(
			(item) => item.title.trim().toLowerCase() === normalized,
		);

		if (exact) return exact;

		return (
			data.data.find((item) =>
				item.title.trim().toLowerCase().includes(normalized),
			) ?? null
		);
	}, [data, entryId, hasEntryId, title]);

	useEffect(() => {
		if (!series?.seasons.length) {
			setSelectedSeason(null);
			return;
		}

		setSelectedSeason((current) => {
			if (
				typeof current === "number" &&
				series.seasons.some((season) => season.season === current)
			) {
				return current;
			}

			return series.seasons[0]?.season ?? null;
		});
	}, [series]);

	useEffect(() => {
		const params = new URLSearchParams(searchParams.toString());

		if (typeof selectedSeason === "number" && Number.isFinite(selectedSeason)) {
			params.set("season", String(selectedSeason));
		} else {
			params.delete("season");
		}

		const current = searchParams.toString();
		const next = params.toString();

		if (current !== next) {
			router.replace(next ? `${pathname}?${next}` : pathname, {
				scroll: false,
			});
		}
	}, [pathname, router, searchParams, selectedSeason]);

	const activeSeason = useMemo(() => {
		if (!series?.seasons.length) return null;

		if (typeof selectedSeason !== "number") {
			return series.seasons[0] ?? null;
		}

		return (
			series.seasons.find((season) => season.season === selectedSeason) ??
			series.seasons[0] ??
			null
		);
	}, [series, selectedSeason]);

	const firstSeason = series?.seasons[0];
	const firstEpisode = firstSeason?.episodes[0];
	const firstEpisodeForPlay = activeSeason?.episodes[0] ?? firstEpisode;
	const totalEpisodes =
		series?.seasons.reduce(
			(total, season) => total + season.episodes.length,
			0,
		) ?? 0;

	const progressByEpisodeId = useMemo(() => {
		const map = new Map<number, number>();
		for (const item of recentsData ?? []) {
			const recentEntryId = item.m3uEntryId ?? item.entryId;
			if (typeof recentEntryId !== "number") continue;

			const progress = Math.max(0, Math.floor(item.progressSeconds ?? 0));
			if (progress > 0) {
				map.set(recentEntryId, progress);
			}
		}

		return map;
	}, [recentsData]);

	const seriesKey = useMemo(
		() => (series ? getSeriesKeyFromSeriesItem(series) : null),
		[series],
	);
	const matchingFavoriteEntries = useMemo(() => {
		if (!seriesKey) return [];
		return (favoritesData ?? []).filter(
			(favorite) => getSeriesKeyFromFavoriteEntry(favorite) === seriesKey,
		);
	}, [favoritesData, seriesKey]);
	const isSeriesFavorite = matchingFavoriteEntries.length > 0;

	const openWatch = (
		episode: GroupedSeriesEpisodeDto,
		options?: { startFromBeginning?: boolean },
	) => {
		const mediaUrl = buildMediaProxyUrl(mac, episode.id);
		const params = new URLSearchParams({
			mac,
			entryId: String(episode.id),
			resume: options?.startFromBeginning ? "0" : "1",
			title: episode.rawTitle,
			streamUrl: mediaUrl,
			groupTitle: episode.groupTitle,
			quality: "",
			isLegendado: "0",
			fromPreview: `${window.location.pathname}${window.location.search}`,
		});

		router.push(`/watch?${params.toString()}`);
	};

	const toggleSeriesFavorite = async () => {
		if (!series || !mac) return;

		try {
			if (isSeriesFavorite) {
				await Promise.all(
					matchingFavoriteEntries.map((favorite) =>
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

	return (
		<LayoutShell activeSidebarItem="series">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center justify-between px-6 z-10 sticky top-0">
					<div className="flex items-center gap-4">
						<MobileSidebarToggle className="border-white/10 bg-black/40 text-white hover:bg-black/60 hover:text-white" />
						<a
							className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-accent hover:text-accent-foreground h-10 w-10 text-white bg-black/40 backdrop-blur-md border border-white/10"
							href={backHref}
						>
							<span className="material-symbols-outlined">arrow_back</span>
						</a>
					</div>
					<div className="flex items-center gap-4">
						<Button
							aria-label={
								isSeriesFavorite
									? "Remover série dos favoritos"
									: "Adicionar série aos favoritos"
							}
							className="h-10 w-10 border border-white/10 bg-black/40 text-white backdrop-blur-md hover:bg-black/40 hover:text-rose-300"
							onClick={() => {
								void toggleSeriesFavorite();
							}}
							size="icon"
							type="button"
							variant="icon"
						>
							<span
								className={`material-symbols-outlined ${
									isSeriesFavorite ? "text-rose-300" : ""
								}`}
							>
								{isSeriesFavorite ? "favorite" : "favorite_border"}
							</span>
						</Button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					{isPending ? (
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
							<section className="xl:col-span-1 space-y-4">
								<Skeleton className="h-8 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
								<div className="flex flex-wrap gap-2">
									<Skeleton className="h-6 w-20 rounded-full" />
									<Skeleton className="h-6 w-28 rounded-full" />
								</div>
								<Skeleton className="h-11 w-64 rounded-md" />
							</section>
							<section className="xl:col-span-2 space-y-3">
								<div className="mb-4 flex items-center justify-between">
									<Skeleton className="h-7 w-32" />
									<Skeleton className="h-10 w-44" />
								</div>
								{Array.from({ length: 6 }).map((_, index) => (
									<Card
										className="border-border/50 p-2"
										key={`series-skeleton-${index}`}
									>
										<div className="flex gap-4">
											<Skeleton className="h-20 w-32 shrink-0 rounded-md" />
											<div className="flex-1 space-y-2 py-1">
												<Skeleton className="h-3 w-16" />
												<Skeleton className="h-4 w-3/4" />
											</div>
										</div>
									</Card>
								))}
							</section>
						</div>
					) : null}

					{error instanceof Error ? (
						<div className="text-sm text-destructive">{error.message}</div>
					) : null}

					{!isPending && !series ? (
						<div className="text-sm text-muted-foreground">
							Série não encontrada no catálogo.
						</div>
					) : null}

					{series ? (
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
							<section className="xl:col-span-1">
								<div className="movie-poster-container bg-muted">
									{firstEpisode?.tvgLogo ? (
										<Image
											alt={series.title}
											className="movie-poster"
											fill
											sizes="(min-width: 1280px) 25vw, 100vw"
											src={firstEpisode.tvgLogo}
										/>
									) : null}
								</div>
								<h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-4">
									{series.title}
								</h1>
								<p className="text-sm text-muted-foreground mt-2">
									{series.seasons.length} temporada(s) · {totalEpisodes}{" "}
									episódio(s)
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									<Badge variant="outline">Series</Badge>
									<Badge variant="outline">{series.seasons.length}T</Badge>
									<Badge variant="outline">{totalEpisodes}E</Badge>
								</div>
								<p className="text-sm text-muted-foreground mt-6">
									Selecione temporada e episódio para iniciar a reprodução.
								</p>
								<div className="mt-6 flex flex-wrap items-center gap-3">
									{firstEpisodeForPlay ? (
										<Button
											onClick={() => openWatch(firstEpisodeForPlay)}
											type="button"
										>
											<span className="material-symbols-outlined text-xl">
												play_arrow
											</span>
											Assistir primeiro episódio
										</Button>
									) : null}
								</div>
							</section>

							<section className="xl:col-span-2">
								<div className="rounded-xl flex flex-col overflow-hidden">
									<div className="p-4 flex items-center justify-between shrink-0">
										<h2 className="text-xl font-semibold">Episódios</h2>
										<Select
											onValueChange={(value) => {
												setSelectedSeason(Number(value));
											}}
											value={
												typeof selectedSeason === "number"
													? String(selectedSeason)
													: undefined
											}
										>
											<SelectTrigger className="w-44">
												<SelectValue placeholder="Temporada" />
											</SelectTrigger>
											<SelectContent>
												{series.seasons.map((season) => (
													<SelectItem
														key={season.season}
														value={String(season.season)}
													>
														Season {season.season}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="max-h-[70vh] bg-card rounded-xl overflow-y-auto p-2 hide-scrollbar">
										<div className="flex flex-col gap-3">
											{activeSeason ? (
												<div className="space-y-2" key={activeSeason.season}>
													<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
														Season {activeSeason.season}
													</h3>
													<div className="flex flex-col gap-1">
														{activeSeason.episodes.map((episode, index) => {
															const code = resolveEpisodeCode(episode, index);
															const progressSeconds =
																progressByEpisodeId.get(episode.id) ?? 0;
															const hasProgress = progressSeconds > 0;
															return (
																<Card
																	className="bg-background w-full rounded-lg border-border/50"
																	key={episode.id}
																>
																	<div className="p-2 flex gap-4">
																		<div className="relative w-32 h-20 shrink-0 rounded-md overflow-hidden bg-muted">
																			{episode.tvgLogo ? (
																				<Image
																					alt={episode.rawTitle}
																					className="w-full h-full object-cover"
																					fill
																					sizes="128px"
																					src={episode.tvgLogo}
																				/>
																			) : null}
																		</div>
																		<div className="flex flex-col flex-1 py-1 justify-center">
																			<div className="flex items-center justify-between mb-1">
																				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
																					{code}
																				</span>
																				{hasProgress ? (
																					<Badge
																						className="bg-green-600/90 text-white border-white/10 uppercase tracking-wider"
																						variant="outline"
																					>
																						Retomar{" "}
																						{formatProgressLabel(
																							progressSeconds,
																						)}
																					</Badge>
																				) : null}
																			</div>
																			<h3 className="font-medium text-sm text-foreground line-clamp-1 transition-colors">
																				{episode.rawTitle}
																			</h3>
																			<div className="mt-2 flex flex-wrap gap-2">
																				{hasProgress ? (
																					<Button
																						onClick={() => openWatch(episode)}
																						type="button"
																					>
																						Retomar
																					</Button>
																				) : null}
																				<Button
																					onClick={() =>
																						openWatch(episode, {
																							startFromBeginning: true,
																						})
																					}
																					type="button"
																					variant={
																						hasProgress ? "outline" : "default"
																					}
																				>
																					Começar do início
																				</Button>
																			</div>
																		</div>
																	</div>
																</Card>
															);
														})}
													</div>
												</div>
											) : null}
										</div>
									</div>
								</div>
							</section>
						</div>
					) : null}
				</div>
			</main>
		</LayoutShell>
	);
}

export default function SeriesDetailsPage() {
	return (
		<Suspense fallback={null}>
			<SeriesDetailsPageContent />
		</Suspense>
	);
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { LayoutShell } from "@/components/iptv/layout-shell";
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
	buildMediaProxyUrl,
	fetchGroupedSeriesPage,
	fetchRecents,
} from "@/lib/iptv";
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
	const search = searchParams.get("search") ?? "";
	const groupTitle = searchParams.get("groupTitle") ?? "";
	const sort = searchParams.get("sort") ?? "";
	const adult = useAppSettingsStore((state) => state.adult);

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

	const series = useMemo(() => {
		if (!data || !title) return null;
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
	}, [data, title]);

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

	return (
		<LayoutShell activeSidebarItem="series">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<div className="absolute inset-0 z-0 pointer-events-none">
					{firstEpisode?.tvgLogo ? (
						<Image
							alt={series?.title ?? "Series background"}
							className="w-full h-full object-cover opacity-60"
							fill
							sizes="100vw"
							src={firstEpisode.tvgLogo}
						/>
					) : null}
					<div className="absolute inset-0 hero-gradient" />
				</div>

				<header className="h-20 shrink-0 bg-transparent flex items-center justify-between px-6 z-20 relative">
					<a
						className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-accent hover:text-accent-foreground h-10 w-10 text-white bg-black/40 backdrop-blur-md border border-white/10"
						href={backHref}
					>
						<span className="material-symbols-outlined">arrow_back</span>
					</a>
					<div className="flex items-center gap-4">
						<Button
							className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-accent hover:text-accent-foreground h-10 w-10 text-white bg-black/40 backdrop-blur-md border border-white/10"
							type="button"
							variant="ghost"
						>
							<span className="material-symbols-outlined">search</span>
						</Button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto px-6 pb-6 pt-12 md:pt-24 z-10 relative scroll-smooth flex flex-col lg:flex-row gap-12">
					{isPending ? (
						<>
							<div className="w-full lg:w-1/2 flex flex-col justify-start">
								<div className="flex flex-wrap gap-2 mb-4">
									<Skeleton className="h-6 w-20 rounded-full bg-white/20" />
									<Skeleton className="h-6 w-28 rounded-full bg-white/20" />
									<Skeleton className="h-6 w-28 rounded-full bg-white/20" />
								</div>

								<Skeleton className="h-12 w-4/5 mb-3 bg-white/20" />
								<Skeleton className="h-12 w-3/5 mb-4 bg-white/20" />

								<div className="flex items-center gap-4 mb-6">
									<Skeleton className="h-4 w-40 bg-white/20" />
									<Skeleton className="h-4 w-40 bg-white/20" />
								</div>

								<div className="space-y-2 mb-8 max-w-2xl">
									<Skeleton className="h-6 w-full bg-white/20" />
									<Skeleton className="h-6 w-11/12 bg-white/20" />
								</div>

								<Skeleton className="h-12 w-64 rounded-md" />
							</div>

							<div className="w-full lg:w-1/2 flex flex-col h-full max-h-[70vh]">
								<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden">
									<div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0 bg-background/50">
										<Skeleton className="h-7 w-32" />
										<Skeleton className="h-9 w-44" />
									</div>

									<div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
										<div className="space-y-2">
											<Skeleton className="h-4 w-32 ml-2" />
											{Array.from({ length: 6 }).map((_, index) => (
												<div
													className="w-full rounded-lg p-2 flex gap-4"
													key={`series-skeleton-${index}`}
												>
													<Skeleton className="w-32 h-20 shrink-0 rounded-md" />
													<div className="flex-1 py-1 space-y-2">
														<Skeleton className="h-3 w-16" />
														<Skeleton className="h-4 w-3/4" />
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						</>
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
						<>
							<div className="w-full lg:w-1/2 flex flex-col justify-start">
								<div className="flex flex-wrap gap-2 mb-4">
									<Badge
										className="rounded-full border-white/20 bg-black/40 text-white"
										variant="outline"
									>
										Series
									</Badge>
									<Badge
										className="bg-white/20 text-white uppercase tracking-wider"
										variant="outline"
									>
										{series.seasons.length} temporadas
									</Badge>
									<Badge
										className="bg-white/20 text-white uppercase tracking-wider"
										variant="outline"
									>
										{totalEpisodes} episódios
									</Badge>
								</div>

								<h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4 drop-shadow-md">
									{series.title}
								</h1>

								<div className="flex items-center gap-4 text-sm text-gray-300 mb-6 font-medium">
									<span>{series.seasons.length} temporada(s)</span>
									<span>{totalEpisodes} episódio(s)</span>
								</div>

								<p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl drop-shadow-sm">
									Selecione temporada e episódio para iniciar a reprodução.
								</p>

								<div className="flex flex-wrap items-center gap-4">
									{firstEpisodeForPlay ? (
										<Button
											className="inline-flex items-center justify-center rounded-md text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 py-2 gap-2 shadow-lg hover:scale-105 active:scale-95 duration-200"
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
							</div>

							<div className="w-full lg:w-1/2 flex flex-col h-full max-h-[70vh]">
								<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden">
									<div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0 bg-background/50">
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
											<SelectTrigger className="w-44 bg-secondary/50">
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

									<div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
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
																	className="episode-card w-full rounded-lg border-border/50"
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
							</div>
						</>
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

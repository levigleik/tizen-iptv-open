"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fetchGroupedSeriesPage } from "@/lib/iptv";
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

export default function SeriesDetailsPage() {
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

	const openWatch = (episode: GroupedSeriesEpisodeDto) => {
		const params = new URLSearchParams({
			title: episode.rawTitle,
			streamUrl: episode.streamUrl,
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
						<div className="text-sm text-muted-foreground">
							Carregando detalhes...
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
															return (
																<Button
																	className="episode-card w-full text-left rounded-lg min-h-10 h-full p-2 flex gap-4 group focus:outline-none focus:ring-2 focus:ring-primary hover:bg-accent/50"
																	key={episode.id}
																	onClick={() => openWatch(episode)}
																	type="button"
																	variant="ghost"
																>
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
																		<div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
																			<span className="material-symbols-outlined text-2xl text-white">
																				play_circle
																			</span>
																		</div>
																	</div>
																	<div className="flex flex-col flex-1 py-1 justify-center">
																		<div className="flex items-center justify-between mb-1">
																			<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
																				{code}
																			</span>
																		</div>
																		<h3 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
																			{episode.rawTitle}
																		</h3>
																	</div>
																</Button>
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

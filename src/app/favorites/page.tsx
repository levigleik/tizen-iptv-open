"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CatalogImage } from "@/components/iptv/catalog-image";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFavorites } from "@/lib/iptv";
import { resolveMacAddress } from "@/lib/tizen";

type StreamType = "LIVE" | "VOD" | "SERIES" | "OTHER";

type FavoriteCatalogItem = {
	entryId: number;
	title: string;
	subtitle: string;
	logo?: string | null;
	streamType: StreamType;
};

function normalizeStreamType(value?: string | null): StreamType {
	const type = value?.trim().toUpperCase();
	if (type === "LIVE") return "LIVE";
	if (type === "VOD") return "VOD";
	if (type === "SERIES") return "SERIES";
	return "OTHER";
}

export default function FavoritesPage() {
	const router = useRouter();
	const [mac, setMac] = useState("");

	useEffect(() => {
		setMac(resolveMacAddress());
	}, []);

	const { data: favoritesData, isPending } = useQuery({
		queryKey: ["favorites", mac],
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchFavorites(mac, 200, signal),
	});

	const favoritesByCategory = useMemo(() => {
		const result = {
			channels: [] as FavoriteCatalogItem[],
			movies: [] as FavoriteCatalogItem[],
			series: [] as FavoriteCatalogItem[],
		};
		const seen = new Set<number>();

		for (const item of favoritesData ?? []) {
			const entryId = item.m3uEntryId;
			if (typeof entryId !== "number" || seen.has(entryId)) continue;

			const streamType = normalizeStreamType(
				item.m3uEntry?.streamType ??
					item.m3uEntry?.type ??
					item.streamType ??
					item.type,
			);
			const title =
				item.m3uEntry?.title ?? item.m3uEntry?.rawTitle ?? `Item ${entryId}`;
			const subtitle =
				item.m3uEntry?.groupTitle ??
				(streamType === "LIVE"
					? "Canal"
					: streamType === "VOD"
						? "Filme"
						: streamType === "SERIES"
							? "Série"
							: "Outro");
			const card: FavoriteCatalogItem = {
				entryId,
				title,
				subtitle,
				logo: item.m3uEntry?.tvgLogo,
				streamType,
			};

			if (streamType === "LIVE") {
				result.channels.push(card);
			} else if (streamType === "VOD") {
				result.movies.push(card);
			} else if (streamType === "SERIES") {
				result.series.push(card);
			}

			seen.add(entryId);
		}

		return result;
	}, [favoritesData]);

	const openDetails = (item: FavoriteCatalogItem) => {
		const params = new URLSearchParams({ mac, title: item.title });
		if (item.streamType === "LIVE") {
			router.push(`/channels/details?${params.toString()}`);
			return;
		}
		if (item.streamType === "VOD") {
			router.push(`/movies/details?${params.toString()}`);
			return;
		}
		router.push(`/series/details?${params.toString()}`);
	};

	const renderSection = (
		title: string,
		items: FavoriteCatalogItem[],
		initialFocus = false,
	) => (
		<section>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-xl font-semibold tracking-tight">{title}</h2>
			</div>

			{isPending ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
					{Array.from({ length: 8 }).map((_, index) => (
						<div
							className="flex flex-col gap-2"
							key={`${title}-skeleton-${index}`}
						>
							<Skeleton className="aspect-2/3 w-full rounded-xl" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-4/5" />
								<Skeleton className="h-3 w-3/5" />
							</div>
						</div>
					))}
				</div>
			) : items.length === 0 ? (
				<Card className="border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
					Nenhum item encontrado.
				</Card>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 gap-y-8">
					{items.map((item, index) => (
						<Card
							className="movie-card cursor-pointer group flex flex-col gap-2 outline-none border-none bg-transparent shadow-none"
							data-catalog-item="true"
							data-initial-focus={
								initialFocus && index === 0 ? "catalog-item" : undefined
							}
							key={`${title}-${item.entryId}`}
							onClick={() => openDetails(item)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									openDetails(item);
								}
							}}
							role="button"
							tabIndex={0}
						>
							<div className="movie-poster-container bg-muted">
								<CatalogImage
									alt={item.title}
									className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
									fill
									loading="lazy"
									sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 16.66vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33.33vw, 50vw"
									src={item.logo}
								/>
								<div className="absolute top-2 left-2">
									<Badge
										className="bg-primary/90 text-white border-white/10 uppercase tracking-wider"
										variant="outline"
									>
										Favorito
									</Badge>
								</div>
							</div>

							<div className="flex flex-col">
								<h3 className="font-medium text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors group-focus:text-primary">
									{item.title}
								</h3>
								<p className="text-xs text-muted-foreground truncate mt-0.5">
									{item.subtitle}
								</p>
							</div>
						</Card>
					))}
				</div>
			)}
		</section>
	);

	const hasChannels = favoritesByCategory.channels.length > 0;
	const hasMovies = favoritesByCategory.movies.length > 0;

	return (
		<LayoutShell activeSidebarItem="favorites">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center px-6 z-10 sticky top-0">
					<h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					<div className="space-y-10" data-catalog-grid="true">
						{renderSection("Canais", favoritesByCategory.channels, true)}
						{renderSection("Filmes", favoritesByCategory.movies, !hasChannels)}
						{renderSection(
							"Séries",
							favoritesByCategory.series,
							!hasChannels && !hasMovies,
						)}
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}

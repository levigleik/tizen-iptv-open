"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { toast } from "sonner";

import { CatalogImage } from "@/components/iptv/catalog-image";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { MobileSidebarToggle } from "@/components/iptv/mobile-sidebar-toggle";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	addFavorite,
	fetchFavorites,
	fetchGroupedChannelsPage,
	removeFavorite,
	startChannelWatchSession,
} from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import type {
	GroupedChannelEpgItemDto,
	GroupedEntryVariantDto,
} from "@/types/iptv";

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	hour: "2-digit",
	minute: "2-digit",
});

function decodeHtmlEntities(value: string): string {
	return value
		.replaceAll("&apos;", "'")
		.replaceAll("&quot;", '"')
		.replaceAll("&amp;", "&")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">");
}

function toDate(value: string): Date {
	return new Date(value);
}

function normalizeForMatch(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/\[[^\]]*\]/g, " ")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function scoreDisplayName(displayName: string, candidates: string[]): number {
	const normalizedDisplay = normalizeForMatch(displayName);
	if (!normalizedDisplay) return 0;

	let best = 0;

	for (const candidateRaw of candidates) {
		const candidate = normalizeForMatch(candidateRaw);
		if (!candidate) continue;

		if (candidate === normalizedDisplay) {
			best = Math.max(best, 1000);
			continue;
		}

		if (
			normalizedDisplay.includes(candidate) ||
			candidate.includes(normalizedDisplay)
		) {
			best = Math.max(best, 800);
		}

		const displayTokens = new Set(normalizedDisplay.split(" ").filter(Boolean));
		const candidateTokens = candidate.split(" ").filter(Boolean);
		const overlap = candidateTokens.filter((token) => displayTokens.has(token));
		const overlapScore = overlap.length * 100;
		best = Math.max(best, overlapScore);
	}

	return best;
}

function getEpgProgress(item: GroupedChannelEpgItemDto): number {
	const start = Number(item.startTimestamp) * 1000;
	const stop = Number(item.stopTimestamp) * 1000;
	const now = Date.now();

	if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) {
		return 0;
	}

	if (now <= start) return 0;
	if (now >= stop) return 100;

	return Math.min(100, Math.max(0, ((now - start) / (stop - start)) * 100));
}

function dedupeEpgItems(
	items: GroupedChannelEpgItemDto[],
): GroupedChannelEpgItemDto[] {
	const seen = new Set<string>();
	const result: GroupedChannelEpgItemDto[] = [];

	for (const item of items) {
		const key = [
			item.channelId,
			item.channelDisplayName,
			item.startTimestamp,
			item.stopTimestamp,
			item.title,
		]
			.map((value) => normalizeForMatch(String(value ?? "")))
			.join("|");

		if (seen.has(key)) continue;
		seen.add(key);
		result.push(item);
	}

	return result;
}

function ChannelDetailsPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const mac = searchParams.get("mac") ?? "";
	const title = searchParams.get("title") ?? "";
	const entryId = Number(searchParams.get("entryId") ?? "");
	const hasEntryId = Number.isFinite(entryId);
	const search = searchParams.get("search") ?? "";
	const groupTitle = searchParams.get("groupTitle") ?? "";
	const sort = searchParams.get("sort") ?? "";
	const adult = useAppSettingsStore((state) => state.adult);
	const queryClient = useQueryClient();
	const favoritesQueryKey = ["favorites", "channels", mac] as const;

	const backParams = new URLSearchParams();
	if (search) backParams.set("search", search);
	if (groupTitle) backParams.set("groupTitle", groupTitle);
	if (sort) backParams.set("sort", sort);
	const backHref = backParams.toString()
		? `/channels?${backParams.toString()}`
		: "/channels";

	const { data, isPending, error } = useQuery({
		queryKey: ["channel-details", mac, title, search, groupTitle, adult],
		enabled: Boolean(mac && title),
		queryFn: ({ signal }) =>
			fetchGroupedChannelsPage(
				mac,
				1,
				100,
				adult,
				title,
				groupTitle || undefined,
				signal,
			),
	});

	const { data: favoritesData } = useQuery({
		queryKey: favoritesQueryKey,
		enabled: Boolean(mac),
		queryFn: ({ signal }) => fetchFavorites(mac, 200, signal, ["LIVE"]),
	});

	const favoriteEntryIds = useMemo(() => {
		return new Set(
			(favoritesData ?? []).map((favorite) => favorite.m3uEntryId),
		);
	}, [favoritesData]);

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

	const channel = useMemo(() => {
		if (!data) return null;

		if (hasEntryId) {
			const byEntryId = data.data.find((item) =>
				item.variants.some((variant) => variant.id === entryId),
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

	const firstVariant = channel?.variants[0];
	const allEpgItems = useMemo(() => {
		if (!channel?.variants?.length) return [];

		const merged = channel.variants
			.flatMap((variant) => variant.epg ?? [])
			.filter((item) => Boolean(item.channelDisplayName));

		return dedupeEpgItems(merged);
	}, [channel]);

	const epgByDisplay = useMemo(() => {
		const map = new Map<string, GroupedChannelEpgItemDto[]>();

		for (const item of allEpgItems) {
			const key = item.channelDisplayName.trim();
			if (!key) continue;

			const current = map.get(key) ?? [];
			current.push(item);
			map.set(key, current);
		}

		for (const [key, list] of map.entries()) {
			map.set(
				key,
				list.sort(
					(a, b) => Number(a.startTimestamp) - Number(b.startTimestamp),
				),
			);
		}

		return map;
	}, [allEpgItems]);

	const primaryDisplayName = useMemo(() => {
		if (!channel) return null;
		const entries = Array.from(epgByDisplay.entries());
		if (entries.length === 0) return null;

		const candidates = [
			channel.title,
			...channel.variants.map((v) => v.rawTitle),
		];
		let bestName: string | null = null;
		let bestScore = -1;

		for (const [displayName] of entries) {
			const score = scoreDisplayName(displayName, candidates);
			if (score > bestScore) {
				bestScore = score;
				bestName = displayName;
			}
		}

		return bestName;
	}, [channel, epgByDisplay]);

	const epgItems = useMemo(() => {
		if (!primaryDisplayName) return [];
		return epgByDisplay.get(primaryDisplayName) ?? [];
	}, [epgByDisplay, primaryDisplayName]);

	const additionalEpgGroups = useMemo(() => {
		if (!primaryDisplayName) return [];
		return Array.from(epgByDisplay.entries())
			.filter(([displayName]) => displayName !== primaryDisplayName)
			.sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
	}, [epgByDisplay, primaryDisplayName]);

	const nowProgram = useMemo(() => {
		const now = Date.now();
		return (
			epgItems.find((item) => {
				const start = Number(item.startTimestamp) * 1000;
				const stop = Number(item.stopTimestamp) * 1000;
				return now >= start && now <= stop;
			}) ?? null
		);
	}, [epgItems]);

	const nextProgram = useMemo(() => {
		if (!nowProgram) return epgItems[0] ?? null;

		const currentStart = Number(nowProgram.startTimestamp);
		return (
			epgItems.find((item) => Number(item.startTimestamp) > currentStart) ??
			null
		);
	}, [epgItems, nowProgram]);

	const startWatchMutation = useMutation({
		mutationFn: (variant: GroupedEntryVariantDto) =>
			startChannelWatchSession(mac, variant.id),
	});

	const openWatch = async (variant: GroupedEntryVariantDto) => {
		const streamUrl = await startWatchMutation.mutateAsync(variant);
		const params = new URLSearchParams({
			title: variant.rawTitle,
			streamUrl: variant.streamUrl,
			groupTitle: variant.groupTitle,
			quality: variant.qualityTags.join(","),
			isLegendado: variant.isLegendado ? "1" : "0",
			fromPreview: `${window.location.pathname}${window.location.search}`,
		});

		router.push(`/watch?${params.toString()}`);
	};

	const channelFavoriteIds = channel
		? channel.variants
				.map((variant) => variant.id)
				.filter((id) => favoriteEntryIds.has(id))
		: [];
	const isChannelFavorite = channelFavoriteIds.length > 0;

	const toggleChannelFavorite = async () => {
		if (!channel || !mac) return;

		try {
			if (isChannelFavorite) {
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

	return (
		<LayoutShell activeSidebarItem="live-tv">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center justify-between px-6 z-10 sticky top-0">
					<div className="flex items-center gap-4">
						<MobileSidebarToggle className="border-white/10 bg-black/40 text-white hover:bg-black/60 hover:text-white" />
						<a
							className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 w-10 text-white bg-black/40 backdrop-blur-md border border-white/10"
							href={backHref}
						>
							<span className="material-symbols-outlined">arrow_back</span>
						</a>
						<h1 className="text-2xl font-bold tracking-tight hidden lg:block">
							{title || "Channel details"}
						</h1>
					</div>
					<div className="flex items-center gap-4">
						<Button
							aria-label={
								isChannelFavorite
									? "Remover dos favoritos"
									: "Adicionar aos favoritos"
							}
							className="h-10 w-10 border border-white/10 bg-black/40 text-white backdrop-blur-md hover:bg-black/40 hover:text-rose-400"
							onClick={() => {
								void toggleChannelFavorite();
							}}
							size="icon"
							type="button"
							variant="icon"
						>
							<span
								className={`material-symbols-outlined ${
									isChannelFavorite ? "text-rose-400" : ""
								}`}
							>
								{isChannelFavorite ? "favorite" : "favorite_border"}
							</span>
						</Button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					{isPending ? (
						<div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
							<section className="xl:col-span-1 space-y-4">
								<div className="movie-poster-container bg-muted" />
							</section>
							<section className="xl:col-span-2 space-y-3">
								<Card className="h-20 border-border/50" />
								<Card className="h-20 border-border/50" />
								<Card className="h-20 border-border/50" />
							</section>
						</div>
					) : null}

					{error instanceof Error ? (
						<div className="text-sm text-destructive">{error.message}</div>
					) : null}

					{!isPending && !channel ? (
						<div className="text-sm text-muted-foreground">
							Canal não encontrado no catálogo.
						</div>
					) : null}

					{channel ? (
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
							<section className="xl:col-span-1">
								<div className="movie-poster-container bg-muted">
									<CatalogImage
										alt={channel.title}
										className="movie-poster"
										fill
										sizes="(min-width: 1280px) 25vw, 100vw"
										src={firstVariant?.tvgLogo}
									/>
								</div>
								<h2 className="text-2xl font-bold mt-4">{channel.title}</h2>
								<p className="text-sm text-muted-foreground mt-2">
									{firstVariant?.groupTitle ?? "Sem grupo"}
								</p>

								<div className="mt-6 space-y-3">
									<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
										Programação ao vivo
									</h3>
									{nowProgram ? (
										<Card className="border-border/50 p-4">
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<Badge
														className="uppercase tracking-wider"
														variant="outline"
													>
														Agora
													</Badge>
													<p className="text-sm font-semibold leading-tight">
														{decodeHtmlEntities(nowProgram.title)}
													</p>
													<p className="text-xs text-muted-foreground">
														{TIME_FORMATTER.format(toDate(nowProgram.startAt))}{" "}
														- {TIME_FORMATTER.format(toDate(nowProgram.stopAt))}
													</p>
												</div>
											</div>
											<div className="mt-3 h-1.5 w-full rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary"
													style={{ width: `${getEpgProgress(nowProgram)}%` }}
												/>
											</div>
										</Card>
									) : (
										<Card className="border-border/50 p-4">
											<p className="text-sm text-muted-foreground">
												Sem programa ao vivo no momento.
											</p>
										</Card>
									)}

									{nextProgram ? (
										<Card className="border-border/50 p-4">
											<div className="space-y-1">
												<Badge
													className="uppercase tracking-wider"
													variant="secondary"
												>
													Próximo
												</Badge>
												<p className="text-sm font-semibold leading-tight">
													{decodeHtmlEntities(nextProgram.title)}
												</p>
												<p className="text-xs text-muted-foreground">
													{TIME_FORMATTER.format(toDate(nextProgram.startAt))}
												</p>
											</div>
										</Card>
									) : null}
								</div>
							</section>

							<section className="xl:col-span-2">
								<div className="mb-4 flex items-center justify-between">
									<h3 className="text-xl font-semibold tracking-tight">
										Selecione a versão
									</h3>
									<span className="text-sm text-muted-foreground">
										{channel.variants.length} variantes disponíveis
									</span>
								</div>

								<div className="space-y-3">
									{startWatchMutation.error instanceof Error ? (
										<div className="text-sm text-destructive">
											{startWatchMutation.error.message}
										</div>
									) : null}
									{channel.variants.map((variant, index) => {
										const tags = unique(variant.qualityTags);
										const hasVariantEpg = (variant.epg?.length ?? 0) > 0;
										const isStarting =
											startWatchMutation.isPending &&
											startWatchMutation.variables?.id === variant.id;
										return (
											<Card className="border-border/50" key={variant.id}>
												<Button
													className="h-auto w-full justify-start rounded-xl p-4 text-left gap-4"
													data-initial-focus={
														index === 0 ? "variant" : undefined
													}
													disabled={startWatchMutation.isPending}
													onClick={() => {
														void openWatch(variant);
													}}
													type="button"
													variant="ghost"
												>
													<div className="flex items-center justify-between gap-6">
														<div>
															<p className="text-sm font-semibold leading-tight text-foreground">
																{variant.rawTitle}
															</p>
															<p className="text-xs text-muted-foreground mt-1">
																{variant.groupTitle}
															</p>
															{isStarting ? (
																<p className="text-xs text-primary mt-1">
																	Iniciando transmissão...
																</p>
															) : null}
														</div>
													</div>
													<div className="flex flex-wrap gap-2 items-center">
														{tags.length === 0 ? (
															<Badge
																className="bg-black/80 text-white border-white/10 uppercase tracking-wider"
																variant="outline"
															>
																STD
															</Badge>
														) : (
															tags.map((tag) => (
																<Badge
																	className={
																		tag === "HDR"
																			? "bg-blue-600/90 text-white border-white/10 uppercase tracking-wider"
																			: "bg-black/80 text-white border-white/10 uppercase tracking-wider"
																	}
																	key={`${variant.id}-${tag}`}
																	variant="outline"
																>
																	{tag}
																</Badge>
															))
														)}
														{variant.isLegendado ? (
															<Badge
																className="bg-yellow-500/90 text-black uppercase tracking-wider"
																variant="outline"
															>
																[L]
															</Badge>
														) : null}
														{hasVariantEpg ? (
															<Badge
																className="bg-primary/20 text-primary border-primary/30 uppercase tracking-wider"
																variant="outline"
															>
																EPG
															</Badge>
														) : null}
													</div>
												</Button>
											</Card>
										);
									})}
								</div>

								<div className="mt-8">
									<div className="mb-4 flex items-center justify-between">
										<h3 className="text-xl font-semibold tracking-tight">
											EPG do canal
										</h3>
										<div className="flex items-center gap-2">
											<span className="text-sm text-muted-foreground">
												{epgItems.length} programas
											</span>
											{primaryDisplayName ? (
												<Badge variant="outline">{primaryDisplayName}</Badge>
											) : null}
										</div>
									</div>

									{epgItems.length === 0 ? (
										<Card className="border-border/50 p-4">
											<p className="text-sm text-muted-foreground">
												Sem dados de EPG disponíveis para este canal.
											</p>
										</Card>
									) : (
										<div className="space-y-3">
											{epgItems.map((item, index) => {
												const startDate = toDate(item.startAt);
												const stopDate = toDate(item.stopAt);
												const isLive =
													Date.now() >= Number(item.startTimestamp) * 1000 &&
													Date.now() <= Number(item.stopTimestamp) * 1000;

												return (
													<Card
														className="border-border/50 p-4"
														key={`${item.channelId}-${item.startTimestamp}-${index}`}
													>
														<div className="flex items-start gap-4">
															<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
																<CatalogImage
																	alt={item.channelDisplayName}
																	className="object-cover"
																	fill
																	sizes="48px"
																	src={item.channelIcon}
																/>
															</div>
															<div className="min-w-0 flex-1">
																<div className="mb-1 flex flex-wrap items-center gap-2">
																	<Badge
																		variant={isLive ? "default" : "outline"}
																	>
																		{isLive ? "AO VIVO" : "Programado"}
																	</Badge>
																	<Badge variant="secondary">
																		{DATE_TIME_FORMATTER.format(startDate)}
																	</Badge>
																	<Badge variant="secondary">
																		{TIME_FORMATTER.format(startDate)} -{" "}
																		{TIME_FORMATTER.format(stopDate)}
																	</Badge>
																</div>
																<p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
																	{decodeHtmlEntities(item.title)}
																</p>
																{item.description ? (
																	<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
																		{decodeHtmlEntities(item.description)}
																	</p>
																) : null}
															</div>
														</div>
													</Card>
												);
											})}
										</div>
									)}

									{additionalEpgGroups.length > 0 ? (
										<div className="mt-6">
											<Accordion type="multiple" className="w-full">
												{additionalEpgGroups.map(
													([displayName, items], groupIndex) => (
														<AccordionItem
															key={displayName}
															value={`epg-${groupIndex}`}
														>
															<AccordionTrigger>
																<div className="flex items-center gap-2 text-left">
																	<Badge variant="secondary">Alternativo</Badge>
																	<span className="font-medium">
																		{displayName}
																	</span>
																	<span className="text-xs text-muted-foreground">
																		{items.length} programas
																	</span>
																</div>
															</AccordionTrigger>
															<AccordionContent>
																<div className="space-y-3">
																	{items.map((item, itemIndex) => {
																		const startDate = toDate(item.startAt);
																		const stopDate = toDate(item.stopAt);
																		const isLive =
																			Date.now() >=
																				Number(item.startTimestamp) * 1000 &&
																			Date.now() <=
																				Number(item.stopTimestamp) * 1000;

																		return (
																			<Card
																				className="border-border/50 p-4"
																				key={`${item.channelId}-${item.startTimestamp}-${itemIndex}`}
																			>
																				<div className="flex items-start gap-4">
																					<div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted">
																						<CatalogImage
																							alt={item.channelDisplayName}
																							className="object-cover"
																							fill
																							sizes="48px"
																							src={item.channelIcon}
																						/>
																					</div>
																					<div className="min-w-0 flex-1">
																						<div className="mb-1 flex flex-wrap items-center gap-2">
																							<Badge
																								variant={
																									isLive ? "default" : "outline"
																								}
																							>
																								{isLive
																									? "AO VIVO"
																									: "Programado"}
																							</Badge>
																							<Badge variant="secondary">
																								{DATE_TIME_FORMATTER.format(
																									startDate,
																								)}
																							</Badge>
																							<Badge variant="secondary">
																								{TIME_FORMATTER.format(
																									startDate,
																								)}{" "}
																								-{" "}
																								{TIME_FORMATTER.format(
																									stopDate,
																								)}
																							</Badge>
																						</div>
																						<p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
																							{decodeHtmlEntities(item.title)}
																						</p>
																						{item.description ? (
																							<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
																								{decodeHtmlEntities(
																									item.description,
																								)}
																							</p>
																						) : null}
																					</div>
																				</div>
																			</Card>
																		);
																	})}
																</div>
															</AccordionContent>
														</AccordionItem>
													),
												)}
											</Accordion>
										</div>
									) : null}
								</div>
							</section>
						</div>
					) : null}
				</div>
			</main>
		</LayoutShell>
	);
}

export default function ChannelDetailsPage() {
	return (
		<Suspense fallback={null}>
			<ChannelDetailsPageContent />
		</Suspense>
	);
}

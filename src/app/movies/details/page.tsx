"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGroupedMoviesPage } from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import type { GroupedEntryVariantDto } from "@/types/iptv";

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

export default function MovieDetailsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();

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
		? `/movies?${backParams.toString()}`
		: "/movies";

	const { data, isPending, error } = useQuery({
		queryKey: ["movie-details", mac, title, search, groupTitle, adult],
		enabled: Boolean(mac && title),
		queryFn: ({ signal }) =>
			fetchGroupedMoviesPage(
				mac,
				1,
				100,
				adult,
				title,
				groupTitle || undefined,
				signal,
			),
	});

	const movie = useMemo(() => {
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

	const firstVariant = movie?.variants[0];

	const openWatch = (variant: GroupedEntryVariantDto) => {
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

	return (
		<LayoutShell activeSidebarItem="movies">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center justify-between px-6 z-10 sticky top-0">
					<div className="flex items-center gap-4">
						<a
							className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 w-10 text-white bg-black/40 backdrop-blur-md border border-white/10"
							href={backHref}
						>
							<span className="material-symbols-outlined">arrow_back</span>
						</a>
						<h1 className="text-2xl font-bold tracking-tight hidden lg:block">
							{title || "Movie details"}
						</h1>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					{isPending ? (
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
							<section className="xl:col-span-1 space-y-4">
								<Skeleton className="movie-poster-container" />
								<Skeleton className="h-8 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</section>

							<section className="xl:col-span-2">
								<div className="mb-4 flex items-center justify-between">
									<Skeleton className="h-7 w-52" />
									<Skeleton className="h-5 w-44" />
								</div>

								<div className="space-y-3">
									{Array.from({ length: 5 }).map((_, index) => (
										<Card
											className="border-border/50 p-4"
											key={`movie-skeleton-${index}`}
										>
											<div className="space-y-3">
												<div className="flex items-center justify-between gap-4">
													<div className="space-y-2">
														<Skeleton className="h-4 w-56" />
														<Skeleton className="h-3 w-40" />
													</div>
													<Skeleton className="h-6 w-6 rounded-full" />
												</div>
												<div className="flex gap-2">
													<Skeleton className="h-5 w-12 rounded-full" />
													<Skeleton className="h-5 w-16 rounded-full" />
													<Skeleton className="h-5 w-10 rounded-full" />
												</div>
											</div>
										</Card>
									))}
								</div>
							</section>
						</div>
					) : null}

					{error instanceof Error ? (
						<div className="text-sm text-destructive">{error.message}</div>
					) : null}

					{!isPending && !movie ? (
						<div className="text-sm text-muted-foreground">
							Filme não encontrado no catálogo.
						</div>
					) : null}

					{movie ? (
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
							<section className="xl:col-span-1">
								<div className="movie-poster-container bg-muted">
									{firstVariant?.tvgLogo ? (
										<Image
											alt={movie.title}
											className="movie-poster"
											fill
											sizes="(min-width: 1280px) 25vw, 100vw"
											src={firstVariant.tvgLogo}
										/>
									) : null}
								</div>
								<h2 className="text-2xl font-bold mt-4">{movie.title}</h2>
								<p className="text-sm text-muted-foreground mt-2">
									{firstVariant?.groupTitle ?? "Sem grupo"}
								</p>
							</section>

							<section className="xl:col-span-2">
								<div className="mb-4 flex items-center justify-between">
									<h3 className="text-xl font-semibold tracking-tight">
										Selecione a versão
									</h3>
									<span className="text-sm text-muted-foreground">
										{movie.variants.length} variantes disponíveis
									</span>
								</div>

								<div className="space-y-3">
									{movie.variants.map((variant) => {
										const tags = unique(variant.qualityTags);
										return (
											<Card className="border-border/50" key={variant.id}>
												<Button
													className="h-auto w-full justify-start rounded-xl p-4 text-left gap-4"
													onClick={() => openWatch(variant)}
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
													</div>
												</Button>
											</Card>
										);
									})}
								</div>
							</section>
						</div>
					) : null}
				</div>
			</main>
		</LayoutShell>
	);
}

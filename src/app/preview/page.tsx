"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { useTvRemote } from "@/hooks/use-tv-remote";
import { fetchGroupedCategoryPage, startChannelWatchSession } from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";
import type {
	CatalogCategory,
	GroupedCategoryPageDto,
	GroupedChannelDto,
	GroupedEntryVariantDto,
	GroupedMovieDto,
	GroupedSeriesDto,
	GroupedSeriesEpisodeDto,
} from "@/types/iptv";

const CATEGORY_LABEL: Record<CatalogCategory, string> = {
	channels: "Canais",
	series: "Séries",
	movies: "Filmes",
};

function PreviewContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const mac = searchParams.get("mac") ?? "";
	const title = searchParams.get("title") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const perPage = Number(searchParams.get("perPage") ?? "20");
	const search = searchParams.get("search") ?? "";
	const groupTitle = searchParams.get("groupTitle") ?? "";
	const from = searchParams.get("from") ?? "/";
	const categoryParam = searchParams.get("category");
	const category =
		categoryParam === "movies" ||
		categoryParam === "series" ||
		categoryParam === "channels"
			? categoryParam
			: null;
	const adult = useAppSettingsStore((state) => state.adult);

	const { data, isPending, error } = useQuery<
		GroupedCategoryPageDto<
			GroupedMovieDto | GroupedSeriesDto | GroupedChannelDto
		>
	>({
		queryKey: [
			"preview-grouped",
			mac,
			category,
			title,
			page,
			perPage,
			search,
			groupTitle,
			adult,
		],
		enabled: Boolean(mac && category && title),
		queryFn: ({ signal }) => {
			if (!category) throw new Error("Categoria inválida.");

			return fetchGroupedCategoryPage(
				mac,
				category,
				page,
				perPage,
				adult,
				search,
				groupTitle,
				signal,
			);
		},
	});

	const selectedEntity = useMemo(() => {
		if (!data || !category || !title) return null;

		if (category === "movies") {
			return (
				(data.data as GroupedMovieDto[]).find((item) => item.title === title) ??
				null
			);
		}

		if (category === "channels") {
			return (
				(data.data as GroupedChannelDto[]).find(
					(item) => item.title === title,
				) ?? null
			);
		}

		return (
			(data.data as GroupedSeriesDto[]).find((item) => item.title === title) ??
			null
		);
	}, [category, data, title]);

	const previewImage = useMemo(() => {
		if (!selectedEntity || !category) return null;

		if (category === "movies") {
			return (selectedEntity as GroupedMovieDto).variants[0]?.tvgLogo ?? null;
		}

		if (category === "channels") {
			return (selectedEntity as GroupedChannelDto).variants[0]?.tvgLogo ?? null;
		}

		const firstEpisode = (selectedEntity as GroupedSeriesDto).seasons[0]
			?.episodes[0];
		return firstEpisode?.tvgLogo ?? null;
	}, [category, selectedEntity]);

	const startWatchMutation = useMutation({
		mutationFn: (variant: GroupedEntryVariantDto) =>
			startChannelWatchSession(mac, variant.id),
	});

	const openWatch = (payload: {
		entryId?: number;
		title: string;
		streamUrl: string;
		groupTitle: string;
		qualityTags: string[];
		isLegendado: boolean;
	}) => {
		const params = new URLSearchParams({
			...(typeof payload.entryId === "number"
				? { entryId: String(payload.entryId) }
				: {}),
			title: payload.title,
			streamUrl: payload.streamUrl,
			groupTitle: payload.groupTitle,
			quality: payload.qualityTags.join(","),
			isLegendado: payload.isLegendado ? "1" : "0",
			from: `${from ? from : "/"}`,
			fromPreview: `${window.location.pathname}${window.location.search}`,
		});
		router.push(`/watch?${params.toString()}`);
	};

	const openVariant = async (variant: GroupedEntryVariantDto) => {
		const streamUrl =
			category === "channels"
				? await startWatchMutation.mutateAsync(variant)
				: variant.streamUrl;

		openWatch({
			entryId: category === "channels" ? undefined : variant.id,
			title: variant.rawTitle,
			streamUrl,
			groupTitle: variant.groupTitle,
			qualityTags: variant.qualityTags,
			isLegendado: variant.isLegendado,
		});
	};

	const openEpisode = (episode: GroupedSeriesEpisodeDto) => {
		openWatch({
			entryId: episode.id,
			title: episode.rawTitle,
			streamUrl: episode.streamUrl,
			groupTitle: episode.groupTitle,
			qualityTags: [],
			isLegendado: false,
		});
	};

	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action === "back") {
				router.push(from || "/");
			}
		},
	});

	if (!category || !mac || !title) {
		return (
			<main className="mx-auto max-w-6xl p-6">
				<Card>
					<CardContent className="py-6">
						Parâmetros inválidos. Volte para a página inicial.
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-10">
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<CardTitle className="text-2xl">Pré-visualização</CardTitle>
								<CardDescription>
									{CATEGORY_LABEL[category]} · {title}
								</CardDescription>
							</div>
							<Button
								variant="outline"
								onClick={() => router.push(from || "/")}
							>
								Voltar
							</Button>
						</div>
					</CardHeader>
				</Card>

				{previewImage && (
					<Card>
						<CardContent className="p-4">
							<div className="relative h-56 w-full overflow-hidden rounded-lg">
								<Image
									src={previewImage}
									alt={title}
									fill
									unoptimized
									sizes="100vw"
									className="object-cover"
								/>
							</div>
						</CardContent>
					</Card>
				)}

				{isPending && (
					<Card>
						<CardContent className="flex items-center gap-3 py-6">
							<LoadingSpinner size="sm" />
							Carregando detalhes...
						</CardContent>
					</Card>
				)}

				{error && (
					<Card className="border-destructive/40">
						<CardContent className="py-6 text-destructive">
							{error instanceof Error
								? error.message
								: "Erro ao carregar detalhes."}
						</CardContent>
					</Card>
				)}

				{selectedEntity && category === "movies" && (
					<Card>
						<CardHeader>
							<CardTitle>Variantes do filme</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							{(selectedEntity as GroupedMovieDto).variants.map((variant) => (
								<Button
									key={variant.id}
									variant="outline"
									onClick={() => openVariant(variant)}
									className="justify-start"
								>
									{variant.rawTitle}
								</Button>
							))}
						</CardContent>
					</Card>
				)}

				{selectedEntity && category === "channels" && (
					<Card>
						<CardHeader>
							<CardTitle>Qualidades do canal</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							{startWatchMutation.error instanceof Error ? (
								<p className="text-sm text-destructive">
									{startWatchMutation.error.message}
								</p>
							) : null}
							{(selectedEntity as GroupedChannelDto).variants.map((variant) => {
								const isStarting =
									startWatchMutation.isPending &&
									startWatchMutation.variables?.id === variant.id;

								return (
									<Button
										key={variant.id}
										variant="outline"
										disabled={startWatchMutation.isPending}
										onClick={() => {
											void openVariant(variant);
										}}
										className="justify-start"
									>
										{isStarting
											? `Iniciando transmissão... ${variant.rawTitle}`
											: variant.rawTitle}
									</Button>
								);
							})}
						</CardContent>
					</Card>
				)}

				{selectedEntity && category === "series" && (
					<Card>
						<CardHeader>
							<CardTitle>Temporadas e episódios</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{(selectedEntity as GroupedSeriesDto).seasons.map((season) => (
								<div key={season.season} className="space-y-2">
									<Badge variant="secondary">Temporada {season.season}</Badge>
									<div className="flex flex-col gap-2">
										{season.episodes.map((episode) => (
											<Button
												key={episode.id}
												variant="outline"
												onClick={() => openEpisode(episode)}
												className="justify-start"
											>
												{episode.rawTitle}
											</Button>
										))}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</main>
		</div>
	);
}

export default function PreviewPage() {
	return (
		<Suspense
			fallback={
				<main className="mx-auto max-w-6xl p-6">
					<Card>
						<CardContent className="py-6">
							Carregando pré-visualização...
						</CardContent>
					</Card>
				</main>
			}
		>
			<PreviewContent />
		</Suspense>
	);
}

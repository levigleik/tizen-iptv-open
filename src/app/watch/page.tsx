"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useTvRemote } from "@/hooks/use-tv-remote";

function WatchContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const initializedUrlRef = useRef<string | null>(null);
	const retryCountRef = useRef(0);
	const [playbackError, setPlaybackError] = useState<string | null>(null);

	const title = searchParams.get("title") ?? "";
	const streamUrl = searchParams.get("streamUrl") ?? "";
	const groupTitle = searchParams.get("groupTitle") ?? "";
	const quality = searchParams.get("quality") ?? "";
	const isLegendado = searchParams.get("isLegendado") === "1";
	const fromPreview = searchParams.get("fromPreview") ?? "/preview";

	const qualityTags = useMemo(
		() =>
			quality
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean),
		[quality],
	);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !streamUrl) return;
		if (initializedUrlRef.current === streamUrl) return;

		initializedUrlRef.current = streamUrl;
		retryCountRef.current = 0;
		setPlaybackError(null);

		video.pause();
		video.removeAttribute("src");
		video.src = streamUrl;
		video.load();

		const tryPlay = () => {
			void video.play().catch(() => {});
		};

		const retrySource = () => {
			if (retryCountRef.current >= 2) {
				setPlaybackError("Falha ao reproduzir a transmissão ao vivo.");
				return;
			}

			retryCountRef.current += 1;
			video.pause();
			video.removeAttribute("src");
			video.src = streamUrl;
			video.load();
			tryPlay();
		};

		video.addEventListener("loadedmetadata", tryPlay);
		video.addEventListener("canplay", tryPlay);
		video.addEventListener("error", retrySource);
		video.addEventListener("stalled", retrySource);
		video.addEventListener("waiting", tryPlay);
		tryPlay();

		return () => {
			video.removeEventListener("loadedmetadata", tryPlay);
			video.removeEventListener("canplay", tryPlay);
			video.removeEventListener("error", retrySource);
			video.removeEventListener("stalled", retrySource);
			video.removeEventListener("waiting", tryPlay);
		};
	}, [streamUrl]);

	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action === "back") {
				router.push(fromPreview || "/preview");
				return;
			}

			if (action === "playPause") {
				const element = videoRef.current;
				if (!element) return;
				if (element.paused) {
					void element.play();
					return;
				}
				element.pause();
			}
		},
	});

	if (!title || !streamUrl) {
		return (
			<main className="mx-auto max-w-6xl p-6">
				<Card>
					<CardContent className="py-6">
						Conteúdo inválido. Volte para a pré-visualização.
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-10">
				<Card>
					<CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-2xl">Exibição do conteúdo</CardTitle>
							<CardDescription>{title}</CardDescription>
						</div>
						<Button
							variant="outline"
							onClick={() => router.push(fromPreview || "/preview")}
						>
							Voltar
						</Button>
					</CardHeader>
					<CardContent className="space-y-4">
						{playbackError ? (
							<div className="text-sm text-destructive">{playbackError}</div>
						) : null}
						<video
							ref={videoRef}
							className="aspect-video w-full rounded-lg bg-black"
							controls
							playsInline
							preload="metadata"
						/>

						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">
								Grupo: {groupTitle || "Sem grupo"}
							</Badge>
							<Badge variant={isLegendado ? "default" : "secondary"}>
								{isLegendado ? "Legendado" : "Sem marcador [L]"}
							</Badge>
							{qualityTags.length > 0 ? (
								qualityTags.map((tag) => <Badge key={tag}>{tag}</Badge>)
							) : (
								<Badge variant="secondary">Qualidade não informada</Badge>
							)}
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	);
}

export default function WatchPage() {
	return (
		<Suspense
			fallback={
				<main className="mx-auto max-w-6xl p-6">
					<Card>
						<CardContent className="py-6">Carregando conteúdo...</CardContent>
					</Card>
				</main>
			}
		>
			<WatchContent />
		</Suspense>
	);
}

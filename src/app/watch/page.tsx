"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef } from "react";

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
						<video
							ref={videoRef}
							src={streamUrl}
							className="aspect-video w-full rounded-lg bg-black"
							controls
							autoPlay
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

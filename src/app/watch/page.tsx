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
import { fetchRecents, touchRecent, updateRecentProgress } from "@/lib/iptv";
import { resolveMacAddress } from "@/lib/tizen";

function WatchContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const initializedUrlRef = useRef<string | null>(null);
	const retryCountRef = useRef(0);
	const lastProgressRef = useRef(0);
	const hasAppliedRestoreRef = useRef(false);
	const sessionPlayStartedAtRef = useRef<number | null>(null);
	const lastPersistAtRef = useRef<number | null>(null);
	const isPersistingRef = useRef(false);
	const flushProgressRef = useRef<((force?: boolean) => void) | null>(null);
	const recentsRequestIdRef = useRef(0);
	const [playbackError, setPlaybackError] = useState<string | null>(null);
	const [initialProgressSeconds, setInitialProgressSeconds] =
		useState<number>(0);
	const [isRecentReady, setIsRecentReady] = useState(false);
	const [videoResolution, setVideoResolution] = useState<string | null>(null);

	const title = searchParams.get("title") ?? "";
	const streamUrl = searchParams.get("streamUrl") ?? "";
	const groupTitle = searchParams.get("groupTitle") ?? "";
	const quality = searchParams.get("quality") ?? "";
	const isLegendado = searchParams.get("isLegendado") === "1";
	const fromPreview = searchParams.get("fromPreview") ?? "/preview";
	const startFromBeginning = searchParams.get("resume") === "0";
	const macParam = searchParams.get("mac") ?? "";
	const entryIdParam = searchParams.get("entryId") ?? "";
	const entryId = Number(entryIdParam);
	const canTrackRecent = Number.isFinite(entryId) && entryId > 0;
	const mac = useMemo(
		() => (macParam.trim() ? macParam : resolveMacAddress()),
		[macParam],
	);

	const qualityTags = useMemo(
		() =>
			quality
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean),
		[quality],
	);

	useEffect(() => {
		const requestId = recentsRequestIdRef.current + 1;
		recentsRequestIdRef.current = requestId;

		if (!canTrackRecent) {
			setInitialProgressSeconds(0);
			setIsRecentReady(true);
			return;
		}

		const controller = new AbortController();
		setIsRecentReady(false);

		const loadAndTouchRecent = async () => {
			try {
				let restored = 0;

				if (!startFromBeginning) {
					const recents = await fetchRecents(mac, 50, controller.signal);
					const existing = recents.find((item) => {
						const itemEntryId = item.m3uEntryId ?? item.entryId;
						return itemEntryId === entryId;
					});
					restored = Math.max(0, Math.floor(existing?.progressSeconds ?? 0));
				}

				if (recentsRequestIdRef.current !== requestId) {
					return;
				}

				setInitialProgressSeconds(restored);
				lastProgressRef.current = restored;
				hasAppliedRestoreRef.current = false;
				await touchRecent(mac, entryId, undefined, controller.signal);
			} catch {
				// silencioso: não bloqueia playback se o endpoint de recents falhar
				if (!controller.signal.aborted) {
				}
			} finally {
				if (recentsRequestIdRef.current !== requestId) {
					return;
				}

				setIsRecentReady(true);
			}
		};

		void loadAndTouchRecent();

		return () => {
			controller.abort();
		};
	}, [canTrackRecent, entryId, mac, startFromBeginning]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !streamUrl) return;
		if (initializedUrlRef.current === streamUrl) return;

		initializedUrlRef.current = streamUrl;
		retryCountRef.current = 0;
		hasAppliedRestoreRef.current = false;
		sessionPlayStartedAtRef.current = null;
		lastPersistAtRef.current = null;
		isPersistingRef.current = false;
		setVideoResolution(null);
		setPlaybackError(null);

		video.pause();
		video.removeAttribute("src");
		video.src = streamUrl;
		video.load();

		const tryPlay = () => {
			void video.play().catch(() => {});
		};

		const markPlayingStart = () => {
			if (sessionPlayStartedAtRef.current === null) {
				sessionPlayStartedAtRef.current = Date.now();
			}
		};

		const captureResolution = () => {
			if (video.videoWidth > 0 && video.videoHeight > 0) {
				setVideoResolution(`${video.videoWidth}x${video.videoHeight}`);
			}
		};

		video.addEventListener("timeupdate", captureResolution);

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
		video.addEventListener("loadedmetadata", captureResolution);
		video.addEventListener("canplay", tryPlay);
		video.addEventListener("canplay", captureResolution);
		video.addEventListener("playing", markPlayingStart);
		video.addEventListener("playing", captureResolution);
		video.addEventListener("error", retrySource);
		video.addEventListener("stalled", retrySource);
		video.addEventListener("waiting", tryPlay);
		video.addEventListener("timeupdate", captureResolution);
		tryPlay();

		return () => {
			video.removeEventListener("loadedmetadata", tryPlay);
			video.removeEventListener("loadedmetadata", captureResolution);
			video.removeEventListener("canplay", tryPlay);
			video.removeEventListener("canplay", captureResolution);
			video.removeEventListener("playing", markPlayingStart);
			video.removeEventListener("playing", captureResolution);
			video.removeEventListener("error", retrySource);
			video.removeEventListener("stalled", retrySource);
			video.removeEventListener("waiting", tryPlay);
			video.removeEventListener("timeupdate", captureResolution);
		};
	}, [streamUrl]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !canTrackRecent || !isRecentReady) return;
		if (hasAppliedRestoreRef.current) return;

		if (
			!Number.isFinite(initialProgressSeconds) ||
			initialProgressSeconds <= 0
		) {
			return;
		}

		let attempts = 0;
		let intervalId: number | null = null;

		const applyRestoreProgress = () => {
			if (hasAppliedRestoreRef.current) return;
			attempts += 1;

			const duration = Number.isFinite(video.duration)
				? video.duration
				: Infinity;
			const safeTarget = Math.min(
				initialProgressSeconds,
				Math.max(0, duration - 3),
			);

			if (safeTarget > 0) {
				if (video.currentTime < safeTarget - 1) {
					video.currentTime = safeTarget;
				}

				const restored = Math.abs(video.currentTime - safeTarget) <= 2;
				if (restored || attempts >= 12) {
					lastProgressRef.current = Math.floor(
						restored ? video.currentTime : safeTarget,
					);
					hasAppliedRestoreRef.current = true;
					if (intervalId !== null) {
						window.clearInterval(intervalId);
					}
				}
			} else {
				hasAppliedRestoreRef.current = true;
				if (intervalId !== null) {
					window.clearInterval(intervalId);
				}
			}
		};

		const applyWithDelay = () => {
			window.setTimeout(() => {
				applyRestoreProgress();
			}, 2500);
		};

		if (video.readyState >= 1) {
			applyWithDelay();
			intervalId = window.setInterval(() => {
				applyRestoreProgress();
			}, 500);
			return;
		}

		video.addEventListener("loadedmetadata", applyWithDelay);
		video.addEventListener("canplay", applyWithDelay);

		return () => {
			if (intervalId !== null) {
				window.clearInterval(intervalId);
			}
			video.removeEventListener("loadedmetadata", applyWithDelay);
			video.removeEventListener("canplay", applyWithDelay);
		};
	}, [canTrackRecent, initialProgressSeconds, isRecentReady]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !canTrackRecent) return;

		const flushProgress = (force = false) => {
			if (isPersistingRef.current) return;
			const current = Math.max(0, Math.floor(video.currentTime || 0));
			if (!Number.isFinite(current)) return;

			if (
				sessionPlayStartedAtRef.current === null &&
				video.currentTime > 0 &&
				!video.paused
			) {
				sessionPlayStartedAtRef.current = Date.now();
			}

			const startedAt = sessionPlayStartedAtRef.current;
			if (force && startedAt === null && current <= 0) {
				return;
			}

			if (!force && startedAt === null) return;

			const now = Date.now();
			if (!force) {
				const elapsedFromStart = now - (startedAt ?? now);
				if (elapsedFromStart < 60_000) return;

				if (lastPersistAtRef.current !== null) {
					const elapsedSinceLast = now - lastPersistAtRef.current;
					if (elapsedSinceLast < 60_000) return;
				}
			}

			const safeProgress = startFromBeginning
				? current
				: Math.max(current, initialProgressSeconds);

			isPersistingRef.current = true;
			lastProgressRef.current = safeProgress;
			void updateRecentProgress(mac, entryId, safeProgress)
				.then(() => {
					lastPersistAtRef.current = Date.now();
				})
				.catch(() => {})
				.finally(() => {
					isPersistingRef.current = false;
				});
		};

		const handlePauseOrEnded = () => {
			flushProgress(true);
		};

		const handleBeforeUnload = () => {
			flushProgress(true);
		};

		flushProgressRef.current = (force = false) => {
			flushProgress(force);
		};

		const interval = window.setInterval(() => {
			if (video.paused || video.ended) return;
			flushProgress(false);
		}, 5_000);

		video.addEventListener("pause", handlePauseOrEnded);
		video.addEventListener("ended", handlePauseOrEnded);
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.clearInterval(interval);
			video.removeEventListener("pause", handlePauseOrEnded);
			video.removeEventListener("ended", handlePauseOrEnded);
			window.removeEventListener("beforeunload", handleBeforeUnload);
			flushProgress(true);
			flushProgressRef.current = null;
		};
	}, [
		canTrackRecent,
		entryId,
		initialProgressSeconds,
		mac,
		startFromBeginning,
	]);

	const handleGoBack = () => {
		flushProgressRef.current?.(true);
		router.push(fromPreview || "/preview");
	};

	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action === "back") {
				handleGoBack();
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
						<Button variant="outline" onClick={handleGoBack}>
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
							) : videoResolution ? (
								<Badge variant="secondary">{videoResolution}</Badge>
							) : (
								<Badge variant="secondary">Qualidade não informada</Badge>
							)}
							<Badge variant="outline">
								<a
									href={streamUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="underline"
								>
									{streamUrl}
								</a>
							</Badge>
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

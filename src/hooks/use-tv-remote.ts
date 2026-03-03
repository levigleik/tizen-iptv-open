"use client";

import { useEffect } from "react";

import { registerTizenKeys } from "@/lib/tizen";
import { getRemoteAction, type TvRemoteAction } from "@/lib/tv-remote";

interface UseTvRemoteOptions {
	enabled?: boolean;
	onAction: (action: TvRemoteAction, event: KeyboardEvent) => void;
}

export function useTvRemote({
	enabled = true,
	onAction,
}: UseTvRemoteOptions): void {
	useEffect(() => {
		if (!enabled) return;

		registerTizenKeys();

		const handler = (event: KeyboardEvent) => {
			const action = getRemoteAction(event);
			if (!action) return;

			event.preventDefault();
			onAction(action, event);
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [enabled, onAction]);
}

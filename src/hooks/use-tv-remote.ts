"use client";

import { useEffect } from "react";

import { registerTizenKeys } from "@/lib/tizen";
import { getRemoteAction, type TvRemoteAction } from "@/lib/tv-remote";

interface UseTvRemoteOptions {
	enabled?: boolean;
	capture?: boolean;
	preventDefault?: boolean;
	onAction: (action: TvRemoteAction, event: KeyboardEvent) => void | boolean;
}

export function useTvRemote({
	enabled = true,
	capture = true,
	preventDefault = true,
	onAction,
}: UseTvRemoteOptions): void {
	useEffect(() => {
		if (!enabled) return;

		registerTizenKeys();

		const handler = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;

			const action = getRemoteAction(event);
			if (!action) return;

			const handled = onAction(action, event);
			if (preventDefault && handled !== false) {
				event.preventDefault();
			}
		};

		window.addEventListener("keydown", handler, { capture });
		return () =>
			window.removeEventListener("keydown", handler, {
				capture,
			});
	}, [capture, enabled, onAction, preventDefault]);
}

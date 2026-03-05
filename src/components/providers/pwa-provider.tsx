"use client";

import { useEffect } from "react";

interface PwaProviderProps {
	children: React.ReactNode;
}

export function PwaProvider({ children }: PwaProviderProps) {
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!("serviceWorker" in navigator)) return;

		const isSecureContext =
			window.location.protocol === "https:" ||
			window.location.hostname === "localhost";
		if (!isSecureContext) return;

		const register = async () => {
			try {
				await navigator.serviceWorker.register("/sw.js", {
					scope: "/",
					updateViaCache: "none",
				});
			} catch {
				// Silent fail: app remains fully functional without SW.
			}
		};

		void register();
	}, []);

	return children;
}

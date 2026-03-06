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

		let hasReloadedForNewSw = false;

		const forceActivateAndReload = (
			registration: ServiceWorkerRegistration,
		) => {
			if (!registration.waiting) return;
			registration.waiting.postMessage({ type: "SKIP_WAITING" });
		};

		const register = async () => {
			try {
				const registration = await navigator.serviceWorker.register("/sw.js", {
					scope: "/",
					updateViaCache: "none",
				});

				forceActivateAndReload(registration);

				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (!newWorker) return;

					newWorker.addEventListener("statechange", () => {
						if (
							newWorker.state === "installed" &&
							navigator.serviceWorker.controller
						) {
							forceActivateAndReload(registration);
						}
					});
				});

				const onControllerChange = () => {
					if (hasReloadedForNewSw) return;
					hasReloadedForNewSw = true;
					window.location.reload();
				};

				navigator.serviceWorker.addEventListener(
					"controllerchange",
					onControllerChange,
				);

				const checkForUpdates = () => {
					void registration.update();
				};

				checkForUpdates();
				document.addEventListener("visibilitychange", checkForUpdates);

				return () => {
					navigator.serviceWorker.removeEventListener(
						"controllerchange",
						onControllerChange,
					);
					document.removeEventListener("visibilitychange", checkForUpdates);
				};
			} catch {
				// Silent fail: app remains fully functional without SW.
			}

			return undefined;
		};

		let cleanup: (() => void) | undefined;
		void register().then((teardown) => {
			cleanup = teardown;
		});

		return () => {
			cleanup?.();
		};
	}, []);

	return children;
}

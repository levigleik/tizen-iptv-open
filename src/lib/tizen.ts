import { normalizeMac } from "@/lib/iptv";
import { useAppSettingsStore } from "@/lib/settings-store";

interface TizenTvInputDevice {
	registerKey: (keyName: string) => void;
	registerKeyBatch?: (keyNames: string[]) => void;
}

interface TizenWindow {
	tvinputdevice?: TizenTvInputDevice;
}

interface WebapisWindow {
	network?: {
		getMac: () => string;
	};
}

declare global {
	interface Window {
		tizen?: TizenWindow;
		webapis?: WebapisWindow;
	}
}

const TIZEN_EXTRA_KEYS = [
	"ColorF0Red",
	"ColorF1Green",
	"ColorF2Yellow",
	"ColorF3Blue",
	"MediaPlayPause",
	"MediaPlay",
	"MediaPause",
	"MediaStop",
	"Return",
	"Exit",
];

const STORAGE_KEY = "iptv.mac";

export function registerTizenKeys(): void {
	if (typeof window === "undefined") return;
	const device = window.tizen?.tvinputdevice;
	if (!device) return;

	try {
		if (device.registerKeyBatch) {
			device.registerKeyBatch(TIZEN_EXTRA_KEYS);
			return;
		}

		for (const key of TIZEN_EXTRA_KEYS) {
			device.registerKey(key);
		}
	} catch {
		// ignora falhas de registro em ambientes não-Tizen
	}
}

export function getMacFromTizenApi(): string | null {
	if (typeof window === "undefined") return null;

	try {
		const mac = window.webapis?.network?.getMac?.();
		if (!mac) return null;
		return normalizeMac(mac);
	} catch {
		return null;
	}
}

export function resolveMacAddress(): string {
	if (typeof window === "undefined") {
		return normalizeMac(process.env.NEXT_PUBLIC_IPTV_FALLBACK_MAC ?? "");
	}

	// 1. Manual MAC (Zustand store -> LocalStorage persist)
	const manualMac = useAppSettingsStore.getState().manualMac;
	if (manualMac && manualMac.trim().length >= 12) {
		return normalizeMac(manualMac);
	}

	// 2. Query Parameter
	const params = new URLSearchParams(window.location.search);
	const queryMac = params.get("mac");
	if (queryMac) {
		const normalized = normalizeMac(queryMac);
		window.localStorage.setItem(STORAGE_KEY, normalized);
		return normalized;
	}

	// 3. Tizen Native API
	const tizenMac = getMacFromTizenApi();
	if (tizenMac) {
		window.localStorage.setItem(STORAGE_KEY, tizenMac);
		return tizenMac;
	}

	// 4. Fallback for stored value
	const storedMac = window.localStorage.getItem(STORAGE_KEY);
	if (storedMac) {
		return normalizeMac(storedMac);
	}

	// 5. Env fallback
	const fallbackMac = normalizeMac(
		process.env.NEXT_PUBLIC_IPTV_FALLBACK_MAC ?? "",
	);
	window.localStorage.setItem(STORAGE_KEY, fallbackMac);
	return fallbackMac;
}

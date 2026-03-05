import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppTheme = "dark" | "light";

type AppSettingsState = {
	adult: boolean;
	theme: AppTheme;
	manualMac: string;
	setAdult: (adult: boolean) => void;
	setTheme: (theme: AppTheme) => void;
	setManualMac: (mac: string) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
	persist(
		(set) => ({
			adult: false,
			theme: "dark",
			manualMac: "",
			setAdult: (adult) => set({ adult }),
			setTheme: (theme) => set({ theme }),
			setManualMac: (manualMac) => set({ manualMac }),
		}),
		{
			name: "app-settings",
			storage: createJSONStorage(() => localStorage),
		},
	),
);

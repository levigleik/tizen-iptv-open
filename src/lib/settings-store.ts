import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppTheme = "dark" | "light";

type AppSettingsState = {
	adult: boolean;
	theme: AppTheme;
	setAdult: (adult: boolean) => void;
	setTheme: (theme: AppTheme) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
	persist(
		(set) => ({
			adult: false,
			theme: "dark",
			setAdult: (adult) => set({ adult }),
			setTheme: (theme) => set({ theme }),
		}),
		{
			name: "app-settings",
			storage: createJSONStorage(() => localStorage),
		},
	),
);

"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { useAppSettingsStore } from "@/lib/settings-store";

export function SettingsSync() {
	const { resolvedTheme, setTheme } = useTheme();
	const theme = useAppSettingsStore((state) => state.theme);

	useEffect(() => {
		if (resolvedTheme !== theme) {
			setTheme(theme);
		}
	}, [resolvedTheme, setTheme, theme]);

	return null;
}

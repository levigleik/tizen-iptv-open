"use client";

import { useTheme } from "next-themes";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { AppTheme } from "@/lib/settings-store";
import { useAppSettingsStore } from "@/lib/settings-store";

export default function SettingsPage() {
	const { setTheme: applyTheme } = useTheme();
	const adult = useAppSettingsStore((state) => state.adult);
	const theme = useAppSettingsStore((state) => state.theme);
	const setAdult = useAppSettingsStore((state) => state.setAdult);
	const setTheme = useAppSettingsStore((state) => state.setTheme);

	const handleThemeChange = (nextTheme: AppTheme) => {
		setTheme(nextTheme);
		applyTheme(nextTheme);
	};

	return (
		<LayoutShell activeSidebarItem="settings">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center px-6 z-10 sticky top-0">
					<h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					<div className="mx-auto w-full max-w-3xl space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Conteúdo Adulto</CardTitle>
								<CardDescription>
									Controla o parâmetro global <strong>adult</strong> enviado ao
									backend em todas as consultas de catálogo.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<label className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
									<div>
										<p className="text-sm font-medium">
											Mostrar conteúdo adulto
										</p>
										<p className="text-xs text-muted-foreground">
											Desativado por padrão (`adult=false`).
										</p>
									</div>
									<Switch checked={adult} onCheckedChange={setAdult} />
								</label>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Tema</CardTitle>
								<CardDescription>
									Tema global usando o padrão dark/light do shadcn.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex items-center gap-3">
								<Button
									onClick={() => handleThemeChange("dark")}
									variant={theme === "dark" ? "default" : "outline"}
								>
									Dark
								</Button>
								<Button
									onClick={() => handleThemeChange("light")}
									variant={theme === "light" ? "default" : "outline"}
								>
									Light
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}

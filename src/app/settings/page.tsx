"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LayoutShell } from "@/components/iptv/layout-shell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
	getEpgUpdateStatus,
	getPlaylistUpdateStatus,
	updateEpg,
	updatePlaylist,
} from "@/lib/iptv";
import type { AppTheme } from "@/lib/settings-store";
import { useAppSettingsStore } from "@/lib/settings-store";
import { resolveMacAddress } from "@/lib/tizen";

export default function SettingsPage() {
	const { setTheme: applyTheme } = useTheme();
	const adult = useAppSettingsStore((state) => state.adult);
	const theme = useAppSettingsStore((state) => state.theme);
	const manualMac = useAppSettingsStore((state) => state.manualMac);
	const setAdult = useAppSettingsStore((state) => state.setAdult);
	const setTheme = useAppSettingsStore((state) => state.setTheme);
	const setManualMac = useAppSettingsStore((state) => state.setManualMac);

	const [isUpdatingPlaylist, setIsUpdatingPlaylist] = useState(false);
	const [isUpdatingEpg, setIsUpdatingEpg] = useState(false);
	const [playlistToastId, setPlaylistToastId] = useState<
		string | number | undefined
	>();
	const [epgToastId, setEpgToastId] = useState<string | number | undefined>();

	// Polling para status da Playlist
	const playlistStatus = useQuery({
		queryKey: ["playlist-update-status"],
		queryFn: getPlaylistUpdateStatus,
		enabled: isUpdatingPlaylist,
		refetchInterval: (query) => {
			const data = query.state.data;
			// Só encerra se estiver explicitamente completado E se o tempo atual for maior que o tempo inicial
			// (Aqui assumimos que se o job não estiver rodando logo de cara, ele ainda vai começar)
			if (data && !data.running && data.queueState === "completed") {
				return false;
			}
			return 1000;
		},
	});

	// Efeito para finalizar Playlist e mostrar Toast (apenas uma vez)
	useEffect(() => {
		if (
			isUpdatingPlaylist &&
			playlistStatus.data &&
			!playlistStatus.data.running &&
			playlistStatus.data.queueState === "completed" &&
			// Garante que o polling já rodou pelo menos uma vez e detectou o job em execução ou o toast inicial já foi disparado
			playlistStatus.dataUpdatedAt > Date.now() - 2000
		) {
			setIsUpdatingPlaylist(false);
			toast.success("Sync da Playlist concluído!", {
				description: "O catálogo foi atualizado com sucesso.",
				id: playlistToastId,
			});
			setPlaylistToastId(undefined);
		}
	}, [
		isUpdatingPlaylist,
		playlistStatus.data,
		playlistStatus.dataUpdatedAt,
		playlistToastId,
	]);

	// Polling para status do EPG
	const epgStatus = useQuery({
		queryKey: ["epg-update-status"],
		queryFn: getEpgUpdateStatus,
		enabled: isUpdatingEpg,
		refetchInterval: (query) => {
			const data = query.state.data;
			if (data && !data.running && data.queueState === "completed") {
				return false;
			}
			return 1000;
		},
	});

	// Efeito para finalizar EPG e mostrar Toast (apenas uma vez)
	useEffect(() => {
		if (
			isUpdatingEpg &&
			epgStatus.data &&
			!epgStatus.data.running &&
			epgStatus.data.queueState === "completed" &&
			epgStatus.dataUpdatedAt > Date.now() - 2000
		) {
			setIsUpdatingEpg(false);
			toast.success("Sync do EPG concluído!", {
				description: "A grade de programação foi atualizada.",
				id: epgToastId,
			});
			setEpgToastId(undefined);
		}
	}, [isUpdatingEpg, epgStatus.data, epgStatus.dataUpdatedAt, epgToastId]);

	const handleThemeChange = (nextTheme: AppTheme) => {
		setTheme(nextTheme);
		applyTheme(nextTheme);
	};

	const handleUpdatePlaylist = async () => {
		const mac = resolveMacAddress();
		setIsUpdatingPlaylist(true);

		const tId = toast.loading("Iniciando sincronização da playlist...");
		setPlaylistToastId(tId);
		try {
			const data = await updatePlaylist(mac);
			toast.info("Playlist enfileirada", {
				id: tId,
				description: data.message,
			});
		} catch (_error) {
			toast.error("Erro ao iniciar atualização.", { id: tId });
			setIsUpdatingPlaylist(false);
		}
	};

	const handleUpdateEpg = async () => {
		const mac = resolveMacAddress();
		setIsUpdatingEpg(true);

		const tId = toast.loading("Iniciando sincronização do EPG...");
		setEpgToastId(tId);

		try {
			const data = await updateEpg(mac);
			toast.info("EPG enfileirado", {
				id: tId,
				description: data.message,
			});
		} catch (_error) {
			toast.error("Erro ao iniciar atualização.", { id: tId });
			setIsUpdatingEpg(false);
		}
	};

	return (
		<LayoutShell activeSidebarItem="settings">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center px-6 z-10 sticky top-0">
					<h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
				</header>

				<div className="flex-1 overflow-y-auto p-6 scroll-smooth">
					<div className="mx-auto w-full max-w-3xl space-y-6 pb-20">
						<Card>
							<CardHeader>
								<CardTitle>Identificação (MAC)</CardTitle>
								<CardDescription>
									Define o endereço MAC usado para identificar sua conta no
									backend. Se vazio, o sistema tentará detectar automaticamente.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<p className="text-sm font-medium">MAC Manual</p>
									<Input
										placeholder="00:11:22:33:44:55"
										value={manualMac}
										onChange={(e) => setManualMac(e.target.value)}
										className="font-mono"
									/>
									<p className="text-xs text-muted-foreground uppercase">
										MAC Atual em uso:{" "}
										<span className="font-mono font-bold text-primary">
											{resolveMacAddress()}
										</span>
									</p>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Sincronização</CardTitle>
								<CardDescription>
									Força a atualização dos dados do servidor para o seu MAC.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="space-y-4">
									<div className="flex flex-wrap gap-4">
										<Button
											variant="outline"
											onClick={handleUpdatePlaylist}
											disabled={isUpdatingPlaylist}
											className="gap-2"
										>
											<RefreshCw
												className={`h-4 w-4 ${isUpdatingPlaylist ? "animate-spin" : ""}`}
											/>
											Otimizar Playlist (Sync)
										</Button>
										<Button
											variant="outline"
											onClick={handleUpdateEpg}
											disabled={isUpdatingEpg}
											className="gap-2"
										>
											<RefreshCw
												className={`h-4 w-4 ${isUpdatingEpg ? "animate-spin" : ""}`}
											/>
											Atualizar EPG
										</Button>
									</div>

									{playlistStatus.data?.running &&
										playlistStatus.data.progress && (
											<div className="space-y-1.5">
												<div className="flex justify-between text-xs">
													<span className="text-muted-foreground">
														Processando Playlist...
													</span>
													<span className="font-mono">
														{playlistStatus.data.progress.processedEntries} /{" "}
														{playlistStatus.data.progress.parsedEntries}
													</span>
												</div>
												<Progress
													value={
														(playlistStatus.data.progress.processedEntries /
															playlistStatus.data.progress.parsedEntries) *
														100
													}
													className="h-1"
												/>
											</div>
										)}

									{epgStatus.data?.running && epgStatus.data.progress && (
										<div className="space-y-1.5">
											<div className="flex justify-between text-xs">
												<span className="text-muted-foreground">
													Processando EPG...
												</span>
												<span className="font-mono">
													{epgStatus.data.progress.processedEntries} /{" "}
													{epgStatus.data.progress.parsedEntries}
												</span>
											</div>
											<Progress
												value={
													(epgStatus.data.progress.processedEntries /
														epgStatus.data.progress.parsedEntries) *
													100
												}
												className="h-1"
											/>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

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

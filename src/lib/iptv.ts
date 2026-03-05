import type {
	CatalogCategory,
	GroupedCategoryListDto,
	GroupedCategoryPageDto,
	GroupedChannelDto,
	GroupedMovieDto,
	GroupedSeriesDto,
} from "@/types/iptv";

const DEFAULT_API_BASE_URL = "/api";
const FALLBACK_UPSTREAM = "http://localhost:4000";

function getConfiguredApiBaseUrl(): string | null {
	const value = process.env.NEXT_PUBLIC_IPTV_API_BASE_URL?.trim();
	if (!value) return null;
	return value.replace(/\/$/, "");
}

export function normalizeMac(value: string): string {
	return value.replaceAll(":", "").trim().toUpperCase();
}

export function getApiBaseUrl(): string {
	const configured = getConfiguredApiBaseUrl();

	if (typeof window !== "undefined") {
		if (window.location.protocol === "https:" && configured?.startsWith("http://")) {
			return DEFAULT_API_BASE_URL;
		}
	}

	return configured ?? DEFAULT_API_BASE_URL;
}

export function buildMediaProxyUrl(mac: string, entryId: number): string {
	const cleanMac = normalizeMac(mac);
	return `${getApiBaseUrl()}/iptv/${cleanMac}/media/${entryId}`;
}

function buildGroupedCategoryUrl(
	mac: string,
	category: CatalogCategory,
	page: number,
	perPage: number,
	adult = false,
	search?: string,
	groupTitle?: string,
): string {
	const cleanMac = normalizeMac(mac);
	const params = new URLSearchParams({
		page: String(page),
		perPage: String(perPage),
	});

	if (search?.trim()) {
		params.set("search", search.trim());
	}

	if (groupTitle?.trim()) {
		params.set("groupTitle", groupTitle.trim());
	}

	params.set("adult", String(adult));

	return `${getApiBaseUrl()}/iptv/${cleanMac}/grouped/${category}?${params.toString()}`;
}

function buildGroupedCategoryListUrl(
	mac: string,
	category: CatalogCategory,
	adult = false,
): string {
	const cleanMac = normalizeMac(mac);
	const params = new URLSearchParams({
		adult: String(adult),
	});

	return `${getApiBaseUrl()}/iptv/${cleanMac}/grouped/${category}/category?${params.toString()}`;
}

function toAbsoluteApiUrl(url: string): string {
	if (/^https?:\/\//i.test(url)) {
		if (typeof window !== "undefined" && window.location.protocol === "https:") {
			const configured = getConfiguredApiBaseUrl() ?? FALLBACK_UPSTREAM;

			try {
				const upstream = new URL(configured);
				const target = new URL(url);

				if (target.origin === upstream.origin) {
					return `${DEFAULT_API_BASE_URL}${target.pathname}${target.search}`;
				}
			} catch {
				// If URL parsing fails, keep original URL.
			}
		}

		return url;
	}

	const base = getApiBaseUrl().replace(/\/$/, "");
	const path = url.startsWith("/") ? url : `/${url}`;
	return `${base}${path}`;
}

interface StartChannelWatchResponse {
	playlistUrl: string;
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function waitForPlaylistReady(
	playlistUrl: string,
	signal?: AbortSignal,
): Promise<void> {
	const attempts = 6;
	let delay = 250;

	for (let attempt = 0; attempt < attempts; attempt += 1) {
		if (signal?.aborted) {
			throw new DOMException("Operação cancelada", "AbortError");
		}

		const response = await fetch(playlistUrl, {
			method: "GET",
			headers: {
				Accept: "application/vnd.apple.mpegurl,text/plain,*/*",
			},
			cache: "no-store",
			signal,
		});

		if (response.ok) {
			const manifest = await response.text();
			if (manifest.includes("#EXTM3U") && manifest.includes("#EXTINF:")) {
				return;
			}
		}

		if (attempt < attempts - 1) {
			await wait(delay);
			delay *= 2;
		}
	}

	throw new Error("Transmissão ainda não ficou pronta. Tente novamente.");
}

export async function fetchGroupedCategoryPage(
	mac: string,
	category: CatalogCategory,
	page: number,
	perPage: number,
	adult = false,
	search?: string,
	groupTitle?: string,
	signal?: AbortSignal,
): Promise<
	GroupedCategoryPageDto<GroupedMovieDto | GroupedSeriesDto | GroupedChannelDto>
> {
	const response = await fetch(
		buildGroupedCategoryUrl(
			mac,
			category,
			page,
			perPage,
			adult,
			search,
			groupTitle,
		),
		{
			headers: {
				Accept: "application/json",
			},
			signal,
			cache: "no-store",
		},
	);

	if (!response.ok) {
		throw new Error(
			`Falha ao carregar ${category} (${response.status} ${response.statusText})`,
		);
	}

	return (await response.json()) as GroupedCategoryPageDto<
		GroupedMovieDto | GroupedSeriesDto | GroupedChannelDto
	>;
}

export async function fetchGroupedMoviesPage(
	mac: string,
	page: number,
	perPage: number,
	adult = false,
	search?: string,
	groupTitle?: string,
	signal?: AbortSignal,
): Promise<GroupedCategoryPageDto<GroupedMovieDto>> {
	const response = await fetch(
		buildGroupedCategoryUrl(
			mac,
			"movies",
			page,
			perPage,
			adult,
			search,
			groupTitle,
		),
		{
			headers: {
				Accept: "application/json",
			},
			signal,
			cache: "no-store",
		},
	);

	if (!response.ok) {
		throw new Error(
			`Falha ao carregar filmes (${response.status} ${response.statusText})`,
		);
	}

	return (await response.json()) as GroupedCategoryPageDto<GroupedMovieDto>;
}

export async function fetchGroupedSeriesPage(
	mac: string,
	page: number,
	perPage: number,
	adult = false,
	search?: string,
	groupTitle?: string,
	signal?: AbortSignal,
): Promise<GroupedCategoryPageDto<GroupedSeriesDto>> {
	const response = await fetch(
		buildGroupedCategoryUrl(
			mac,
			"series",
			page,
			perPage,
			adult,
			search,
			groupTitle,
		),
		{
			headers: {
				Accept: "application/json",
			},
			signal,
			cache: "no-store",
		},
	);

	if (!response.ok) {
		throw new Error(
			`Falha ao carregar séries (${response.status} ${response.statusText})`,
		);
	}

	return (await response.json()) as GroupedCategoryPageDto<GroupedSeriesDto>;
}

export async function fetchGroupedChannelsPage(
	mac: string,
	page: number,
	perPage: number,
	adult = false,
	search?: string,
	groupTitle?: string,
	signal?: AbortSignal,
): Promise<GroupedCategoryPageDto<GroupedChannelDto>> {
	const response = await fetch(
		buildGroupedCategoryUrl(
			mac,
			"channels",
			page,
			perPage,
			adult,
			search,
			groupTitle,
		),
		{
			headers: {
				Accept: "application/json",
			},
			signal,
			cache: "no-store",
		},
	);

	if (!response.ok) {
		throw new Error(
			`Falha ao carregar canais (${response.status} ${response.statusText})`,
		);
	}

	return (await response.json()) as GroupedCategoryPageDto<GroupedChannelDto>;
}

export async function fetchGroupedCategoryList(
	mac: string,
	category: CatalogCategory,
	adult = false,
	signal?: AbortSignal,
): Promise<GroupedCategoryListDto> {
	const response = await fetch(
		buildGroupedCategoryListUrl(mac, category, adult),
		{
			headers: {
				Accept: "application/json",
			},
			signal,
			cache: "no-store",
		},
	);

	if (!response.ok) {
		throw new Error(
			`Falha ao carregar categorias de ${category} (${response.status} ${response.statusText})`,
		);
	}

	return (await response.json()) as GroupedCategoryListDto;
}

export async function startChannelWatchSession(
	mac: string,
	entryId: number,
	signal?: AbortSignal,
): Promise<string> {
	const cleanMac = normalizeMac(mac);
	const response = await fetch(
		`${getApiBaseUrl()}/iptv/${cleanMac}/channels/${entryId}/watch`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
			},
			signal,
			cache: "no-store",
		},
	);

	if (!response.ok) {
		throw new Error(
			`Falha ao iniciar canal ao vivo (${response.status} ${response.statusText})`,
		);
	}

	const payload = (await response.json()) as StartChannelWatchResponse;
	if (!payload?.playlistUrl) {
		throw new Error("Backend não retornou playlist HLS para o canal.");
	}

	const playlistUrl = toAbsoluteApiUrl(payload.playlistUrl);
	await waitForPlaylistReady(playlistUrl, signal);

	console.log("Playlist pronta:", playlistUrl);
	return playlistUrl;
}

export type UpdateResponse = {
	accepted: boolean;
	jobId: string;
	status: string;
	message: string;
};

export type UpdateStatusResponse = {
	running: boolean;
	jobId: string;
	queueState: string;
	startedAt: string | null;
	finishedAt: string | null;
	lastSuccessAt: string | null;
	lastError: string | null;
	progress?: {
		stage: string;
		parsedEntries: number;
		newEntries: number;
		processedEntries: number;
	};
};

export type M3uEntrySummaryDto = {
	id?: number;
	streamType?: string;
	type?: string;
	title?: string;
	rawTitle?: string;
	groupTitle?: string;
	tvgLogo?: string | null;
};

export type RecentEntryDto = {
	id?: number;
	mac?: string;
	m3uEntryId?: number;
	entryId?: number;
	streamType?: string;
	type?: string;
	progressSeconds: number;
	updatedAt?: string;
	createdAt?: string;
	m3uEntry?: M3uEntrySummaryDto;
};

export type FavoriteEntryDto = {
	id: number;
	mac: string;
	m3uEntryId: number;
	streamType?: string;
	type?: string;
	createdAt?: string;
	m3uEntry?: M3uEntrySummaryDto;
};

export async function updatePlaylist(mac: string): Promise<UpdateResponse> {
	const response = await fetch(`${getApiBaseUrl()}/iptv/${mac}/update`, {
		method: "POST",
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error("Falha ao atualizar playlist");
	}

	return (await response.json()) as UpdateResponse;
}

export async function updateEpg(mac: string): Promise<UpdateResponse> {
	const response = await fetch(`${getApiBaseUrl()}/iptv/${mac}/epg/update`, {
		method: "POST",
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error("Falha ao atualizar EPG");
	}

	return (await response.json()) as UpdateResponse;
}

export async function getPlaylistUpdateStatus(): Promise<UpdateStatusResponse> {
	const response = await fetch(`${getApiBaseUrl()}/iptv/update/status`, {
		headers: { Accept: "application/json" },
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error("Falha ao buscar status da playlist");
	}

	return (await response.json()) as UpdateStatusResponse;
}

export async function getEpgUpdateStatus(): Promise<UpdateStatusResponse> {
	const response = await fetch(`${getApiBaseUrl()}/iptv/epg/update/status`, {
		headers: { Accept: "application/json" },
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error("Falha ao buscar status do EPG");
	}

	return (await response.json()) as UpdateStatusResponse;
}

export async function fetchRecents(
	mac: string,
	limit = 50,
	signal?: AbortSignal,
	types?: string[],
): Promise<RecentEntryDto[]> {
	const cleanMac = normalizeMac(mac);
	const params = new URLSearchParams({ limit: String(limit) });

	if (types?.length) {
		params.set("type", types.join(","));
	}

	const response = await fetch(
		`${getApiBaseUrl()}/iptv/${cleanMac}/recents?${params.toString()}`,
		{
			headers: { Accept: "application/json" },
			cache: "no-store",
			signal,
		},
	);

	if (!response.ok) {
		throw new Error("Falha ao buscar recentes");
	}

	return (await response.json()) as RecentEntryDto[];
}

export async function fetchFavorites(
	mac: string,
	limit = 50,
	signal?: AbortSignal,
	types?: string[],
): Promise<FavoriteEntryDto[]> {
	const cleanMac = normalizeMac(mac);
	const params = new URLSearchParams({ limit: String(limit) });

	if (types?.length) {
		params.set("type", types.join(","));
	}

	const response = await fetch(
		`${getApiBaseUrl()}/iptv/${cleanMac}/favorites?${params.toString()}`,
		{
			headers: { Accept: "application/json" },
			cache: "no-store",
			signal,
		},
	);

	if (!response.ok) {
		throw new Error("Falha ao buscar favoritos");
	}

	return (await response.json()) as FavoriteEntryDto[];
}

export async function touchRecent(
	mac: string,
	entryId: number,
	progressSeconds?: number,
	signal?: AbortSignal,
): Promise<RecentEntryDto> {
	const cleanMac = normalizeMac(mac);
	const response = await fetch(
		`${getApiBaseUrl()}/iptv/${cleanMac}/recents/${entryId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			cache: "no-store",
			signal,
			body:
				typeof progressSeconds === "number"
					? JSON.stringify({
							progressSeconds: Math.max(0, Math.floor(progressSeconds)),
						})
					: undefined,
		},
	);

	if (!response.ok) {
		throw new Error("Falha ao registrar recente");
	}

	return (await response.json()) as RecentEntryDto;
}

export async function updateRecentProgress(
	mac: string,
	entryId: number,
	progressSeconds: number,
	signal?: AbortSignal,
): Promise<RecentEntryDto> {
	const cleanMac = normalizeMac(mac);
	const response = await fetch(
		`${getApiBaseUrl()}/iptv/${cleanMac}/recents/${entryId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			cache: "no-store",
			signal,
			body: JSON.stringify({
				progressSeconds: Math.max(0, Math.floor(progressSeconds)),
			}),
		},
	);

	if (!response.ok) {
		throw new Error("Falha ao atualizar progresso em recentes");
	}

	return (await response.json()) as RecentEntryDto;
}

import type {
	CatalogCategory,
	GroupedCategoryListDto,
	GroupedCategoryPageDto,
	GroupedChannelDto,
	GroupedMovieDto,
	GroupedSeriesDto,
} from "@/types/iptv";

const DEFAULT_API_BASE_URL = "http://localhost:4000";

export function normalizeMac(value: string): string {
	return value.replaceAll(":", "").trim().toUpperCase();
}

export function getApiBaseUrl(): string {
	return process.env.NEXT_PUBLIC_IPTV_API_BASE_URL ?? DEFAULT_API_BASE_URL;
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

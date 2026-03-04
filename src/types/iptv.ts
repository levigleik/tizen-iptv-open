export type CatalogCategory = "channels" | "series" | "movies";

export interface GroupedChannelEpgItemDto {
	channelId: string;
	channelDisplayName: string;
	channelIcon?: string | null;
	title: string;
	description?: string | null;
	startAt: string;
	stopAt: string;
	startTimestamp: string;
	stopTimestamp: string;
}

export interface GroupedEntryVariantDto {
	id: number;
	rawTitle: string;
	streamUrl: string;
	groupTitle: string;
	tvgLogo?: string | null;
	qualityTags: string[];
	isLegendado: boolean;
	epg?: GroupedChannelEpgItemDto[];
}

export interface GroupedMovieDto {
	title: string;
	variants: GroupedEntryVariantDto[];
}

export interface GroupedSeriesEpisodeDto {
	id: number;
	rawTitle: string;
	episode?: number;
	streamUrl: string;
	groupTitle: string;
	tvgLogo?: string | null;
}

export interface GroupedSeriesSeasonDto {
	season: number;
	episodes: GroupedSeriesEpisodeDto[];
}

export interface GroupedSeriesDto {
	title: string;
	seasons: GroupedSeriesSeasonDto[];
}

export interface GroupedChannelDto {
	title: string;
	variants: GroupedEntryVariantDto[];
}

export interface PageInfoDto {
	currentPage: number;
	perPage: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	pageCount: number;
}

export interface GroupedCategoryPageDto<TItem> {
	data: TItem[];
	pageInfo: PageInfoDto;
}

export type GroupedMoviesPageDto = GroupedCategoryPageDto<GroupedMovieDto>;
export type GroupedSeriesPageDto = GroupedCategoryPageDto<GroupedSeriesDto>;
export type GroupedChannelsPageDto = GroupedCategoryPageDto<GroupedChannelDto>;

export interface GroupedCategoryListDto {
	data: string[];
}

export interface DisplayItem {
	id: number | string;
	title: string;
	subtitle: string;
	rawTitle?: string;
	streamUrl?: string;
	thumbnail?: string | null;
	badges: string[];
	groupTitle: string;
}

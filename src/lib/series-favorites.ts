import type { FavoriteEntryDto } from "@/lib/iptv";
import type { GroupedSeriesDto } from "@/types/iptv";

function normalizeSeriesToken(value?: string | null): string {
	return (value ?? "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

export function extractSeriesTitle(raw: string): string {
	const cleaned = raw
		.replace(/\[[^\]]*\]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	const match =
		cleaned.match(/(.+?)\s*[Ss](\d{1,2})\s*[Ee](?:[Pp])?\s*(\d{1,3})\b/) ||
		cleaned.match(/(.+?)\s*(\d{1,2})\s*[Xx]\s*(\d{1,3})\b/);

	return (match ? match[1] : cleaned).trim();
}

export function buildSeriesKey(
	title: string,
	primaryGroupTitle?: string,
): string {
	const normalizedTitle = normalizeSeriesToken(title);
	const normalizedGroup = normalizeSeriesToken(primaryGroupTitle);
	return `${normalizedTitle}::${normalizedGroup}`;
}

export function getSeriesPrimaryGroupTitle(series: GroupedSeriesDto): string {
	for (const season of series.seasons) {
		for (const episode of season.episodes) {
			if (episode.groupTitle?.trim()) {
				return episode.groupTitle.trim();
			}
		}
	}

	return "";
}

export function getSeriesKeyFromSeriesItem(series: GroupedSeriesDto): string {
	return buildSeriesKey(series.title, getSeriesPrimaryGroupTitle(series));
}

export function getSeriesAnchorEntryId(
	series: GroupedSeriesDto,
): number | null {
	const bySeason = [...series.seasons].sort((a, b) => a.season - b.season);

	for (const season of bySeason) {
		const byEpisode = [...season.episodes].sort((a, b) => {
			const episodeA =
				typeof a.episode === "number" ? a.episode : Number.MAX_SAFE_INTEGER;
			const episodeB =
				typeof b.episode === "number" ? b.episode : Number.MAX_SAFE_INTEGER;
			if (episodeA !== episodeB) {
				return episodeA - episodeB;
			}
			return a.id - b.id;
		});

		const s01e01 = byEpisode.find(
			(episode) => season.season === 1 && episode.episode === 1,
		);
		if (s01e01) {
			return s01e01.id;
		}

		if (byEpisode[0]) {
			return byEpisode[0].id;
		}
	}

	return null;
}

export function getSeriesKeyFromFavoriteEntry(
	favorite: FavoriteEntryDto,
): string {
	const raw =
		favorite.m3uEntry?.rawTitle ??
		favorite.m3uEntry?.title ??
		`Entry ${favorite.m3uEntryId}`;
	const extractedTitle = extractSeriesTitle(raw);
	const groupTitle = favorite.m3uEntry?.groupTitle ?? "";
	return buildSeriesKey(extractedTitle, groupTitle);
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { ContentRail } from "@/components/iptv/content-rail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTvRemote } from "@/hooks/use-tv-remote";
import {
	fetchGroupedCategoryList,
	fetchGroupedChannelsPage,
	fetchGroupedMoviesPage,
	fetchGroupedSeriesPage,
} from "@/lib/iptv";
import type {
	CatalogCategory,
	DisplayItem,
	GroupedCategoryPageDto,
	GroupedChannelDto,
	GroupedMovieDto,
	GroupedSeriesDto,
} from "@/types/iptv";

const CATEGORY_LABEL: Record<CatalogCategory, string> = {
	channels: "Canais",
	series: "Séries",
	movies: "Filmes",
};

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function getCategoryItems(
	catalog:
		| GroupedCategoryPageDto<
				GroupedMovieDto | GroupedSeriesDto | GroupedChannelDto
		  >
		| null
		| undefined,
	category: CatalogCategory,
): DisplayItem[] {
	if (!catalog) return [];

	if (category === "channels") {
		return (catalog.data as GroupedChannelDto[]).map((channel) => {
			const first = channel.variants[0];
			const qualityTags = unique(
				channel.variants.flatMap((variant) => variant.qualityTags),
			);
			const hasLegendado = channel.variants.some(
				(variant) => variant.isLegendado,
			);

			return {
				id: `${channel.title}-${first?.id ?? "channel"}`,
				title: channel.title,
				subtitle: `${channel.variants.length} qualidades`,
				thumbnail: first?.tvgLogo,
				badges: hasLegendado ? [...qualityTags, "Legendado"] : qualityTags,
				groupTitle: first?.groupTitle ?? "Sem grupo",
			};
		});
	}

	if (category === "movies") {
		return (catalog.data as GroupedMovieDto[]).map((movie) => {
			const first = movie.variants[0];
			const qualityTags = unique(
				movie.variants.flatMap((variant) => variant.qualityTags),
			);
			const hasLegendado = movie.variants.some(
				(variant) => variant.isLegendado,
			);

			return {
				id: `${movie.title}-${first?.id ?? "movie"}`,
				title: movie.title,
				subtitle: `${movie.variants.length} variantes`,
				thumbnail: first?.tvgLogo,
				badges: hasLegendado ? [...qualityTags, "Legendado"] : qualityTags,
				groupTitle: first?.groupTitle ?? "Sem grupo",
			};
		});
	}

	return (catalog.data as GroupedSeriesDto[]).map((series) => {
		const episodes = series.seasons.flatMap((season) => season.episodes);
		const firstEpisode = episodes[0];

		return {
			id: `${series.title}-${firstEpisode?.id ?? "series"}`,
			title: series.title,
			subtitle: `${series.seasons.length} temporadas · ${episodes.length} episódios`,
			thumbnail: firstEpisode?.tvgLogo,
			badges: [`${series.seasons.length} temporadas`],
			groupTitle: firstEpisode?.groupTitle ?? "Sem grupo",
		};
	});
}

function CatalogContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const queryMac = searchParams.get("mac") ?? "";
	const queryCategory = searchParams.get("category");
	const category =
		queryCategory === "movies" ||
		queryCategory === "series" ||
		queryCategory === "channels"
			? queryCategory
			: null;

	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [selectedGroupTitle, setSelectedGroupTitle] = useState("");
	const [focusedContentIndex, setFocusedContentIndex] = useState(0);
	const [hasRestoredState, setHasRestoredState] = useState(false);

	useEffect(() => {
		const restoredPage = Number(searchParams.get("page") ?? "1");
		const restoredPerPage = Number(searchParams.get("perPage") ?? "20");
		const restoredSearch = searchParams.get("search") ?? "";
		const restoredSearchInput =
			searchParams.get("searchInput") ?? restoredSearch;
		const restoredGroupTitle = searchParams.get("groupTitle") ?? "";
		const restoredFocusedContent = Number(
			searchParams.get("focusedContent") ?? "0",
		);

		if (!Number.isNaN(restoredPage) && restoredPage > 0) setPage(restoredPage);
		if (!Number.isNaN(restoredPerPage) && restoredPerPage > 0)
			setPerPage(restoredPerPage);
		setSearch(restoredSearch);
		setSearchInput(restoredSearchInput);
		setSelectedGroupTitle(restoredGroupTitle);
		if (!Number.isNaN(restoredFocusedContent) && restoredFocusedContent >= 0) {
			setFocusedContentIndex(restoredFocusedContent);
		}
		setHasRestoredState(true);
	}, [searchParams]);

	const {
		data: categoryPage,
		error,
		isPending,
		isFetching,
		refetch,
	} = useQuery<
		GroupedCategoryPageDto<
			GroupedMovieDto | GroupedSeriesDto | GroupedChannelDto
		>
	>({
		queryKey: [
			"catalog",
			queryMac,
			category,
			page,
			perPage,
			search,
			selectedGroupTitle,
		],
		enabled: Boolean(queryMac && category),
		queryFn: ({ signal }) => {
			if (!category) throw new Error("Categoria inválida");

			if (category === "movies") {
				return fetchGroupedMoviesPage(
					queryMac,
					page,
					perPage,
					search,
					selectedGroupTitle,
					signal,
				);
			}

			if (category === "series") {
				return fetchGroupedSeriesPage(
					queryMac,
					page,
					perPage,
					search,
					selectedGroupTitle,
					signal,
				);
			}

			return fetchGroupedChannelsPage(
				queryMac,
				page,
				perPage,
				search,
				selectedGroupTitle,
				signal,
			);
		},
	});

	const { data: categoryList } = useQuery<{ data: string[] }>({
		queryKey: ["catalog-groups", queryMac, category],
		enabled: Boolean(queryMac && category),
		queryFn: ({ signal }) => {
			if (!category) throw new Error("Categoria inválida");
			return fetchGroupedCategoryList(queryMac, category, signal);
		},
	});

	const items = useMemo(
		() => (category ? getCategoryItems(categoryPage, category) : []),
		[category, categoryPage],
	);

	const groups = useMemo(() => categoryList?.data ?? [], [categoryList]);
	const pageInfo = categoryPage?.pageInfo;

	useEffect(() => {
		if (!hasRestoredState || !category) return;

		const params = new URLSearchParams({ mac: queryMac, category });
		if (page !== 1) params.set("page", String(page));
		if (perPage !== 20) params.set("perPage", String(perPage));
		if (search) params.set("search", search);
		if (searchInput && searchInput !== search)
			params.set("searchInput", searchInput);
		if (selectedGroupTitle) params.set("groupTitle", selectedGroupTitle);
		if (focusedContentIndex !== 0)
			params.set("focusedContent", String(focusedContentIndex));

		const nextUrl = `${pathname}?${params.toString()}`;
		const currentUrl =
			typeof window !== "undefined"
				? `${pathname}${window.location.search}`
				: "";
		if (nextUrl === currentUrl) return;
		router.replace(nextUrl, { scroll: false });
	}, [
		category,
		focusedContentIndex,
		hasRestoredState,
		page,
		pathname,
		perPage,
		queryMac,
		router,
		search,
		searchInput,
		selectedGroupTitle,
	]);

	const handleApplySearch = useCallback(() => {
		setPage(1);
		setFocusedContentIndex(0);
		setSearch(searchInput.trim());
	}, [searchInput]);

	const handleClearFilters = useCallback(() => {
		setPage(1);
		setFocusedContentIndex(0);
		setSearchInput("");
		setSearch("");
		setSelectedGroupTitle("");
	}, []);

	const goToPreviousPage = useCallback(() => {
		if (!pageInfo?.hasPreviousPage) return;
		setPage((current) => Math.max(1, current - 1));
		setFocusedContentIndex(0);
	}, [pageInfo]);

	const goToNextPage = useCallback(() => {
		if (!pageInfo?.hasNextPage) return;
		setPage((current) => current + 1);
		setFocusedContentIndex(0);
	}, [pageInfo]);

	const openPreview = useCallback(
		(item: DisplayItem) => {
			if (!category || !queryMac) return;

			const from = `${pathname}?${new URLSearchParams({
				mac: queryMac,
				category,
				page: String(page),
				perPage: String(perPage),
				search,
				searchInput,
				groupTitle: selectedGroupTitle,
				focusedContent: String(focusedContentIndex),
			}).toString()}`;

			const params = new URLSearchParams({
				mac: queryMac,
				category,
				title: item.title,
				page: String(page),
				perPage: String(perPage),
				search,
				groupTitle: selectedGroupTitle,
				from,
			});

			router.push(`/preview?${params.toString()}`);
		},
		[
			category,
			focusedContentIndex,
			page,
			pathname,
			perPage,
			queryMac,
			router,
			search,
			searchInput,
			selectedGroupTitle,
		],
	);

	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action === "left" && items.length > 0) {
				setFocusedContentIndex(
					(current) => (current - 1 + items.length) % items.length,
				);
				return;
			}

			if (action === "right" && items.length > 0) {
				setFocusedContentIndex((current) => (current + 1) % items.length);
				return;
			}

			if (action === "back") {
				router.push("/");
				return;
			}

			if (action === "select") {
				const item = items[focusedContentIndex];
				if (item) openPreview(item);
			}
		},
	});

	if (!category || !queryMac) {
		return (
			<main className="mx-auto max-w-6xl p-6">
				<Card>
					<CardContent className="py-6">
						Categoria inválida. Volte para o início.
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-10">
				<Card>
					<CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-3xl">
								{CATEGORY_LABEL[category]}
							</CardTitle>
							<CardDescription>
								2) Navegue no catálogo, filtre e abra a pré-visualização.
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => router.push("/")}>
								Voltar
							</Button>
							<Button variant="secondary" onClick={() => void refetch()}>
								{isFetching ? "Atualizando..." : "Atualizar catálogo"}
							</Button>
						</div>
					</CardHeader>
				</Card>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						handleApplySearch();
					}}
					className="flex flex-wrap items-center gap-2"
				>
					<input
						type="text"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
						placeholder="Buscar por nome"
						className="h-10 min-w-60 rounded-md border border-input bg-background px-3 text-sm"
					/>
					<Button type="submit" variant="outline">
						Buscar
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={handleClearFilters}
					>
						Limpar filtros
					</Button>
					{search && <Badge variant="outline">Busca: {search}</Badge>}
					{selectedGroupTitle && (
						<Badge variant="outline">Grupo: {selectedGroupTitle}</Badge>
					)}
				</form>

				<div className="flex flex-wrap gap-2">
					<Button
						variant={selectedGroupTitle ? "outline" : "default"}
						onClick={() => {
							setSelectedGroupTitle("");
							setPage(1);
							setFocusedContentIndex(0);
						}}
					>
						Todos os grupos
					</Button>
					{groups.map((group) => (
						<Button
							key={group}
							variant={selectedGroupTitle === group ? "default" : "outline"}
							onClick={() => {
								setSelectedGroupTitle(group);
								setPage(1);
								setFocusedContentIndex(0);
							}}
						>
							{group}
						</Button>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						onClick={goToPreviousPage}
						disabled={!pageInfo?.hasPreviousPage || isFetching}
					>
						Página anterior
					</Button>
					<Badge variant="outline">
						Página {pageInfo?.currentPage ?? page} de {pageInfo?.pageCount ?? 1}
					</Badge>
					<Button
						variant="outline"
						onClick={goToNextPage}
						disabled={!pageInfo?.hasNextPage || isFetching}
					>
						Próxima página
					</Button>
					<div className="ml-2 flex items-center gap-2">
						<Badge variant="secondary">Por página</Badge>
						{[10, 20, 30, 100].map((size) => (
							<Button
								key={size}
								variant={perPage === size ? "default" : "outline"}
								onClick={() => {
									setPerPage(size);
									setPage(1);
									setFocusedContentIndex(0);
								}}
								disabled={isFetching}
							>
								{size}
							</Button>
						))}
					</div>
				</div>

				{isPending || isFetching ? (
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{Array.from({ length: 8 }).map((_, index) => (
							<Skeleton key={`sk-${index}`} className="h-56 w-full" />
						))}
					</div>
				) : (
					<ContentRail
						items={items}
						focusedIndex={focusedContentIndex}
						onFocus={setFocusedContentIndex}
						onSelect={openPreview}
					/>
				)}

				{error && (
					<Card className="border-destructive/40">
						<CardContent className="py-4 text-sm text-destructive">
							{error instanceof Error
								? error.message
								: "Erro ao carregar catálogo."}
						</CardContent>
					</Card>
				)}
			</main>
		</div>
	);
}

export default function CatalogPage() {
	return (
		<Suspense
			fallback={
				<main className="mx-auto max-w-6xl p-6">
					<Card>
						<CardContent className="py-6">Carregando catálogo...</CardContent>
					</Card>
				</main>
			}
		>
			<CatalogContent />
		</Suspense>
	);
}

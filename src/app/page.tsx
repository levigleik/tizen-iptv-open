"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CategorySelector } from "@/components/iptv/category-selector";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useTvRemote } from "@/hooks/use-tv-remote";
import { resolveMacAddress } from "@/lib/tizen";
import type { CatalogCategory } from "@/types/iptv";

const CATEGORY_ORDER: CatalogCategory[] = ["channels", "series", "movies"];

const CATEGORY_LABEL: Record<CatalogCategory, string> = {
	channels: "Canais",
	series: "Séries",
	movies: "Filmes",
};

const CATEGORY_DESCRIPTION: Record<CatalogCategory, string> = {
	channels: "Programação ao vivo, esportes e notícias.",
	series: "Temporadas e episódios organizados.",
	movies: "Catálogo de filmes com variantes de qualidade.",
};

export default function Home() {
	const router = useRouter();
	const [mac, setMac] = useState("");
	const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);

	useEffect(() => {
		setMac(resolveMacAddress());
	}, []);

	const categoryOptions = useMemo(
		() =>
			CATEGORY_ORDER.map((key) => ({
				key,
				label: CATEGORY_LABEL[key],
				description: CATEGORY_DESCRIPTION[key],
				count: 0,
			})),
		[],
	);

	const openCatalog = (category: CatalogCategory) => {
		if (!mac) return;
		const params = new URLSearchParams({ mac, category });
		router.push(`/catalog?${params.toString()}`);
	};

	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action === "left") {
				setFocusedCategoryIndex(
					(current) =>
						(current - 1 + categoryOptions.length) % categoryOptions.length,
				);
				return;
			}

			if (action === "right") {
				setFocusedCategoryIndex(
					(current) => (current + 1) % categoryOptions.length,
				);
				return;
			}

			if (action === "select") {
				const option = categoryOptions[focusedCategoryIndex];
				if (option) {
					openCatalog(option.key);
				}
			}
		},
	});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 lg:px-10">
				<Card className="border-border/80 bg-card/80">
					<CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle className="text-3xl">IPTV Open Tizen</CardTitle>
							<CardDescription>
								Selecione o tipo de conteúdo para avançar.
							</CardDescription>
						</div>
						<Badge variant="outline">MAC: {mac || "Detectando..."}</Badge>
					</CardHeader>
				</Card>

				<section className="space-y-3">
					<h2 className="text-xl font-semibold">
						1) Escolha o tipo de conteúdo
					</h2>
					<CategorySelector
						options={categoryOptions}
						selectedCategory={null}
						focusedIndex={focusedCategoryIndex}
						onFocus={setFocusedCategoryIndex}
						onSelect={openCatalog}
					/>
				</section>
			</main>
		</div>
	);
}

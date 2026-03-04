"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useTvRemote } from "@/hooks/use-tv-remote";

interface SortOption {
	label: string;
	value: string;
}

interface CatalogNavbarProps {
	title: string;
	searchPlaceholder: string;
	searchValue: string;
	onSearchChange: (value: string) => void;
	onClearFilters: () => void;
	groups: string[];
	selectedGroupTitle: string;
	onGroupTitleChange: (value: string) => void;
	sortValue: string;
	onSortValueChange: (value: string) => void;
	sortOptions: SortOption[];
}

export function CatalogNavbar({
	title,
	searchPlaceholder,
	searchValue,
	onSearchChange,
	onClearFilters,
	groups,
	selectedGroupTitle,
	onGroupTitleChange,
	sortValue,
	onSortValueChange,
	sortOptions,
}: CatalogNavbarProps) {
	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action !== "red") return false;
			onClearFilters();
			return true;
		},
	});

	return (
		<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10 flex items-center justify-between px-6">
			<div className="flex flex-1 items-center gap-4">
				<h1 className="mr-6 hidden text-2xl font-bold tracking-tight lg:block">
					{title}
				</h1>
				<div className="group relative w-full max-w-md">
					<span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
						search
					</span>
					<Input
						className="w-full rounded-full bg-secondary/50 pl-10"
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder={searchPlaceholder}
						type="text"
						value={searchValue}
					/>
				</div>
				<Button
					className="shrink-0 gap-2"
					onClick={onClearFilters}
					type="button"
					variant="outline"
				>
					<span className="h-2 w-2 rounded-full bg-red-500" />
					Limpar filtros
				</Button>
			</div>
			<div className="flex items-center gap-3">
				<Select
					onValueChange={(value) => {
						onGroupTitleChange(value === "__all" ? "" : value);
					}}
					value={selectedGroupTitle || "__all"}
				>
					<SelectTrigger className="w-48 bg-card">
						<SelectValue placeholder="Todas Categorias" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__all">Todas Categorias</SelectItem>
						{groups.map((group) => (
							<SelectItem key={group} value={group}>
								{group}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select onValueChange={onSortValueChange} value={sortValue}>
					<SelectTrigger className="w-44 bg-card">
						<SelectValue placeholder="Ordernar por" />
					</SelectTrigger>
					<SelectContent>
						{sortOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</header>
	);
}

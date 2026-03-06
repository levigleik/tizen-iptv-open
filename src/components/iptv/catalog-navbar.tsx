"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MobileSidebarToggle } from "@/components/iptv/mobile-sidebar-toggle";
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
	const desktopSearchInputRef = useRef<HTMLInputElement>(null);
	const mobileSearchInputRef = useRef<HTMLInputElement>(null);
	const categoryTriggerRef = useRef<HTMLButtonElement>(null);
	const [activeMobileControl, setActiveMobileControl] = useState<
		"none" | "search" | "group" | "sort"
	>("none");
	const [isMobileGroupMenuOpen, setIsMobileGroupMenuOpen] = useState(false);
	const [isMobileSortMenuOpen, setIsMobileSortMenuOpen] = useState(false);

	const hasActiveFilters = useMemo(() => {
		return Boolean(
			searchValue.trim() || selectedGroupTitle || sortValue !== "default",
		);
	}, [searchValue, selectedGroupTitle, sortValue]);

	useEffect(() => {
		if (activeMobileControl === "search") {
			mobileSearchInputRef.current?.focus();
		}

		setIsMobileGroupMenuOpen(activeMobileControl === "group");
		setIsMobileSortMenuOpen(activeMobileControl === "sort");
	}, [activeMobileControl]);

	useTvRemote({
		enabled: true,
		onAction: (action) => {
			if (action === "red") {
				onClearFilters();
				return true;
			}

			if (action === "green") {
				const input =
					desktopSearchInputRef.current ?? mobileSearchInputRef.current;
				if (!input) return false;

				input.focus();
				const end = input.value.length;
				input.setSelectionRange(end, end);
				return true;
			}

			if (action === "yellow") {
				const trigger = categoryTriggerRef.current;
				if (!trigger) return false;

				trigger.focus();
				trigger.click();
				return true;
			}

			return false;
		},
	});

	return (
		<header className="h-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10 flex items-center justify-between px-6">
			<div className="flex flex-1 items-center gap-4">
				<MobileSidebarToggle />

				<div
					className={`relative h-10 overflow-hidden transition-[width] duration-300 ease-out md:hidden ${
						activeMobileControl === "search" ? "w-56" : "w-10"
					}`}
				>
					<Button
						aria-label="Abrir busca"
						className={`absolute inset-0 h-10 w-10 p-0 transition-opacity duration-200 ${
							activeMobileControl === "search"
								? "pointer-events-none opacity-0"
								: "opacity-100"
						}`}
						onClick={() => {
							setActiveMobileControl("search");
						}}
						type="button"
						variant="outline"
					>
						<span className="material-symbols-outlined text-lg">search</span>
					</Button>

					<div
						className={`group absolute inset-0 transition-opacity duration-200 ${
							activeMobileControl === "search"
								? "opacity-100"
								: "pointer-events-none opacity-0"
						}`}
					>
						<span className="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
							search
						</span>
						<Input
							className="h-10 w-full rounded-full bg-secondary/50 pr-10 pl-12 focus-visible:ring-0 focus-visible:border-primary"
							onBlur={() => setActiveMobileControl("none")}
							onChange={(event) => onSearchChange(event.target.value)}
							placeholder={searchPlaceholder}
							ref={mobileSearchInputRef}
							type="text"
							value={searchValue}
						/>
						<button
							aria-label="Fechar busca"
							className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
							onClick={() => setActiveMobileControl("none")}
							type="button"
						>
							<span className="material-symbols-outlined text-base">close</span>
						</button>
					</div>
				</div>

				<div
					className={`relative h-10 overflow-hidden transition-[width] duration-300 ease-out md:hidden ${
						activeMobileControl === "group" ? "w-48" : "w-10"
					}`}
				>
					<Button
						aria-label="Abrir categorias"
						className={`absolute inset-0 h-10 w-10 p-0 transition-opacity duration-200 ${
							activeMobileControl === "group"
								? "pointer-events-none opacity-0"
								: "opacity-100"
						}`}
						onClick={() => setActiveMobileControl("group")}
						type="button"
						variant="outline"
					>
						<span className="material-symbols-outlined text-lg">
							filter_alt
						</span>
					</Button>

					<div
						className={`absolute inset-0 transition-opacity duration-200 ${
							activeMobileControl === "group"
								? "opacity-100"
								: "pointer-events-none opacity-0"
						}`}
					>
						<Select
							onOpenChange={(open) => {
								setIsMobileGroupMenuOpen(open);
								if (!open) {
									setActiveMobileControl("none");
								}
							}}
							onValueChange={(value) => {
								onGroupTitleChange(value === "__all" ? "" : value);
								setIsMobileGroupMenuOpen(false);
								setActiveMobileControl("none");
							}}
							open={isMobileGroupMenuOpen}
							value={selectedGroupTitle || "__all"}
						>
							<SelectTrigger className="h-10 w-48 bg-card">
								<SelectValue placeholder="Categorias" />
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
					</div>
				</div>

				<div
					className={`relative h-10 overflow-hidden transition-[width] duration-300 ease-out md:hidden ${
						activeMobileControl === "sort" ? "w-44" : "w-10"
					}`}
				>
					<Button
						aria-label="Abrir ordenação"
						className={`absolute inset-0 h-10 w-10 p-0 transition-opacity duration-200 ${
							activeMobileControl === "sort"
								? "pointer-events-none opacity-0"
								: "opacity-100"
						}`}
						onClick={() => setActiveMobileControl("sort")}
						type="button"
						variant="outline"
					>
						<span className="material-symbols-outlined text-lg">sort</span>
					</Button>

					<div
						className={`absolute inset-0 transition-opacity duration-200 ${
							activeMobileControl === "sort"
								? "opacity-100"
								: "pointer-events-none opacity-0"
						}`}
					>
						<Select
							onOpenChange={(open) => {
								setIsMobileSortMenuOpen(open);
								if (!open) {
									setActiveMobileControl("none");
								}
							}}
							onValueChange={(value) => {
								onSortValueChange(value);
								setIsMobileSortMenuOpen(false);
								setActiveMobileControl("none");
							}}
							open={isMobileSortMenuOpen}
							value={sortValue}
						>
							<SelectTrigger className="h-10 w-44 bg-card">
								<SelectValue placeholder="Ordenar" />
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
				</div>

				<h1 className="mr-6 hidden text-2xl font-bold tracking-tight lg:block">
					{title}
				</h1>
				<div className="group relative hidden w-full max-w-md md:block">
					<span className="absolute top-1/2 left-3 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-green-500 md:block" />
					<span className="material-symbols-outlined absolute top-1/2 left-7 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
						search
					</span>
					<Input
						className="h-10 w-full rounded-full bg-secondary/50 pl-14"
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder={searchPlaceholder}
						ref={desktopSearchInputRef}
						type="text"
						value={searchValue}
					/>
				</div>
				{hasActiveFilters ? (
					<Button
						className="hidden h-10 shrink-0 gap-2 md:inline-flex"
						onClick={onClearFilters}
						type="button"
						variant="outline"
					>
						<span className="hidden h-2 w-2 rounded-full bg-red-500 md:block" />
						Limpar filtros
					</Button>
				) : null}
			</div>
			<div className="hidden items-center gap-3 md:flex">
				<Select
					onValueChange={(value) => {
						onGroupTitleChange(value === "__all" ? "" : value);
					}}
					value={selectedGroupTitle || "__all"}
				>
					<SelectTrigger
						className="h-10 w-48 bg-card gap-2"
						ref={categoryTriggerRef}
					>
						<span className="hidden h-2.5 w-2.5 rounded-full bg-yellow-400 md:block" />
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
					<SelectTrigger className="h-10 w-44 bg-card">
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

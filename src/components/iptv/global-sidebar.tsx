"use client";

import { type FocusEvent, useState } from "react";

type SidebarItem = {
	key: string;
	icon: string;
	label: string;
	href: string;
	dividerBefore?: boolean;
};

type GlobalSidebarProps = {
	activeItem?: string;
	isMobileOpen?: boolean;
	onRequestCloseMobile?: () => void;
};

const NAV_ITEMS: SidebarItem[] = [
	{ key: "home", icon: "home", label: "Início", href: "#/" },
	{ key: "live-tv", icon: "tv", label: "Canais", href: "#/channels" },
	{ key: "movies", icon: "movie", label: "Filmes", href: "#/movies" },
	{ key: "series", icon: "smart_display", label: "Séries", href: "#/series" },
	{
		key: "favorites",
		icon: "favorite",
		label: "Favoritos",
		href: "#/favorites",
		dividerBefore: true,
	},
	{ key: "history", icon: "history", label: "Histórico", href: "#/history" },
];

export function GlobalSidebar({
	activeItem = "home",
	isMobileOpen = false,
	onRequestCloseMobile,
}: GlobalSidebarProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const handleFocusOut = (event: FocusEvent<HTMLElement>) => {
		const nextFocused = event.relatedTarget;
		if (
			nextFocused instanceof Node &&
			event.currentTarget.contains(nextFocused)
		) {
			return;
		}

		if (isMobileOpen) {
			return;
		}

		setIsExpanded(false);
	};

	const showExpandedState = isExpanded || isMobileOpen;
	const sidebarWidth = isExpanded ? "md:w-64" : "md:w-20";
	const labelVisibility = showExpandedState
		? "max-w-[220px] opacity-100 translate-x-0"
		: "max-w-0 opacity-0 -translate-x-2";
	const itemLayout = showExpandedState
		? "justify-start gap-3"
		: "justify-center gap-0";
	const mobileVisibility = isMobileOpen ? "translate-x-0" : "-translate-x-full";
	const mobilePointerEvents = isMobileOpen
		? "pointer-events-auto"
		: "pointer-events-none md:pointer-events-auto";

	return (
		<aside
			data-sidebar-root="true"
			className={`fixed inset-y-0 left-0 ${mobileVisibility} ${mobilePointerEvents} w-64 border-r border-border/50 bg-background md:relative md:translate-x-0 ${sidebarWidth} flex flex-col items-center shrink-0 z-50 md:z-20 transition-[width,transform] duration-300 ease-in-out`}
			onFocusCapture={() => setIsExpanded(true)}
			onBlurCapture={handleFocusOut}
		>
			<div className="h-20 flex items-center justify-center px-4 w-full shrink-0 border-b border-border/50 overflow-hidden">
				<span className="material-symbols-outlined text-primary text-3xl">
					live_tv
				</span>
				<span
					className={`${showExpandedState ? "ml-3" : "ml-0"} font-bold text-xl tracking-tight whitespace-nowrap overflow-hidden transition-all duration-200 ${labelVisibility}`}
				>
					PlayTV
				</span>
			</div>

			<nav className="flex-1 w-full py-6 flex flex-col gap-2 px-3 overflow-y-auto hide-scrollbar">
				{NAV_ITEMS.map((item) => (
					<div key={item.key}>
						{item.dividerBefore ? (
							<div
								className={`my-4 border-t border-border/50 w-full transition-opacity duration-200 ${
									showExpandedState ? "opacity-100" : "opacity-0"
								}`}
							/>
						) : null}
						<a
							className={
								item.key === activeItem
									? `group relative flex items-center ${itemLayout} px-3 py-3 rounded-md bg-primary text-primary-foreground shadow-sm  transition-colors focus-visible:ring-2 focus-visible:ring-ring`
									: `group relative flex items-center ${itemLayout} px-3 py-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent  transition-colors focus-visible:ring-2 focus-visible:ring-ring`
							}
							href={item.href}
							data-sidebar-focus="true"
							data-sidebar-active={item.key === activeItem ? "true" : undefined}
							onClick={() => onRequestCloseMobile?.()}
						>
							<span className="material-symbols-outlined">{item.icon}</span>
							<span
								className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${labelVisibility}`}
							>
								{item.label}
							</span>
						</a>
					</div>
				))}
			</nav>

			<div className="p-4 w-full mt-auto border-t border-border/50">
				<a
					className={
						activeItem === "settings"
							? `group relative flex items-center ${itemLayout} px-3 py-3 rounded-md bg-primary text-primary-foreground shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring`
							: `group relative flex items-center ${itemLayout} px-3 py-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring`
					}
					href="#/settings"
					data-sidebar-focus="true"
					data-sidebar-active={activeItem === "settings" ? "true" : undefined}
					onClick={() => onRequestCloseMobile?.()}
				>
					<span className="material-symbols-outlined">settings</span>
					<span
						className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${labelVisibility}`}
					>
						Configurações
					</span>
				</a>
			</div>
		</aside>
	);
}

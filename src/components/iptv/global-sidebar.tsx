type SidebarItem = {
	key: string;
	icon: string;
	label: string;
	href: string;
	dividerBefore?: boolean;
};

type GlobalSidebarProps = {
	activeItem?: string;
};

const NAV_ITEMS: SidebarItem[] = [
	{ key: "home", icon: "home", label: "Home", href: "#" },
	{ key: "live-tv", icon: "tv", label: "Live TV", href: "#" },
	{ key: "movies", icon: "movie", label: "Movies", href: "#" },
	{ key: "series", icon: "smart_display", label: "Series", href: "#" },
	{
		key: "favorites",
		icon: "favorite",
		label: "Favorites",
		href: "#",
		dividerBefore: true,
	},
	{ key: "history", icon: "history", label: "History", href: "#" },
];

export function GlobalSidebar({ activeItem = "home" }: GlobalSidebarProps) {
	return (
		<aside className="w-20 md:w-64 border-r border-border bg-card flex flex-col items-center md:items-start shrink-0 z-20 transition-all duration-300">
			<div className="h-16 flex items-center justify-center md:justify-start md:px-6 w-full shrink-0 border-b border-border/50">
				<span className="material-symbols-outlined text-primary text-3xl">
					live_tv
				</span>
				<span className="ml-3 font-bold text-xl tracking-tight hidden md:block">
					PlayTV
				</span>
			</div>

			<nav className="flex-1 w-full py-6 flex flex-col gap-2 px-3 overflow-y-auto hide-scrollbar">
				{NAV_ITEMS.map((item) => (
					<div key={item.key}>
						{item.dividerBefore ? (
							<div className="my-4 border-t border-border/50 w-full hidden md:block" />
						) : null}
						<a
							className={
								item.key === activeItem
									? "flex items-center gap-3 px-3 py-3 rounded-md bg-primary text-primary-foreground shadow-sm transition-colors"
									: "flex items-center gap-3 px-3 py-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							}
							href={item.href}
						>
							<span className="material-symbols-outlined">{item.icon}</span>
							<span className="font-medium hidden md:block">{item.label}</span>
						</a>
					</div>
				))}
			</nav>

			<div className="p-4 w-full mt-auto border-t border-border/50">
				<a
					className="flex items-center gap-3 px-3 py-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors justify-center md:justify-start"
					href="#"
				>
					<span className="material-symbols-outlined">settings</span>
					<span className="font-medium hidden md:block">Settings</span>
				</a>
			</div>
		</aside>
	);
}

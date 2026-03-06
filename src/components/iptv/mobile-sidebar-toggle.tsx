"use client";

import { useLayoutShellSidebar } from "@/components/iptv/layout-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileSidebarToggleProps = {
	className?: string;
};

export function MobileSidebarToggle({ className }: MobileSidebarToggleProps) {
	const { isMobileSidebarOpen, toggleMobileSidebar } = useLayoutShellSidebar();

	return (
		<Button
			aria-expanded={isMobileSidebarOpen}
			aria-label={isMobileSidebarOpen ? "Fechar menu" : "Abrir menu"}
			className={cn("h-10 w-10 p-0 md:hidden", className)}
			onClick={toggleMobileSidebar}
			size="icon"
			type="button"
			variant="icon"
		>
			<span className="material-symbols-outlined text-lg">
				{isMobileSidebarOpen ? "close" : "menu"}
			</span>
		</Button>
	);
}

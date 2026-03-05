import type { ReactNode } from "react";

import { GlobalSidebar } from "@/components/iptv/global-sidebar";

type LayoutShellProps = {
	children: ReactNode;
	activeSidebarItem?: string;
};

export function LayoutShell({
	children,
	activeSidebarItem = "home",
}: LayoutShellProps) {
	return (
		<div className="flex h-screen overflow-hidden">
			<GlobalSidebar activeItem={activeSidebarItem} />
			{children}
		</div>
	);
}

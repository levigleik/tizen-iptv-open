"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { GlobalSidebar } from "@/components/iptv/global-sidebar";
import { Button } from "@/components/ui/button";

type LayoutShellProps = {
	children: ReactNode;
	activeSidebarItem?: string;
};

type LayoutShellSidebarContextValue = {
	isMobileSidebarOpen: boolean;
	toggleMobileSidebar: () => void;
	closeMobileSidebar: () => void;
};

const LayoutShellSidebarContext =
	createContext<LayoutShellSidebarContextValue | null>(null);

export function useLayoutShellSidebar() {
	const context = useContext(LayoutShellSidebarContext);

	if (context) {
		return context;
	}

	return {
		isMobileSidebarOpen: false,
		toggleMobileSidebar: () => {},
		closeMobileSidebar: () => {},
	};
}

export function LayoutShell({
	children,
	activeSidebarItem = "home",
}: LayoutShellProps) {
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

	const toggleMobileSidebar = useCallback(() => {
		setIsMobileSidebarOpen((previous) => !previous);
	}, []);

	const closeMobileSidebar = useCallback(() => {
		setIsMobileSidebarOpen(false);
	}, []);

	const contextValue = useMemo(
		() => ({
			isMobileSidebarOpen,
			toggleMobileSidebar,
			closeMobileSidebar,
		}),
		[closeMobileSidebar, isMobileSidebarOpen, toggleMobileSidebar],
	);

	return (
		<LayoutShellSidebarContext.Provider value={contextValue}>
			<div className="relative flex h-screen overflow-hidden">
				<GlobalSidebar
					activeItem={activeSidebarItem}
					isMobileOpen={isMobileSidebarOpen}
					onRequestCloseMobile={closeMobileSidebar}
				/>

				<Button
					aria-label="Fechar menu lateral"
					className={`fixed inset-0 z-40 h-auto w-auto rounded-none border-0 bg-black/50 transition-opacity duration-300 hover:bg-black/50 md:hidden ${
						isMobileSidebarOpen
							? "pointer-events-auto opacity-100"
							: "pointer-events-none opacity-0"
					}`}
					onClick={closeMobileSidebar}
					type="button"
					variant="icon"
				/>

				{children}
			</div>
		</LayoutShellSidebarContext.Provider>
	);
}

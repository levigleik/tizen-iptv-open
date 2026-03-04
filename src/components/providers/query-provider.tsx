"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { SettingsSync } from "@/components/providers/settings-sync";
import { ThemeProvider } from "@/components/providers/theme-provider";

interface QueryProviderProps {
	children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: true,
						retry: 1,
						staleTime: 5000,
					},
				},
			}),
	);

	return (
		<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
			<SettingsSync />
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ThemeProvider>
	);
}

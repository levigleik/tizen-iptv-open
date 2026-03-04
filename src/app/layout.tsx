import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import { TvRemoteNavigationProvider } from "@/components/providers/tv-remote-navigation-provider";

import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "IPTV Open Tizen",
	description: "Cliente IPTV para Tizen com Next.js e shadcn/ui",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<head>
				<link
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className={`${inter.variable} antialiased`}>
				<QueryProvider>
					<TvRemoteNavigationProvider>{children}</TvRemoteNavigationProvider>
				</QueryProvider>
			</body>
		</html>
	);
}

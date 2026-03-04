import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";
import { TvRemoteNavigationProvider } from "@/components/providers/tv-remote-navigation-provider";
import { Toaster } from "@/components/ui/sonner";
import {
	Montserrat,
	Playfair_Display,
	Source_Code_Pro,
} from "next/font/google";

import "./globals.css";

const fontSans = Montserrat({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontSerif = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-serif",
});

const fontMono = Source_Code_Pro({
	subsets: ["latin"],
	variable: "--font-mono",
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
			<body
				className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
			>
				<QueryProvider>
					<TvRemoteNavigationProvider>
						{children}
						<Toaster position="bottom-right" richColors />
					</TvRemoteNavigationProvider>
				</QueryProvider>
			</body>
		</html>
	);
}

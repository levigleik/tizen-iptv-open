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
	title: {
		default: "Tizen Open IPTV",
		template: "%s | Tizen Open IPTV",
	},
	description: "Site/app de IPTV open source para Tizen OS 3+.",
	applicationName: "Tizen Open IPTV",
	keywords: ["IPTV", "Tizen", "Tizen OS 3+", "Open Source", "Player"],
	creator: "Tizen Open IPTV",
	publisher: "Tizen Open IPTV",
	openGraph: {
		title: "Tizen Open IPTV",
		description: "Site/app de IPTV open source para Tizen OS 3+.",
		siteName: "Tizen Open IPTV",
		locale: "pt_BR",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Tizen Open IPTV",
		description: "Site/app de IPTV open source para Tizen OS 3+.",
	},
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/icon-192.png", type: "image/png", sizes: "192x192" },
			{ url: "/icon-512.png", type: "image/png", sizes: "512x512" },
			{ url: "/icon.svg", type: "image/svg+xml" },
		],
		shortcut: "/favicon.ico",
		apple: "/apple-icon.png",
	},
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
				tabIndex={0}
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

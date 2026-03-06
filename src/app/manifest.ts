import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Tizen Open IPTV",
		short_name: "Tizen IPTV",
		description: "Site/app de IPTV open source para Tizen OS 3+.",
		start_url: "/",
		scope: "/",
		display: "standalone",
		orientation: "landscape",
		background_color: "#0b1020",
		theme_color: "#0ea5e9",
		lang: "pt-BR",
		icons: [
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/apple-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	};
}

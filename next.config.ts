import type { NextConfig } from "next";

const IPTV_API_UPSTREAM =
	process.env.NEXT_PUBLIC_IPTV_API_BASE_URL ?? "http://localhost:4000";
const IPTV_API_UPSTREAM_NORMALIZED = IPTV_API_UPSTREAM.replace(/\/$/, "");

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},

			// google images
			{
				protocol: "https",
				hostname: "**.gstatic.com",
			},

			// amazon
			{
				protocol: "https",
				hostname: "**.amazon.com.br",
			},
			{
				protocol: "https",
				hostname: "**.media-amazon.com",
			},

			// imdb
			{
				protocol: "https",
				hostname: "**.imdb.com",
			},

			// wikipedia
			{
				protocol: "https",
				hostname: "**.wikimedia.org",
			},

			// pinterest
			{
				protocol: "https",
				hostname: "**.pinimg.com",
			},

			// cloudfront (CDN)
			{
				protocol: "https",
				hostname: "**.cloudfront.net",
			},

			// tmdb
			{
				protocol: "https",
				hostname: "image.tmdb.org",
			},

			// outros domínios únicos
			{
				protocol: "https",
				hostname: "seeklogo.com",
			},
			{
				protocol: "https",
				hostname: "www.radiotaormina.it",
			},
			{
				protocol: "https",
				hostname: "www.purepeople.com.br",
			},
			{
				protocol: "https",
				hostname: "www.rftvoficial.com.br",
			},

			// domínios http
			{
				protocol: "http",
				hostname: "lgfp.one",
			},
			{
				protocol: "http",
				hostname: "tvmanabrasil.com",
			},
			{
				protocol: "http",
				hostname: "**.xyz",
			},
		],
	},
	async headers() {
		return [
			{
				source: "/sw.js",
				headers: [
					{
						key: "Content-Type",
						value: "application/javascript; charset=utf-8",
					},
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
					{
						key: "Content-Security-Policy",
						value: "default-src 'self'; script-src 'self'",
					},
				],
			},
			{
				source: "/manifest.webmanifest",
				headers: [
					{
						key: "Content-Type",
						value: "application/manifest+json; charset=utf-8",
					},
				],
			},
		];
	},
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${IPTV_API_UPSTREAM_NORMALIZED}/:path*`,
			},
		];
	},
};

export default nextConfig;

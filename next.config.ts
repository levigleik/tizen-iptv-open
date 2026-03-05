import type { NextConfig } from "next";

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
};

export default nextConfig;

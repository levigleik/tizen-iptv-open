import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "http",
				hostname: "lgfp.one",
			},
			{
				protocol: "https",
				hostname: "upload.wikimedia.org",
			},
			{
				protocol: "https",
				hostname: "www.radiotaormina.it",
			},
			{
				protocol: "http",
				hostname: "97j91.xyz",
			},
			{
				protocol: "http",
				hostname: "tvmanabrasil.com",
			},
			{
				protocol: "https",
				hostname: "seeklogo.com",
			},
			{
				protocol: "https",
				hostname: "encrypted-tbn0.gstatic.com",
			},
		],
	},
};

export default nextConfig;

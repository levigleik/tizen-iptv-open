import { useCallback, useEffect, useState } from "react";

export function useHashRouter() {
	const [hash, setHash] = useState("");

	useEffect(() => {
		const handleHashChange = () => {
			setHash(window.location.hash.slice(1) || "/");
		};

		handleHashChange();

		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const navigate = useCallback((path: string) => {
		window.location.hash = path;
	}, []);

	const getSearchParams = useCallback(() => {
		const [_, search] = hash.split("?");
		return new URLSearchParams(search || "");
	}, [hash]);

	const getPathname = useCallback(() => {
		return hash.split("?")[0] || "/";
	}, [hash]);

	return {
		pathname: getPathname(),
		searchParams: getSearchParams(),
		navigate,
		hash,
	};
}

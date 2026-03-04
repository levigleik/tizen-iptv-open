"use client";

import { useEffect, useState } from "react";

interface UseDebouncedSearchOptions {
	initialValue?: string;
	delayMs?: number;
	minChars?: number;
	isFetching: boolean;
}

function normalizeSearchTerm(value: string, minChars: number): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	return trimmed.length >= minChars ? trimmed : "";
}

export function useDebouncedSearch({
	initialValue = "",
	delayMs = 1300,
	minChars = 3,
	isFetching,
}: UseDebouncedSearchOptions) {
	const [searchInput, setSearchInput] = useState(initialValue);
	const [search, setSearch] = useState(
		normalizeSearchTerm(initialValue, minChars),
	);
	const normalizedInput = normalizeSearchTerm(searchInput, minChars);
	const isOptimisticLoading =
		searchInput.trim().length >= minChars && normalizedInput !== search;

	useEffect(() => {
		const inputAtSchedule = searchInput;
		let timeoutId: number | null = null;

		const schedule = () => {
			timeoutId = window.setTimeout(() => {
				if (isFetching) {
					schedule();
					return;
				}

				setSearch(normalizeSearchTerm(inputAtSchedule, minChars));
			}, delayMs);
		};

		schedule();

		return () => {
			if (timeoutId !== null) {
				window.clearTimeout(timeoutId);
			}
		};
	}, [delayMs, isFetching, minChars, searchInput]);

	return {
		isOptimisticLoading,
		search,
		searchInput,
		setSearchInput,
	};
}

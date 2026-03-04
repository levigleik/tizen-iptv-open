"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect } from "react";

import { useTvRemote } from "@/hooks/use-tv-remote";
import type { TvRemoteAction } from "@/lib/tv-remote";

type TvRemoteNavigationProviderProps = {
	children: ReactNode;
};

const FOCUSABLE_SELECTOR = [
	"button:not([disabled])",
	"a[href]",
	"input:not([disabled]):not([type='hidden'])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"[role='button']",
	"[role='link']",
	"[role='menuitem']",
	"[role='option']",
	"[role='combobox']",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

const DIRECTIONAL_ACTIONS: TvRemoteAction[] = ["up", "down", "left", "right"];

function isTypingContext(element: Element | null): boolean {
	if (!(element instanceof HTMLElement)) return false;
	if (element.isContentEditable) return true;

	if (element instanceof HTMLInputElement) {
		return !element.readOnly && !element.disabled;
	}

	if (element instanceof HTMLTextAreaElement) {
		return !element.readOnly && !element.disabled;
	}

	return false;
}

function isVisible(element: HTMLElement): boolean {
	if (element.getClientRects().length === 0) return false;

	const style = window.getComputedStyle(element);
	return style.display !== "none" && style.visibility !== "hidden";
}

function isFocusableCandidate(element: Element): element is HTMLElement {
	if (!(element instanceof HTMLElement)) return false;
	if (
		element.hasAttribute("disabled") ||
		element.getAttribute("aria-disabled") === "true"
	) {
		return false;
	}

	return isVisible(element);
}

function getFocusableElements(): HTMLElement[] {
	return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
		isFocusableCandidate,
	);
}

function findBestCandidate(
	current: HTMLElement,
	candidates: HTMLElement[],
	action: TvRemoteAction,
): HTMLElement | null {
	const currentRect = current.getBoundingClientRect();
	const currentCenterX = currentRect.left + currentRect.width / 2;
	const currentCenterY = currentRect.top + currentRect.height / 2;

	let bestElement: HTMLElement | null = null;
	let bestScore = Number.POSITIVE_INFINITY;

	for (const candidate of candidates) {
		if (candidate === current) continue;

		const rect = candidate.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const deltaX = centerX - currentCenterX;
		const deltaY = centerY - currentCenterY;

		const inDirection =
			action === "left"
				? deltaX < -4
				: action === "right"
					? deltaX > 4
					: action === "up"
						? deltaY < -4
						: deltaY > 4;

		if (!inDirection) continue;

		const primaryDistance =
			action === "left" || action === "right"
				? Math.abs(deltaX)
				: Math.abs(deltaY);
		const secondaryDistance =
			action === "left" || action === "right"
				? Math.abs(deltaY)
				: Math.abs(deltaX);

		const score = primaryDistance * 10 + secondaryDistance;
		if (score < bestScore) {
			bestScore = score;
			bestElement = candidate;
		}
	}

	return bestElement;
}

function focusElement(element: HTMLElement): void {
	element.focus();
	element.scrollIntoView({
		block: "nearest",
		inline: "nearest",
		behavior: "smooth",
	});
}

function selectFocusedElement(): boolean {
	const activeElement = document.activeElement;
	if (!(activeElement instanceof HTMLElement)) return false;
	if (isTypingContext(activeElement)) return false;

	activeElement.click();
	return true;
}

function ensureInitialFocus(): void {
	const activeElement = document.activeElement;
	if (
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement
	) {
		return;
	}

	const first = getFocusableElements()[0];
	if (first) {
		focusElement(first);
	}
}

export function TvRemoteNavigationProvider({
	children,
}: TvRemoteNavigationProviderProps) {
	const router = useRouter();
	const pathname = usePathname();

	const moveFocus = useCallback((action: TvRemoteAction): boolean => {
		if (!DIRECTIONAL_ACTIONS.includes(action)) return false;

		const activeElement = document.activeElement;
		if (isTypingContext(activeElement)) return false;

		const selectOpen = document.querySelector(
			"[data-slot='select-content'][data-state='open']",
		);
		if (selectOpen) return false;

		const focusable = getFocusableElements();
		if (focusable.length === 0) return false;

		if (
			!(activeElement instanceof HTMLElement) ||
			!focusable.includes(activeElement)
		) {
			focusElement(focusable[0]);
			return true;
		}

		const next = findBestCandidate(activeElement, focusable, action);
		if (!next) return false;

		focusElement(next);
		return true;
	}, []);

	useTvRemote({
		enabled: true,
		capture: false,
		preventDefault: false,
		onAction: (action) => {
			if (moveFocus(action)) {
				return true;
			}

			if (action === "select") {
				return selectFocusedElement();
			}

			if (action === "back") {
				router.back();
				return true;
			}

			return false;
		},
	});

	useEffect(() => {
		void pathname;

		const timeoutId = window.setTimeout(() => {
			ensureInitialFocus();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [pathname]);

	return children;
}

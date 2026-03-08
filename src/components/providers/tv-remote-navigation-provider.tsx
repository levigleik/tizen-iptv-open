"use client";


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

function hasAxisAlignment(
	currentRect: DOMRect,
	candidateRect: DOMRect,
	action: TvRemoteAction,
): boolean {
	if (action === "up" || action === "down") {
		const overlap =
			Math.min(currentRect.right, candidateRect.right) -
			Math.max(currentRect.left, candidateRect.left);
		if (overlap > 0) return true;

		const currentCenterX = currentRect.left + currentRect.width / 2;
		const candidateCenterX = candidateRect.left + candidateRect.width / 2;
		const allowedOffset =
			Math.max(currentRect.width, candidateRect.width) * 0.6;
		return Math.abs(currentCenterX - candidateCenterX) <= allowedOffset;
	}

	const overlap =
		Math.min(currentRect.bottom, candidateRect.bottom) -
		Math.max(currentRect.top, candidateRect.top);
	if (overlap > 0) return true;

	const currentCenterY = currentRect.top + currentRect.height / 2;
	const candidateCenterY = candidateRect.top + candidateRect.height / 2;
	const allowedOffset =
		Math.max(currentRect.height, candidateRect.height) * 0.6;
	return Math.abs(currentCenterY - candidateCenterY) <= allowedOffset;
}

function findBestCandidate(
	current: HTMLElement,
	candidates: HTMLElement[],
	action: TvRemoteAction,
): HTMLElement | null {
	const currentRect = current.getBoundingClientRect();
	const currentCenterX = currentRect.left + currentRect.width / 2;
	const currentCenterY = currentRect.top + currentRect.height / 2;
	const currentScrollableAncestor = getClosestScrollableAncestor(current);

	let bestElement: HTMLElement | null = null;
	let bestScore = Number.POSITIVE_INFINITY;
	let bestAlignedElement: HTMLElement | null = null;
	let bestAlignedScore = Number.POSITIVE_INFINITY;
	let bestInSameContext: HTMLElement | null = null;
	let bestInSameContextScore = Number.POSITIVE_INFINITY;
	let bestAlignedInSameContext: HTMLElement | null = null;
	let bestAlignedInSameContextScore = Number.POSITIVE_INFINITY;

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
		const axisAligned = hasAxisAlignment(currentRect, rect, action);
		const candidateScrollableAncestor = getClosestScrollableAncestor(candidate);
		const isSameScrollableContext =
			currentScrollableAncestor !== null &&
			candidateScrollableAncestor === currentScrollableAncestor;

		if (
			isSameScrollableContext &&
			axisAligned &&
			score < bestAlignedInSameContextScore
		) {
			bestAlignedInSameContextScore = score;
			bestAlignedInSameContext = candidate;
		}

		if (isSameScrollableContext && score < bestInSameContextScore) {
			bestInSameContextScore = score;
			bestInSameContext = candidate;
		}

		if (axisAligned && score < bestAlignedScore) {
			bestAlignedScore = score;
			bestAlignedElement = candidate;
		}

		if (score < bestScore) {
			bestScore = score;
			bestElement = candidate;
		}
	}

	if (bestAlignedInSameContext) return bestAlignedInSameContext;
	if (bestInSameContext) return bestInSameContext;
	return bestAlignedElement ?? bestElement;
}

function isScrollableContainer(element: HTMLElement): boolean {
	const style = window.getComputedStyle(element);
	const canScrollY =
		(style.overflowY === "auto" || style.overflowY === "scroll") &&
		element.scrollHeight > element.clientHeight;
	const canScrollX =
		(style.overflowX === "auto" || style.overflowX === "scroll") &&
		element.scrollWidth > element.clientWidth;

	return canScrollY || canScrollX;
}

function getScrollableAncestors(element: HTMLElement): HTMLElement[] {
	const ancestors: HTMLElement[] = [];
	let current = element.parentElement;

	while (current) {
		if (isScrollableContainer(current)) {
			ancestors.push(current);
		}
		current = current.parentElement;
	}

	return ancestors;
}

function getClosestScrollableAncestor(
	element: HTMLElement,
): HTMLElement | null {
	return getScrollableAncestors(element)[0] ?? null;
}

function keepElementVisibleInScrollableAncestors(element: HTMLElement): void {
	const margin = 48;

	for (const container of getScrollableAncestors(element)) {
		const focusRect = element.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		let nextScrollTop = container.scrollTop;
		let nextScrollLeft = container.scrollLeft;

		if (focusRect.bottom > containerRect.bottom - margin) {
			nextScrollTop += focusRect.bottom - (containerRect.bottom - margin);
		} else if (focusRect.top < containerRect.top + margin) {
			nextScrollTop += focusRect.top - (containerRect.top + margin);
		}

		if (focusRect.right > containerRect.right - margin) {
			nextScrollLeft += focusRect.right - (containerRect.right - margin);
		} else if (focusRect.left < containerRect.left + margin) {
			nextScrollLeft += focusRect.left - (containerRect.left + margin);
		}

		if (
			nextScrollTop !== container.scrollTop ||
			nextScrollLeft !== container.scrollLeft
		) {
			container.scrollTo({
				top: nextScrollTop,
				left: nextScrollLeft,
				behavior: "smooth",
			});
		}
	}
}

function focusElement(element: HTMLElement): void {
	element.focus();
	element.scrollIntoView({
		block: "nearest",
		inline: "nearest",
		behavior: "smooth",
	});

	// Run after focus styles/layout settle so the card stays fully visible.
	window.requestAnimationFrame(() => {
		keepElementVisibleInScrollableAncestors(element);

		window.requestAnimationFrame(() => {
			keepElementVisibleInScrollableAncestors(element);
		});
	});
}

function selectFocusedElement(): boolean {
	const activeElement = document.activeElement;
	if (!(activeElement instanceof HTMLElement)) return false;
	if (isTypingContext(activeElement)) return false;

	activeElement.click();
	return true;
}

function getPreferredInitialFocusElement(): HTMLElement | null {
	const preferredSelectors = [
		"[data-initial-focus='variant']",
		"[data-initial-focus='catalog-item']",
	];

	for (const selector of preferredSelectors) {
		const preferred = document.querySelector(selector);
		if (preferred instanceof HTMLElement && isFocusableCandidate(preferred)) {
			return preferred;
		}
	}

	return null;
}

function ensureInitialFocus(): HTMLElement | null {
	const activeElement = document.activeElement;
	if (
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement
	) {
		return null;
	}

	const preferred = getPreferredInitialFocusElement();
	if (preferred) {
		focusElement(preferred);
		return preferred;
	}

	const focusable = getFocusableElements();
	const firstMainContent = focusable.find(
		(element) => element.dataset.sidebarFocus !== "true",
	);
	const first = firstMainContent ?? focusable[0];
	if (first) {
		focusElement(first);
		return first;
	}

	return null;
}

export function TvRemoteNavigationProvider({
	children,
}: TvRemoteNavigationProviderProps) {

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
			const firstMainContent = focusable.find(
				(element) => element.dataset.sidebarFocus !== "true",
			);
			focusElement(firstMainContent ?? focusable[0]);
			return true;
		}

		const activeSidebarRoot = activeElement.closest('[data-sidebar-root="true"]');
		let next = findBestCandidate(activeElement, focusable, action);

		const isEnteringSidebar = !activeSidebarRoot && next?.closest('[data-sidebar-root="true"]');
		if (isEnteringSidebar) {
			const activeSidebarItem = document.querySelector(
				'[data-sidebar-root="true"] [data-sidebar-active="true"]',
			);
			if (
				activeSidebarItem instanceof HTMLElement &&
				isFocusableCandidate(activeSidebarItem)
			) {
				next = activeSidebarItem;
			}
		}

		// Prevent vertical navigation from escaping the sidebar.
		const nextSidebarRoot = next?.closest('[data-sidebar-root="true"]');
		if (activeSidebarRoot && (action === "up" || action === "down") && nextSidebarRoot !== activeSidebarRoot) {
			// If we are in the sidebar and trying to go up/down but it escapes to the main content, stay put.
			return true;
		}

		const isCatalogVerticalMove =
			(activeElement.dataset.catalogItem === "true" ||
				activeElement.closest("[data-catalog-grid='true']") !== null) &&
			(action === "up" || action === "down");
		if (isCatalogVerticalMove) {
			const currentGrid = activeElement.closest("[data-catalog-grid='true']");
			const nextGrid = next?.closest("[data-catalog-grid='true']") ?? null;

			// Keep focus in the same catalog grid while loading more items.
			if (currentGrid && (!next || nextGrid !== currentGrid)) {
				return true;
			}
		}

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
				const activeElement = document.activeElement;
				if (isTypingContext(activeElement)) return false;

				const isSidebarPresent = document.querySelector('[data-sidebar-root="true"]') !== null;
				if (!isSidebarPresent) {
					// Fallback if there is no sidebar (e.g., if a page prevents default but somehow reaches here, or full-screen modes Without layout)
					window.history.back();
					return true;
				}

				const isSidebarFocused =
					activeElement instanceof HTMLElement &&
					activeElement.closest('[data-sidebar-root="true"]') !== null;

				const hash = window.location.hash || "#/";
				const isHomePath = hash === "#/" || hash === "#";

				if (!isSidebarFocused) {
					// 1. Move focus back to the Sidebar
					const activeSidebarItem = document.querySelector(
						'[data-sidebar-root="true"] [data-sidebar-active="true"]',
					);
					if (activeSidebarItem instanceof HTMLElement && isFocusableCandidate(activeSidebarItem)) {
						focusElement(activeSidebarItem);
					} else {
						const firstSidebarItem = document.querySelector('[data-sidebar-root="true"] a[href]');
						if (firstSidebarItem instanceof HTMLElement && isFocusableCandidate(firstSidebarItem)) {
							focusElement(firstSidebarItem);
						}
					}
					return true;
				}

				if (!isHomePath) {
					// 2. If inside sidebar but not on Home -> navigate to Home
					window.location.hash = "#/";
					return true;
				}

				// 3. If inside Sidebar AND on Home -> Exit Application
				try {
					// @ts-ignore
					if (typeof tizen !== "undefined" && tizen.application) {
						// @ts-ignore
						tizen.application.getCurrentApplication().exit();
					}
				} catch (e) {
					console.error("Failed to exit application", e);
				}

				return true;
			}

			return false;
		},
	});

	useEffect(() => {
		let intervalId: number | null = null;
		let guardTimeoutId: number | null = null;
		let timeoutId: number | null = null;

		const triggerFocusRoutine = () => {
			if (timeoutId !== null) window.clearTimeout(timeoutId);
			if (intervalId !== null) window.clearInterval(intervalId);
			if (guardTimeoutId !== null) window.clearTimeout(guardTimeoutId);

			timeoutId = window.setTimeout(() => {
				const initialFocused = ensureInitialFocus();

				let attempts = 0;
				const maxAttempts = 20; // Reduce polling time since routing is fast
				intervalId = window.setInterval(() => {
					attempts += 1;

					const preferred = getPreferredInitialFocusElement();
					if (!preferred) {
						if (attempts >= maxAttempts && intervalId !== null) {
							window.clearInterval(intervalId);
							intervalId = null;
						}
						return;
					}

					const activeElement = document.activeElement;
					const canReplaceFocus =
						!(activeElement instanceof HTMLElement) ||
						activeElement === document.body ||
						activeElement === document.documentElement ||
						activeElement === document.querySelector(".movie-poster") || // generic placeholder focus
						activeElement === initialFocused ||
						isTypingContext(activeElement);

					if (canReplaceFocus) {
						focusElement(preferred);
					}

					if (intervalId !== null) {
						window.clearInterval(intervalId);
						intervalId = null;
					}
				}, 80);

				guardTimeoutId = window.setTimeout(
					() => {
						if (intervalId !== null) {
							window.clearInterval(intervalId);
							intervalId = null;
						}
					},
					maxAttempts * 80 + 100,
				);
			}, 0);

		};

		// Run initially
		triggerFocusRoutine();

		// Expose a custom event for triggering from inner components (like when infinite loading finishes or router transitions)
		const handleFocusRequest = () => {
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => {
					triggerFocusRoutine();
				});
			});
		};

		window.addEventListener("hashchange", handleFocusRequest);
		window.addEventListener("tv-focus-request", handleFocusRequest);

		return () => {
			window.removeEventListener("hashchange", handleFocusRequest);
			window.removeEventListener("tv-focus-request", handleFocusRequest);
			
			if (timeoutId !== null) window.clearTimeout(timeoutId);
			if (intervalId !== null) window.clearInterval(intervalId);
			if (guardTimeoutId !== null) window.clearTimeout(guardTimeoutId);
		};
	}, []);

	return children;
}

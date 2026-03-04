"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

const failedImageSrc = new Set<string>();

interface CatalogImageProps extends Omit<ImageProps, "src"> {
	src?: string | null;
	fallbackSrc?: string;
}

export function CatalogImage({
	src,
	fallbackSrc = "/catalog-fallback.svg",
	onError,
	...props
}: CatalogImageProps) {
	const resolvedSrc = src ?? "";
	const [useFallback, setUseFallback] = useState(
		!resolvedSrc || failedImageSrc.has(resolvedSrc),
	);

	useEffect(() => {
		if (!resolvedSrc || failedImageSrc.has(resolvedSrc)) {
			setUseFallback(true);
			return;
		}

		setUseFallback(false);
	}, [resolvedSrc]);

	return (
		<Image
			{...props}
			src={useFallback ? fallbackSrc : resolvedSrc}
			onError={(event) => {
				if (!useFallback && resolvedSrc) {
					failedImageSrc.add(resolvedSrc);
					setUseFallback(true);
				}

				onError?.(event);
			}}
		/>
	);
}

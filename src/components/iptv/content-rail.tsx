import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DisplayItem } from "@/types/iptv";

interface ContentRailProps {
	items: DisplayItem[];
	focusedIndex: number;
	onFocus: (index: number) => void;
	onSelect: (item: DisplayItem) => void;
}

export function ContentRail({
	items,
	focusedIndex,
	onFocus,
	onSelect,
}: ContentRailProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{items.map((item, index) => {
				const isFocused = focusedIndex === index;

				return (
					<button
						type="button"
						key={`${item.id}-${item.rawTitle}`}
						onClick={() => onSelect(item)}
						onFocus={() => onFocus(index)}
						className="text-left"
					>
						<Card
							className={[
								"overflow-hidden border-border transition-all",
								isFocused ? "border-primary ring-2 ring-primary" : "",
							].join(" ")}
						>
							<div className="relative h-40 w-full bg-muted">
								{item.thumbnail ? (
									<Image
										src={item.thumbnail}
										alt={item.title}
										fill
										sizes="(max-width: 768px) 100vw, 25vw"
										unoptimized
										className="object-cover"
									/>
								) : (
									<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
										Sem miniatura
									</div>
								)}
							</div>
							<CardContent className="space-y-2 px-4 py-3">
								<p className="line-clamp-2 text-sm font-semibold">
									{item.title}
								</p>
								<p className="line-clamp-1 text-xs text-muted-foreground">
									{item.subtitle}
								</p>
								<div className="flex flex-wrap gap-1">
									<Badge variant="outline">{item.groupTitle}</Badge>
									{item.badges.slice(0, 3).map((tag) => (
										<Badge key={`${item.id}-${tag}`}>{tag}</Badge>
									))}
								</div>
							</CardContent>
						</Card>
					</button>
				);
			})}
		</div>
	);
}

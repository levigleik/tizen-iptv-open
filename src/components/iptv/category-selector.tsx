import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { CatalogCategory } from "@/types/iptv";

export interface CategoryOption {
	key: CatalogCategory;
	label: string;
	description: string;
	count: number;
}

interface CategorySelectorProps {
	options: CategoryOption[];
	selectedCategory: CatalogCategory | null;
	focusedIndex: number;
	onFocus: (index: number) => void;
	onSelect: (category: CatalogCategory) => void;
}

export function CategorySelector({
	options,
	selectedCategory,
	focusedIndex,
	onFocus,
	onSelect,
}: CategorySelectorProps) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			{options.map((option, index) => {
				const isSelected = selectedCategory === option.key;
				const isFocused = focusedIndex === index;

				return (
					<Button
						type="button"
						key={option.key}
						onClick={() => onSelect(option.key)}
						onFocus={() => onFocus(index)}
						className="h-auto w-full justify-start whitespace-normal border-0 bg-transparent p-0 text-left hover:bg-transparent"
						variant="icon"
					>
						<Card
							className={[
								"transition-all",
								isSelected ? "border-primary" : "border-border",
								isFocused ? "ring-2 ring-primary" : "",
							].join(" ")}
						>
							<CardHeader>
								<div className="flex items-center justify-between gap-3">
									<CardTitle className="text-xl">{option.label}</CardTitle>
									<Badge variant={isSelected ? "default" : "outline"}>
										{option.count}
									</Badge>
								</div>
								<CardDescription>{option.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground text-sm">
									{isSelected
										? "Selecionado para navegação"
										: "Pressione Enter para abrir"}
								</p>
							</CardContent>
						</Card>
					</Button>
				);
			})}
		</div>
	);
}

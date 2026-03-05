import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: "sm" | "md" | "lg" | "xl";
	mode?: "spinner" | "dots" | "skeleton";
}

const sizeClasses = {
	sm: "h-4 w-4 border-2",
	md: "h-8 w-8 border-3",
	lg: "h-12 w-12 border-4",
	xl: "h-16 w-16 border-4",
};

export function LoadingSpinner({
	size = "md",
	mode = "spinner",
	className,
	...props
}: LoadingSpinnerProps) {
	if (mode === "dots") {
		return (
			<div
				className={cn("flex items-center justify-center gap-1", className)}
				{...props}
			>
				<div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
				<div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
				<div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"animate-spin rounded-full border-muted border-t-primary",
				sizeClasses[size],
				className,
			)}
			{...props}
		/>
	);
}

export function LoadingOverlay({
	text = "Carregando...",
	blur = true,
}: {
	text?: string;
	blur?: boolean;
}) {
	return (
		<div
			className={cn(
				"absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/60",
				blur && "backdrop-blur-sm",
			)}
		>
			<LoadingSpinner size="lg" />
			{text && (
				<p className="animate-pulse text-sm font-medium text-muted-foreground tracking-wide">
					{text}
				</p>
			)}
		</div>
	);
}

export function LoadingScreen({ text = "Carregando..." }: { text?: string }) {
	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
			<LoadingSpinner size="xl" />
			{text && (
				<p className="animate-pulse text-base font-semibold text-primary tracking-widest uppercase">
					{text}
				</p>
			)}
		</div>
	);
}

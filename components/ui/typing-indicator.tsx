import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
    className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
            </div>
        </div>
    )
}

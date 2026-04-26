import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "shrink-0 animate-pulse rounded-md bg-foreground/10 ring-1 ring-border/50 dark:bg-foreground/15",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

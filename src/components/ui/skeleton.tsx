import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent/20 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

function AppCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("backdrop-blur-xl bg-white/5 dark:bg-black/10 border border-white/10 rounded-2xl p-6 animate-pulse", className)}>
      <div className="aspect-video bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded-xl mb-4" />
      <div className="space-y-3">
        <div className="h-6 bg-gradient-to-r from-cosmic-blue/30 to-cosmic-purple/30 rounded w-3/4" />
        <div className="h-4 bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded w-full" />
        <div className="h-4 bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded w-5/6" />
        <div className="flex gap-2 mt-4">
          <div className="h-6 w-16 bg-cosmic-blue/20 rounded-full" />
          <div className="h-6 w-16 bg-cosmic-purple/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 backdrop-blur-xl bg-white/5 dark:bg-black/10 border border-white/10 rounded-xl animate-pulse", className)}>
      <div className="h-12 w-12 bg-gradient-to-br from-cosmic-blue/20 to-cosmic-purple/20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gradient-to-r from-cosmic-blue/30 to-cosmic-purple/30 rounded w-1/2" />
        <div className="h-3 bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded w-3/4" />
      </div>
      <div className="h-8 w-20 bg-cosmic-blue/20 rounded-lg" />
    </div>
  );
}

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("backdrop-blur-xl bg-white/5 dark:bg-black/10 border border-white/10 rounded-xl p-6 text-center animate-pulse", className)}>
      <div className="h-16 w-16 bg-gradient-to-br from-cosmic-blue/20 to-cosmic-purple/20 rounded-full mx-auto mb-4" />
      <div className="h-8 bg-gradient-to-r from-cosmic-blue/30 to-cosmic-purple/30 rounded w-16 mx-auto mb-2" />
      <div className="h-4 bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded w-24 mx-auto" />
    </div>
  );
}

function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded animate-pulse",
            i === lines - 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("backdrop-blur-xl bg-white/5 dark:bg-black/10 border border-white/10 rounded-xl overflow-hidden", className)}>
      <div className="border-b border-white/10 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gradient-to-r from-cosmic-blue/30 to-cosmic-purple/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="border-b border-white/5 p-4 last:border-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={colIdx} className="h-4 bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, AppCardSkeleton, ListItemSkeleton, StatCardSkeleton, TextSkeleton, TableSkeleton }

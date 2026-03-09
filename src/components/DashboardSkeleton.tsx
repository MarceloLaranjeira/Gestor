import { Skeleton } from "@/components/ui/skeleton";

const SkeletonCard = () => (
  <div className="glass-card rounded-xl p-5 space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24 animate-shimmer" />
        <Skeleton className="h-8 w-16 animate-shimmer" />
        <Skeleton className="h-3 w-32 animate-shimmer" />
      </div>
      <Skeleton className="w-11 h-11 rounded-xl shrink-0 animate-shimmer" />
    </div>
  </div>
);

const SkeletonChart = ({ height = 240 }: { height?: number }) => (
  <div className="glass-card rounded-xl p-5 space-y-4">
    <Skeleton className="h-4 w-40 animate-shimmer" />
    <Skeleton className={`w-full rounded-lg animate-shimmer`} style={{ height }} />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-3 py-3 px-5 border-t border-border/50">
    <Skeleton className="h-3 flex-1 max-w-[250px] animate-shimmer" />
    <Skeleton className="h-5 w-16 rounded-full animate-shimmer" />
    <Skeleton className="h-3 w-28 animate-shimmer hidden sm:block" />
    <Skeleton className="h-3 w-20 animate-shimmer hidden md:block" />
    <Skeleton className="h-3 w-16 animate-shimmer hidden lg:block" />
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36 animate-shimmer" />
        <Skeleton className="h-4 w-56 animate-shimmer" />
      </div>
    </div>

    {/* Stats Row 1 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>

    {/* Stats Row 2 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <SkeletonChart height={240} />
      </div>
      <SkeletonChart height={240} />
    </div>

    {/* Demandas + Eventos */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SkeletonChart height={140} />
      <SkeletonChart height={140} />
    </div>

    {/* Tables */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 glass-card rounded-xl">
        <div className="p-5 pb-3">
          <Skeleton className="h-4 w-36 animate-shimmer" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
      <div className="glass-card rounded-xl p-5 space-y-3">
        <Skeleton className="h-4 w-32 animate-shimmer" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Skeleton className="h-6 w-6 animate-shimmer" />
              <Skeleton className="h-3 w-6 animate-shimmer" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-full animate-shimmer" />
              <Skeleton className="h-3 w-20 animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardSkeleton;

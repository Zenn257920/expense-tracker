import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <main className="min-h-screen space-y-8 bg-zinc-950 p-6 text-white">
      {/* Dashboard Header */}
      <div className="mb-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>
      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>

            <Skeleton className="mt-6 h-7 w-40" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </section>

      {/* Monthly Overview Chart */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        {/* Chart Header */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Chart Legend */}
        <div className="mt-8 flex justify-center gap-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Chart Area */}
        <div className="mt-6 flex gap-4">
          {/* Y Axis */}
          <div className="flex flex-col justify-between pb-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-10" />
            ))}
          </div>

          {/* Chart Lines / Grid */}
          <div className="flex flex-1 flex-col justify-between pb-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-px w-full" />
            ))}

            {/* X Axis */}
            <div className="mt-4 flex justify-between">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}

export default function Loading() {
  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <Skeleton className="w-36 h-7" />

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Skeleton className="w-full md:w-64 h-10" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-10 h-10" />
            <Skeleton className="w-10 h-10" />
            <Skeleton className="w-10 h-10" />
          </div>
        </div>
      </div>

      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 p-5 rounded-xl min-h-[150px] animate-pulse"
          >
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <Skeleton className="bg-white/70 w-2/3 h-6" />
                <div className="flex items-center gap-2">
                  <Skeleton className="bg-white/70 w-8 h-8" />
                  <Skeleton className="bg-white/70 w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="bg-white/70 w-1/2 h-4" />
                <Skeleton className="bg-white/70 w-full h-4" />
                <Skeleton className="bg-white/70 w-5/6 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

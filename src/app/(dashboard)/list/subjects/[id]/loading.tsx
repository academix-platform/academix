function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}

export default function Loading() {
  return (
    <div className="space-y-6 bg-gray-50 p-6 min-h-screen">
      <div className="flex items-center gap-2">
        <Skeleton className="w-16 h-4" />
        <Skeleton className="rounded-full w-4 h-4" />
        <Skeleton className="w-36 h-4" />
      </div>

      <Skeleton className="rounded-xl w-full h-48" />

      <div className="flex justify-between items-start gap-4 bg-white p-6 border border-gray-100 rounded-xl">
        <div className="flex items-start gap-4 w-full">
          <Skeleton className="rounded-xl w-14 h-14" />
          <div className="space-y-3 w-full">
            <Skeleton className="w-56 h-7" />
            <Skeleton className="w-72 h-4" />
            <Skeleton className="w-full max-w-xl h-4" />
            <Skeleton className="w-5/6 max-w-xl h-4" />
          </div>
        </div>
        <Skeleton className="rounded-lg w-28 h-10" />
      </div>

      <Skeleton className="rounded-xl w-full h-12" />

      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white p-5 border border-gray-100 rounded-xl"
          >
            <Skeleton className="rounded-xl w-11 h-11" />
            <div className="space-y-2">
              <Skeleton className="w-10 h-7" />
              <Skeleton className="w-20 h-4" />
            </div>
          </div>
        ))}
      </div>

      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-xl">
            <div className="flex gap-3 p-4 border-gray-100 border-b">
              <Skeleton className="w-24 h-8" />
              <Skeleton className="w-28 h-8" />
              <Skeleton className="w-24 h-8" />
            </div>
            <div className="space-y-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-start gap-4">
                  <div className="space-y-2 w-full">
                    <Skeleton className="w-2/3 h-5" />
                    <Skeleton className="w-5/6 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                  <Skeleton className="w-24 h-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 border border-gray-100 rounded-xl">
            <Skeleton className="mb-4 w-28 h-5" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-10 h-4" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 border border-gray-100 rounded-xl">
            <Skeleton className="mb-4 w-24 h-5" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="rounded-full w-10 h-10" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="w-28 h-4" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

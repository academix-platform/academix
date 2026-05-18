const pulse = "animate-pulse rounded-md bg-slate-200";

export function AdminPageSkeleton() {
  return (
    <div className="flex lg:flex-row flex-col gap-4 p-4">
      <div className="flex flex-col gap-8 w-full lg:w-2/3">
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 border border-slate-100 rounded-2xl"
            >
              <div className={`${pulse} ml-auto mb-6 w-8 h-8`} />
              <div className={`${pulse} mb-3 w-16 h-8`} />
              <div className={`${pulse} w-20 h-4`} />
            </div>
          ))}
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-lg h-[450px]">
          <div className={`${pulse} mb-8 w-36 h-6`} />
          <div className="items-end gap-4 grid grid-cols-6 h-[360px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${pulse} w-full`}
                style={{ height: `${35 + i * 10}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full lg:w-1/3">
        <div className="bg-white p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-4 w-28 h-6`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-3 w-full h-16`} />
          ))}
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-4 w-36 h-6`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-3 w-full h-20`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="bg-white m-4 p-4 border border-slate-100 rounded-md">
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className={`${pulse} w-36 h-7`} />
        <div className="flex gap-2">
          <div className={`${pulse} w-56 h-10`} />
          <div className={`${pulse} w-10 h-10`} />
          <div className={`${pulse} w-10 h-10`} />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="gap-3 grid grid-cols-12">
            <div className={`${pulse} col-span-3 h-10`} />
            <div className={`${pulse} col-span-3 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceListSkeleton() {
  return (
    <div className="bg-white m-4 p-4 border border-slate-100 rounded-md">
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className={`${pulse} w-44 h-7`} />
        <div className="flex gap-2">
          <div className={`${pulse} w-44 h-10`} />
          <div className={`${pulse} w-10 h-10`} />
        </div>
      </div>
      <div className="gap-4 grid md:grid-cols-3 mb-4">
        <div className={`${pulse} h-24`} />
        <div className={`${pulse} h-24`} />
        <div className={`${pulse} h-24`} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="gap-3 grid grid-cols-12">
            <div className={`${pulse} col-span-4 h-10`} />
            <div className={`${pulse} col-span-3 h-10`} />
            <div className={`${pulse} col-span-3 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LessonsListSkeleton() {
  return (
    <div className="bg-white m-4 p-4 border border-slate-100 rounded-md">
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className={`${pulse} w-40 h-7`} />
        <div className="flex gap-2">
          <div className={`${pulse} w-56 h-10`} />
          <div className={`${pulse} w-10 h-10`} />
          <div className={`${pulse} w-10 h-10`} />
        </div>
      </div>
      <div className="gap-3 grid md:grid-cols-6 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${pulse} h-12`} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="gap-3 grid grid-cols-12">
            <div className={`${pulse} col-span-3 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
            <div className={`${pulse} col-span-3 h-10`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewPageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className={`${pulse} w-56 h-8`} />
      <div className="gap-4 grid md:grid-cols-2">
        <div className="bg-white p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-4 w-40 h-6`} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-3 w-full h-12`} />
          ))}
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-4 w-28 h-6`} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-2 w-full h-8`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScheduleDashboardSkeleton() {
  return (
    <div className="flex xl:flex-row flex-col gap-4 p-4">
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} mb-4 w-36 h-7`} />
          <div className={`${pulse} w-full h-[620px]`} />
        </div>
      </div>
      <div className="flex flex-col gap-8 w-full xl:w-1/3">
        <div className="bg-white p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} mb-4 w-24 h-6`} />
          <div className={`${pulse} mb-4 w-full h-64`} />
          <div className={`${pulse} mb-2 w-40 h-6`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-3 w-full h-16`} />
          ))}
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} mb-4 w-40 h-6`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-3 w-full h-20`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className={`${pulse} w-40 h-8`} />
      <div className="space-y-3 bg-white p-4 border border-slate-100 rounded-lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${pulse} w-full h-12`} />
        ))}
      </div>
    </div>
  );
}

export function ProfileDetailSkeleton() {
  return (
    <div className="flex xl:flex-row flex-col gap-4 p-4">
      <div className="space-y-4 w-full xl:w-3/4">
        <div className="flex flex-wrap md:flex-nowrap gap-4">
          <div className="bg-white p-4 border border-slate-100 rounded-md w-full md:w-2/3">
            <div className={`${pulse} w-32 h-32 rounded-full mb-4`} />
            <div className={`${pulse} w-52 h-7 mb-4`} />
            <div className="gap-3 grid grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${pulse} h-5`} />
              ))}
            </div>
          </div>
          <div className="gap-4 grid grid-cols-2 w-full md:w-1/3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 border border-slate-100 rounded-md"
              >
                <div className={`${pulse} w-8 h-8 mb-3`} />
                <div className={`${pulse} w-14 h-6 mb-2`} />
                <div className={`${pulse} w-20 h-4`} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 border border-slate-100 rounded-md h-[700px]">
          <div className={`${pulse} w-48 h-6 mb-4`} />
          <div className={`${pulse} w-full h-[620px]`} />
        </div>
      </div>
      <div className="space-y-4 w-full xl:w-1/4">
        <div className="bg-white p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} w-28 h-6 mb-4`} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${pulse} h-10 mb-2`} />
          ))}
        </div>
        <div className={`${pulse} h-44`} />
        <div className={`${pulse} h-64`} />
      </div>
    </div>
  );
}

export function ExamSubmissionsSkeleton() {
  return (
    <div className="bg-white m-4 p-4 border border-slate-100 rounded-md">
      <div className={`${pulse} w-64 h-6 mb-6`} />
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${pulse} h-20`} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="gap-3 grid grid-cols-12">
            <div className={`${pulse} col-span-4 h-10`} />
            <div className={`${pulse} col-span-3 h-10`} />
            <div className={`${pulse} col-span-2 h-10`} />
            <div className={`${pulse} col-span-3 h-10`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExamGradingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className={`${pulse} w-72 h-8`} />
      <div className="space-y-4 bg-white p-4 border border-slate-100 rounded-md">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${pulse} h-20`} />
        ))}
      </div>
    </div>
  );
}

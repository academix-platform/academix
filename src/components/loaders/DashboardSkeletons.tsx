const pulse = "animate-pulse rounded-md bg-slate-200";

const CalendarGridSkeleton = () => (
  <div className="p-2 sm:p-3 border border-slate-100 rounded-md">
    <div className="flex justify-between items-center mb-2 sm:mb-3">
      <div className={`${pulse} w-24 sm:w-28 h-4 sm:h-5`} />
      <div className="flex gap-1.5 sm:gap-2">
        <div className={`${pulse} rounded-full w-6 sm:w-8 h-6 sm:h-8`} />
        <div className={`${pulse} rounded-full w-6 sm:w-8 h-6 sm:h-8`} />
      </div>
    </div>
    <div className="gap-1 sm:gap-2 grid grid-cols-7 mb-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className={`${pulse} h-4 sm:h-6`} />
      ))}
    </div>
    <div className="gap-1 sm:gap-2 grid grid-cols-7">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="p-0.5 sm:p-1 border border-slate-100 rounded-md h-12 sm:h-20"
        >
          <div className={`${pulse} mb-0.5 sm:mb-1 w-4 h-3 sm:h-4`} />
          <div className={`${pulse} mb-0.5 sm:mb-1 w-full h-2 sm:h-3`} />
          <div className={`${pulse} w-1/2 h-2 sm:h-3`} />
        </div>
      ))}
    </div>
  </div>
);

const MiniDatePickerSkeleton = () => (
  <div className="p-2 sm:p-3 border border-slate-100 rounded-md">
    <div className="flex justify-between items-center mb-2 sm:mb-3">
      <div className={`${pulse} w-20 sm:w-24 h-4 sm:h-5`} />
      <div className="flex gap-1 sm:gap-2">
        <div className={`${pulse} rounded-full w-5 sm:w-7 h-5 sm:h-7`} />
        <div className={`${pulse} rounded-full w-5 sm:w-7 h-5 sm:h-7`} />
      </div>
    </div>
    <div className="gap-1 sm:gap-1.5 grid grid-cols-7 mb-1.5 sm:mb-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className={`${pulse} h-3 sm:h-4`} />
      ))}
    </div>
    <div className="gap-1 sm:gap-1.5 grid grid-cols-7">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="flex justify-center items-center border border-slate-100 rounded-md h-6 sm:h-8"
        >
          <div className={`${pulse} w-3 sm:w-4 h-3 sm:h-4 rounded-full`} />
        </div>
      ))}
    </div>
  </div>
);

export function AdminPageSkeleton() {
  return (
    <div className="flex lg:flex-row flex-col gap-3 sm:gap-4 p-3 sm:p-4">
      <div className="flex flex-col gap-4 sm:gap-8 w-full lg:w-2/3">
        <div className="gap-2 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-3 sm:p-4 border border-slate-100 rounded-2xl"
            >
              <div className={`${pulse} ml-auto mb-4 sm:mb-6 w-8 h-8`} />
              <div className={`${pulse} mb-2 sm:mb-3 w-16 h-6 sm:h-8`} />
              <div className={`${pulse} w-20 h-3 sm:h-4`} />
            </div>
          ))}
        </div>
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-lg min-h-[300px] sm:min-h-[450px]">
          <div className={`${pulse} mb-4 sm:mb-8 w-36 h-5 sm:h-6`} />
          <div className="flex-1 items-end gap-2 sm:gap-4 grid grid-cols-3 sm:grid-cols-6">
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
      <div className="flex flex-col gap-3 sm:gap-4 w-full lg:w-1/3">
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-lg">
          <MiniDatePickerSkeleton />
          <div
            className={`${pulse} mt-3 sm:mt-4 mb-2 sm:mb-3 w-28 h-5 sm:h-6`}
          />
          {Array.from({ length: 1 }).map((_, i) => (
            <div
              key={i}
              className={`${pulse} mb-2 sm:mb-3 w-full h-12 sm:h-16`}
            />
          ))}
        </div>
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-3 sm:mb-4 w-36 h-5 sm:h-6`} />
          {Array.from({ length: 1 }).map((_, i) => (
            <div
              key={i}
              className={`${pulse} mb-2 sm:mb-3 w-full h-16 sm:h-20`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="bg-white m-2 sm:m-4 p-3 sm:p-4 border border-slate-100 rounded-md">
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className={`${pulse} w-36 h-6 sm:h-7`} />
        <div className="flex flex-wrap gap-2">
          <div className={`${pulse} w-40 sm:w-56 h-9 sm:h-10`} />
          <div className={`${pulse} w-9 sm:w-10 h-9 sm:h-10`} />
          <div className={`${pulse} w-9 sm:w-10 h-9 sm:h-10`} />
        </div>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12"
          >
            <div className={`${pulse} col-span-1 md:col-span-3 h-9 sm:h-10`} />
            <div className={`${pulse} col-span-1 md:col-span-3 h-9 sm:h-10`} />
            <div className={`${pulse} col-span-1 md:col-span-2 h-9 sm:h-10`} />
            <div
              className={`${pulse} col-span-1 md:col-span-2 h-9 sm:h-10 hidden sm:block`}
            />
            <div
              className={`${pulse} col-span-1 md:col-span-2 h-9 sm:h-10 hidden md:block`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceListSkeleton() {
  return (
    <div className="bg-white m-2 sm:m-4 p-3 sm:p-4 border border-slate-100 rounded-md">
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className={`${pulse} w-44 h-6 sm:h-7`} />
        <div className="flex flex-wrap gap-2">
          <div className={`${pulse} w-40 sm:w-44 h-9 sm:h-10`} />
          <div className={`${pulse} w-9 sm:w-10 h-9 sm:h-10`} />
        </div>
      </div>
      <div className="gap-2 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-4">
        <div className={`${pulse} h-20 sm:h-24`} />
        <div className={`${pulse} h-20 sm:h-24`} />
        <div className={`${pulse} h-20 sm:h-24 hidden md:block`} />
      </div>
      <div className="space-y-2 sm:space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12"
          >
            <div className={`${pulse} col-span-1 md:col-span-4 h-9 sm:h-10`} />
            <div className={`${pulse} col-span-1 md:col-span-3 h-9 sm:h-10`} />
            <div
              className={`${pulse} col-span-1 md:col-span-3 h-9 sm:h-10 hidden md:block`}
            />
            <div
              className={`${pulse} col-span-1 md:col-span-2 h-9 sm:h-10 hidden md:block`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LessonsListSkeleton() {
  return (
    <div className="bg-white m-2 sm:m-4 p-3 sm:p-4 border border-slate-100 rounded-md">
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className={`${pulse} w-40 h-6 sm:h-7`} />
        <div className="flex flex-wrap gap-2">
          <div className={`${pulse} w-40 sm:w-56 h-9 sm:h-10`} />
          <div className={`${pulse} w-9 sm:w-10 h-9 sm:h-10`} />
          <div className={`${pulse} w-9 sm:w-10 h-9 sm:h-10`} />
        </div>
      </div>
      <div className="gap-2 sm:gap-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${pulse} h-10 sm:h-12`} />
        ))}
      </div>
      <div className="block mt-4 sm:mt-6">
        <div className={`${pulse} mb-2 sm:mb-3 w-44 h-5 sm:h-6`} />
        <CalendarGridSkeleton />
      </div>
    </div>
  );
}

export function OverviewPageSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
      <div className={`${pulse} w-56 h-7 sm:h-8`} />
      <div className="gap-3 sm:gap-4 grid grid-cols-1 md:grid-cols-2">
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-3 sm:mb-4 w-40 h-5 sm:h-6`} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`${pulse} mb-2 sm:mb-3 w-full h-10 sm:h-12`}
            />
          ))}
        </div>
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-lg">
          <div className={`${pulse} mb-3 sm:mb-4 w-28 h-5 sm:h-6`} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${pulse} mb-2 w-full h-7 sm:h-8`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScheduleDashboardSkeleton() {
  return (
    <div className="flex xl:flex-row flex-col gap-3 sm:gap-4 p-3 sm:p-4">
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} mb-3 sm:mb-4 w-36 h-6 sm:h-7`} />
          <div className="hidden lg:block">
            <CalendarGridSkeleton />
          </div>
          <div className="lg:hidden space-y-2 sm:space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="gap-2 sm:gap-3 grid grid-cols-1 md:grid-cols-12"
              >
                <div
                  className={`${pulse} col-span-1 md:col-span-3 h-8 sm:h-10`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:gap-8 w-full xl:w-1/3">
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md">
          <MiniDatePickerSkeleton />
          <div
            className={`${pulse} mt-3 sm:mt-4 mb-2 sm:mb-2 w-full h-5 sm:h-6`}
          />
          {Array.from({ length: 1 }).map((_, i) => (
            <div
              key={i}
              className={`${pulse} mb-2 sm:mb-3 w-full h-12 sm:h-16`}
            />
          ))}
        </div>
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} mb-3 sm:mb-4 w-full h-5 sm:h-6`} />
          {Array.from({ length: 1 }).map((_, i) => (
            <div
              key={i}
              className={`${pulse} mb-2 sm:mb-3 w-full h-16 sm:h-20`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
      <div className={`${pulse} w-40 h-7 sm:h-8`} />
      <div className="space-y-2 sm:space-y-3 bg-white p-3 sm:p-4 border border-slate-100 rounded-lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${pulse} w-full h-10 sm:h-12`} />
        ))}
      </div>
    </div>
  );
}

export function ProfileDetailSkeleton() {
  return (
    <div className="flex xl:flex-row flex-col gap-3 sm:gap-4 p-3 sm:p-4">
      <div className="space-y-3 sm:space-y-4 w-full xl:w-3/4">
        <div className="flex flex-col sm:flex-wrap md:flex-nowrap gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md w-full md:w-2/3">
            <div
              className={`${pulse} w-24 sm:w-32 h-24 sm:h-32 rounded-full mb-3 sm:mb-4`}
            />
            <div className={`${pulse} w-40 sm:w-52 h-6 sm:h-7 mb-3 sm:mb-4`} />
            <div className="gap-2 sm:gap-3 grid grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${pulse} h-4 sm:h-5`} />
              ))}
            </div>
          </div>
          <div className="gap-2 sm:gap-4 grid grid-cols-2 w-full md:w-1/3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md"
              >
                <div
                  className={`${pulse} w-6 sm:w-8 h-6 sm:h-8 mb-2 sm:mb-3`}
                />
                <div
                  className={`${pulse} w-12 sm:w-14 h-5 sm:h-6 mb-1 sm:mb-2`}
                />
                <div className={`${pulse} w-16 sm:w-20 h-3 sm:h-4`} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md min-h-[400px] sm:min-h-[700px]">
          <div className={`${pulse} w-40 sm:w-48 h-5 sm:h-6 mb-3 sm:mb-4`} />
          <CalendarGridSkeleton />
        </div>
      </div>
      <div className="space-y-3 sm:space-y-4 w-full xl:w-1/4">
        <div className="bg-white p-3 sm:p-4 border border-slate-100 rounded-md">
          <div className={`${pulse} w-28 h-5 sm:h-6 mb-3 sm:mb-4`} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${pulse} h-8 sm:h-10 mb-2`} />
          ))}
        </div>
        <div className={`${pulse} h-40 sm:h-44`} />
        <div className={`${pulse} h-56 sm:h-64`} />
      </div>
    </div>
  );
}

export function ExamSubmissionsSkeleton() {
  return (
    <div className="bg-white m-2 sm:m-4 p-3 sm:p-4 border border-slate-100 rounded-md">
      <div className={`${pulse} w-64 h-5 sm:h-6 mb-4 sm:mb-6`} />
      <div className="gap-2 sm:gap-4 grid grid-cols-2 md:grid-cols-4 mb-4 sm:mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${pulse} h-16 sm:h-20`} />
        ))}
      </div>
      <div className="space-y-2 sm:space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12"
          >
            <div className={`${pulse} col-span-1 md:col-span-4 h-9 sm:h-10`} />
            <div className={`${pulse} col-span-1 md:col-span-3 h-9 sm:h-10`} />
            <div
              className={`${pulse} col-span-1 md:col-span-2 h-9 sm:h-10 hidden md:block`}
            />
            <div
              className={`${pulse} col-span-1 md:col-span-3 h-9 sm:h-10 hidden sm:block`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExamGradingSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
      <div className={`${pulse} w-72 h-7 sm:h-8`} />
      <div className="space-y-2 sm:space-y-4 bg-white p-3 sm:p-4 border border-slate-100 rounded-md">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${pulse} h-16 sm:h-20`} />
        ))}
      </div>
    </div>
  );
}

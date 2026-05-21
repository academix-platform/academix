export default function Loading() {
  return (
    <div className="p-6 space-y-3">
      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />

      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="p-3 border rounded-md space-y-2 animate-pulse"
        >
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-2 w-48 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

const ErrorState = ({
  title = "Something went wrong",
  description = "We could not load this content. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className = "",
}: ErrorStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}
    >
      <div className="flex justify-center items-center bg-red-100 rounded-full w-12 h-12">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="font-semibold text-red-700 text-lg">{title}</h2>
      <p className="max-w-md text-gray-500 text-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 mt-2 px-4 py-2 rounded-md text-white text-sm transition"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};

export default ErrorState;

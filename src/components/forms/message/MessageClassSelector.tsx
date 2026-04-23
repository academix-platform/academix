"use client";

type ClassOption = {
  id: number;
  name: string;
};

type MessageClassSelectorProps = {
  classes: ClassOption[];
  selectedClassIds: number[];
  onChange: (nextClassIds: number[]) => void;
};

const MessageClassSelector = ({
  classes,
  selectedClassIds,
  onChange,
}: MessageClassSelectorProps) => {
  const allSelected =
    classes.length > 0 && selectedClassIds.length === classes.length;

  const toggleClass = (classId: number, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedClassIds, classId]))
      : selectedClassIds.filter((id) => id !== classId);

    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 w-full md:w-1/3">
      <div className="flex justify-between items-center">
        <label className="text-gray-500 text-xs">Classes (optional)</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(classes.map((cls) => cls.id))}
            className="text-blue-600 text-xs hover:underline"
          >
            Select all
          </button>
          {selectedClassIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-blue-600 text-xs hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 rounded-md ring-[1.5px] ring-gray-300 max-h-[170px] overflow-y-auto">
        <label className="flex items-center gap-2 mb-2 text-gray-700 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) =>
              event.target.checked
                ? onChange(classes.map((cls) => cls.id))
                : onChange([])
            }
            className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
          />
          <span className="font-medium">Select all</span>
        </label>

        {classes.map((cls) => (
          <label
            key={cls.id}
            className="flex items-center gap-2 text-gray-700 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedClassIds.includes(cls.id)}
              onChange={(event) => toggleClass(cls.id, event.target.checked)}
              className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
            />
            <span>{cls.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MessageClassSelector;

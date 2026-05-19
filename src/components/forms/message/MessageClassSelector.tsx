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
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center">
        <label className="font-medium text-gray-700 text-sm">Classes (optional)</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(classes.map((cls) => cls.id))}
            className="font-medium text-academixPurpleDark text-xs hover:underline"
          >
            Select all
          </button>
          {selectedClassIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-medium text-academixPurpleDark text-xs hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 bg-white p-4 border-2 border-gray-200 rounded-lg max-h-[220px] overflow-y-auto">
        <label className="flex items-center gap-2 mb-2 text-gray-700 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) =>
              event.target.checked
                ? onChange(classes.map((cls) => cls.id))
                : onChange([])
            }
            className="border-gray-300 rounded focus:ring-academixPurpleDark w-4 h-4 text-academixPurpleDark"
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
              className="border-gray-300 rounded focus:ring-academixPurpleDark w-4 h-4 text-academixPurpleDark"
            />
            <span>{cls.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MessageClassSelector;



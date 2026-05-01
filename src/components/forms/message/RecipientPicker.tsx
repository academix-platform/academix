"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type RecipientOption = {
  id: string;
  name: string;
};

type RecipientPickerProps = {
  label: string;
  items: RecipientOption[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
};

const RecipientPicker = ({
  label,
  items,
  selectedIds,
  onChange,
}: RecipientPickerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredItems = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return [];

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) &&
        !selectedIds.includes(String(item.id)),
    );
  }, [items, searchValue, selectedIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleRecipient = (id: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedIds, id]))
      : selectedIds.filter((currentId) => currentId !== id);

    onChange(next);
  };

  const selectAll = () => {
    onChange(items.map((item) => item.id));
  };

  const clear = () => {
    onChange([]);
  };

  return (
    <div className="w-full md:w-[48%]">
      <div className="flex justify-between items-center">
        <label className="text-gray-500 text-xs">{label}</label>
        <button
          type="button"
          onClick={selectAll}
          className="text-blue-600 text-xs hover:underline"
        >
          Select all
        </button>
      </div>

      <div ref={containerRef}>
        <div className="relative">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-200 focus-within:border-blue-400 rounded-xl focus-within:ring-2 focus-within:ring-blue-100">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              aria-label={`Search ${label.toLowerCase()}`}
              className="bg-transparent outline-none w-full text-sm"
            />
            <button
              type="button"
              onClick={() => setShowDropdown(true)}
              className="text-gray-500 hover:text-gray-700"
              aria-label={`Open ${label.toLowerCase()} search results`}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {showDropdown && (
            <div className="top-full right-0 left-0 z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-md max-h-56 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 hover:bg-blue-100 px-3 py-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(String(item.id))}
                      onChange={(event) =>
                        toggleRecipient(item.id, event.target.checked)
                      }
                      className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
                    />
                    {item.name}
                  </label>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-gray-50 mt-3 px-4 py-3 border border-gray-300 border-dashed rounded-xl">
          <span className="text-gray-600 text-sm">
            {selectedIds.length} selected
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-blue-600 text-xs hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipientPicker;

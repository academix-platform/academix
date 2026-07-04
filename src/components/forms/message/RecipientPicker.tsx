"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("forms.message");
  const commonT = useTranslations("forms.common");
  const actionsT = useTranslations("actions");
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
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center">
        <label className="font-medium text-gray-700 text-sm">{label}</label>
        <button
          type="button"
          onClick={selectAll}
          className="font-medium text-academixPurpleDark text-xs hover:underline"
        >
          {commonT("selectAll")}
        </button>
      </div>

      <div ref={containerRef}>
        <div className="relative">
          <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg focus-within:ring-0 transition-all">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("searchRecipients", { label })}
              aria-label={t("searchRecipients", { label })}
              className="bg-transparent outline-none w-full text-sm placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowDropdown(true)}
              className="text-gray-400 hover:text-academixPurpleDark transition-colors"
              aria-label={t("openRecipientSearch", { label })}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {showDropdown && (
            <div className="top-full inset-x-0 z-10 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 hover:bg-academixPurpleLight px-4 py-3 w-full hover:text-academixPurpleDark text-sm text-start transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(String(item.id))}
                      onChange={(event) =>
                        toggleRecipient(item.id, event.target.checked)
                      }
                      className="border-gray-300 rounded focus:ring-academixPurpleDark w-4 h-4 text-academixPurpleDark"
                    />
                    {item.name}
                  </label>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  {commonT("noResultsFound")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-white mt-3 px-4 py-3 border-2 border-gray-300 border-dashed rounded-lg">
          <span className="text-gray-600 text-sm">
            {commonT("selected", { count: selectedIds.length })}
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="font-medium text-academixPurpleDark text-xs hover:underline"
            >
              {actionsT("clear")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipientPicker;



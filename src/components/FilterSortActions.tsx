import { Filter, ArrowUpDown } from "lucide-react";

type Props = {
  onFilterClick?: () => void;
  onSortClick?: () => void;
};

export default function FilterSortActions({
  onFilterClick,
  onSortClick,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <button className="flex justify-center items-center bg-academixYellow rounded-full w-8 h-8">
        <Filter className="w-[14px] h-[14px]" />
      </button>

      <button className="flex justify-center items-center bg-academixYellow rounded-full w-8 h-8">
        <ArrowUpDown className="w-[14px] h-[14px]" />
      </button>
    </div>
  );
}

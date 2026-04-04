import { MoreHorizontal } from "lucide-react";

const UserCard = ({ type }: { type: string }) => {
  return (
    <div className="flex-1 even:bg-academixYellow odd:bg-academixPurple p-4 rounded-2xl min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="bg-white px-2 py-1 rounded-full text-[10px] text-green-600">
          2024/25
        </span>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      <h1 className="my-4 font-semibold text-2xl">1,234</h1>
      <h2 className="font-medium text-gray-500 text-sm capitalize">{type}s</h2>
    </div>
  );
};

export default UserCard;

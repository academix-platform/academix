import EmptyState from "@/components/states/EmptyState";

const Table = ({
  columns,
  renderRow,
  data,
  emptyTitle,
  emptyDescription,
}: {
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
  emptyTitle?: string;
  emptyDescription?: string;
}) => {
  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full min-h-[300px]">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="py-0"
        />
      </div>
    );
  }

  return (
    <table className="mt-4 w-full">
      <thead>
        <tr className="text-gray-500 text-sm">
          {columns.map((col) => (
            <th
              key={col.accessor}
              className={`p-4 text-start ${col.className ?? ""}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{data.map((item) => renderRow(item))}</tbody>
    </table>
  );
};

export default Table;

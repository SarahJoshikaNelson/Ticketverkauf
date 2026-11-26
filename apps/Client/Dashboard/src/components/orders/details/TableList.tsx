import { formatPrice } from "@/lib/utils";
import { Seat } from "@ticket-system/models";

type TableGroup = {
  tableName: string;
  seats: Seat[];
  totalPrice: number;
};

export default function TableList({ tableGroup }: { tableGroup: TableGroup }) {
  return (
    <div className="flex flex-row gap-2 w-full rounded-lg p-4 justify-between items-center">
      <p>
        Tisch {tableGroup.tableName} ({tableGroup.seats.length} Plätze)
      </p>
      <p>{formatPrice(tableGroup.totalPrice)}</p>
    </div>
  );
}

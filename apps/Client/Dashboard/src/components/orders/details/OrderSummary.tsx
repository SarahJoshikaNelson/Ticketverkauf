import { formatPrice } from "@/lib/utils";

function OrderSummary({ total }: { total: number }) {
  return (
    <div>
      <div className="flex flex-row gap-2 w-full rounded-lg p-4 justify-between items-center">
        <p>Gesamt</p>
        <p>{formatPrice(total)}</p>
      </div>
    </div>
  );
}

export default OrderSummary;

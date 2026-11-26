import { Seat, Ticket } from "@ticket-system/models";
import TicketList from "./TicketList";
import TableList from "./TableList";
import OrderSummary from "./OrderSummary";
import { useState, useMemo } from "react";

function TicketTableTable({
  tickets,
  seats,
}: {
  tickets: Ticket[];
  seats: Seat[];
}) {
  const [totalTicketsPrice, setTotalTicketsPrice] = useState<number>(0);

  // Group seats by table
  const groupedSeats = useMemo(() => {
    const grouped = new Map<string, Seat[]>();

    seats.forEach((seat) => {
      const tableName = seat.tableName || seat.table || "Unbekannter Tisch";
      if (!grouped.has(tableName)) {
        grouped.set(tableName, []);
      }
      grouped.get(tableName)!.push(seat);
    });

    return Array.from(grouped.entries()).map(([tableName, seats]) => ({
      tableName,
      seats,
      totalPrice: seats.reduce((sum, seat) => sum + seat.price, 0),
    }));
  }, [seats]);

  const totalTablePrice = seats.reduce((sum, seat) => sum + seat.price, 0);

  return (
    <div className="flex flex-col gap-2 w-full rounded-lg p-4 bg-background-700 dark:bg-background-200 border border-background-100 dark:border-background-300">
      {tickets.length > 0 && (
        <TicketList
          tickets={tickets}
          onTotalPriceCalcualtion={setTotalTicketsPrice}
        />
      )}
      {seats.length > 0 && (
        <>
          <span
            id="line"
            className="w-full h-px bg-background-100 dark:bg-background-300"
          />
          {groupedSeats.map((tableGroup, index) => (
            <TableList key={tableGroup.tableName} tableGroup={tableGroup} />
          ))}
        </>
      )}
      <span
        id="line"
        className="w-full h-px bg-background-100 dark:bg-background-300"
      />
      <OrderSummary total={totalTicketsPrice + totalTablePrice} />
    </div>
  );
}

export default TicketTableTable;

import { formatPrice } from "@/lib/utils";
import { SalesOverview } from "@ticket-system/models";
import CountUp from "react-countup";

function FactList({ salesOverview }: { salesOverview: SalesOverview }) {
  return (
    <div className="flex flex-row max-sm:flex-col gap-4 w-full justify-center mt-10">
      <div className="flex flex-col gap-4 w-1/3 max-sm:w-full items-center">
        <h1 className="text-4xl font-bold max-sm:text-2xl">
          <CountUp end={salesOverview.orderCount} duration={2} />
        </h1>
        <p className="text-sm">Bestellungen</p>
        <h1 className="text-4xl font-bold max-sm:text-2xl">
          <CountUp
            end={salesOverview.studentTickets + salesOverview.externalTickets}
            duration={2}
          />
        </h1>
        <p className="text-sm">Tickets</p>
        <h1 className="text-4xl font-bold max-sm:text-2xl">
          <CountUp end={salesOverview.tableCount} duration={2} />
        </h1>
        <p className="text-sm">Sitzplätze</p>
      </div>

      <div className="flex flex-col gap-4 w-1/3 max-sm:w-full items-center">
        <h1 className="sm:text-4xl font-bold max-sm:text-2xl">
          <CountUp
            decimals={2}
            formattingFn={formatPrice}
            end={
              salesOverview.externalProfit +
              salesOverview.studentProfit +
              salesOverview.tableProfit
            }
            duration={2}
          />
        </h1>
        <p className="text-sm">Gesamt-Umsatz</p>
        <h1 className="sm:text-4xl font-bold max-sm:text-2xl">
          <CountUp
            decimals={2}
            formattingFn={formatPrice}
            end={salesOverview.externalProfit + salesOverview.studentProfit}
            duration={2}
          />
        </h1>
        <p className="text-sm">Ticket-Umsatz</p>
        <h1 className="sm:text-4xl font-bold max-sm:text-2xl">
          <CountUp
            decimals={2}
            end={salesOverview.tableProfit}
            duration={2}
            formattingFn={formatPrice}
          />
        </h1>
        <p className="text-sm">Sitzplatz-Umsatz</p>
      </div>
    </div>
  );
}

export default FactList;

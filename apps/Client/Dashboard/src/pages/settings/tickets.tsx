import AdditionalChargeForPhysicalTicketsManager from "@/components/settings/tickets/AdditionalChargeForPhysicalTicketsManager";
import MaxCountManager from "@/components/settings/tickets/MaxCountManager";
import MaxCountPerOrderManager from "@/components/settings/tickets/MaxCountPerOrderManager";
import PricingManager from "@/components/settings/tickets/PricingManager";

function Tickets() {
  return (
    <div className="flex flex-col gap-4 pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Tickets</h1>
      <div className="flex flex-col gap-4">
        <MaxCountManager />
        <MaxCountPerOrderManager />
        <PricingManager header="Schüler-Karten" ticketType="student" />
        <PricingManager header="Standard-Karten" ticketType="extern" />
        <AdditionalChargeForPhysicalTicketsManager />
        <div className="min-h-25" />
      </div>
    </div>
  );
}

export default Tickets;

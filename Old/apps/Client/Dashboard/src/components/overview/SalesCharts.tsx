import StudentsVsExtern from "./StudentsVsExtern";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { getSalesOverview } from "@/utils/sales-utils";
import { SalesOverview } from "@ticket-system/models";
import TableVsTicket from "./TableVsTicket";
import FactList from "./FactList";
import WeekOverview from "./WeekOverview";
import PhysicalVsDigital from "./PhysicalVsDigital";

function SalesCharts() {
  const { keycloak } = useKeycloak();
  const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(
    null
  );

  useEffect(() => {
    getSalesOverview(keycloak.token ?? undefined, "possible").then(
      setSalesOverview
    );
  }, [keycloak.token]);

  if (!salesOverview) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4 m-5 max-w-full">
      <FactList salesOverview={salesOverview} />
      <WeekOverview salesOverview={salesOverview} />
      <div className="flex flex-row max-sm:flex-col gap-4 justify-center items-center w-full flex-wrap">
        <StudentsVsExtern sales={salesOverview} />
        <TableVsTicket sales={salesOverview} />
        <PhysicalVsDigital sales={salesOverview} />
      </div>
    </div>
  );
}

export default SalesCharts;

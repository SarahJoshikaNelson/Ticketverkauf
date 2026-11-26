import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import ImageDataAdjuster from "@/components/settings/data/image-data-adjuster";
import DataAdjuster from "@/components/settings/data/data-adjuster";
import { usePhase } from "@/context/PhaseContext";

interface AllData {
  title: string;
  subTitle: string;
  onDate: string;
  paymentInfo: string;
  paymentText: string;
  organizationName: string;
  organizationAddress: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  physicalPickupInfo: string;
}

function Data() {
  const [allData, setAllData] = useState<AllData>({
    title: "",
    subTitle: "",
    onDate: "",
    paymentInfo: "",
    paymentText: "",
    organizationName: "",
    organizationAddress: "",
    footerText: "",
    contactEmail: "",
    contactPhone: "",
    contactWebsite: "",
    physicalPickupInfo: "",
  });

  const { keycloak } = useKeycloak();
  const { phase } = usePhase();
  const isReadOnly = phase !== null && phase > 0;

  useEffect(() => {
    (async () => {
      const req = await authFetch(
        getFetchUrl("api/v2/data"),
        keycloak.token ?? "",
        {
          method: "GET",
        }
      );

      if (req.ok) {
        const res = await req.json();
        setAllData({
          title: res.title || "",
          subTitle: res.subTitle || "",
          onDate: res.onDate || "",
          paymentInfo: res.paymentInfo || "",
          paymentText: res.paymentText || "",
          organizationName: res.organizationName || "",
          organizationAddress: res.organizationAddress || "",
          footerText: res.footerText || "",
          contactEmail: res.contactEmail || "",
          contactPhone: res.contactPhone || "",
          contactWebsite: res.contactWebsite || "",
          physicalPickupInfo: res.physicalPickupInfo || "",
        });
      } else {
        toast.error(`Fehler beim Laden der Daten: ${req.statusText}`);
      }
    })();
  }, [keycloak.token]);

  return (
    <div className="flex flex-col gap-4 pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold">Daten</h1>
      {isReadOnly && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Änderungen sind nur bis inklusive Phase 0 möglich. Diese Angaben
          bleiben sichtbar, sind aber schreibgeschützt.
        </div>
      )}
      <DataAdjuster
        allData={allData}
        setAllData={setAllData}
        readOnly={isReadOnly}
      />
      <ImageDataAdjuster readOnly={isReadOnly} />
    </div>
  );
}

export default Data;

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice, randomUUID } from "@/lib/utils";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdditionalChargeForPhysicalTicketsManager() {
  const { keycloak } = useKeycloak();
  const [chargeInputId] = useState(randomUUID());
  const [oldCharge, setCharge] = useState<number | undefined>(undefined);
  const [inputtedCharge, setInputtedCharge] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    fetch(getFetchUrl("api/v2/ticket/physical/additional-charge"))
      .then((res) => res.json())
      .then((data: { additionalChargeForPhysicalTicket: number }) => {
        setCharge(+data.additionalChargeForPhysicalTicket);
        setInputtedCharge(+data.additionalChargeForPhysicalTicket);
      });
  }, []);

  const updateChargeReq = async (newCharge: number) => {
    if (keycloak.token) {
      const req = await authFetch(
        getFetchUrl(`api/v2/ticket/physical/additional-charge/${newCharge}`),
        keycloak.token,
        {},
        "PUT"
      );
      if (!req.ok) {
        toast.error(
          "Fehler beim Speichern des Aufpreises für physische Tickets"
        );
        return;
      }
      toast.success("Aufpreis für physische Tickets gespeichert");
    } else {
      toast.error("Fehler beim Speichern des Aufpreises für physische Tickets");
      console.error("Keycloak token is undefined");
    }
  };

  if (oldCharge === undefined) {
    return <Card className="max-sm:min-w-full w-full animate-pulse" />;
  }

  return (
    <Card className="max-sm:min-w-full w-full">
      <CardHeader>
        <CardTitle>
          Aufpreis für physische Karten - {formatPrice(oldCharge)}
        </CardTitle>
        <CardDescription>Wähle einen Preis aus.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
              <label htmlFor={chargeInputId}>Preis</label>
              <Input
                type="number"
                id={chargeInputId}
                value={inputtedCharge}
                onChange={(e) => setInputtedCharge(+e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          disabled={oldCharge === inputtedCharge}
          variant="destructive"
          onClick={() => setInputtedCharge(oldCharge)}
        >
          Zurücksetzen
        </Button>
        <Button
          disabled={oldCharge === inputtedCharge}
          variant="outline"
          onClick={async () => {
            await updateChargeReq(inputtedCharge!);
          }}
        >
          Speichern
        </Button>
      </CardFooter>
    </Card>
  );
}

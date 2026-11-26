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
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { toast } from "sonner";
interface PricingManagerProps {
  ticketType: string;
  header: string;
}

function PricingManager({ ticketType, header }: PricingManagerProps) {
  const { keycloak } = useKeycloak();

  const [price, setPrice] = useState(0);
  const [startPrice, setStartPrice] = useState(0);

  useEffect(() => {
    authFetch(getFetchUrl(`api/v2/ticket/${ticketType}`), keycloak.token)
      .then((res) => res.json())
      .then((data) => {
        setPrice(data);
        setStartPrice(data);
      });
  }, [keycloak.token]);

  const savePrice = async () => {
    const req = await authFetch(
      getFetchUrl(`api/v2/ticket/${ticketType}/${price}`),
      keycloak.token,
      {},
      "PUT"
    );

    if (req.ok) {
      setStartPrice(price);
      toast.success("Preis gespeichert");
    } else {
      toast.error("Fehler beim Speichern des Preises");
    }
  };

  return (
    <Card className="max-sm:min-w-full w-full">
      <CardHeader>
        <CardTitle>
          Preis für {header} - {formatPrice(startPrice)}
        </CardTitle>
        <CardDescription>Wähle einen Preis aus.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
              <Label htmlFor="price">Preis</Label>
              <Input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(+e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          disabled={price === startPrice}
          variant="destructive"
          onClick={() => setPrice(startPrice)}
        >
          Zurücksetzen
        </Button>
        <Button
          disabled={price === startPrice}
          variant="outline"
          onClick={savePrice}
        >
          Speichern
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PricingManager;

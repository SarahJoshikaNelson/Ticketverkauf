import { useEffect } from "react";

import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { useState } from "react";
import { toast } from "sonner";
import { getFetchUrl } from "@/utils/getFetchUrl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BorderRadiusPreview from "./border-radius-preview";
import { styleResponse } from "@ticket-system/models";
function BorderRadius({
  data,
  setData,
}: {
  data: styleResponse;
  setData: (data: styleResponse) => void;
}) {
  const [startBorderRadius, setStartBorderRadius] = useState<number>(0);
  const [borderRadius, setBorderRadius] = useState<number>(0);

  const { keycloak } = useKeycloak();

  const saveBorderRadius = async () => {
    const updateData = {
      ...data,
      borderRadius: borderRadius,
    };

    const req = await authFetch(
      getFetchUrl("api/v2/styling"),
      keycloak.token,
      {
        body: JSON.stringify(updateData),
        headers: {
          "Content-Type": "application/json",
        },
      },
      "POST"
    );

    if (req.ok) {
      setData(updateData);
      setStartBorderRadius(borderRadius);
      toast.success(`Border Radius geändert: ${borderRadius}`);
    } else {
      toast.error("Fehler beim Ändern des Border Radius");
    }
  };

  useEffect(() => {
    (async () => {
      const req = await authFetch(
        getFetchUrl("api/v2/styling"),
        keycloak.token ?? ""
      );

      if (req.ok) {
        const data: styleResponse = await req.json();

        setData(data);

        setBorderRadius(data.borderRadius);
        setStartBorderRadius(data.borderRadius);
      }
    })();
  }, [keycloak.token]);

  // Sync internal state when data prop changes (e.g., reset to default)
  useEffect(() => {
    if (data.borderRadius !== undefined) {
      setBorderRadius(data.borderRadius);
      setStartBorderRadius(data.borderRadius);
    }
  }, [data.borderRadius]);

  return (
    <Card className="max-sm:min-w-full w-2/3">
      <CardHeader>
        <CardTitle>Border Radius</CardTitle>
        <CardDescription>Wähle einen Border Radius aus.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
              <Label htmlFor="borderRadius">Border Radius</Label>
              <Input
                type="number"
                id="borderRadius"
                value={borderRadius}
                onChange={(e) => setBorderRadius(parseInt(e.target.value))}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          disabled={borderRadius === startBorderRadius}
          variant="destructive"
          onClick={() => setBorderRadius(startBorderRadius)}
        >
          Zurücksetzen
        </Button>
        <Button
          disabled={borderRadius === startBorderRadius}
          variant="outline"
          onClick={saveBorderRadius}
        >
          Speichern
        </Button>
      </CardFooter>
      <CardFooter className="flex justify-center">
        <BorderRadiusPreview borderRadius={borderRadius} />
      </CardFooter>
    </Card>
  );
}

export default BorderRadius;

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
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { styleResponse } from "@ticket-system/models";

interface colorPickerParams {
  header: string;
  text: string;
  color: "background" | "text" | "primary" | "secondary" | "accent";
  data: styleResponse;
  setData: (data: styleResponse) => void;
}

function ColorPicker({
  header,
  text,
  color,
  data,
  setData,
}: colorPickerParams) {
  const [startColor, setStartColor] = useState<string>(color);
  const [newColor, setNewColor] = useState<string>(color);

  const { keycloak } = useKeycloak();

  const saveColor = async () => {
    const updatedData = data;
    updatedData[color] = newColor;

    const req = await authFetch(
      getFetchUrl("api/v2/styling"),
      keycloak.token,
      {
        body: JSON.stringify(updatedData),
        headers: {
          "Content-Type": "application/json",
        },
      },
      "POST"
    );

    if (req.ok) {
      toast.success("Farbe gespeichert");
    } else {
      toast.error("Fehler beim Speichern der Farbe");
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

        setNewColor(data[color]);
        setStartColor(data[color]);
      }
    })();
  }, [keycloak.token]);

  // Sync internal state when data prop changes (e.g., reset to default)
  useEffect(() => {
    if (data[color]) {
      setNewColor(data[color]);
      setStartColor(data[color]);
    }
  }, [data[color]]);

  return (
    <Card className="max-sm:min-w-full w-1/3">
      <CardHeader>
        <CardTitle className="leading-relaxed">
          {header} &ndash; {startColor}
        </CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
              <Label htmlFor={color}>{text}</Label>
              <Input
                type="color"
                id={color}
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center flex-wrap items-center gap-2">
        <Button
          disabled={newColor === startColor}
          variant="destructive"
          onClick={() => setNewColor(startColor)}
        >
          Zurücksetzen
        </Button>
        <Button
          disabled={newColor === startColor}
          variant="outline"
          onClick={saveColor}
        >
          Speichern
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ColorPicker;

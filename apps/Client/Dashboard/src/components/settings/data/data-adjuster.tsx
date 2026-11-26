import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { cn } from "@/lib/utils";

interface AllDataProps {
  // String data
  title: string;
  subTitle: string;
  // Date data
  onDate: string;
  // Payment data
  paymentInfo: string;
  paymentText: string;
  // Footer data
  organizationName: string;
  organizationAddress: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  physicalPickupInfo: string;
}

interface DataAdjusterProps {
  allData: AllDataProps;
  setAllData: (data: AllDataProps) => void;
  readOnly?: boolean;
}

function DataAdjuster({
  allData,
  setAllData,
  readOnly = false,
}: DataAdjusterProps) {
  const [formData, setFormData] = useState<AllDataProps>(allData);
  const { keycloak } = useKeycloak();
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(allData);
    setHasChanges(false);
  }, [allData]);

  const handleChange = (field: keyof AllDataProps, value: string) => {
    if (readOnly) {
      return;
    }
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setHasChanges(JSON.stringify(updated) !== JSON.stringify(allData));
  };

  const saveAllData = async () => {
    if (readOnly || !keycloak.token) {
      return;
    }
    // Ensure website has http:// or https:// prefix
    let websiteUrl = formData.contactWebsite.trim();
    if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const req = await authFetch(
      getFetchUrl("api/v2/data"),
      keycloak.token,
      {
        body: JSON.stringify({
          title: formData.title,
          subTitle: formData.subTitle,
          date: formData.onDate,
          paymentInfo: formData.paymentInfo,
          paymentText: formData.paymentText,
          organizationName: formData.organizationName,
          organizationAddress: formData.organizationAddress,
          footerText: formData.footerText,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          contactWebsite: websiteUrl,
          physicalPickupInfo: formData.physicalPickupInfo,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
      "POST"
    );

    if (req.ok) {
      const updatedData = { ...formData, contactWebsite: websiteUrl };
      setAllData(updatedData);
      setFormData(updatedData);
      setHasChanges(false);
      toast.success("Alle Einstellungen gespeichert");
    } else {
      toast.error(`Fehler beim Speichern: ${req.statusText}`);
    }
  };

  const resetForm = () => {
    if (readOnly) {
      return;
    }
    setFormData(allData);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Event Information */}
      <Card className="max-sm:min-w-full w-full">
        <CardHeader>
          <CardTitle>Event-Informationen</CardTitle>
          <CardDescription>
            Konfiguriere die grundlegenden Informationen zum Event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                placeholder="z.B. Maturaball 2024"
                value={formData.title}
                disabled={readOnly}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="subTitle">Untertitel</Label>
              <Input
                id="subTitle"
                placeholder="z.B. HTBLA Leonding"
                value={formData.subTitle}
                disabled={readOnly}
                onChange={(e) => handleChange("subTitle", e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="onDate">Datum</Label>
              <Input
                id="onDate"
                type="date"
                value={formData.onDate}
                disabled={readOnly}
                onChange={(e) => handleChange("onDate", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card className="max-sm:min-w-full w-full">
        <CardHeader>
          <CardTitle>Zahlungsinformationen</CardTitle>
          <CardDescription>
            Konfiguriere die Zahlungsinformationen und Zahlungsanweisungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="paymentInfo">Zahlungsinformationen</Label>
              <textarea
                id="paymentInfo"
                placeholder="z.B. Kontodaten, IBAN, BIC..."
                value={formData.paymentInfo}
                disabled={readOnly}
                onChange={(e) => handleChange("paymentInfo", e.target.value)}
                className={cn(
                  "min-h-[100px] p-2 border border-input rounded-md bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                  "placeholder:text-muted-foreground"
                )}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="paymentText">Zahlungsanweisungen</Label>
              <textarea
                id="paymentText"
                placeholder="z.B. Anleitung zur Zahlung..."
                value={formData.paymentText}
                disabled={readOnly}
                onChange={(e) => handleChange("paymentText", e.target.value)}
                className={cn(
                  "min-h-[100px] p-2 border border-input rounded-md bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                  "placeholder:text-muted-foreground"
                )}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="physicalPickupInfo">
                Abholung herkömmlicher physischer Tickets Informationen
              </Label>
              <textarea
                id="physicalPickupInfo"
                placeholder="z.B. Informationen zur Abholung..."
                value={formData.physicalPickupInfo}
                disabled={readOnly}
                onChange={(e) =>
                  handleChange("physicalPickupInfo", e.target.value)
                }
                className={cn(
                  "min-h-[100px] p-2 border border-input rounded-md bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                  "placeholder:text-muted-foreground"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Configuration */}
      <Card className="max-sm:min-w-full w-full">
        <CardHeader>
          <CardTitle>Organisationsdaten</CardTitle>
          <CardDescription>
            Konfiguriere die Organisationsdaten deiner E-Mails und Rechnungen.
            BITTE DEN FÖRMLICHEN NAMEN DER ORGANISATION ANGEBEN, da diese
            informationen als "Rechnungsausteller" verwendet werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="organizationName">Organisationsname</Label>
              <Input
                id="organizationName"
                placeholder="z.B. 2024 Maturaball"
                value={formData.organizationName}
                disabled={readOnly}
                onChange={(e) =>
                  handleChange("organizationName", e.target.value)
                }
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="organizationAddress">Anschrift</Label>
              <textarea
                id="organizationAddress"
                placeholder="z.B. Musterstraße 1, 1234 Stadt"
                value={formData.organizationAddress}
                disabled={readOnly}
                onChange={(e) =>
                  handleChange("organizationAddress", e.target.value)
                }
                className={cn(
                  "min-h-[60px] p-2 border border-input rounded-md bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                  "placeholder:text-muted-foreground"
                )}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="footerText">Fußzeilentext</Label>
              <textarea
                id="footerText"
                placeholder="z.B. Zusätzliche Informationen oder Copyright-Text"
                value={formData.footerText}
                disabled={readOnly}
                onChange={(e) => handleChange("footerText", e.target.value)}
                className={cn(
                  "min-h-20 p-2 border border-input rounded-md bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                  "placeholder:text-muted-foreground"
                )}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="contactEmail">E-Mail-Adresse</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="z.B. kontakt@example.com"
                value={formData.contactEmail}
                disabled={readOnly}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="contactPhone">Telefonnummer</Label>
              <Input
                id="contactPhone"
                placeholder="z.B. +43 123 456789"
                value={formData.contactPhone}
                disabled={readOnly}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="contactWebsite">Website</Label>
              <Input
                id="contactWebsite"
                placeholder="z.B. https://example.com"
                value={formData.contactWebsite}
                disabled={readOnly}
                onChange={(e) => handleChange("contactWebsite", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save/Reset Buttons */}
      <Card className="max-sm:min-w-full w-full">
        <CardFooter className="flex justify-between pt-6">
          <Button
            disabled={readOnly || !hasChanges}
            variant="destructive"
            onClick={resetForm}
          >
            Zurücksetzen
          </Button>
          <Button
            disabled={readOnly || !hasChanges}
            variant="outline"
            onClick={saveAllData}
          >
            Alle Einstellungen speichern
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default DataAdjuster;

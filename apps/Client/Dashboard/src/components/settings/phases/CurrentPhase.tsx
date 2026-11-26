import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import authFetch from "@/utils/authfetch";
import { toast } from "sonner";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { usePhase } from "@/context/PhaseContext";

export const POSSIBLE_PHASES = [0, 1, 2] as const;

export type PossiblePhase = (typeof POSSIBLE_PHASES)[number];

export const PHASES_OBJECT: Record<PossiblePhase, string> = {
  0: "Niemand kann bestellen",
  1: "Maturanten können bestellen",
  2: "Alle können bestellen",
};

const requiredBaseFields = [
  { key: "title", label: "Titel" },
  { key: "onDate", label: "Datum" },
  { key: "paymentInfo", label: "Zahlungsinformation" },
  { key: "organizationName", label: "Organisationsname" },
  { key: "organizationAddress", label: "Anschrift" },
];

function CurrentPhase() {
  const [startPhase, setStartPhase] = useState("");
  const [phase, setPhase] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isFetchingPrereqs, setIsFetchingPrereqs] = useState(false);

  const { keycloak } = useKeycloak();
  const { phase: currentPhase, setPhaseValue, refreshPhase } = usePhase();

  const [prerequisites, setPrerequisites] = useState({
    hasDesign: false,
    hasPrices: false,
    hasBaseData: false,
  });
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  const prerequisitesMet =
    prerequisites.hasDesign &&
    prerequisites.hasPrices &&
    prerequisites.hasBaseData;

  const fetchPrerequisites = useCallback(async () => {
    if (!keycloak?.token) {
      return;
    }
    setIsFetchingPrereqs(true);
    try {
      const [designRes, studentRes, externRes, dataRes] = await Promise.all([
        authFetch(getFetchUrl("api/v1/ticket-design"), keycloak.token),
        authFetch(getFetchUrl("api/v2/ticket/student"), keycloak.token),
        authFetch(getFetchUrl("api/v2/ticket/extern"), keycloak.token),
        authFetch(getFetchUrl("api/v2/data"), keycloak.token),
      ]);

      if (!designRes.ok || !studentRes.ok || !externRes.ok || !dataRes.ok) {
        throw new Error("Failed to load prerequisites");
      }

      const [designs, studentPrice, externPrice, baseData] = await Promise.all([
        designRes.json(),
        studentRes.json(),
        externRes.json(),
        dataRes.json(),
      ]);

      const hasDesign =
        Array.isArray(designs) &&
        designs.some((design: { active?: boolean }) => design?.active);
      const hasPrices = [studentPrice, externPrice].every(
        (value) => typeof value === "number" && value > 0
      );
      const missingBaseFields = requiredBaseFields
        .filter(({ key }) => {
          const value = baseData?.[key];
          return !value || value.toString().trim() === "";
        })
        .map(({ label }) => label);

      const hasBaseData = missingBaseFields.length === 0;

      const missing: string[] = [];
      if (!hasDesign) {
        missing.push("Aktives Ticketdesign");
      }
      if (!hasPrices) {
        missing.push("Ticketpreise für Schüler- und Externenkarten");
      }
      if (!hasBaseData) {
        missing.push(`Basisdaten: ${missingBaseFields.join(", ")}`);
      }

      setPrerequisites({ hasDesign, hasPrices, hasBaseData });
      setMissingRequirements(missing);
    } catch (error) {
      console.error("Error fetching prerequisites:", error);
      toast.error("Voraussetzungen konnten nicht geladen werden.");
      setPrerequisites({
        hasDesign: false,
        hasPrices: false,
        hasBaseData: false,
      });
      setMissingRequirements([
        "Voraussetzungen konnten nicht überprüft werden.",
      ]);
    } finally {
      setIsFetchingPrereqs(false);
    }
  }, [keycloak?.token]);

  const handlePhaseChange = (value: string) => {
    const numericValue = Number(value);
    if (numericValue > 0 && !prerequisitesMet) {
      toast.error(
        "Phase über 0 erfordert abgeschlossenes Design, Preise und Basisdaten."
      );
      return;
    }
    setPhase(value);
    setIsChecked(false);
  };

  const changePhase = async () => {
    const numericPhase = Number(phase);
    if (numericPhase > 0 && !prerequisitesMet) {
      toast.error(
        "Phase über 0 erfordert abgeschlossenes Design, Preise und Basisdaten."
      );
      return;
    }
    const req = await authFetch(
      getFetchUrl("api/v2/admin/phase"),
      keycloak.token,
      {
        body: phase,
      },
      "POST"
    );
    if (req.ok) {
      setStartPhase(phase);
      setPhaseValue(Number(phase) as PossiblePhase);
      await refreshPhase();
      setIsChecked(false);
      toast.success("Phase geändert");
    } else {
      toast.error("Fehler beim Ändern der Phase");
    }
  };

  useEffect(() => {
    if (currentPhase !== null) {
      setPhase(currentPhase.toString());
      setStartPhase(currentPhase.toString());
    }
  }, [currentPhase]);

  useEffect(() => {
    if (!phase && currentPhase === null) {
      refreshPhase();
    }
  }, [currentPhase, phase, refreshPhase]);

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  const phaseChanged = phase !== "" && phase !== startPhase;
  const isHighPhaseBlocked = Number(phase) > 0 && !prerequisitesMet;
  const isSaveDisabled =
    phase === "" || !phaseChanged || !isChecked || isHighPhaseBlocked;

  return (
    <Card className="max-sm:min-w-full w-full">
      <CardHeader>
        <CardTitle>
          Aktuelle Phase -{" "}
          {[0, 1, 2, 3].includes(parseInt(startPhase))
            ? PHASES_OBJECT[parseInt(startPhase) as keyof typeof PHASES_OBJECT]
            : "Nicht definiert"}
        </CardTitle>
        <CardDescription>
          Wähle eine Phase aus, um die Bestellfunktion zu aktivieren oder zu
          deaktivieren.
          {isFetchingPrereqs && (
            <span className="block text-sm text-muted-foreground mt-2">
              Voraussetzungen werden geprüft...
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
              <Label htmlFor="phase">Phase</Label>
              <Select value={phase} onValueChange={handlePhaseChange}>
                <SelectTrigger className="w-full" id="phase">
                  <SelectValue placeholder="Auswählen" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="0">Niemand kann bestellen</SelectItem>
                  <SelectItem value="1" disabled={!prerequisitesMet}>
                    Maturanten können bestellen
                  </SelectItem>
                  <SelectItem value="2" disabled={!prerequisitesMet}>
                    Alle können bestellen
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFetchingPrereqs &&
            !prerequisitesMet &&
            missingRequirements.length > 0 && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-semibold">
                  Folgende Voraussetzungen fehlen:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {missingRequirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

          <div className="flex items-center mt-4 space-x-2">
            <input
              type="checkbox"
              id="terms"
              disabled={!phaseChanged || isHighPhaseBlocked}
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="h-4 w-4 rounded border border-primary"
              style={{
                cursor:
                  !phaseChanged || isHighPhaseBlocked
                    ? "not-allowed"
                    : "pointer",
                opacity: !phaseChanged || isHighPhaseBlocked ? 0.5 : 1,
              }}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:opacity-70"
              style={{
                cursor:
                  !phaseChanged || isHighPhaseBlocked
                    ? "not-allowed"
                    : "pointer",
                opacity: !phaseChanged || isHighPhaseBlocked ? 0.5 : 1,
              }}
            >
              <p className="text-sm max-sm:hidden font-medium leading-none">
                Sie wissen, dass diese Aktion eine Kritische Änderung ist und
                die Bestellfunktion für alle Nutzer beeinflusst.
              </p>
              <p className="text-xs sm:hidden font-medium leading-none">
                Sind Sie sicher?
              </p>
            </label>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          disabled={isSaveDisabled}
          variant="outline"
          onClick={changePhase}
        >
          Speichern
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CurrentPhase;

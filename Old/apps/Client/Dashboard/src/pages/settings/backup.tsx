import { useState, useCallback, useRef, useEffect } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  FileJson,
  CheckCircle2,
} from "lucide-react";

const EXPORT_CATEGORIES = [
  { key: "generalData", label: "Allgemeine Daten", description: "Titel, Zahlungsinfo, Kontaktdaten, Bilder", group: "design" },
  { key: "schedule", label: "Zeitplan", description: "Event-Ablauf und Zeiteinträge", group: "design" },
  { key: "styling", label: "Styling/Theme", description: "Farben, Rahmenradius, Hintergrund", group: "design" },
  { key: "ticketDesigns", label: "Karten-Designs", description: "Ticket-Vorlagen mit Seiten und Elementen", group: "list" },
  { key: "customers", label: "Kunden", description: "Alle registrierten Kunden", group: "list" },
  { key: "orders", label: "Bestellungen", description: "Bestellungen inkl. Kunden und Tickets", group: "list" },
  { key: "products", label: "Shop-Produkte", description: "Produkte im Shop", group: "list" },
  { key: "maturants", label: "Maturantenliste", description: "Importierte Maturanten-Einträge", group: "list" },
  { key: "tableLayout", label: "Tisch-Layout", description: "Ebenen, Räume, Tische, Sitzplätze", group: "design" },
  { key: "settings", label: "Einstellungen", description: "Phasen, Queue-Einstellungen (keine API-Keys)", group: "design" },
] as const;

function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function Backup() {
  const { keycloak } = useKeycloak();

  // Export state
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImportWarning, setShowImportWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state
  const [verificationCode, setVerificationCode] = useState(generateVerificationCode);
  const [userInput, setUserInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    EXPORT_CATEGORIES.forEach((c) => (all[c.key] = true));
    setSelectedCategories(all);
  };

  const selectNone = () => setSelectedCategories({});

  const hasAnySelected = Object.values(selectedCategories).some(Boolean);

  // ==================== EXPORT ====================

  const handleExport = async () => {
    if (!hasAnySelected) {
      toast.error("Bitte mindestens eine Kategorie auswählen.");
      return;
    }
    setExporting(true);
    try {
      const res = await authFetch(
        getFetchUrl("api/v2/backup/export"),
        keycloak.token ?? "",
        {
          body: JSON.stringify(selectedCategories),
          headers: { "Content-Type": "application/json" },
        },
        "POST"
      );

      if (!res.ok) {
        toast.error("Export fehlgeschlagen: " + res.statusText);
        return;
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup erfolgreich heruntergeladen!");
    } catch (err) {
      toast.error("Export fehlgeschlagen.");
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  // ==================== IMPORT ====================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Bitte eine JSON-Datei auswählen.");
      return;
    }

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setImportData(parsed);
      } catch {
        toast.error("Ungültige JSON-Datei.");
        setImportFile(null);
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const getImportSummary = useCallback(() => {
    if (!importData) return { overwrite: [] as string[], append: [] as string[] };

    const overwriteKeys = ["generalData", "schedule", "styling"];
    const appendKeys = ["ticketDesigns", "customers", "orders", "products", "maturants"];

    const overwrite = overwriteKeys
      .filter((k) => k in importData)
      .map((k) => EXPORT_CATEGORIES.find((c) => c.key === k)?.label ?? k);

    const append = appendKeys
      .filter((k) => k in importData)
      .map((k) => EXPORT_CATEGORIES.find((c) => c.key === k)?.label ?? k);

    return { overwrite, append };
  }, [importData]);

  const handleImportClick = () => {
    if (!importData) return;

    const summary = getImportSummary();
    if (summary.overwrite.length > 0) {
      setShowImportWarning(true);
    } else {
      executeImport();
    }
  };

  const executeImport = async () => {
    if (!importData) return;
    setShowImportWarning(false);
    setImporting(true);

    try {
      const res = await authFetch(
        getFetchUrl("api/v2/backup/import"),
        keycloak.token ?? "",
        {
          body: JSON.stringify(importData),
          headers: { "Content-Type": "application/json" },
        },
        "POST"
      );

      if (res.ok) {
        toast.success("Import erfolgreich abgeschlossen!");
        setImportFile(null);
        setImportData(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const errData = await res.json().catch(() => null);
        toast.error("Import fehlgeschlagen: " + (errData?.error ?? res.statusText));
      }
    } catch (err) {
      toast.error("Import fehlgeschlagen.");
      console.error("Import error:", err);
    } finally {
      setImporting(false);
    }
  };

  // ==================== RESET ====================

  const resetCodeMatches = userInput.toUpperCase() === verificationCode;

  const handleResetClick = () => {
    if (!resetCodeMatches) return;
    setShowResetConfirm(true);
  };

  const executeReset = async () => {
    setShowResetConfirm(false);
    setResetting(true);

    try {
      const res = await authFetch(
        getFetchUrl("api/v2/backup/reset"),
        keycloak.token ?? "",
        {},
        "DELETE"
      );

      if (res.ok) {
        toast.success("Alle Daten wurden erfolgreich zurückgesetzt!");
        setUserInput("");
        setVerificationCode(generateVerificationCode());
      } else {
        const errData = await res.json().catch(() => null);
        toast.error("Zurücksetzen fehlgeschlagen: " + (errData?.error ?? res.statusText));
      }
    } catch (err) {
      toast.error("Zurücksetzen fehlgeschlagen.");
      console.error("Reset error:", err);
    } finally {
      setResetting(false);
    }
  };

  const importSummary = getImportSummary();

  return (
    <div className="flex flex-col gap-8 pr-2 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold">Backup & Verwaltung</h1>
        <p className="text-muted-foreground mt-1">
          Daten exportieren, importieren oder für ein neues Jahr zurücksetzen.
        </p>
      </div>

      {/* ==================== EXPORT SECTION ==================== */}
      <section className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Daten exportieren</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Wählen Sie die Datenkategorien, die als JSON-Backup heruntergeladen werden sollen.
          API-Schlüssel werden niemals exportiert.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Alle auswählen
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Keine auswählen
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
            Design-Daten (werden beim Import überschrieben)
          </p>
          {EXPORT_CATEGORIES.filter((c) => c.group === "design").map((cat) => (
            <label
              key={cat.key}
              className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={!!selectedCategories[cat.key]}
                onCheckedChange={() => toggleCategory(cat.key)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
            </label>
          ))}

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
            Listen-Daten (werden beim Import angehängt)
          </p>
          {EXPORT_CATEGORIES.filter((c) => c.group === "list").map((cat) => (
            <label
              key={cat.key}
              className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={!!selectedCategories[cat.key]}
                onCheckedChange={() => toggleCategory(cat.key)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
            </label>
          ))}
        </div>

        <Button onClick={handleExport} disabled={!hasAnySelected || exporting} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exportiere..." : "Backup herunterladen"}
        </Button>
      </section>

      {/* ==================== IMPORT SECTION ==================== */}
      <section className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Daten importieren</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Laden Sie eine zuvor exportierte JSON-Datei hoch, um Daten wiederherzustellen.
          Design-Daten werden überschrieben, Listen-Daten werden angehängt.
        </p>

        <div className="space-y-3">
          <div>
            <Label htmlFor="backup-file" className="text-sm">
              Backup-Datei auswählen
            </Label>
            <Input
              id="backup-file"
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {importData && (
            <div className="rounded-md border p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileJson className="h-4 w-4" />
                {importFile?.name}
              </div>

              {importData.exportDate && (
                <p className="text-xs text-muted-foreground">
                  Erstellt am: {new Date(importData.exportDate as string).toLocaleString("de-AT")}
                </p>
              )}

              {importSummary.overwrite.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Wird überschrieben:
                  </p>
                  <ul className="ml-5 list-disc text-muted-foreground">
                    {importSummary.overwrite.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importSummary.append.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Wird angehängt:
                  </p>
                  <ul className="ml-5 list-disc text-muted-foreground">
                    {importSummary.append.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleImportClick}
            disabled={!importData || importing}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importiere..." : "Backup importieren"}
          </Button>
        </div>

        {/* Import Warning Modal */}
        <Dialog open={showImportWarning} onOpenChange={setShowImportWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Achtung: Daten werden überschrieben!
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p>
                    Die folgenden Datenkategorien werden durch den Import <strong>vollständig
                    überschrieben</strong>. Die aktuellen Werte gehen dabei unwiderruflich verloren:
                  </p>
                  <ul className="list-disc ml-5 font-medium text-foreground">
                    {importSummary.overwrite.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {importSummary.append.length > 0 && (
                    <p className="text-sm">
                      Die folgenden Kategorien werden zu den bestehenden Einträgen{" "}
                      <strong>hinzugefügt</strong>: {importSummary.append.join(", ")}
                    </p>
                  )}
                  <p className="font-semibold text-destructive">
                    Möchten Sie wirklich fortfahren?
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportWarning(false)}>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={executeImport}
                disabled={importing}
              >
                {importing ? "Importiere..." : "Ja, überschreiben und importieren"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* ==================== RESET SECTION ==================== */}
      <section className="rounded-lg border border-red-300 dark:border-red-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-600">Neues Jahr – Alles zurücksetzen</h2>
        </div>

        <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            WARNUNG: Diese Aktion löscht unwiderruflich alle Transaktionsdaten!
          </p>
          <ul className="text-sm text-red-600 dark:text-red-400 list-disc ml-5 space-y-0.5">
            <li>Alle Kunden und ihre Daten</li>
            <li>Alle Bestellungen und Tickets</li>
            <li>Alle registrierten Benutzerkonten</li>
            <li>Alle Maturanten und Studenten</li>
            <li>Alle Shop-Bestellungen</li>
            <li>Phase wird auf 0 zurückgesetzt</li>
          </ul>
          <p className="text-sm text-red-600 dark:text-red-400">
            Design-Daten, Tisch-Layout und Einstellungen bleiben erhalten.
            API-Schlüssel werden nicht berührt.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">
              Geben Sie den folgenden Code ein, um fortzufahren:
            </Label>
            <VerificationCode code={verificationCode} />
          </div>

          <Input
            placeholder="Bestätigungscode eingeben..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.toUpperCase())}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            className="font-mono text-lg tracking-widest text-center"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {userInput.length > 0 && !resetCodeMatches && (
            <p className="text-xs text-red-500">Code stimmt nicht überein.</p>
          )}
          {resetCodeMatches && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Code korrekt.
            </p>
          )}

          <Button
            variant="destructive"
            onClick={handleResetClick}
            disabled={!resetCodeMatches || resetting}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {resetting ? "Wird zurückgesetzt..." : "Alle Daten unwiderruflich löschen"}
          </Button>
        </div>

        {/* Reset Final Confirmation */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                Letzte Warnung: Alle Daten löschen?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block space-y-2">
                  <span className="block font-semibold text-red-600">
                    Dies ist die letzte Bestätigung. Alle Kunden, Bestellungen, Tickets
                    und Benutzerkonten werden permanent gelöscht.
                  </span>
                  <span className="block">
                    Erstellen Sie vorher ein Backup, falls Sie die Daten später noch
                    benötigen.
                  </span>
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetting}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeReset}
                disabled={resetting}
                className="text-red-500"
              >
                {resetting ? "Wird gelöscht..." : "Endgültig löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

function VerificationCode({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 280;
    const height = 60;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, 0);
      ctx.lineTo(Math.random() * width, height);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * height);
      ctx.lineTo(width, Math.random() * height);
      ctx.stroke();
    }

    const charWidth = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
      const x = charWidth * (i + 0.75);
      const y = height / 2 + 8;
      const angle = (Math.random() - 0.5) * 0.25;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `bold ${24 + Math.floor(Math.random() * 4)}px monospace`;
      ctx.fillStyle = `hsl(${200 + Math.random() * 40}, 80%, ${70 + Math.random() * 15}%)`;
      ctx.textAlign = "center";
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
  }, [code]);

  return (
    <div className="flex justify-center mt-2">
      <canvas
        ref={canvasRef}
        className="rounded-md border select-none"
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default Backup;

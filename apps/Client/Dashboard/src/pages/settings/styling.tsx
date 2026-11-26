import BorderRadiusPopoutCaller from "@/components/settings/styles/border-radius-popout-caller";
import ColorPicker from "@/components/settings/styles/color-picker";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

interface styleResponse {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  borderRadius: number;
  accent: string;
}

interface ThemePreset {
  name: string;
  theme: styleResponse;
}

const themePresets: ThemePreset[] = [
  {
    name: "Dunkel Neutral",
    theme: {
      primary: "#6b7280",
      secondary: "#374151",
      text: "#f5f5f5",
      background: "#171717",
      borderRadius: 8,
      accent: "#9ca3af",
    },
  },
  {
    name: "Dunkel Violett",
    theme: {
      primary: "#8b5cf6",
      secondary: "#4c1d95",
      text: "#e2e8f0",
      background: "#1e1b2e",
      borderRadius: 8,
      accent: "#a78bfa",
    },
  },
  {
    name: "Dunkel Ozean",
    theme: {
      primary: "#22d3ee",
      secondary: "#0e7490",
      text: "#e0f2fe",
      background: "#0c1929",
      borderRadius: 10,
      accent: "#67e8f9",
    },
  },
  {
    name: "Hell Warm",
    theme: {
      primary: "#ea580c",
      secondary: "#fed7aa",
      text: "#1c1917",
      background: "#fffbeb",
      borderRadius: 12,
      accent: "#f97316",
    },
  },
];

function Styling() {
  const { keycloak } = useKeycloak();
  const [data, setData] = useState<styleResponse>({
    primary: "",
    secondary: "",
    text: "",
    background: "",
    borderRadius: 0,
    accent: "",
  });
  const [pendingTheme, setPendingTheme] = useState<styleResponse | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const applyTheme = async (theme: styleResponse) => {
    setData(theme);
    try {
      await authFetch(
        getFetchUrl("api/v2/styling"),
        keycloak.token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(theme),
        },
        "POST"
      );
      toast.success("Theme angewendet");
    } catch (error) {
      toast.error("Fehler beim Anwenden des Themes");
    }
  };

  const handleThemeClick = (theme: styleResponse) => {
    setPendingTheme(theme);
    setShowConfirmDialog(true);
  };

  const isThemeActive = (theme: styleResponse) => {
    return (
      data.primary === theme.primary &&
      data.secondary === theme.secondary &&
      data.text === theme.text &&
      data.background === theme.background &&
      data.borderRadius === theme.borderRadius &&
      data.accent === theme.accent
    );
  };

  const confirmApplyTheme = () => {
    if (pendingTheme) {
      applyTheme(pendingTheme);
    }
    setShowConfirmDialog(false);
    setPendingTheme(null);
  };

  const handleGenerateAiTheme = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Bitte geben Sie eine Beschreibung für das Theme ein.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await authFetch(
        getFetchUrl("api/v2/styling/generate-ai-theme"),
        keycloak.token ?? "",
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: aiPrompt }),
        },
        "POST"
      );

      if (response.ok) {
        const generatedTheme: styleResponse = await response.json();
        setData(generatedTheme);
        toast.success("Theme erfolgreich generiert!");
        setAiPrompt("");
        setShowAiPrompt(false);
      } else {
        const errorData = await response.json();
        toast.error(
          `Theme-Generierung fehlgeschlagen: ${errorData.error || "Unbekannter Fehler"}`
        );
      }
    } catch (error) {
      console.error("Error generating AI theme:", error);
      toast.error(
        "Theme-Generierung fehlgeschlagen: Netzwerkfehler oder Serverproblem."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (keycloak.token) {
      authFetch(getFetchUrl("api/v2/styling"), keycloak.token)
        .then((res) => res.json())
        .then((data) => {
          setData(data);
        });
    }
  }, [keycloak.token]);

  return (
    <div className="flex flex-col gap-5 h-full pr-2 max-w-200 mx-auto mb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Styling</h1>
        <Button
          variant="outline"
          size="default"
          onClick={() => setShowAiPrompt(true)}
          className="shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          KI-Theme-Generator
        </Button>
      </div>

      {/* AI Theme Generator Modal */}
      <Dialog open={showAiPrompt} onOpenChange={setShowAiPrompt}>
        <DialogContent className="sm:max-w-[550px] bg-purple-50 dark:bg-accent border-purple-300 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle className="text-purple-800 dark:text-purple-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              KI-Theme-Generator
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300">
              Beschreiben Sie Ihr gewünschtes Theme und lassen Sie es von der KI generieren
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="ai-theme-prompt"
                className="text-sm font-medium text-foreground"
              >
                Theme-Beschreibung
              </Label>
              <Textarea
                id="ai-theme-prompt"
                value={aiPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPrompt(e.target.value)}
                placeholder="z.B. 'Ein elegantes dunkles Theme mit tiefem Blau und Gold-Akzenten' oder 'Ein helles, frisches Theme mit Pastellfarben'"
                className="min-h-[120px] bg-white dark:bg-accent text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 border-purple-200 dark:border-purple-800 focus-visible:ring-purple-500 resize-none"
                disabled={isGenerating}
              />
            </div>
            
            <div className="text-xs text-gray-700 dark:text-gray-300 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-md border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <span className="text-base">💡</span>
                <div>
                  <p className="font-medium mb-1">Hinweise:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Beschreiben Sie Ihr gewünschtes Theme in natürlicher Sprache</li>
                    <li>Geben Sie Farbpräferenzen an (z.B. "dunkel", "hell", "blau", "warm")</li>
                    <li>Erwähnen Sie den gewünschten Stil (z.B. "elegant", "modern", "verspielt")</li>
                    <li>Das generierte Theme wird sofort angezeigt und kann angepasst werden</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAiPrompt(false)}
              disabled={isGenerating}
              className="text-foreground hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleGenerateAiTheme}
              disabled={isGenerating || !aiPrompt.trim()}
              className="bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generieren...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Generieren
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-5 items-center flex-1">
        <div className="flex flex-row gap-5 flex-wrap justify-center *:flex-1">
          <ColorPicker
            header="Text"
            text="Textfarbe"
            color="text"
            data={data}
            setData={setData}
          />
          <ColorPicker
            header="Hintergrund"
            text="Hintergrundfarbe"
            color="background"
            data={data}
            setData={setData}
          />
          <ColorPicker
            header="Primär"
            text="Primäre Farbe"
            color="primary"
            data={data}
            setData={setData}
          />
          <ColorPicker
            header="Sekundär"
            text="Sekundäre Farbe"
            color="secondary"
            data={data}
            setData={setData}
          />
          <ColorPicker
            header="Akzent"
            text="Akzentfarbe"
            color="accent"
            data={data}
            setData={setData}
          />
        </div>
        <BorderRadiusPopoutCaller data={data} setData={setData} />
        <div className="w-full mt-6">
          <h2 className="text-lg font-semibold mb-3 text-center">Themes</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <TooltipProvider>
              {themePresets.map((preset) => {
                const isActive = isThemeActive(preset.theme);
                const button = (
                  <Button
                    key={preset.name}
                    variant="outline"
                    onClick={() => handleThemeClick(preset.theme)}
                    disabled={isActive}
                    className={`flex items-center gap-2 px-4 py-2 ${
                      isActive ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full ring-1 ring-gray-400"
                      style={{ backgroundColor: preset.theme.background }}
                    />
                    <div
                      className="w-4 h-4 rounded-full ring-1 ring-gray-400 -ml-2"
                      style={{ backgroundColor: preset.theme.primary }}
                    />
                    <span>{preset.name}</span>
                  </Button>
                );

                if (isActive) {
                  return (
                    <Tooltip key={preset.name}>
                      <TooltipTrigger asChild>
                        <span>{button}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dieses Theme ist bereits aktiv</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </TooltipProvider>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Theme anwenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Beim Anwenden eines neuen Themes werden alle aktuellen
              Styling-Einstellungen überschrieben. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyTheme}>
              Theme anwenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Styling;

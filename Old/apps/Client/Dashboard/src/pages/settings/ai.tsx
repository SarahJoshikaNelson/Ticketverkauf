import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getFetchUrl } from "@/utils/getFetchUrl";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import {
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Bot,
} from "lucide-react";

function AiSettings() {
  const { keycloak } = useKeycloak();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Model state
  const [model, setModel] = useState("");
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelMessage, setModelMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!keycloak.token) return;

      try {
        // Check token status
        const tokenResponse = await authFetch(
          getFetchUrl("/api/v2/bank/ai-token/status"),
          keycloak.token,
          {},
          "GET"
        );
        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          setHasToken(data.hasToken);
        }

        // Get current model
        const modelResponse = await authFetch(
          getFetchUrl("/api/v2/bank/ai-model"),
          keycloak.token,
          {},
          "GET"
        );
        if (modelResponse.ok) {
          const data = await modelResponse.json();
          setCurrentModel(data.model);
          setModel(data.model);
        }
      } catch {
        // Silently fail
      } finally {
        setIsCheckingStatus(false);
      }
    };

    fetchSettings();
  }, [keycloak.token]);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage({ type: "error", text: "Bitte geben Sie einen Token ein." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await authFetch(
        getFetchUrl("/api/v2/bank/ai-token"),
        keycloak.token,
        {
          body: token.trim(),
          headers: { "Content-Type": "text/plain" },
        },
        "PUT"
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: "AI Token erfolgreich gespeichert!",
        });
        setToken("");
        setHasToken(true);
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.error || "Fehler beim Speichern des Tokens.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveModel = async () => {
    if (!model.trim()) {
      setModelMessage({
        type: "error",
        text: "Bitte geben Sie ein Modell ein.",
      });
      return;
    }

    setIsLoadingModel(true);
    setModelMessage(null);

    try {
      const response = await authFetch(
        getFetchUrl("/api/v2/bank/ai-model"),
        keycloak.token,
        {
          body: model.trim(),
          headers: { "Content-Type": "text/plain" },
        },
        "PUT"
      );

      if (response.ok) {
        setModelMessage({
          type: "success",
          text: "Modell erfolgreich gespeichert!",
        });
        setCurrentModel(model.trim());
      } else {
        const error = await response.json();
        setModelMessage({
          type: "error",
          text: error.error || "Fehler beim Speichern des Modells.",
        });
      }
    } catch {
      setModelMessage({
        type: "error",
        text: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsLoadingModel(false);
    }
  };

  const renderStatusBadge = () => {
    if (isCheckingStatus) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Prüfe...
        </Badge>
      );
    }
    if (hasToken) {
      return (
        <Badge className="bg-green-600 hover:bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Aktiv
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Nicht konfiguriert
      </Badge>
    );
  };

  const hasModelChanged = model.trim() !== currentModel;

  return (
    <div className="flex flex-col items-center gap-6 w-full pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold text-center w-full">
        KI-Einstellungen
      </h1>

      {/* Privacy Notice */}
      <div className="flex items-start gap-3 p-4 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg w-full">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold mb-1">Kontoauszugsverarbeitung</p>
          <p>
            Aufgrund Datenschutzrichtlinien bis auf weiteres nicht verfügbar. Nach genauerer Recherche und Überarbeitung wird dieses Feature jedoch hoffentlich zurückkehren.
          </p>
        </div>
      </div>

      {/* Token Card */}
      <Card className="w-full mx-auto opacity-60 pointer-events-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>OpenRouter API Token</CardTitle>
            {renderStatusBadge()}
          </div>
          <CardDescription className="text-center">
            Token für die KI-gestützte Kontoauszugsverarbeitung.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning notice */}
          <div className="flex items-start gap-2 p-3 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Der Token kann aus Sicherheitsgründen nicht abgerufen werden – nur
              überschrieben.
            </span>
          </div>

          {/* Token input */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-center block">
              Neuer Token
            </Label>
            <div className="flex flex-col gap-2">
              <div className="relative w-full">
                <Input
                  id="token"
                  type={showToken ? "text" : "password"}
                  placeholder="sk-or-v1-..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full pr-10 font-mono text-sm"
                  disabled
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Fix: add explicit text color for contrast */}
              <Button
                className="w-full text-foreground"
                onClick={handleSaveToken}
                disabled
              >
                <Save className="h-4 w-4 mr-2" />
                <span className="text-foreground">Speichern</span>
              </Button>
            </div>
          </div>

          {/* Success/Error message */}
          {message && (
            <div
              className={`flex items-center gap-2 justify-center pr-3 text-sm rounded-lg border ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Instructions */}
          <div className="pt-3 border-t text-sm text-muted-foreground text-center">
            <p className="font-medium text-foreground mb-2">
              So erhalten Sie einen Token:
            </p>
            <ol className="list-decimal list-inside space-y-1 inline-block text-left">
              <li>
                Besuchen Sie{" "}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai
                </a>
              </li>
              <li>Erstellen Sie ein Konto oder melden Sie sich an</li>
              <li>Gehen Sie zu „Keys" im Dashboard</li>
              <li>Erstellen Sie einen neuen API-Schlüssel</li>
              <li>Kopieren Sie den Schlüssel und fügen Sie ihn hier ein</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Model Card */}
      <Card className="w-full mx-auto opacity-60 pointer-events-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              KI-Modell
            </CardTitle>
            {currentModel && (
              <Badge variant="secondary" className="font-mono text-xs">
                {currentModel}
              </Badge>
            )}
          </div>
          <CardDescription className="text-center">
            Wählen Sie das OpenRouter-Modell für die Kontoauszugsverarbeitung.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model input */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-center block">
              Modell-ID
            </Label>
            <div className="flex flex-col gap-2">
              <Input
                id="model"
                type="text"
                placeholder="openai/gpt-4o-mini"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full font-mono text-sm"
                disabled
              />
              {/* Fix: add explicit text color for contrast */}
              <Button
                className="w-full text-foreground"
                onClick={handleSaveModel}
                disabled
              >
                <Save className="h-4 w-4 mr-2" />
                <span className="text-foreground">Speichern</span>
              </Button>
            </div>
          </div>

          {/* Success/Error message */}
          {modelMessage && (
            <div
              className={`flex items-center gap-2 justify-center p-3 text-sm rounded-lg border ${
                modelMessage.type === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              }`}
            >
              {modelMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {modelMessage.text}
            </div>
          )}

          {/* Model examples */}
          <div className="pt-3 border-t text-sm text-muted-foreground text-center">
            <p className="font-medium text-foreground mb-2">
              Verfügbare Modelle (Beispiele):
            </p>
            <ul className="space-y-1 inline-block text-left">
              <li>
                <code className="bg-muted px-1 rounded">
                  xiaomi/mimo-v2-flash:free
                </code>{" "}
                – Das overall beste, sehr empfohlen
              </li>
              <li>
                <code className="bg-muted px-1 rounded">
                  allenai/olmo-3-32b-think:free
                </code>{" "}
                – Gratis Alien
              </li>
              <li>
                <code className="bg-muted px-1 rounded">
                  anthropic/claude-3.5-sonnet
                </code>{" "}
                – Sehr gut
              </li>
              <li>
                <code className="bg-muted px-1 rounded">
                  mistralai/devstral-2512:free
                </code>{" "}
                – Gratis und okay
              </li>
            </ul>
            <p className="mt-2">
              Alle Modelle:{" "}
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                openrouter.ai/models
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AiSettings;

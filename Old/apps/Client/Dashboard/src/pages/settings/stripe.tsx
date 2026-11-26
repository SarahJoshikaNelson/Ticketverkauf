import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFetchUrl } from "@/utils/getFetchUrl";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { usePhase } from "@/context/PhaseContext";
import { AlertCircle, CheckCircle2, Loader2, CreditCard, Key, Eye, EyeOff, Save } from "lucide-react";

function StripeSettings() {
  const { keycloak } = useKeycloak();
  const { phase } = usePhase();
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keysMessage, setKeysMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!keycloak.token) return;
    Promise.all([
      authFetch(getFetchUrl("api/v2/admin/stripe-enabled"), keycloak.token)
        .then((res) => res.json())
        .then((data) => setEnabled(data.enabled)),
      authFetch(getFetchUrl("api/v2/admin/stripe-keys"), keycloak.token)
        .then((res) => res.json())
        .then((data) => {
          setSecretKey(data.secretKey || "");
          setWebhookSecret(data.webhookSecret || "");
        }),
    ])
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [keycloak.token]);

  const handleToggle = async (checked: boolean) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await authFetch(
        getFetchUrl("api/v2/admin/stripe-enabled"),
        keycloak.token,
        {
          body: JSON.stringify({ enabled: checked }),
          headers: { "Content-Type": "application/json" },
        },
        "POST"
      );
      if (response.ok) {
        setEnabled(checked);
        setMessage({
          type: "success",
          text: checked
            ? "Stripe-Zahlungen wurden aktiviert."
            : "Stripe-Zahlungen wurden deaktiviert.",
        });
      } else {
        const text = await response.text();
        setMessage({ type: "error", text: text || "Fehler beim Speichern." });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKeys = async () => {
    setIsSavingKeys(true);
    setKeysMessage(null);
    try {
      const response = await authFetch(
        getFetchUrl("api/v2/admin/stripe-keys"),
        keycloak.token,
        {
          body: JSON.stringify({ secretKey, webhookSecret }),
          headers: { "Content-Type": "application/json" },
        },
        "POST"
      );
      if (response.ok) {
        setKeysMessage({
          type: "success",
          text: "Stripe-Schlüssel wurden gespeichert.",
        });
      } else {
        const text = await response.text();
        setKeysMessage({ type: "error", text: text || "Fehler beim Speichern." });
      }
    } catch {
      setKeysMessage({
        type: "error",
        text: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setIsSavingKeys(false);
    }
  };

  const isDisabled = phase !== 0;

  return (
    <div className="flex flex-col items-center gap-6 w-full pr-2 max-w-200 mx-auto">
      <h1 className="text-2xl font-bold text-center w-full">
        Stripe-Zahlungen
      </h1>

      {isDisabled && (
        <div className="flex items-start gap-3 p-4 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-lg w-full">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">Nur in Phase 0 konfigurierbar</p>
            <p>
              Die Stripe-Einstellung kann nur geändert werden, wenn sich das
              System in Phase 0 befindet (niemand kann bestellen).
            </p>
          </div>
        </div>
      )}

      <Card className={`w-full mx-auto ${isDisabled ? "opacity-60" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe-Zahlungen
            </CardTitle>
            {isLoading ? (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Laden...
              </Badge>
            ) : enabled ? (
              <Badge className="bg-green-600 hover:bg-green-600 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Aktiviert
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">Deaktiviert</Badge>
            )}
          </div>
          <CardDescription>
            Wenn aktiviert, werden Kunden beim Bestellen zu Stripe weitergeleitet
            um online zu bezahlen. Wenn deaktiviert, wird die Bestellung direkt
            per Überweisung aufgegeben.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="stripe-toggle" className="text-base">
              Stripe-Zahlungen aktivieren
            </Label>
            <button
              id="stripe-toggle"
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isLoading || isSaving || isDisabled}
              onClick={() => handleToggle(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                enabled ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  enabled ? "translate-x-[1.25rem]" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 p-3 text-sm rounded-lg border ${
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
        </CardContent>
      </Card>

      <Card className={`w-full mx-auto ${isDisabled ? "opacity-60" : ""}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API-Schlüssel
          </CardTitle>
          <CardDescription>
            Stripe Secret Key und Webhook Secret. Wenn leer, werden die
            Werte aus den Umgebungsvariablen verwendet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <div className="relative">
              <Input
                id="secret-key"
                type={showSecretKey ? "text" : "password"}
                placeholder="sk_live_... oder sk_test_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={isLoading || isDisabled}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <div className="relative">
              <Input
                id="webhook-secret"
                type={showWebhookSecret ? "text" : "password"}
                placeholder="whsec_..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                disabled={isLoading || isDisabled}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSaveKeys}
            disabled={isLoading || isSavingKeys || isDisabled}
            className="gap-2"
          >
            {isSavingKeys ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Schlüssel speichern
          </Button>

          {keysMessage && (
            <div
              className={`flex items-center gap-2 p-3 text-sm rounded-lg border ${
                keysMessage.type === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              }`}
            >
              {keysMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {keysMessage.text}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StripeSettings;

import React, { useEffect, useState } from "react";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function MailSettings() {
  const { keycloak } = useKeycloak();
  const [host, setHost] = useState("");
  const [port, setPort] = useState<number | "">("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPortFallback, setShowPortFallback] = useState(false);

  useEffect(() => {
    if (!keycloak.token) return;
    
    authFetch(getFetchUrl("api/v2/mail-config"), keycloak.token)
      .then(res => res.json())
      .then(data => {
        setHost(data.host || "");
        setPort(data.port || "");
        setUsername(data.username || "");
        setPassword(data.password || "");
        setFromName(data.fromName || "");
        setFromAddress(data.fromAddress || "");
      })
      .catch(e => {
        console.error(e);
        toast.error("Einstellungen konnten nicht geladen werden.");
      });
  }, [keycloak.token]);

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const payload = {
        host,
        port: port || null,
        username,
        password,
        fromName,
        fromAddress,
      };

      const res = await authFetch(getFetchUrl("api/v2/mail-config/test"), keycloak.token ?? "", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, "POST");

      if (res.ok) {
        const data = await res.json();
        setPort(data.port);
        setShowPortFallback(false);
        toast.success(`Verbindung erfolgreich! (Port ${data.port} funktioniert)`);
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           const err = await res.json();
           console.error(err);
           
           // Show port fallback if port is empty and connection failed.
           if (!port) {
             setShowPortFallback(true);
             toast.error(`Verbindung via Standard-Ports fehlgeschlagen:\n${err.error}`);
           } else {
             toast.error(`Verbindung fehlgeschlagen:\n${err.error || "Unbekannter Fehler"}`);
           }
        } else {
           const text = await res.text();
           console.error("Backend Error HTML:", text);
           toast.error(`Der Server hat einen Systemfehler (Status ${res.status}) ausgegeben. Wahrscheinlich ein interner Backend Fehler. Details in der Browserkonsole.`);
        }
      }
    } catch (e) {
      console.error("Catch Block Fehler:", e);
      // Let's show the actual thrown error if possible
      toast.error(`Netzwerk- oder Clientfehler aufgetreten: ${e}`);
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        host,
        port: port || null,
        username,
        password,
        fromName,
        fromAddress,
      };

      const res = await authFetch(getFetchUrl("api/v2/mail-config"), keycloak.token ?? "", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }, "POST");

      if (res.ok) {
        toast.success("Mail-Einstellungen erfolgreich gespeichert!");
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          toast.error(`Fehler beim Speichern: ${err.error || JSON.stringify(err)}`);
        } else {
          const text = await res.text();
          console.error("Save error:", text);
          toast.error(`Server-Fehler beim Speichern (Status ${res.status}). Details in der Konsole.`);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pr-2 max-w-2xl mx-auto py-8 w-full">
      <h1 className="text-2xl font-bold">Mail-Server Eigenschaften</h1>
      <Card>
        <CardHeader>
          <CardTitle>SMTP-Zugangsdaten</CardTitle>
          <CardDescription>
            Konfigurieren Sie hier die Verbindung zu Ihrem Mail-Provider (z.B. Outlook, Gmail). 
            Das Passwort wird sicher verschlüsselt in der Datenbank gespeichert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Input id="host" placeholder="z.B. smtp-mail.outlook.com" value={host} onChange={e => setHost(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">SMTP Benutzername (Mail)</Label>
            <Input id="username" placeholder="mail@example.com" value={username} onChange={e => setUsername(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input id="password" type="password" placeholder={password === "********" ? "Gespeichertes Passwort aktiv (tippen zum Ändern)" : "Passwort Ihres Mail-Providers"} value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromName">Absender Name (Anzeigename)</Label>
            <Input id="fromName" placeholder="Z.b. Maturaballkomitee" value={fromName} onChange={e => setFromName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromAddress">Absender E-Mailadresse</Label>
            <Input id="fromAddress" placeholder="mail@example.com" value={fromAddress} onChange={e => setFromAddress(e.target.value)} />
          </div>

          {(port || showPortFallback) && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="port">Port</Label>
              <Input id="port" type="number" placeholder="z.B. 587 oder 465" value={port} onChange={e => setPort(e.target.value ? parseInt(e.target.value) : "")} />
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/20 p-4 border-t mt-4 rounded-b-xl">
            <Button variant="outline" onClick={testConnection} disabled={isTesting || !host || !username}>
              {isTesting ? "Wird getestet..." : "Verbindung testen"}
            </Button>
            
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={saveSettings} disabled={isSaving || !host || !username}>
              {isSaving ? "Speichern..." : "Einstellungen speichern"}
            </Button>
        </CardFooter>
      </Card>
      
      {showPortFallback && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Die automatische Erkennung des Ports war leider nicht erfolgreich. Bitte suchen Sie den entsprechenden SMTP-Port (meistens 587, 465 oder 25) manuell bei Ihrem E-Mail-Provider und tragen Sie ihn oben ein.
          </div>
      )}
    </div>
  );
}

export default MailSettings;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

function ConfirmationDurationAdjuster() {
    const [startConfirmationDuration, setStartConfirmationDuration] = useState<number>(0);
    const [confirmationDuration, setConfirmationDuration] = useState<number>(0);

    const { keycloak } = useKeycloak();

    const saveConfirmationDuration = async () => {
        const req = await authFetch(
            getFetchUrl("api/v2/queue/confirmation-duration/" + confirmationDuration),
            keycloak.token,
            {},
            'PUT'
        );

        if (req.ok) {
            setStartConfirmationDuration(confirmationDuration);
            if (confirmationDuration === 0) {
                toast.success("Bestätigungsprüfung deaktiviert");
            } else {
                toast.success(`Zeit zum Bestätigen geändert: ${confirmationDuration} ${confirmationDuration === 1 ? 'Stunde' : 'Stunden'}`);
            }
        } else {
            toast.error("Fehler beim Ändern der Bestätigungszeit");
        }
    };

    useEffect(() => {
        authFetch(getFetchUrl("api/v2/queue/confirmation-duration"), keycloak.token)
            .then(res => res.json())
            .then(data => {
                setConfirmationDuration(parseInt(data));
                setStartConfirmationDuration(parseInt(data));
            });
    }, [keycloak.token]);

    return (
        <Card className="max-sm:min-w-full w-full">
            <CardHeader>
                <CardTitle>Zeit zum Bestätigen - {startConfirmationDuration} Stunden</CardTitle>
                <CardDescription>
                    Nach dieser angegebenen Zeit werden Bestellungen, welche nicht per Mail bestätigt wurden, gelöscht.
                    {" "}
                    Um dieses Feature zu deaktivieren (nicht empfohlen!
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="inline-block w-4 h-4 ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Wenn Sie dieses Feature deaktivieren, werden die nicht bestätigten Bestellungen im System bleiben!</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    ), geben Sie eine 0 an.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
                            <Label htmlFor="confirmationTime">Zeit zum Bestätigen (Stunden)</Label>
                            <Input
                                type="number"
                                id="confirmationTime"
                                value={confirmationDuration}
                                onChange={(e) => setConfirmationDuration(parseInt(e.target.value))}
                                min="0"
                            />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    disabled={confirmationDuration === startConfirmationDuration}
                    variant="destructive"
                    onClick={() => setConfirmationDuration(startConfirmationDuration)}
                >
                    Zurücksetzen
                </Button>
                <Button
                    disabled={confirmationDuration === startConfirmationDuration}
                    variant="outline"
                    onClick={saveConfirmationDuration}
                >
                    Speichern
                </Button>
            </CardFooter>
        </Card>
    );
}

export default ConfirmationDurationAdjuster;

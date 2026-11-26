import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";

function MaxCountPerOrderManager() {
    const [startMaxCount, setStartMaxCount] = useState<number>(0);
    const [maxCount, setMaxCount] = useState<number>(0);

    const { keycloak } = useKeycloak();

    const saveMaxCount = async () => {
        const req = await authFetch(getFetchUrl("api/v2/ticket/count-per-order/" + maxCount), keycloak.token, {
            body: maxCount.toString()
        }, 'PUT')

        if (req.ok) {
            setStartMaxCount(maxCount);
            toast.success(`Maximale Anzahl der Tickets pro Bestellung geändert: ${maxCount}`);
        } else {
            toast.error("Fehler beim Ändern der maximale Anzahl der Tickets pro Bestellung");
        }
    }

    useEffect(() => {
        authFetch(getFetchUrl("api/v2/ticket/count-per-order"), keycloak.token)
            .then(res => res.json())
            .then(data => {
                setMaxCount(parseInt(data));
                setStartMaxCount(parseInt(data));
            });
    }, [keycloak.token]);

    return (
        <Card className="max-sm:min-w-full w-full">
            <CardHeader>
                <CardTitle>Max. Tickets pro Bestellung - {startMaxCount}</CardTitle>
                <CardDescription>Wähle eine maximale Anzahl der Tickets pro Bestellung aus.</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
                            <Label htmlFor="maxCountPerOrder">Maximale Anzahl der Tickets pro Bestellung</Label>
                            <Input type="number" id="maxCountPerOrder" min={1} value={maxCount} onChange={(e) => setMaxCount(parseInt(e.target.value))} />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button disabled={maxCount === startMaxCount} variant="destructive" onClick={() => setMaxCount(startMaxCount)}>Zurücksetzen</Button>
                <Button disabled={maxCount === startMaxCount} variant="outline" onClick={saveMaxCount}>Speichern</Button>
            </CardFooter>
        </Card>
    )
}

export default MaxCountPerOrderManager;


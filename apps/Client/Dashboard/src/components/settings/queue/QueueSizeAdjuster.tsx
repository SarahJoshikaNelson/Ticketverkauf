import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useState, useEffect} from "react";
import {toast} from "sonner";
import authFetch from "@/utils/authfetch";
import {useKeycloak} from "@react-keycloak/web";
import {getFetchUrl} from "@/utils/getFetchUrl";

function QueueSizeAdjuster() {
    const [startQueueSize, setStartQueueSize] = useState<number>(0);
    const [queueSize, setQueueSize] = useState<number>(0);

    const {keycloak} = useKeycloak();

    const saveQueueSize = async () => {
        const req = await authFetch(getFetchUrl("api/v2/queue/size/" + queueSize), keycloak.token, {}, 'PUT')

        if (req.ok) {
            setStartQueueSize(queueSize);
            toast.success(`Größe der Non-Queue-Grenze geändert: ${queueSize}`);
        } else {
            toast.error("Fehler beim Ändern der Größe der Non-Queue-Grenze");
        }
    }

    useEffect(() => {
        if (keycloak.token) {
            authFetch(getFetchUrl("api/v2/queue/size"), keycloak.token)
                .then(res => res.json())
                .then(data => {
                    setQueueSize(parseInt(data));
                    setStartQueueSize(parseInt(data));
                });
        }
    }, [keycloak.token]);

    return (
        <Card className="max-sm:min-w-full w-full">
            <CardHeader>
                <CardTitle>Größe der Non-Queue-Grenze - {startQueueSize}</CardTitle>
                <CardDescription>Bestimme die maximale Anzahl an gleichzeitig bestellenden Personen.</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
                            <Label htmlFor="maxCount">Größe der Non-Queue-Grenze</Label>
                            <Input type="number" id="maxCount" value={queueSize} onChange={(e) => setQueueSize(parseInt(e.target.value))}/>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button disabled={queueSize === startQueueSize} variant="destructive"
                        onClick={() => setQueueSize(startQueueSize)}>Zurücksetzen</Button>
                <Button disabled={queueSize === startQueueSize} variant="outline" onClick={saveQueueSize}>Speichern</Button>
            </CardFooter>
        </Card>
    )
}

export default QueueSizeAdjuster;
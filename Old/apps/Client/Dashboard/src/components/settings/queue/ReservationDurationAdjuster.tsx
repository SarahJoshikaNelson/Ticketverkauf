import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";

function ReservationDurationAdjuster() {
    const [startReservationDuration, setStartReservationDuration] = useState<number>(0);
    const [reservationDuration, setReservationDuration] = useState<number>(0);

    const { keycloak } = useKeycloak();

    const saveReservationDuration = async () => {
            const req = await authFetch(getFetchUrl("api/v2/queue/duration/" + reservationDuration), keycloak.token, { }, 'PUT')

            if (req.ok) {
                setStartReservationDuration(reservationDuration);
                if (reservationDuration === 0) {
                    toast.success("Queue deaktiviert");
                } else {
                    toast.success(`Größe der Queue geändert: ${reservationDuration}`);
                }
            } else {
            toast.error("Fehler beim Ändern der Größe der Queue");
        }
    }

    useEffect(() => {
            authFetch(getFetchUrl("api/v2/queue/duration"), keycloak.token)
                .then(res => res.json())
                .then(data => {
                    setReservationDuration(parseInt(data));
                setStartReservationDuration(parseInt(data));
            });
    }, [keycloak.token]);

    return (
        <Card className="max-sm:min-w-full w-full">
            <CardHeader>
                <CardTitle>Dauer der Reservierungszeit - {startReservationDuration}</CardTitle>
                <CardDescription>Bestimme die maximale Dauer der Reservierungszeit per Person. Um die Queue zu deaktivieren, setzen Sie die Dauer auf 0.</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
                            <Label htmlFor="maxCount">Dauer der Reservierungszeit (Minuten)</Label>
                            <Input type="number" id="maxCount" value={reservationDuration} onChange={(e) => setReservationDuration(parseInt(e.target.value))} />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button disabled={reservationDuration === startReservationDuration} variant="destructive" onClick={() => setReservationDuration(startReservationDuration)}>Zurücksetzen</Button>
                <Button disabled={reservationDuration === startReservationDuration} variant="outline" onClick={saveReservationDuration}>Speichern</Button>
            </CardFooter>
        </Card>
    )
}

export default ReservationDurationAdjuster;
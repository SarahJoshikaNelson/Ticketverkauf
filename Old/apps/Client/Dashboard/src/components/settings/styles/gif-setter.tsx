import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DataDTO {
    title: string;
    subTitle: string;
    date: string;
    "gif-url": string;
}

function GifSetter() {
    const { keycloak } = useKeycloak();

    const [gifUrl, setGifUrl] = useState("");
    const [startGifUrl, setStartGifUrl] = useState("");
    const [dataObject, setDataObject] = useState<DataDTO | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
            // Fetch the entire Data object first
            authFetch(getFetchUrl("api/v2/data/"), keycloak.token)
                .then(res => res.json())
                .then(data => {
                    setDataObject({
                        title: data.title,
                        subTitle: data.subTitle,
                        date: data.onDate,
                        "gif-url": data.gifUrl || ""
                    });
                    setGifUrl(data.gifUrl || "");
                    setStartGifUrl(data.gifUrl || "");
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching data:", err);
                toast.error("Fehler beim Laden der Daten");
                setLoading(false);
            });
    }, [keycloak.token]);

    const saveGifUrl = async () => {
        if (dataObject) {
            // Create updated DTO with all existing values but new GIF URL
            const updatedData: DataDTO = {
                ...dataObject,
                "gif-url": gifUrl
            };

            const req = await authFetch(
                getFetchUrl("api/v2/data/"), 
                keycloak.token, 
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(updatedData)
                },
                'POST'
            );

            if (req.ok) {
                setStartGifUrl(gifUrl);
                setDataObject(updatedData);
                toast.success("GIF URL gespeichert");
            } else {
                toast.error("Fehler beim Speichern der GIF URL");
            }
        }
    }

    if (loading) {
        return (
            <Card className="max-sm:min-w-full w-full">
                <CardHeader>
                    <CardTitle>GIF URL wird geladen...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="max-sm:min-w-full w-full">
            <CardHeader>
                <CardTitle>GIF URL für Warteschlange</CardTitle>
                <CardDescription>Legen Sie die URL für das animierte GIF fest, das in der Warteschlange angezeigt wird.</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5 w-full max-sm:text-sm max-w-full overflow-hidden">
                            <Label htmlFor="gifUrl">GIF URL</Label>
                            <Input 
                                type="url" 
                                id="gifUrl" 
                                placeholder="https://example.com/animation.gif"
                                value={gifUrl} 
                                onChange={(e) => setGifUrl(e.target.value)} 
                            />
                        </div>
                        {gifUrl && (
                            <div className="flex flex-col space-y-1.5">
                                <Label>Vorschau</Label>
                                <div className="border rounded-lg p-4 bg-muted flex items-center justify-center">
                                    <img 
                                        src={gifUrl} 
                                        alt="GIF Preview" 
                                        className="max-w-full max-h-48 rounded-lg"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            toast.error("GIF konnte nicht geladen werden");
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button 
                    disabled={gifUrl === startGifUrl} 
                    variant="destructive" 
                    onClick={() => setGifUrl(startGifUrl)}
                >
                    Zurücksetzen
                </Button>
                <Button 
                    disabled={gifUrl === startGifUrl} 
                    variant="outline" 
                    onClick={saveGifUrl}
                >
                    Speichern
                </Button>
            </CardFooter>
        </Card>
    )
}

export default GifSetter;
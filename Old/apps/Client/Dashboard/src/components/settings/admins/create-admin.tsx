import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import PriorityDropdown from "./priority-dropdown";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";

interface CreateAdminProps {
    onAdminCreated?: () => void;
}

function CreateAdmin({ onAdminCreated }: CreateAdminProps) {
    const { keycloak } = useKeycloak();
    const [priority, setPriority] = useState<string>("HIGH");
    const [name, setName] = useState<string>("");
    const [id, setId] = useState<string>("");

    const saveAdmin = () => {
        if(name === "" || id === "" || priority === "") {
            toast.error("Bitte fülle alle Felder aus.");
            return;
        }

            authFetch(getFetchUrl("/api/v2/admin"), keycloak.token, {
                body: JSON.stringify({
                    name,
                    id,
                    priority
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            }, "POST")
                .then(res => {
                    if(res.status === 200) {
                        toast.success("Admin erfolgreich erstellt.");
                        setName("");
                        setId("");
                        setPriority("HIGH");
                        onAdminCreated?.();
                    } else {
                        toast.error("Fehler beim Erstellen des Admins.");
                    }
                })
                .catch(err => {
                toast.error("Fehler beim Erstellen des Admins.");
            });
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Schüler Admin hinzufügen</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Schüler Admin hinzufügen</DialogTitle>
                    <DialogDescription>
                        Hier kannst du einen neuen Admin hinzufügen.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="id" className="text-right">
                            ID
                        </Label>
                        <Input id="id" placeholder="if210044" className="col-span-3" value={id} onChange={(e) => setId(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input id="name" placeholder="Matula Ballmann" className="col-span-3" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="priority" className="text-right">
                            Priorität
                        </Label>
                        <PriorityDropdown priority={priority} setPriority={setPriority} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={saveAdmin}>Speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default CreateAdmin;
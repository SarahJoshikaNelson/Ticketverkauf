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

interface CreateExternAdminProps {
    onAdminCreated?: () => void;
}

function CreateExternAdmin({ onAdminCreated }: CreateExternAdminProps) {
    const { keycloak } = useKeycloak();
    const [priority, setPriority] = useState<string>("LOW");
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const saveAdmin = () => {
        if (username === "" || password === "" || priority === "") {
            toast.error("Bitte fülle alle Felder aus.");
            return;
        }

            authFetch(getFetchUrl("/api/v2/auth/register"), keycloak.token, {
                body: JSON.stringify({
                    username,
                    password,
                    priority
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            }, "POST")
                .then(res => {
                    if (res.status === 200 || res.status === 201) {
                        toast.success("Admin erfolgreich erstellt.");
                        setUsername("");
                        setPassword("");
                        setPriority("LOW");
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
                <Button variant="outline">Externen Admin hinzufügen</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Externen Admin hinzufügen</DialogTitle>
                    <DialogDescription>
                        Hier kannst du einen neuen Admin hinzufügen.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Benutzername
                        </Label>
                        <Input id="username" placeholder="Matula Ballmann" className="col-span-3" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="id" className="text-right">
                            Passwort
                        </Label>
                        <Input id="password" placeholder="Passwort" className="col-span-3" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
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

export default CreateExternAdmin;
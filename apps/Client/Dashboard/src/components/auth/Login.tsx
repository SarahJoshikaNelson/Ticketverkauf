import { useKeycloak } from '@react-keycloak/web';
import { Button } from '../ui/button';
import { ArrowRightIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { getFetchUrl } from '@/utils/getFetchUrl';
import { clearAdminTokens, setAdminTokens } from '@/utils/adminTokens';

export default function Login() {
  const { keycloak } = useKeycloak();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [priority, setPriority] = useState<string>("LOW");
  

  const login = () => {
    if (username === "" || password === "") {
      toast.error("Bitte fülle alle Felder aus.");
      return;
    }
    
    fetch(getFetchUrl("api/v2/auth/login"), {
      method: "POST",
      body: JSON.stringify({
        username,
        password
      }),
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    })
    .then(async res => {
      if (res.ok) {
        toast.success("Erfolgreich eingeloggt.");
        if (window.location.protocol === "http:") {
          const tokens: { accessToken: string; refreshToken: string } = await res.json();
          setAdminTokens(tokens.accessToken, tokens.refreshToken);
          window.location.reload();
          return;
        }
        clearAdminTokens();
        window.location.reload();
      } else {
        toast.error("Fehler beim Einloggen.");
      }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Button variant="outline" onClick={() => keycloak.login()}>
        <p>Schüler einloggen</p>
        <ArrowRightIcon className="w-6 h-6" />
      </Button>
      <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Externer Admin einloggen <ArrowRightIcon className="w-6 h-6" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Externer Admin einloggen</DialogTitle>
                    <DialogDescription>
                        Hier kannst du einen externen Admin einloggen.
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
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={login}>Einloggen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
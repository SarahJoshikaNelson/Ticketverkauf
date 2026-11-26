import { useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";

interface Maturant {
  ldapUser: string;
  firstName: string;
  lastName: string;
  className: string;
}

interface EditMaturantModalProps {
  maturant: Maturant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditMaturantModal({
  maturant,
  open,
  onOpenChange,
  onSuccess,
}: EditMaturantModalProps) {
  const { keycloak } = useKeycloak();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Maturant>(maturant);

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.className.trim()) {
      toast.error("Bitte füllen Sie alle Felder aus.");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(
        getFetchUrl(`api/v2/students/${maturant.ldapUser}`),
        keycloak.token ?? "",
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
        "PUT"
      );

      if (res.ok) {
        toast.success("Maturant erfolgreich aktualisiert!");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Fehler beim Aktualisieren des Maturanten.");
      }
    } catch (err) {
      toast.error("Fehler beim Aktualisieren des Maturanten.");
      console.error("Update error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Maturant bearbeiten</DialogTitle>
          <DialogDescription>
            Ändern Sie die Daten des Maturanten. LDAP-User kann nicht geändert werden.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ldapUser" className="text-right">
              LDAP-User
            </Label>
            <Input
              id="ldapUser"
              value={formData.ldapUser}
              disabled
              className="col-span-3 bg-gray-100"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              Vorname
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">
              Familienname
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="className" className="text-right">
              Klasse
            </Label>
            <Input
              id="className"
              value={formData.className}
              onChange={(e) =>
                setFormData({ ...formData, className: e.target.value })
              }
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button type="submit" onClick={handleSave} disabled={saving}>
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


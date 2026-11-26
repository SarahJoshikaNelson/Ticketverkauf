import { useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { UserPlus } from "lucide-react";

interface AddMaturantModalProps {
  onSuccess: () => void;
}

export default function AddMaturantModal({ onSuccess }: AddMaturantModalProps) {
  const { keycloak } = useKeycloak();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    ldapUser: "",
    firstName: "",
    lastName: "",
    className: "",
  });

  const resetForm = () => {
    setFormData({
      ldapUser: "",
      firstName: "",
      lastName: "",
      className: "",
    });
  };

  const handleSave = async () => {
    // Validate all fields
    if (
      !formData.ldapUser.trim() ||
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.className.trim()
    ) {
      toast.error("Bitte füllen Sie alle Felder aus.");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(
        getFetchUrl("api/v2/students/"),
        keycloak.token ?? "",
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
        "POST"
      );

      if (res.ok) {
        toast.success("Maturant erfolgreich hinzugefügt!");
        resetForm();
        setOpen(false);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(
          `Fehler beim Hinzufügen: ${error.error || "LDAP-User existiert bereits"}`
        );
      }
    } catch (err) {
      toast.error("Fehler beim Hinzufügen des Maturanten.");
      console.error("Add error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!saving) {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Manuell hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Maturant hinzufügen</DialogTitle>
          <DialogDescription>
            Fügen Sie einen neuen Maturanten manuell hinzu. Alle Felder sind
            erforderlich.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-ldapUser" className="text-right">
              LDAP-User
            </Label>
            <Input
              id="add-ldapUser"
              value={formData.ldapUser}
              onChange={(e) =>
                setFormData({ ...formData, ldapUser: e.target.value })
              }
              placeholder="z.B. IF200123"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-firstName" className="text-right">
              Vorname
            </Label>
            <Input
              id="add-firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              placeholder="z.B. Max"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-lastName" className="text-right">
              Familienname
            </Label>
            <Input
              id="add-lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              placeholder="z.B. Mustermann"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-className" className="text-right">
              Klasse
            </Label>
            <Input
              id="add-className"
              value={formData.className}
              onChange={(e) =>
                setFormData({ ...formData, className: e.target.value })
              }
              placeholder="z.B. 5AHIF"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button type="submit" onClick={handleSave} disabled={saving}>
            {saving ? "Wird hinzugefügt..." : "Hinzufügen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


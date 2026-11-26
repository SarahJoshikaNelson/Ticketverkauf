import { useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";

interface ClearAllAlertProps {
  onSuccess: () => void;
}

export default function ClearAllAlert({ onSuccess }: ClearAllAlertProps) {
  const { keycloak } = useKeycloak();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClearAll = async () => {
    setDeleting(true);
    try {
      const res = await authFetch(
        getFetchUrl("api/v2/students/all"),
        keycloak.token ?? "",
        {},
        "DELETE"
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} Maturanten erfolgreich gelöscht!`);
        setOpen(false);
        onSuccess();
      } else {
        toast.error("Fehler beim Löschen der Maturanten.");
      }
    } catch (err) {
      toast.error("Fehler beim Löschen der Maturanten.");
      console.error("Clear all error:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Alle löschen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alle Maturanten löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2">
              <p className="font-semibold text-red-600">
                ⚠️ WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <p>
                Möchten Sie wirklich <strong>alle Maturanten</strong> aus der
                Datenbank löschen? Alle gespeicherten Einträge werden permanent
                entfernt.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAll}
            disabled={deleting}
            className="text-red-500"
          >
            {deleting ? "Wird gelöscht..." : "Ja, alle löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


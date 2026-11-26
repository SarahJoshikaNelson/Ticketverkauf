import { useState, useRef } from "react";
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
import { toast } from "sonner";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { Upload, FileText } from "lucide-react";

interface UploadModalProps {
  onSuccess: () => void;
}

export default function UploadModal({ onSuccess }: UploadModalProps) {
  const { keycloak } = useKeycloak();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast.error("Bitte wählen Sie eine CSV-Datei aus.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Bitte wählen Sie zuerst eine Datei aus.");
      return;
    }

    setUploading(true);
    try {
      const csvContent = await selectedFile.text();

      const res = await authFetch(
        getFetchUrl("api/v2/students/upload"),
        keycloak.token ?? "",
        {
          headers: {
            "Content-Type": "text/plain",
          },
          body: csvContent,
        },
        "POST"
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count} Maturanten erfolgreich hochgeladen!`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setOpen(false);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(`Fehler beim Hochladen: ${error.error || res.statusText}`);
      }
    } catch (err) {
      toast.error("Fehler beim Hochladen der CSV-Datei.");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!uploading) {
      setOpen(newOpen);
      if (!newOpen) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          CSV hochladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>CSV-Datei hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie eine CSV-Datei mit Maturantendaten hoch. Die Datei sollte
            die Spalten "LDAP-User", "Vorname", "Familienname" und "Klasse"
            enthalten (durch Semikolon getrennt).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file-input-modal"
            />
            <label htmlFor="csv-file-input-modal" className="w-full">
              <Button
                asChild
                variant="outline"
                disabled={uploading}
                className="w-full"
              >
                <span className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Datei auswählen
                </span>
              </Button>
            </label>
            {selectedFile && (
              <div className="text-sm text-gray-600 text-center p-2 bg-gray-50 rounded">
                <strong>Ausgewählt:</strong> {selectedFile.name}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Wird hochgeladen..." : "Hochladen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


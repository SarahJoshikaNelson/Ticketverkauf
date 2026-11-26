import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import EditMaturantModal from "./edit-maturant-modal";
import DeleteMaturantAlert from "./delete-maturant-alert";

interface Maturant {
  ldapUser: string;
  firstName: string;
  lastName: string;
  className: string;
}

function StudentList() {
  const { keycloak } = useKeycloak();
  const [maturanten, setMaturanten] = useState<Maturant[] | "loading">("loading");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMaturant, setEditingMaturant] = useState<Maturant | null>(null);

  const fetchMaturanten = async () => {
    try {
      const res = await authFetch(
        getFetchUrl("api/v2/students/"),
        keycloak.token ?? ""
      );
      if (res.ok) {
        const data = await res.json();
        setMaturanten(data);
      } else {
        toast.error("Fehler beim Laden der Maturanten.");
        setMaturanten([]);
      }
    } catch (err) {
      toast.error("Fehler beim Laden der Maturanten.");
      setMaturanten([]);
    }
  };

  useEffect(() => {
    fetchMaturanten();
  }, [keycloak.token]);

  const handleDelete = async (ldapUser: string) => {
    try {
      const res = await authFetch(
        getFetchUrl(`api/v2/students/${ldapUser}`),
        keycloak.token ?? "",
        {},
        "DELETE"
      );

      if (res.ok) {
        toast.success("Maturant erfolgreich gelöscht!");
        fetchMaturanten();
      } else {
        toast.error("Fehler beim Löschen des Maturanten.");
      }
    } catch (err) {
      toast.error("Fehler beim Löschen des Maturanten.");
      console.error("Delete error:", err);
    }
  };

  const filteredMaturanten =
    maturanten === "loading"
      ? []
      : maturanten.filter(
          (maturant) =>
            maturant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            maturant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            maturant.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
            maturant.ldapUser.toLowerCase().includes(searchTerm.toLowerCase())
        );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Suchen nach Name, LDAP-User oder Klasse..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-0">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">LDAP-User</TableHead>
              <TableHead className="whitespace-nowrap">Vorname</TableHead>
              <TableHead className="whitespace-nowrap">Familienname</TableHead>
              <TableHead className="whitespace-nowrap">Klasse</TableHead>
              <TableHead className="whitespace-nowrap text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maturanten === "loading"
              ? new Array(5).fill(0).map((_, index) => (
                  <TableRow className="h-12 w-full" key={index}>
                    <TableCell>
                      <div className="animate-pulse bg-gray-500 w-full py-5"></div>
                    </TableCell>
                    <TableCell>
                      <div className="animate-pulse bg-gray-500 w-full py-5"></div>
                    </TableCell>
                    <TableCell>
                      <div className="animate-pulse bg-gray-500 w-full py-5"></div>
                    </TableCell>
                    <TableCell>
                      <div className="animate-pulse bg-gray-500 w-full py-5"></div>
                    </TableCell>
                  </TableRow>
                ))
              : filteredMaturanten.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm ? "Keine Maturanten gefunden." : "Keine Maturanten vorhanden. Bitte laden Sie eine CSV-Datei hoch."}
                  </TableCell>
                </TableRow>
              )
              : filteredMaturanten.map((maturant) => (
                  <TableRow key={maturant.ldapUser}>
                    <TableCell className="text-left truncate max-w-[150px]">
                      {maturant.ldapUser}
                    </TableCell>
                    <TableCell className="font-medium text-left truncate max-w-[150px]">
                      {maturant.firstName}
                    </TableCell>
                    <TableCell className="text-left truncate max-w-[150px]">
                      {maturant.lastName}
                    </TableCell>
                    <TableCell className="text-left whitespace-nowrap">
                      {maturant.className}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMaturant(maturant)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteMaturantAlert
                          ldapUser={maturant.ldapUser}
                          name={`${maturant.firstName} ${maturant.lastName}`}
                          onDelete={handleDelete}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="text-left whitespace-nowrap" colSpan={3}>
                Gesamtanzahl von Maturanten
              </TableCell>
              <TableCell className="text-right" colSpan={2}>
                {maturanten === "loading"
                  ? "Lädt..."
                  : searchTerm
                  ? `${filteredMaturanten.length} von ${maturanten.length}`
                  : maturanten.length}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {editingMaturant && (
        <EditMaturantModal
          maturant={editingMaturant}
          open={!!editingMaturant}
          onOpenChange={(open) => !open && setEditingMaturant(null)}
          onSuccess={fetchMaturanten}
        />
      )}
    </div>
  );
}

export default StudentList;


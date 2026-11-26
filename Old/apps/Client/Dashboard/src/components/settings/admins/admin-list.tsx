import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect } from "react";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useState } from "react";
import { Admin } from "@ticket-system/models";
import { useKeycloak } from "@react-keycloak/web";
import DeleteAlert from "./delete-alert";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
function AdminList() {
  const { keycloak } = useKeycloak();

  const [admins, setAdmins] = useState<Admin[] | "loading">("loading");

  useEffect(() => {
    authFetch(getFetchUrl("api/v2/admin"), keycloak.token)
      .then((res) => res.json())
      .then((data) => setAdmins(data));
  }, [keycloak.token]);

  const handleDelete = (id: string) => {
    if (keycloak.token) {
      authFetch(getFetchUrl(`api/v2/admin/${id}`), keycloak.token, {}, "DELETE")
        .then((res) => {
          if (res.status === 200) {
            setAdmins(
              admins === "loading"
                ? "loading"
                : admins.filter((admin) => admin.id !== id)
            );
            toast.success("Admin erfolgreich gelöscht.");
          } else {
            toast.error("Fehler beim Löschen des Admins.");
          }
        })
        .catch((err) => {
          toast.error("Fehler beim Löschen des Admins.");
        });
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-0">
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">ID</TableHead>
            <TableHead className="whitespace-nowrap">Name</TableHead>
            <TableHead className="whitespace-nowrap">Priorität</TableHead>
            <TableHead className="whitespace-nowrap">Löschen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins === "loading"
            ? new Array(3).fill(0).map((_, index) => (
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
            : admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="text-left truncate max-w-30">
                    {admin.id}
                  </TableCell>
                  <TableCell className="font-medium text-left truncate max-w-37.5">
                    {admin.name}
                  </TableCell>
                  <TableCell className="text-left whitespace-nowrap">
                    {admin.priority === "HIGH" ? "Volle Kontrolle" : "Nur Scan"}
                  </TableCell>
                  <TableCell>
                    <DeleteAlert id={admin.id} onDelete={handleDelete} />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-left whitespace-nowrap" colSpan={2}>
              Gesamtanzahl von Admins
            </TableCell>

            <TableCell className="text-right" colSpan={2}>
              {admins === "loading" ? "Lädt..." : admins.length}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default AdminList;

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PhysicalTicketPdfView from "./PhysicalTicketsPdf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { Spinner } from "../ui/spinner";
import { DialogDescription } from "@radix-ui/react-dialog";

type PrintDialogProps = {
  trigger: React.ReactNode;
};

export type PhysicalTicketResponseDto = {
  ticketId: string;
  ownerName: string;
  orderId: string;
};

export default function PrintDialog({ trigger }: PrintDialogProps) {
  const { keycloak } = useKeycloak();

  const [ticketFilter, setTicketFilter] = useState<"unprinted" | "all">(
    "unprinted"
  );
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [foregroundColor, setForegroundColor] = useState<string>("#000000");
  const [shouldPrint, setShouldPrint] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const {
    data: tickets,
    error: ticketsLoadingError,
    isLoading: areTicketsLoading,
  } = useQuery({
    queryKey: ["tickets-for-printing"],
    queryFn: async () => {
      let url = `api/v2/ticket/physical?filter=${ticketFilter}`;
      const res = await authFetch(getFetchUrl(url), keycloak.token, {
        method: "GET",
      });

      if (res.status === 200) {
        const data = await res.json();
        return data as PhysicalTicketResponseDto[];
      }
    },
  });

  useEffect(() => {
    if (shouldPrint) {
      setCurrentAsPrintedMutation.mutate();
    }
  }, [shouldPrint]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["tickets-for-printing"] });
  }, [ticketFilter]);

  const setCurrentAsPrintedMutation = useMutation({
    mutationKey: ["setTicketsAsPrinted"],
    mutationFn: async () => {
      const url = `api/v2/ticket/physical/current/printed-status`;
      const res = await authFetch(
        getFetchUrl(url),
        keycloak.token,
        undefined,
        "PUT"
      );

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["tickets-for-printing"] });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShouldPrint(true);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="min-w-[80vw] flex h-[90vh] p-0 gap-0 bg-neutral-900">
        <div className="flex flex-1 h-full">
          {/* Left side - Form */}
          <div className="p-6 flex flex-col flex-2">
            <DialogHeader className="mb-6">
              <DialogTitle>Drucken der physischen Tickets</DialogTitle>
            </DialogHeader>
            <DialogDescription />

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6 flex-1"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="ticket-filter">Ticket Auswahl</Label>
                <Select
                  value={ticketFilter}
                  onValueChange={(value: "unprinted" | "all") => {
                    setTicketFilter(value);
                    queryClient.invalidateQueries({
                      queryKey: ["tickets-for-printing"],
                    });
                  }}
                >
                  <SelectTrigger id="ticket-filter">
                    <SelectValue placeholder="Wählen Sie eine Option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unprinted">
                      Noch nicht ausgedruckte Tickets
                    </SelectItem>
                    <SelectItem value="all">Alle Tickets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="background-color">Hintergrundfarbe</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="background-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="foreground-color">Vordergrundfarbe</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="foreground-color"
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="mt-auto">
                <Button
                  type="submit"
                  className="w-full text-white"
                  disabled={
                    areTicketsLoading ||
                    tickets === undefined ||
                    tickets.length === 0
                  }
                >
                  {tickets?.length === 0
                    ? "Keine Tickets zum Ausdrucken"
                    : "Ausdrucken"}
                </Button>
              </div>
            </form>
          </div>

          {/* Right side - Preview */}
          <div className="flex-1 bg-white border-l overflow-auto rounded-lg">
            <div className="p-6 text-gray-500 flex justify-center items-center h-full">
              {areTicketsLoading || tickets === undefined ? (
                <Spinner />
              ) : ticketsLoadingError ? (
                <p>Fehler beim Laden der Bestellungen</p>
              ) : (
                <PhysicalTicketPdfView
                  tickets={tickets}
                  qrForeground={foregroundColor}
                  qrBackground={backgroundColor}
                  shouldPrint={shouldPrint}
                  setShouldPrint={setShouldPrint}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

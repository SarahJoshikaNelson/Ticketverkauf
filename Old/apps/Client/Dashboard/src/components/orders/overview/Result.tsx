import ThreeDotDropdown from "@/components/ui-additions/ThreeDotDropdown";
import { getFetchUrl } from "@/utils/getFetchUrl";
import authFetch from "@/utils/authfetch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Order } from "@ticket-system/models";
import { useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/lib/utils";

interface ResultProps {
  order: Order;
  onSelect?: (order: Order) => void;
  isSelected?: boolean;
}

function Result({ order, onSelect, isSelected }: ResultProps) {
  const [status, setStatus] = useState<string>(order.order.status);
  const [
    additionalChargeForPhysicalTicket,
    setAdditionalChargeForPhysicalTicket,
  ] = useState<number | undefined>(undefined);
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();

  useEffect(() => {
    const responsePromise = fetch(
      getFetchUrl("api/v2/ticket/physical/additional-charge"),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    responsePromise.then(async (res) => {
      if (!res.ok) {
        toast.error("Fehler beim Laden des Aufpreises für physische Tickets");
        return;
      }
      res.json().then((data: { additionalChargeForPhysicalTicket: number }) => {
        setAdditionalChargeForPhysicalTicket(
          data.additionalChargeForPhysicalTicket
        );
      });
    });
  }, []);

  const onDownload = async (orderId: string) => {
    order.order.tickets.forEach(async (ticket) => {
      const response = await authFetch(
        `${getFetchUrl("api/v2/ticket/download/")}${ticket.id}`,
        keycloak.token!
      );
      if (!response.ok) {
        toast.error("Fehler beim Download des Tickets");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    });
  };

  const handleCardClick = () => {
    onSelect?.(order);

    if (typeof window !== "undefined") {
      const isMobile = window.matchMedia("(max-width: 640px)").matches;
      if (isMobile) {
        navigate(`/orders/details/${order.id}`);
      }
    }
  };

  if (additionalChargeForPhysicalTicket === undefined) {
    return (
      <div
        className={`flex flex-row p-4 min-h-29 rounded-lg w-full bg-background-700 dark:bg-background-200 border border-background-100 dark:border-background-300 animate-pulse`}
      ></div>
    );
  }

  return (
    <div
      className={`min-h-29 flex flex-row p-4 rounded-lg w-full bg-background-700 dark:bg-background-200 border border-background-100 dark:border-background-300 ${
        onSelect
          ? "cursor-pointer hover:bg-background-600 dark:hover:bg-background-300"
          : ""
      } ${
        isSelected
          ? "ring-2 ring-[#30b34a] bg-[#30b34a]/10 dark:bg-[#30b34a]/20"
          : ""
      }`}
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-2 items-start justify-center flex-1">
        <h3 className="text-xl font-bold text-text-300 dark:text-text-400">
          {order.customer.firstName} {order.customer.lastName}
        </h3>
        <p className="text-sm text-gray-500 max-sm:hidden">
          Bestellt am {new Date(order.order.orderDate).toLocaleDateString()}
        </p>
        <p className="text-md font-bold max-sm:block sm:hidden">
          {formatPrice(
            order.order.seats.reduce((acc, seat) => acc + seat.price, 0) +
              order.order.tickets.reduce(
                (acc, ticket) =>
                  acc +
                  ticket.price +
                  (ticket.isPhysical ? additionalChargeForPhysicalTicket : 0),
                0
              )
          )}
        </p>
      </div>
      <div className="flex flex-col gap-2 justify-center items-center flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-row gap-2 items-center">
              <p className="text-xl dark:text-text-800 text-text-100 cursor-help hover:text-blue-500 transition-colors max-sm:hidden">
                {
                  order.order.tickets.filter(
                    (ticket) => ticket.type === "EXTERNAL"
                  ).length
                }
                E /{" "}
                {
                  order.order.tickets.filter(
                    (ticket) => ticket.type === "STUDENT"
                  ).length
                }
                S / {order.order.seats.length}SP /{" "}
                {formatPrice(
                  order.order.seats.reduce((acc, seat) => acc + seat.price, 0) +
                    order.order.tickets.reduce(
                      (acc, ticket) =>
                        acc +
                        ticket.price +
                        (ticket.isPhysical
                          ? additionalChargeForPhysicalTicket
                          : 0),
                      0
                    )
                )}
              </p>
              <p className="text-xl dark:text-text-800 text-text-100 cursor-help hover:text-blue-500 transition-colors sm:hidden">
                {
                  order.order.tickets.filter(
                    (ticket) => ticket.type === "EXTERNAL"
                  ).length
                }
                E /{" "}
                {
                  order.order.tickets.filter(
                    (ticket) => ticket.type === "STUDENT"
                  ).length
                }
                S / {order.order.seats.length}SP
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>
                Externe Tickets:{" "}
                {
                  order.order.tickets.filter(
                    (ticket) => ticket.type === "EXTERNAL"
                  ).length
                }
              </p>
              <p>
                Studenten Tickets:{" "}
                {
                  order.order.tickets.filter(
                    (ticket) => ticket.type === "STUDENT"
                  ).length
                }
              </p>
              <p>Sitzplätze: {order.order.seats.length}</p>
              <p>
                Gesamtpreis:{" "}
                {formatPrice(
                  order.order.seats.reduce((acc, seat) => acc + seat.price, 0) +
                    order.order.tickets.reduce(
                      (acc, ticket) =>
                        acc +
                        ticket.price +
                        (ticket.isPhysical
                          ? additionalChargeForPhysicalTicket
                          : 0),
                      0
                    )
                )}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
        <p className="text-sm text-gray-500">
          Status:{" "}
          <span className="text-green-500">
            {status === "CONFIRMED"
              ? "Bestätigt"
              : status === "WAITING"
              ? "Unbestätigt"
              : status === "PAID"
              ? "Bezahlt"
              : status === "DONE"
              ? "Abgeholt"
              : status === "CANCELLED"
              ? "Abgebrochen"
              : "Unkown"}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-2 items-end justify-center flex-1 max-sm:hidden">
        <ThreeDotDropdown
          startStatus={status}
          setStatusCallback={setStatus}
          id={order.id}
          onDownload={() => onDownload(order.id)}
        />
      </div>
    </div>
  );
}

export default Result;

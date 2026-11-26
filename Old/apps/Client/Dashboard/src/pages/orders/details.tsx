import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CopyClickBadge from "@/components/ui-additions/CopyClickBadge";
import DateAndStatusBar from "@/components/orders/details/DateAndStatusBar";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { getFetchUrl } from "@/utils/getFetchUrl";
import DataTable from "@/components/orders/details/DataTable";
import TicketTableTable from "@/components/orders/details/TicketTableTable";
import { Order } from "@ticket-system/models";
import { Button } from "@/components/ui/button";
import SettingButtons from "@/components/orders/details/SettingButtons";
import { toast } from "sonner";

function OrdersDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { keycloak } = useKeycloak();

  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const fetchOrder = async () => {
      if (keycloak.token) {
        const response = await authFetch(
          getFetchUrl(`api/v2/admin/getOrderDetails/${id}`),
          keycloak.token,
          {},
          "GET"
        );

        const data = await response.json();

        setOrder(data);
        setStatus(
          data.order.status === "CANCELLED" ? "CANCELLED" : data.order.status
        );
      }
    };

    fetchOrder();
  }, [id]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            order: {
              ...prev.order,
              status: newStatus as Order["order"]["status"],
            },
          }
        : prev
    );
  };

  const handleDownload = async () => {
    if (!order) return;

    if (order.order.tickets.length === 0) {
      toast.info("Keine Tickets zum Download vorhanden");
      return;
    }

    try {
      await Promise.all(
        order.order.tickets.map(async (ticket) => {
          const response = await authFetch(
            `${getFetchUrl("api/v2/ticket/download/")}${ticket.id}`,
            keycloak.token!
          );
          if (!response.ok) {
            throw new Error("Download fehlgeschlagen");
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, "_blank");
        })
      );
      toast.success("Tickets werden heruntergeladen");
    } catch (error) {
      console.error("Fehler beim Download der Tickets", error);
      toast.error("Fehler beim Download der Tickets");
    }
  };

  return (
    <div className="flex flex-col gap-4 pr-2 justify-center items-center max-w-200 mx-auto">
      <div className="flex w-full max-w-4xl justify-start">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Zurück
        </Button>
      </div>
      <h1>Order Details</h1>
      <CopyClickBadge id={id as string} />
      {order && (
        <>
          <DateAndStatusBar
            date={order.order.orderDate.toString()}
            status={status}
            id={id as string}
            onStatusChange={handleStatusChange}
            onDownload={handleDownload}
          />
          <DataTable customer={order.customer} />
          <TicketTableTable
            tickets={order.order.tickets}
            seats={order.order.seats}
          />
          {order.order.seats && order.order.seats.length > 0 && (
            <Link to={`/orders/seats-status?orderId=${id}`}>
              <Button variant="outline">View Seats in Layout</Button>
            </Link>
          )}

          <SettingButtons
            orderId={order.id}
            status={status}
            onStatusChange={handleStatusChange}
            onDownload={handleDownload}
          />
        </>
      )}
    </div>
  );
}

export default OrdersDetails;

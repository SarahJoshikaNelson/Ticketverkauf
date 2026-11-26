import { Ticket } from "@ticket-system/models";
import { useState, useEffect } from "react";
import { getFetchUrl } from "@/utils/getFetchUrl";
import authFetch from "@/utils/authfetch";
import { useKeycloak } from "@react-keycloak/web";
import { formatPrice } from "@/lib/utils";

function TicketList({
  tickets,
  onTotalPriceCalcualtion,
}: {
  tickets: Ticket[];
  onTotalPriceCalcualtion: (total: number) => void;
}) {
  const [studentTicketPrice, setStudentTicketPrice] = useState<number>(0);
  const [externalTicketPrice, setExternalTicketPrice] = useState<number>(0);
  const [
    additionalChargeForPhysicalTicket,
    setAdditionalChargeForPhysicalTicket,
  ] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { keycloak } = useKeycloak();

  useEffect(() => {
    const fetchStudentTicketPrice = async () => {
      const response = await authFetch(
        `${getFetchUrl("api/v2/ticket/student")}`,
        keycloak.token,
        {},
        "GET"
      );
      const data = await response.json();
      setStudentTicketPrice(data);
    };

    const fetchExternalTicketPrice = async () => {
      const response = await authFetch(
        `${getFetchUrl("api/v2/ticket/extern")}`,
        keycloak.token,
        {},
        "GET"
      );
      const data = await response.json();
      setExternalTicketPrice(data);
    };

    const fetchPhysicalTicketCharge = async () => {
      const response = await fetch(
        getFetchUrl("api/v2/ticket/physical/additional-charge"),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAdditionalChargeForPhysicalTicket(
          data.additionalChargeForPhysicalTicket
        );
      }
    };

    const fetchPrices = async () => {
      await fetchStudentTicketPrice();
      await fetchExternalTicketPrice();
      await fetchPhysicalTicketCharge();
      setIsLoading(false);
    };

    fetchPrices();
  }, [tickets]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const studentTickets = tickets.filter((ticket) => ticket.type === "STUDENT");
  const externalTickets = tickets.filter(
    (ticket) => ticket.type === "EXTERNAL"
  );

  const studentPhysicalCount = studentTickets.filter(
    (ticket) => ticket.isPhysical
  ).length;
  const externalPhysicalCount = externalTickets.filter(
    (ticket) => ticket.isPhysical
  ).length;

  const studentTotalPrice =
    studentTicketPrice * studentTickets.length +
    studentPhysicalCount * additionalChargeForPhysicalTicket;
  const externalTotalPrice =
    externalTicketPrice * externalTickets.length +
    externalPhysicalCount * additionalChargeForPhysicalTicket;

  onTotalPriceCalcualtion(studentTotalPrice + externalTotalPrice);

  return (
    <div>
      <div className="flex flex-col gap-2 w-full rounded-lg p-4">
        <div className="flex flex-col gap-2 w-full">
          {studentTickets.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 w-full justify-between items-center">
                <p>Schüler</p>
                <p>{studentTickets.length}</p>
                <p>{formatPrice(studentTotalPrice)}</p>
              </div>
              {studentPhysicalCount > 0 && (
                <div className="flex flex-row gap-2 w-full justify-between items-center text-sm text-gray-400 pl-4">
                  <p>Davon {studentPhysicalCount} physisch</p>
                  <p></p>
                  <p>
                    {formatPrice(
                      studentPhysicalCount * additionalChargeForPhysicalTicket
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {externalTickets.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 w-full justify-between items-center">
                <p>Standart</p>
                <p>{externalTickets.length}</p>
                <p>{formatPrice(externalTotalPrice)}</p>
              </div>
              {externalPhysicalCount > 0 && (
                <div className="flex flex-row gap-2 w-full justify-between items-center text-sm text-gray-400 pl-4">
                  <p>Davon {externalPhysicalCount} physisch</p>
                  <p></p>
                  <p>
                    {formatPrice(
                      externalPhysicalCount * additionalChargeForPhysicalTicket
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketList;

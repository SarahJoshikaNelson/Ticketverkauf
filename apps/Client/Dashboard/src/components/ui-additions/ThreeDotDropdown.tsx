import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import ThreeDots from "@/icons/three-dots";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { changeOrderStatus } from "@/utils/order-edit-utils";
import { useKeycloak } from "@react-keycloak/web";
import { useQueryClient } from "@tanstack/react-query";

interface ThreeDotDropdownProps {
  startStatus: string;
  setStatusCallback: (status: string) => void;
  id: string;
  className?: string;
  onDownload: () => void;
}

function ThreeDotDropdown({
  startStatus,
  setStatusCallback,
  id,
  className,
  onDownload,
}: ThreeDotDropdownProps) {
  const [status, setStatus] = useState<string>(startStatus);
  const { keycloak } = useKeycloak();
  const queryClient = useQueryClient();

  const handleStatusChange = async (newStatus: string) => {
    const success = await changeOrderStatus(id, newStatus, keycloak.token!);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  };

  useEffect(() => {
    setStatusCallback(status);
  }, [status]);

  useEffect(() => {
    setStatus(startStatus);
  }, [startStatus]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className={className}>
        <Button variant="ghost" size="icon">
          <ThreeDots />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onDownload}>
            <p>Ticket(s) herunterladen</p>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to={`/orders/details/${id}`}>
              <p>Details</p>
              <p className="text-[10px] text-gray-500">{id}</p>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
              <DropdownMenuRadioItem
                onClick={() => handleStatusChange("DONE")}
                value="DONE"
                className={
                  status === "DONE" ? "italic text-gray-400 cursor-default" : ""
                }
                disabled={status === "DONE"}
              >
                {status === "DONE"
                  ? "Als abgeholt markiert"
                  : "Abgeholt markieren"}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                onClick={() => handleStatusChange("PAID")}
                value="PAID"
                className={
                  status === "PAID" ? "italic text-gray-400 cursor-default" : ""
                }
                disabled={status === "PAID"}
              >
                {status === "PAID"
                  ? "Als bezahlt markiert"
                  : "Bezahlt markieren"}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                onClick={() => handleStatusChange("CONFIRMED")}
                value="CONFIRMED"
                className={
                  status === "CONFIRMED"
                    ? "italic text-gray-400 cursor-default"
                    : ""
                }
                disabled={status === "CONFIRMED"}
              >
                {status === "CONFIRMED"
                  ? "Als bestätigt markiert"
                  : "Bestätigt markieren"}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                onClick={() => handleStatusChange("WAITING")}
                value="WAITING"
                className={
                  status === "WAITING"
                    ? "italic text-gray-400 cursor-default"
                    : ""
                }
                disabled={status === "WAITING"}
              >
                {status === "WAITING"
                  ? "Als unbestätigt markiert"
                  : "Unbestätigt markieren"}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                onClick={() => handleStatusChange("CANCELLED")}
                value="CANCELLED"
                className={
                  status === "CANCELLED"
                    ? "italic text-gray-400 cursor-default"
                    : ""
                }
                disabled={status === "CANCELLED"}
              >
                {status === "CANCELLED"
                  ? "Als abgebrochen markiert"
                  : "Abgebrochen markieren"}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThreeDotDropdown;

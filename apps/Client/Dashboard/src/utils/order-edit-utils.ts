import authFetch from "./authfetch";
import { getFetchUrl } from "./getFetchUrl";
import { toast } from "sonner";

async function changeOrderStatus(
  orderId: string,
  status: string,
  token: string,
): Promise<boolean> {
  const response = await authFetch(
    `${getFetchUrl(`api/v2/order/status/${orderId}`)}`,
    token,
    {
      body: JSON.stringify(status),
      headers: {
        "Content-Type": "application/json",
      },
    },
    "PUT",
  );

  if (!response.ok) {
    toast.error("Fehler beim Ändern des Status");
    return false;
  } else {
    toast.success("Status erfolgreich geändert");
    return true;
  }
}

export { changeOrderStatus };

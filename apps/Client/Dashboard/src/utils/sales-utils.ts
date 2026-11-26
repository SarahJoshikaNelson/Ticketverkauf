import { SalesOverview } from "@ticket-system/models";
import authFetch from "./authfetch";
import { getFetchUrl } from "./getFetchUrl";

export async function getSalesOverview(token: string | undefined, type: "detail" | "possible") {
    const response = await authFetch(getFetchUrl(`api/v2/sales/profit/${type}`), token, {}, "GET");

    if (response.status === 200) {
        const data : SalesOverview = await response.json();

        return data;
    }

    return null;
}
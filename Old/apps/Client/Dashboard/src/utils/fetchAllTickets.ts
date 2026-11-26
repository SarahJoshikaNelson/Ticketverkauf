import authFetch from "./authfetch";
import { getFetchUrl } from "./getFetchUrl";

export async function fetchAllTickets(token: string) {
    let url = `api/v2/admin/getOrderOverview`;

    const res = await authFetch(getFetchUrl(url), token, {
        method: "GET"
    });

    if (res.status === 200) {
        const data = await res.json();
        
        return data;
    }

    return [];
}
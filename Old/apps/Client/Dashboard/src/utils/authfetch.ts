import { getAdminAccessToken, refreshAdminTokens } from "./adminTokens";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const authFetch = async (
  url: string,
  token: string | undefined,
  options: RequestInit = {},
  method: HttpMethod = "GET"
): Promise<Response> => {
  const isHttp = typeof window !== "undefined" && window.location.protocol === "http:";

  const headers = new Headers(options.headers ?? undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (isHttp) {
    const accessToken = getAdminAccessToken();
    if (accessToken) {
      headers.set("admin-token", accessToken);
    }
  }

  const requestInit: RequestInit = {
    ...options,
    headers,
    method,
  };

  if (!isHttp && requestInit.credentials === undefined) {
    requestInit.credentials = "include";
  }

  let response = await fetch(url, requestInit);
  if (response.status === 401 && !token) {
    const refreshed = await refreshAdminTokens();
    if (refreshed) {
      if (isHttp) {
        const newAccessToken = getAdminAccessToken();
        if (newAccessToken) {
          headers.set("admin-token", newAccessToken);
        }
      }
      response = await fetch(url, requestInit);
    }
  }

  return response;
};

export default authFetch;
import { getAdminAccessToken, getAdminRefreshToken, clearAdminTokens, setAdminTokens } from "./adminTokens";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export const getApiBase = () => {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (!base) {
    throw new Error("VITE_API_URL is not defined");
  }
  return base.replace(/\/$/, "");
};

const refreshAdminTokens = async (): Promise<boolean> => {
  const isHttp = typeof window !== "undefined" && window.location.protocol === "http:";
  const base = getApiBase();

  const requestInit: RequestInit = {
    method: "POST",
    credentials: "include",
  };

  if (isHttp) {
    const refreshToken = getAdminRefreshToken();
    if (!refreshToken) {
      return false;
    }

    requestInit.headers = {
      "Content-Type": "application/json",
    };
    requestInit.body = JSON.stringify({ token: refreshToken });
  }

  try {
    const response = await fetch(`${base}/v2/auth/refresh`, requestInit);
    if (!response.ok) {
      if (isHttp) {
        clearAdminTokens();
      }
      return false;
    }

    if (isHttp) {
      const data: { accessToken: string; refreshToken: string } = await response.json();
      setAdminTokens(data.accessToken, data.refreshToken);
    }

    return true;
  } catch {
    if (isHttp) {
      clearAdminTokens();
    }
    return false;
  }
};

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


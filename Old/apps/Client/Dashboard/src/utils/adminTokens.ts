import { getFetchUrl } from "./getFetchUrl";

const ACCESS_TOKEN_KEY = "admin-token";
const REFRESH_TOKEN_KEY = "admin-refresh-token";

export const setAdminTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAdminAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getAdminRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearAdminTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const refreshAdminTokens = async (): Promise<boolean> => {
  const isHttp = window.location.protocol === "http:";
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
    const response = await fetch(getFetchUrl("api/v2/auth/refresh"), requestInit);
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


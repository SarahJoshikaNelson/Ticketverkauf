import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";

// Enums to match Java DTOs
export enum DesignElementTypes {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  FIELD = "FIELD",
  BLUR = "BLUR",
  QR = "QR"
}

export enum DesignElementFillers {
  CODE = "CODE",
  DATE = "DATE",
  TIME = "TIME",
  NAME = "NAME",
  ORDERNUMBER = "ORDERNUMBER"
}

export enum PageType {
  FRONT = "FRONT",
  BACK = "BACK"
}

export interface Design {
  id: string;
  name: string;
  width: number;
  height: number;
  frontPage: DesignPage;
  backPage: DesignPage;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface DesignPage {
  type: PageType;
  elements: DesignElement[];
}

export interface DesignElement {
  id: string;
  type: DesignElementTypes;
  filler: DesignElementFillers;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  isDynamic: boolean;
  imageData: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
  borderRadius: number;
  blurIntensity: number;
  backgroundColor: string;
  layer: number;
  rotation: number;
}

export interface DesignPushRequest {
  name: string;
  width: number;
  height: number;
  frontPage: DesignPage;
  backPage: DesignPage;
}

export function useDesigns() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  const { keycloak } = useKeycloak();

  const loadDesigns = async () => {
    const url = "api/v1/ticket-design"

    const response = await authFetch(`${getFetchUrl(url)}`, keycloak.token, {
      method: "GET"
    });

    if (response.status === 200) {
      const data = await response.json();
      setDesigns(data);
      setLoading(false);
    }
  }

  const setActiveDesign = async (designId: string) => {
    const url = `api/v1/ticket-design/${designId}/active`

    const response = await authFetch(`${getFetchUrl(url)}`, keycloak.token, {}, "PUT");

    if (response.status === 200) {
      loadDesigns();
    }
  }

  const deleteDesign = async (designId: string) => {
    const url = `api/v1/ticket-design/${designId}`

    const response = await authFetch(`${getFetchUrl(url)}`, keycloak.token, {}, "DELETE");

    if (response.status === 200) {
      loadDesigns();
    }
  }

  const pushDesign = async (design: DesignPushRequest) => {
    const url = "api/v1/ticket-design"

    const response = await authFetch(`${getFetchUrl(url)}`, keycloak.token, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(design)
    }, "POST");

    if (response.status === 201) {
      await loadDesigns();
      return { success: true, status: response.status };
    }
    
    return { success: false, status: response.status };
  }

  const updateDesign = async (designId: string, design: DesignPushRequest) => {
    const url = `api/v1/ticket-design/${designId}`

    const response = await authFetch(`${getFetchUrl(url)}`, keycloak.token, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(design)
    }, "PUT");

    if (response.status === 200) {
      await loadDesigns();
      return { success: true, status: response.status };
    }
    
    return { success: false, status: response.status };
  }

  useEffect(() => {
    loadDesigns();
  }, []);

  return { designs, setDesigns, loading, loadDesigns, setActiveDesign, deleteDesign, pushDesign, updateDesign };
}
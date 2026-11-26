import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";
import { Design, PageType } from "./useDesigns";


export function useDesign() {
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);

  const { keycloak } = useKeycloak();

  const loadDesign = async (id: string) => {
    const url = `api/v1/ticket-design/${id}`

    const response = await authFetch(`${getFetchUrl(url)}`, keycloak.token, {
      method: "GET"
    });

    if (response.status === 200) {
      const data = await response.json();
      
      // Transform the API response to match our frontend interface
      const transformedDesign: Design = {
        ...data,
        frontPage: {
          type: PageType.FRONT,
          elements: (data.frontPage?.elements || []).map((element: any) => ({
            ...element,
            // Ensure required properties have proper defaults
            width: element.width || 100,
            height: element.height || 30,
            x: element.x || 0,
            y: element.y || 0,
            zIndex: element.zIndex || 0,
            visible: element.visible !== false,
            fontSize: element.fontSize || 12,
            fontWeight: element.fontWeight || 'normal',
            color: element.color || '#000000',
            content: element.content || '',
            isDynamic: element.isDynamic || false,
            opacity: element.opacity || 100,
            borderRadius: element.borderRadius || 0,
            blurIntensity: element.blurIntensity || 0,
            backgroundColor: element.backgroundColor || '#000000',
            layer: element.layer || 0,
            rotation: element.rotation || 0,
            imageData: element.imageData || '',
            filler: element.filler
          }))
        },
        backPage: {
          type: PageType.BACK,
          elements: (data.backPage?.elements || []).map((element: any) => ({
            ...element,
            // Ensure required properties have proper defaults
            width: element.width || 100,
            height: element.height || 30,
            x: element.x || 0,
            y: element.y || 0,
            zIndex: element.zIndex || 0,
            visible: element.visible !== false,
            fontSize: element.fontSize || 12,
            fontWeight: element.fontWeight || 'normal',
            color: element.color || '#000000',
            content: element.content || '',
            isDynamic: element.isDynamic || false,
            opacity: element.opacity || 100,
            borderRadius: element.borderRadius || 0,
            blurIntensity: element.blurIntensity || 0,
            backgroundColor: element.backgroundColor || '#000000',
            layer: element.layer || 0,
            rotation: element.rotation || 0,
            imageData: element.imageData || '',
            filler: element.filler
          }))
        }
      };
      
      setDesign(transformedDesign);
      setLoading(false);
    }
  }

  return { design, setDesign, loading, loadDesign };
}
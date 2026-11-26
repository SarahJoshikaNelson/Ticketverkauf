import React, { useState, useEffect } from "react";
import { useKeycloak } from "@react-keycloak/web";
import authFetch from "@/utils/authfetch";
import { getFetchUrl } from "@/utils/getFetchUrl";
import { toast } from "sonner";

// Import all the new modular components
import {
  TicketDesignerProvider,
  useTicketDesigner,
} from "@/components/ticket-designer/TicketDesignerContext";
import { TicketDesignerHeader } from "@/components/ticket-designer/TicketDesignerHeader";
import { ToolsPanel } from "@/components/ticket-designer/ToolsPanel";
import { TicketCanvas } from "@/components/ticket-designer/TicketCanvas";
import { ElementPropertiesPanel } from "@/components/ticket-designer/ElementPropertiesPanel";
import { SavedDesignsPanel } from "@/components/ticket-designer/SavedDesignsPanel";
import { useDesign } from "@/hooks/useDesign";

// Inner component that uses the context
const TicketDesignerContent: React.FC = () => {
  const { keycloak } = useKeycloak();
  const [designName, setDesignName] = useState("Mein Ticket Design");
  const [hasLoadedActiveDesign, setHasLoadedActiveDesign] = useState(false);

  const { setSelectedElement, setSavedDesigns, updateCurrentPage, setDesign, setCurrentDesignId } =
    useTicketDesigner();

  const { loadDesign } = useDesign();

  // Load saved designs on component mount
  useEffect(() => {
    loadSavedDesigns();
  }, []);

  const loadSavedDesigns = async () => {
    try {
      if (keycloak.token) {
        const response = await authFetch(
          `${getFetchUrl("api/v1/ticket-design")}`,
          keycloak.token,
          {},
          "GET"
        );
        if (response.ok) {
          const designs = await response.json();
          setSavedDesigns(designs);
          
          // Auto-load active design if found and not already loaded
          if (!hasLoadedActiveDesign) {
            const activeDesign = designs.find((d: any) => d.active === true);
            if (activeDesign) {
              await loadActiveDesign(activeDesign.id);
              setHasLoadedActiveDesign(true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load designs:", error);
    }
  };

  const loadActiveDesign = async (designId: string) => {
    try {
      const response = await authFetch(
        `${getFetchUrl(`api/v1/ticket-design/${designId}`)}`,
        keycloak.token,
        {},
        "GET"
      );
      if (response.ok) {
        const designData = await response.json();
        
        // Transform and set the design
        const transformedDesign = {
          ...designData,
          frontPage: {
            type: "FRONT" as const,
            elements: (designData.frontPage?.elements || []).map((element: any) => ({
              ...element,
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
            type: "BACK" as const,
            elements: (designData.backPage?.elements || []).map((element: any) => ({
              ...element,
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
        setCurrentDesignId(designData.id);
        setDesignName(designData.name);
        toast.success(`Aktives Design "${designData.name}" geladen`);
      }
    } catch (error) {
      console.error("Failed to load active design:", error);
    }
  };

  const clearCanvas = () => {
    updateCurrentPage([]);
    setSelectedElement(null);
  };

  return (
    <div className="bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <TicketDesignerHeader
          designName={designName}
          onClearCanvas={clearCanvas}
        />

        {/* Main Content - Responsive Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-9 gap-4 lg:gap-6">
          {/* Left Panel - Tools (Full width on mobile, sidebar on desktop) */}
          <div className="xl:col-span-3 order-1 xl:order-1">
            <div className="space-y-4 lg:space-y-6 xl:pr-2 ticket-designer-scroll">
              <ToolsPanel
                designName={designName}
                setDesignName={setDesignName}
              />

              {/* Element Properties Panel - Hidden on mobile when no element selected */}
              <div className="hidden sm:block xl:block">
                <ElementPropertiesPanel />
              </div>
            </div>
          </div>

          {/* Center - Canvas and Saved Designs */}
          <div className="xl:col-span-6 order-2 xl:order-2">
            <div className="space-y-4 lg:space-y-6 pb-8">
              <TicketCanvas />

              {/* Saved Designs Panel - Now beneath canvas */}
              <SavedDesignsPanel setDesignName={setDesignName} />
            </div>

            {/* Element Properties Panel - Mobile only, shown when element selected */}
            <div className="block sm:hidden mt-4">
              <ElementPropertiesPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component wrapped with provider
function TicketsDesign() {
  return (
    <TicketDesignerProvider>
      <TicketDesignerContent />
    </TicketDesignerProvider>
  );
}

export default TicketsDesign;

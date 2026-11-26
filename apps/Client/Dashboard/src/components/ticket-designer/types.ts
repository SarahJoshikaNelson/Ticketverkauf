import { Design, DesignElement, PageType } from "@/hooks/useDesigns";

export interface TicketDesignerContextType {
  design: Design;
  currentPage: PageType;
  selectedElement: DesignElement | null;
  isLoading: boolean;
  savedDesigns: Design[];
  currentDesignId: string | null;
  setDesign: (design: Design) => void;
  setSelectedElement: (element: DesignElement | null) => void;
  setCurrentPage: (page: PageType) => void;
  updateCurrentPage: (elements: DesignElement[]) => void;
  updateElement: (elementId: string, updates: Partial<DesignElement>) => void;
  updateElementPosition: (elementId: string, x: number, y: number) => void;
  updateElementSize: (elementId: string, width: number, height: number) => void;
  deleteElement: (elementId: string) => void;
  getCurrentElements: () => DesignElement[];
  setSavedDesigns: (designs: Design[]) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentDesignId: (id: string | null) => void;
  // Layering methods
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  bringForward: (elementId: string) => void;
  sendBackward: (elementId: string) => void;
} 
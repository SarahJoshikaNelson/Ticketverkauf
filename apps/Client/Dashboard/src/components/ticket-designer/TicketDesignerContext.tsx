import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Design, DesignElement, PageType } from '@/hooks/useDesigns';
import { TicketDesignerContextType } from './types';

const TicketDesignerContext = createContext<TicketDesignerContextType | undefined>(undefined);

export const useTicketDesigner = () => {
  const context = useContext(TicketDesignerContext);
  if (!context) {
    throw new Error('useTicketDesigner must be used within a TicketDesignerProvider');
  }
  return context;
};

interface TicketDesignerProviderProps {
  children: ReactNode;
}

export const TicketDesignerProvider: React.FC<TicketDesignerProviderProps> = ({ children }) => {
  const [design, setDesign] = useState<Design>({
    id: "",
    name: "",
    width: 0,
    height: 0,
    createdAt: "",
    updatedAt: "",
    active: false,
    frontPage: {
      type: PageType.FRONT,
      elements: []
    },
    backPage: {
      type: PageType.BACK,
      elements: []
    }
  });
  
  const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>(PageType.FRONT);
  const [savedDesigns, setSavedDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  const updateCurrentPage = useCallback((elements: DesignElement[]) => {
    setDesign(prev => {
      const pageKey = currentPage === PageType.FRONT ? 'frontPage' : 'backPage';
      return {
        ...prev,
        [pageKey]: {
          type: currentPage,
          elements: elements
        }
      };
    });
  }, [currentPage]);

  const updateElement = useCallback((elementId: string, updates: Partial<DesignElement>) => {
    let updatedElement: DesignElement | null = null;
    
    setDesign(prev => {
      const pageKey = currentPage === PageType.FRONT ? 'frontPage' : 'backPage';
      return {
        ...prev,
        [pageKey]: {
          type: currentPage,
          elements: prev[pageKey].elements.map(el => {
            if (el.id === elementId) {
              updatedElement = { ...el, ...updates };
              return updatedElement;
            }
            return el;
          })
        }
      };
    });

    // Update selectedElement if it's the element being updated
    if (selectedElement?.id === elementId && updatedElement) {
      setSelectedElement(updatedElement);
    }
  }, [currentPage, selectedElement]);

  const updateElementPosition = useCallback((elementId: string, x: number, y: number) => {
    updateElement(elementId, { x, y });
  }, [updateElement]);

  const updateElementSize = useCallback((elementId: string, width: number, height: number) => {
    updateElement(elementId, { width, height });
  }, [updateElement]);

  const deleteElement = useCallback((elementId: string) => {
    setDesign(prev => {
      const pageKey = currentPage === PageType.FRONT ? 'frontPage' : 'backPage';
      return {
        ...prev,
        [pageKey]: {
          type: currentPage,
          elements: prev[pageKey].elements.filter(el => el.id !== elementId)
        }
      };
    });
    
    // Clear selection if the deleted element was selected
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  }, [currentPage, selectedElement]);

  const getCurrentElements = useCallback((): DesignElement[] => {
    const pageKey = currentPage === PageType.FRONT ? 'frontPage' : 'backPage';
    return design[pageKey].elements || [];
  }, [currentPage, design]);

  // Clear selection when switching pages
  const switchPage = useCallback((page: PageType) => {
    setCurrentPage(page);
    setSelectedElement(null); // Clear selection when switching pages
  }, []);

  // Layering methods
  const bringToFront = useCallback((elementId: string) => {
    const elements = getCurrentElements();
    const maxZIndex = Math.max(...elements.map(el => el.zIndex || 0));
    updateElement(elementId, { zIndex: maxZIndex + 1 });
  }, [getCurrentElements, updateElement]);

  const sendToBack = useCallback((elementId: string) => {
    const elements = getCurrentElements();
    const minZIndex = Math.min(...elements.map(el => el.zIndex || 0));
    updateElement(elementId, { zIndex: minZIndex - 1 });
  }, [getCurrentElements, updateElement]);

  const bringForward = useCallback((elementId: string) => {
    const elements = getCurrentElements();
    const currentElement = elements.find(el => el.id === elementId);
    if (!currentElement) return;
    
    const currentZIndex = currentElement.zIndex || 0;
    const elementsAbove = elements.filter(el => (el.zIndex || 0) > currentZIndex);
    
    if (elementsAbove.length > 0) {
      const nextZIndex = Math.min(...elementsAbove.map(el => el.zIndex || 0));
      updateElement(elementId, { zIndex: nextZIndex + 0.5 });
      
      // Normalize z-indices to keep them as integers
      setTimeout(() => normalizeZIndices(), 0);
    }
  }, [getCurrentElements, updateElement]);

  const sendBackward = useCallback((elementId: string) => {
    const elements = getCurrentElements();
    const currentElement = elements.find(el => el.id === elementId);
    if (!currentElement) return;
    
    const currentZIndex = currentElement.zIndex || 0;
    const elementsBelow = elements.filter(el => (el.zIndex || 0) < currentZIndex);
    
    if (elementsBelow.length > 0) {
      const nextZIndex = Math.max(...elementsBelow.map(el => el.zIndex || 0));
      updateElement(elementId, { zIndex: nextZIndex - 0.5 });
      
      // Normalize z-indices to keep them as integers
      setTimeout(() => normalizeZIndices(), 0);
    }
  }, [getCurrentElements, updateElement]);

  const normalizeZIndices = useCallback(() => {
    const elements = getCurrentElements();
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    sortedElements.forEach((element, index) => {
      if (element.zIndex !== index) {
        updateElement(element.id, { zIndex: index });
      }
    });
  }, [getCurrentElements, updateElement]);

  const contextValue: TicketDesignerContextType = {
    design,
    selectedElement,
    currentPage,
    savedDesigns,
    isLoading,
    currentDesignId,
    setDesign,
    setSelectedElement,
    setCurrentPage: switchPage,
    updateCurrentPage,
    updateElement,
    updateElementPosition,
    updateElementSize,
    deleteElement,
    getCurrentElements,
    setSavedDesigns,
    setIsLoading,
    setCurrentDesignId,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward
  };

  return (
    <TicketDesignerContext.Provider value={contextValue}>
      {children}
    </TicketDesignerContext.Provider>
  );
}; 
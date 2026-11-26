import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, FileText, Trash2, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Copy, Eye, EyeOff, MousePointer, Move3D } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Rnd } from 'react-rnd';
import { toast } from 'sonner';
import { useTicketDesigner } from './TicketDesignerContext';
import { ElementRenderer } from './ElementRenderer';
import { DesignElement, PageType, DesignElementTypes } from '@/hooks/useDesigns';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

export const TicketCanvas: React.FC = () => {
  const [canvasScale, setCanvasScale] = useState(1);
  const [resizeMode, setResizeMode] = useState<string | null>(null);
  
  const {
    design,
    selectedElement,
    setSelectedElement,
    currentPage,
    setCurrentPage,
    updateElementPosition,
    updateElementSize,
    updateElement,
    deleteElement,
    updateCurrentPage,
    getCurrentElements,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward
  } = useTicketDesigner();

  const currentElements = getCurrentElements();
  
  // Sort elements by z-index for proper rendering
  const sortedElements = [...currentElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // Calculate responsive canvas size
  const calculateCanvasScale = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) return 0.7; // Mobile
      if (screenWidth < 1024) return 0.85; // Tablet
      return 1; // Desktop
    }
    return 1;
  };

  // Update canvas scale on window resize and add keyboard shortcuts
  useEffect(() => {
    const updateScale = () => {
      setCanvasScale(calculateCanvasScale());
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts if an element is selected
      if (!selectedElement) return;

      // Prevent default behavior for our shortcuts
      if (e.ctrlKey || e.key === 'Delete' || e.key === '[' || e.key === ']') {
        switch (e.key) {
          case 'd':
          case 'D':
            if (e.ctrlKey) {
              e.preventDefault();
              handleDuplicateElement(selectedElement);
            }
            break;
          case 'h':
          case 'H':
            if (e.ctrlKey) {
              e.preventDefault();
              handleToggleVisibility(selectedElement.id);
            }
            break;
          case ']':
            e.preventDefault();
            if (e.ctrlKey) {
              handleLayerAction('front', selectedElement.id);
            } else {
              handleLayerAction('forward', selectedElement.id);
            }
            break;
          case '[':
            e.preventDefault();
            if (e.ctrlKey) {
              handleLayerAction('back', selectedElement.id);
            } else {
              handleLayerAction('backward', selectedElement.id);
            }
            break;
          case 'Delete':
            e.preventDefault();
            handleDeleteElement(selectedElement.id);
            break;
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement]); // Add selectedElement as dependency

  const scaledWidth = CANVAS_WIDTH * canvasScale;
  const scaledHeight = CANVAS_HEIGHT * canvasScale;

  const handleDeleteElement = (elementId: string) => {
    deleteElement(elementId);
    toast.success('Element gelöscht');
  };

  const handleDuplicateElement = (element: DesignElement) => {
    // Prevent duplicating QR codes - only one QR code allowed per design
    if (element.type === DesignElementTypes.QR) {
      toast.error('Es kann nur ein QR-Code pro Ticket hinzugefügt werden');
      return;
    }

    // Calculate next z-index
    const maxZIndex = currentElements.length > 0 
      ? Math.max(...currentElements.map(el => el.zIndex || 0))
      : 0;

    const duplicatedElement: DesignElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      x: element.x + 20, // Offset the duplicate slightly
      y: element.y + 20,
      zIndex: maxZIndex + 1
    };
    
    updateCurrentPage([...currentElements, duplicatedElement]);
    setSelectedElement(duplicatedElement);
    toast.success('Element dupliziert');
  };

  const handleToggleVisibility = (elementId: string) => {
    const element = currentElements.find(el => el.id === elementId);
    if (element) {
      updateElement(elementId, { visible: !element.visible });
      toast.success(element.visible ? 'Element ausgeblendet' : 'Element eingeblendet');
    }
  };

  const handleTabChange = (value: string) => {
    if (value === PageType.FRONT || value === PageType.BACK) {
      setCurrentPage(value as PageType);
    }
  };

  const handleLayerAction = (action: string, elementId: string) => {
    switch (action) {
      case 'front':
        bringToFront(elementId);
        toast.success('Element nach vorne gebracht');
        break;
      case 'back':
        sendToBack(elementId);
        toast.success('Element nach hinten gesendet');
        break;
      case 'forward':
        bringForward(elementId);
        toast.success('Element eine Ebene nach vorne');
        break;
      case 'backward':
        sendBackward(elementId);
        toast.success('Element eine Ebene nach hinten');
        break;
    }
  };

  const handleSelectElement = (element: DesignElement) => {
    setSelectedElement(element);
    setResizeMode(null); // Exit resize mode when selecting
    toast.success('Element ausgewählt');
  };

  const handleResizeMode = (elementId: string) => {
    const element = currentElements.find(el => el.id === elementId);
    if (element) {
      setSelectedElement(element);
      setResizeMode(elementId);
      toast.success('Größe ändern aktiviert - Ziehen Sie an den Ecken');
    }
  };

  // Element Context Menu Component
  const ElementContextMenu: React.FC<{ element: DesignElement; children: React.ReactNode }> = ({ element, children }) => {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={() => handleSelectElement(element)}>
            <MousePointer className="w-4 h-4 mr-2" />
            Auswählen
            <span className="ml-auto text-xs text-muted-foreground">Eigenschaften</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleResizeMode(element.id)}>
            <Move3D className="w-4 h-4 mr-2" />
            Größe ändern
            <span className="ml-auto text-xs text-muted-foreground">Aktiviert Griffe</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => handleDuplicateElement(element)}>
            <Copy className="w-4 h-4 mr-2" />
            Duplizieren
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleToggleVisibility(element.id)}>
            {element.visible ? (
              <EyeOff className="w-4 h-4 mr-2" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            {element.visible ? 'Ausblenden' : 'Einblenden'}
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+H</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowUp className="w-4 h-4 mr-2" />
              Ebenen
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => handleLayerAction('front', element.id)}>
                <ArrowUp className="w-4 h-4 mr-2" />
                Nach vorne
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+]</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleLayerAction('forward', element.id)}>
                <ChevronUp className="w-4 h-4 mr-2" />
                Eine Ebene vor
                <span className="ml-auto text-xs text-muted-foreground">]</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleLayerAction('backward', element.id)}>
                <ChevronDown className="w-4 h-4 mr-2" />
                Eine Ebene zurück
                <span className="ml-auto text-xs text-muted-foreground">[</span>
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleLayerAction('back', element.id)}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Nach hinten
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+[</span>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem 
            variant="destructive"
            onClick={() => handleDeleteElement(element.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Löschen
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderCanvas = () => (
    <div className="flex justify-center">
      <div 
        className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden shadow-lg transition-colors duration-300"
        style={{ 
          width: scaledWidth, 
          height: scaledHeight,
          transform: `scale(${canvasScale})`,
          transformOrigin: 'top center'
        }}
        onClick={(e) => {
          // Only clear states if clicking on the canvas background
          if (e.target === e.currentTarget) {
            setSelectedElement(null);
            setResizeMode(null);
          }
        }}
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Elements */}
        {sortedElements.map((element) => (
          <ElementContextMenu key={element.id} element={element}>
            <Rnd
              size={{ width: element.width, height: element.height }}
              position={{ x: element.x, y: element.y }}
              onDrag={(e, d) => {
                // Prevent default drag behavior that might cause stretching
                e.preventDefault();
              }}
              onDragStop={(e, d) => updateElementPosition(element.id, d.x, d.y)}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateElementSize(
                  element.id,
                  parseInt(ref.style.width),
                  parseInt(ref.style.height)
                );
                updateElementPosition(element.id, position.x, position.y);
                setResizeMode(null); // Exit resize mode after resizing
                toast.success('Elementgröße geändert');
              }}
              bounds="parent"
              style={{ zIndex: element.zIndex || 0 }}
              className={`${
                selectedElement?.id === element.id 
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-opacity-75' 
                  : ''
              } ${
                resizeMode === element.id
                  ? 'ring-2 ring-green-500 dark:ring-green-400 ring-opacity-75'
                  : ''
              } transition-all duration-200`}
              dragHandleClassName="drag-handle"
              enableResizing={{
                top: resizeMode === element.id,
                right: resizeMode === element.id,
                bottom: resizeMode === element.id,
                left: resizeMode === element.id,
                topRight: resizeMode === element.id,
                bottomRight: resizeMode === element.id,
                bottomLeft: resizeMode === element.id,
                topLeft: resizeMode === element.id,
              }}  
              disableDragging={false}
              dragAxis="both"
              cancel=".no-drag"
            >
              <div className="relative w-full h-full group drag-handle">
                <ElementRenderer element={element} />
                
                {/* Action buttons - only show when selected */}
                {selectedElement?.id === element.id && (
                  <div className="absolute -top-8 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 no-drag">
                    {/* Layer controls */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-6 h-6 p-0 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 no-drag"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayerAction('front', element.id);
                      }}
                      title="Nach vorne bringen"
                    >
                      <ArrowUp className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-6 h-6 p-0 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 no-drag"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayerAction('forward', element.id);
                      }}
                      title="Eine Ebene nach vorne"
                    >
                      <ChevronUp className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-6 h-6 p-0 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 no-drag"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayerAction('backward', element.id);
                      }}
                      title="Eine Ebene nach hinten"
                    >
                      <ChevronDown className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-6 h-6 p-0 rounded-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 no-drag"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLayerAction('back', element.id);
                      }}
                      title="Nach hinten senden"
                    >
                      <ArrowDown className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    </Button>
                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-6 h-6 p-0 rounded-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 no-drag"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteElement(element.id);
                      }}
                      title="Löschen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </Rnd>
          </ElementContextMenu>
        ))}

        {/* Resize mode indicator */}
        {resizeMode && (
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium z-50">
            Größe ändern aktiv - Ziehen Sie an den grünen Griffen
          </div>
        )}

        {/* Empty state */}
        {currentElements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400 dark:text-gray-500 transition-colors duration-300">
              <FileText className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs lg:text-sm">Ziehen Sie Elemente hierher</p>
              <p className="text-xs">oder klicken Sie auf "Hinzufügen"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transition-colors duration-300">
      <CardHeader className="pb-3 lg:pb-4">
        <CardTitle className="flex items-center gap-2 text-base lg:text-lg text-gray-900 dark:text-gray-100">
          <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500 dark:text-indigo-400" />
          Ticket Design Canvas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={currentPage} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 lg:mb-6 bg-gray-100 dark:bg-gray-800 transition-colors duration-300">
            <TabsTrigger 
              value={PageType.FRONT} 
              className="flex items-center gap-2 text-xs lg:text-sm data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 data-[state=active]:text-gray-900 data-[state=active]:dark:text-gray-100 text-gray-600 dark:text-gray-400"
            >
              <CreditCard className="w-3 h-3 lg:w-4 lg:h-4" />
              Vorderseite
            </TabsTrigger>
            <TabsTrigger 
              value={PageType.BACK} 
              className="flex items-center gap-2 text-xs lg:text-sm data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 data-[state=active]:text-gray-900 data-[state=active]:dark:text-gray-100 text-gray-600 dark:text-gray-400"
            >
              <CreditCard className="w-3 h-3 lg:w-4 lg:h-4 rotate-180" />
              Rückseite
            </TabsTrigger>
          </TabsList>

          <TabsContent value={PageType.FRONT} className="mt-0">
            {renderCanvas()}
          </TabsContent>

          <TabsContent value={PageType.BACK} className="mt-0">
            {renderCanvas()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 
import { useRef, useEffect, useState, useCallback } from "react";
import { Layer, Room, Table, Seat } from "@ticket-system/models/order";
import { Base64Coder } from "@ticket-system/processors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Move,
  Maximize2,
  Edit3,
  Info,
  Undo,
  Redo,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TableConfiguratorProps {
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
  onSave: (layers: Layer[]) => Promise<void>;
}

interface CanvasState {
  zoomLevel: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  wasPanning: boolean;
  selectedElement: Room | Table | Seat | null;
  hoveredElement: Room | Table | Seat | null;
  isDragging: boolean;
  isResizing: boolean;
  dragStartX: number;
  dragStartY: number;
  resizeHandle: string | null;
  startX: number;
  startY: number;
  moveMode: boolean;
  resizeMode: boolean;
  dragMode: boolean;
}

interface CreateMode {
  type: "room" | "table" | "seat" | null;
  table?: Table;
  room?: Room;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  element: Room | Table | Seat | null;
}

interface RenameDialogState {
  isOpen: boolean;
  element: Room | Table | Seat | null;
  newName: string;
}

export default function TableConfigurator({
  layers,
  onLayersChange,
  onSave,
}: TableConfiguratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [selectedLayerName, setSelectedLayerName] = useState<string>("");
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoomLevel: 0.8,
    panX: 0,
    panY: 0,
    isPanning: false,
    wasPanning: false,
    selectedElement: null,
    hoveredElement: null,
    isDragging: false,
    isResizing: false,
    dragStartX: 0,
    dragStartY: 0,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    moveMode: false,
    resizeMode: false,
    dragMode: false,
  });
  const [createMode, setCreateMode] = useState<CreateMode>({ type: null });
  const [newElementName, setNewElementName] = useState("");
  const [newElementPrice, setNewElementPrice] = useState(0);
  const [priceInputValue, setPriceInputValue] = useState("0");
  const [newTablePosition, setNewTablePosition] = useState({ x: 100, y: 100 });
  const [newTableSize, setNewTableSize] = useState({ width: 80, height: 60 });
  const [newTableSelectable, setNewTableSelectable] = useState(true);
  const [newRoomPosition, setNewRoomPosition] = useState({ x: 100, y: 100 });
  const [newRoomSize, setNewRoomSize] = useState({ width: 200, height: 150 });
  const [newSeatPosition, setNewSeatPosition] = useState({ x: 100, y: 100 });
  const [propertyInputs, setPropertyInputs] = useState({
    x: "",
    y: "",
    width: "",
    height: "",
    price: "",
    name: "",
    selectable: false,
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    element: null,
  });
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    isOpen: false,
    element: null,
    newName: "",
  });

  // Layer management state
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerLevel, setNewLayerLevel] = useState(0);
  const [newLayerPicture, setNewLayerPicture] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [cachedBackgroundImage, setCachedBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [showLayerDialog, setShowLayerDialog] = useState(false);
  const [showEditPictureDialog, setShowEditPictureDialog] = useState(false);

  // Layer renaming state
  const [renameLayerDialogOpen, setRenameLayerDialogOpen] = useState(false);
  const [newLayerNameForRename, setNewLayerNameForRename] = useState("");

  // History and unsaved changes tracking
  const [history, setHistory] = useState<Layer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialLayersRef = useRef<string>(JSON.stringify(layers));
  const stateBeforeDragRef = useRef<Layer[] | null>(null);

  // Initialize history with initial layers state
  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(layers))]);
      setHistoryIndex(0);
    }
  }, []);

  // Update selected layer when layer name changes
  useEffect(() => {
    const layer = layers.find((l) => l.name === selectedLayerName);
    setSelectedLayer(layer || null);
  }, [selectedLayerName, layers]);

  // Track unsaved changes
  useEffect(() => {
    const currentState = JSON.stringify(layers);
    const hasChanges = currentState !== initialLayersRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [layers]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Wrapper for onLayersChange that adds to history
  const onLayersChangeWithHistory = useCallback(
    (newLayers: Layer[]) => {
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newLayers)));

      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex((prev) => prev + 1);
      }

      setHistory(newHistory);
      onLayersChange(newLayers);
    },
    [history, historyIndex, onLayersChange]
  );

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onLayersChange(JSON.parse(JSON.stringify(history[newIndex])));
      toast.info("Undo successful");
    } else {
      toast.error("Nothing to undo");
    }
  }, [historyIndex, history, onLayersChange]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onLayersChange(JSON.parse(JSON.stringify(history[newIndex])));
      toast.info("Redo successful");
    } else {
      toast.error("Nothing to redo");
    }
  }, [historyIndex, history, onLayersChange]);

  // Wrap the save function to reset unsaved changes
  const handleSave = useCallback(async () => {
    await onSave(layers);
    initialLayersRef.current = JSON.stringify(layers);
    setHasUnsavedChanges(false);
  }, [layers, onSave]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: Math.max(rect.width, 400),
          height: Math.max(rect.height, 500),
        });
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const getAllTables = useCallback((): Table[] => {
    if (!selectedLayer) return [];
    return selectedLayer.rooms.flatMap((room) => room.tables);
  }, [selectedLayer]);

  const getAllSeats = useCallback((): Seat[] => {
    if (!selectedLayer) return [];
    return selectedLayer.rooms.flatMap((room) =>
      room.tables.flatMap((table) => table.seats)
    );
  }, [selectedLayer]);

  const getMousePosition = useCallback(
    (event: MouseEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const x =
        (event.clientX - rect.left - canvasState.panX) / canvasState.zoomLevel;
      const y =
        (event.clientY - rect.top - canvasState.panY) / canvasState.zoomLevel;
      return { x, y };
    },
    [canvasState.panX, canvasState.panY, canvasState.zoomLevel]
  );

  const isPointInRect = useCallback(
    (x: number, y: number, element: Room | Table | Seat): boolean => {
      return (
        x >= element.xposition &&
        x <= element.xposition + element.xlength &&
        y >= element.yposition &&
        y <= element.yposition + element.ylength
      );
    },
    []
  );

  const findHoveredElement = useCallback(
    (x: number, y: number): Room | Table | Seat | null => {
      if (!selectedLayer) return null;

      // Check seats first (they're on top)
      const allSeats = getAllSeats();
      for (const seat of allSeats) {
        if (isPointInRect(x, y, seat)) {
          return seat;
        }
      }

      // Check tables
      const allTables = getAllTables();
      for (const table of allTables) {
        if (isPointInRect(x, y, table)) {
          return table;
        }
      }

      // Check rooms
      for (const room of selectedLayer.rooms) {
        if (isPointInRect(x, y, room)) {
          return room;
        }
      }

      return null;
    },
    [selectedLayer, getAllSeats, getAllTables, isPointInRect]
  );

  const getResizeHandle = useCallback(
    (x: number, y: number, element: Room | Table | Seat): string | null => {
      const handleSize = 8;
      const { xposition, yposition, xlength, ylength } = element;

      // Check corners first
      if (
        x >= xposition + xlength - handleSize &&
        x <= xposition + xlength + handleSize &&
        y >= yposition + ylength - handleSize &&
        y <= yposition + ylength + handleSize
      ) {
        return "se"; // southeast
      }
      if (
        x >= xposition + xlength - handleSize &&
        x <= xposition + xlength + handleSize &&
        y >= yposition - handleSize &&
        y <= yposition + handleSize
      ) {
        return "ne"; // northeast
      }
      if (
        x >= xposition - handleSize &&
        x <= xposition + handleSize &&
        y >= yposition + ylength - handleSize &&
        y <= yposition + ylength + handleSize
      ) {
        return "sw"; // southwest
      }
      if (
        x >= xposition - handleSize &&
        x <= xposition + handleSize &&
        y >= yposition - handleSize &&
        y <= yposition + handleSize
      ) {
        return "nw"; // northwest
      }

      // Check edges
      if (
        x >= xposition + xlength - handleSize &&
        x <= xposition + xlength + handleSize &&
        y >= yposition &&
        y <= yposition + ylength
      ) {
        return "e"; // east
      }
      if (
        x >= xposition - handleSize &&
        x <= xposition + handleSize &&
        y >= yposition &&
        y <= yposition + ylength
      ) {
        return "w"; // west
      }
      if (
        x >= xposition &&
        x <= xposition + xlength &&
        y >= yposition + ylength - handleSize &&
        y <= yposition + ylength + handleSize
      ) {
        return "s"; // south
      }
      if (
        x >= xposition &&
        x <= xposition + xlength &&
        y >= yposition - handleSize &&
        y <= yposition + handleSize
      ) {
        return "n"; // north
      }

      return null;
    },
    []
  );

  // Layer management functions
  const handleCreateLayer = useCallback(() => {
    if (!newLayerName.trim()) {
      toast.error("Bitte geben Sie einen Namen für die neue Ebene ein");
      return;
    }

    const layer: Layer = {
      name: newLayerName,
      level: newLayerLevel,
      picture: newLayerPicture || undefined,
      rooms: [],
    };

    onLayersChangeWithHistory([...layers, layer]);
    setNewLayerName("");
    setNewLayerLevel(0);
    setNewLayerPicture("");
    setImagePreview("");
    setCachedBackgroundImage(null); // Clear cache when new layer is created
    setShowLayerDialog(false);
    setSelectedLayerName(layer.name);
    toast.success("Layer created successfully");
  }, [
    newLayerName,
    newLayerLevel,
    newLayerPicture,
    layers,
    onLayersChangeWithHistory,
  ]);

  // Image upload handlers
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei aus");
      return;
    }

    setIsUploadingImage(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = Base64Coder.encodeImage(uint8Array);

      setNewLayerPicture(base64String);
      setImagePreview(`data:image/jpeg;base64,${base64String}`);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const removeImage = useCallback(() => {
    setNewLayerPicture("");
    setImagePreview("");
    toast.success("Image removed");
  }, []);

  const handleUpdateLayerPicture = useCallback(() => {
    if (!selectedLayer) return;

    const updatedLayers = layers.map((layer) =>
      layer.name === selectedLayerName
        ? { ...layer, picture: newLayerPicture || undefined }
        : layer
    );
    onLayersChangeWithHistory(updatedLayers);
    setShowEditPictureDialog(false);
    setNewLayerPicture("");
    setImagePreview("");
    setCachedBackgroundImage(null); // Clear cache when picture is updated
    toast.success("Bild erfolgreich aktualisiert");
  }, [
    selectedLayer,
    selectedLayerName,
    newLayerPicture,
    layers,
    onLayersChangeWithHistory,
  ]);

  const handleRenameLayer = useCallback(() => {
    if (!selectedLayer || !newLayerNameForRename.trim()) return;

    const newName = newLayerNameForRename.trim();
    if (newName === selectedLayerName) {
      setRenameLayerDialogOpen(false);
      return;
    }

    // Check if name exists
    if (layers.some((l) => l.name === newName)) {
      toast.error("Eine Ebene mit diesem Namen existiert bereits");
      return;
    }

    const updatedLayers = layers.map((layer) =>
      layer.name === selectedLayerName ? { ...layer, name: newName } : layer
    );

    // Update references in rooms if needed?
    // The Room interface has a 'layer' property which matches the layer name.
    // We need to update that as well.
    const finalLayers = updatedLayers.map((layer) => ({
      ...layer,
      rooms: layer.rooms.map((room) =>
        room.layer === selectedLayerName ? { ...room, layer: newName } : room
      ),
    }));

    onLayersChangeWithHistory(finalLayers);
    setSelectedLayerName(newName);
    setRenameLayerDialogOpen(false);
    toast.success("Ebene erfolgreich umbenannt");
  }, [
    selectedLayer,
    selectedLayerName,
    newLayerNameForRename,
    layers,
    onLayersChangeWithHistory,
  ]);

  const handleDeleteLayer = useCallback(() => {
    if (!selectedLayer) return;

    if (
      !confirm(
        `Sind Sie sicher, dass Sie die Ebene "${selectedLayerName}" löschen möchten? Alle Räume, Tische und Plätze darauf werden ebenfalls gelöscht.`
      )
    ) {
      return;
    }

    const updatedLayers = layers.filter((l) => l.name !== selectedLayerName);
    onLayersChangeWithHistory(updatedLayers);

    if (updatedLayers.length > 0) {
      setSelectedLayerName(updatedLayers[0].name);
    } else {
      setSelectedLayerName("");
      setSelectedLayer(null);
    }
    toast.success("Ebene erfolgreich gelöscht");
  }, [selectedLayer, selectedLayerName, layers, onLayersChangeWithHistory]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = containerSize.width;
    const canvasHeight = containerSize.height;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(canvasState.panX, canvasState.panY);
    ctx.scale(canvasState.zoomLevel, canvasState.zoomLevel);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw layer background image if available
    if (selectedLayer?.picture) {
      if (cachedBackgroundImage) {
        // Use cached image for better performance
        ctx.drawImage(cachedBackgroundImage, 0, 0);
        drawCanvasElements(ctx);
        ctx.restore();
      } else {
        // Load image and cache it
        const img = new Image();
        img.onload = () => {
          setCachedBackgroundImage(img);
          // Draw the image at the origin (0,0) in the transformed coordinate system
          // This ensures it moves with the pan and zoom
          ctx.drawImage(img, 0, 0);

          // Continue drawing other elements after the image loads
          drawCanvasElements(ctx);

          // Restore canvas state after everything is drawn
          ctx.restore();
        };
        img.src = `data:image/jpeg;base64,${selectedLayer.picture}`;
      }
    } else {
      // No background image, draw elements directly
      drawCanvasElements(ctx);
      ctx.restore();
    }
  }, [
    selectedLayer,
    canvasState.panX,
    canvasState.panY,
    canvasState.zoomLevel,
    containerSize.width,
    containerSize.height,
    canvasState.selectedElement,
    getAllTables,
    getAllSeats,
    canvasState.hoveredElement,
    cachedBackgroundImage,
  ]);

  // Clear cached image when layer changes
  useEffect(() => {
    setCachedBackgroundImage(null);
  }, [selectedLayerName]);

  const drawCanvasElements = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Draw rooms
      if (selectedLayer) {
        selectedLayer.rooms.forEach((room) => {
          // Transparent fill: skip fillRect to keep room area transparent
          ctx.strokeStyle =
            room === canvasState.selectedElement ? "#1d4ed8" : "#9ca3af";
          ctx.lineWidth = room === canvasState.selectedElement ? 3 : 1;
          ctx.strokeRect(
            room.xposition,
            room.yposition,
            room.xlength,
            room.ylength
          );
        });
      }

      // Get all tables once
      const allTables = getAllTables();

      // Draw seat lines first so they appear behind tables and seats
      allTables.forEach((table) => {
        if (table.seats && table.seats.length > 0) {
          ctx.strokeStyle = "#9ca3af";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);

          table.seats.forEach((seat) => {
            const tableCenterX = table.xposition + table.xlength / 2;
            const tableCenterY = table.yposition + table.ylength / 2;
            const seatCenterX = seat.xposition + seat.xlength / 2;
            const seatCenterY = seat.yposition + seat.ylength / 2;

            ctx.beginPath();
            ctx.moveTo(tableCenterX, tableCenterY);
            ctx.lineTo(seatCenterX, seatCenterY);
            ctx.stroke();
          });

          ctx.setLineDash([]);
        }
      });

      // Draw tables
      allTables.forEach((table) => {
        ctx.fillStyle =
          table === canvasState.selectedElement ? "#10b981" : "#d1fae5";
        ctx.strokeStyle =
          table === canvasState.selectedElement ? "#059669" : "#6ee7b7";
        ctx.lineWidth = table === canvasState.selectedElement ? 3 : 1;

        ctx.fillRect(
          table.xposition,
          table.yposition,
          table.xlength,
          table.ylength
        );
        ctx.strokeRect(
          table.xposition,
          table.yposition,
          table.xlength,
          table.ylength
        );

        // Table name
        ctx.fillStyle = "#374151";
        ctx.font = "12px Arial";
        ctx.fillText(
          table.name,
          table.xposition + table.xlength / 2,
          table.yposition + table.ylength / 2
        );
      });

      // Draw seats
      const allSeats = getAllSeats();
      allSeats.forEach((seat) => {
        ctx.fillStyle =
          seat === canvasState.selectedElement ? "#f59e0b" : "#fef3c7";
        ctx.strokeStyle =
          seat === canvasState.selectedElement ? "#d97706" : "#fbbf24";
        ctx.lineWidth = seat === canvasState.selectedElement ? 2 : 1;

        ctx.fillRect(
          seat.xposition,
          seat.yposition,
          seat.xlength,
          seat.ylength
        );
        ctx.strokeRect(
          seat.xposition,
          seat.yposition,
          seat.xlength,
          seat.ylength
        );

        // Draw seat price
        ctx.fillStyle = "#000";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `€${seat.price}`,
          seat.xposition + seat.xlength / 2,
          seat.yposition + seat.ylength / 2
        );
      });

      // Draw room labels last so they appear above tables and seats
      if (selectedLayer) {
        selectedLayer.rooms.forEach((room) => {
          // Text color: white by default, selected uses border color for consistency
          const isSelected = room === canvasState.selectedElement;
          const labelColor = isSelected ? "#1d4ed8" : "#ffffff";
          ctx.fillStyle = labelColor;
          ctx.font = "14px Arial";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(room.name, room.xposition + 6, room.yposition + 6);
        });
      }

      // Draw resize handles for selected element (only in resize mode)
      if (canvasState.selectedElement && canvasState.resizeMode) {
        const selectedElement = canvasState.selectedElement;

        // Find the current element from the rooms state to get the latest dimensions
        let currentElement: Room | Table | Seat | null = null;

        if ("tables" in selectedElement) {
          // Room
          currentElement =
            selectedLayer?.rooms.find(
              (room) => room.name === selectedElement.name
            ) || null;
        } else if ("seats" in selectedElement) {
          // Table
          for (const room of selectedLayer?.rooms || []) {
            const table = room.tables.find(
              (table) => table.name === selectedElement.name
            );
            if (table) {
              currentElement = table;
              break;
            }
          }
        } else {
          // Seat
          for (const room of selectedLayer?.rooms || []) {
            for (const table of room.tables) {
              const seat = table.seats.find(
                (seat) => seat.id === selectedElement.id
              );
              if (seat) {
                currentElement = seat;
                break;
              }
            }
            if (currentElement) break;
          }
        }

        if (currentElement) {
          const element = currentElement;
          const handleSize = 8;

          ctx.fillStyle = "#ef4444";
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 1;

          // Corner handles
          ctx.fillRect(
            element.xposition - handleSize / 2,
            element.yposition - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition - handleSize / 2,
            element.yposition - handleSize / 2,
            handleSize,
            handleSize
          );

          ctx.fillRect(
            element.xposition + element.xlength - handleSize / 2,
            element.yposition - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition + element.xlength - handleSize / 2,
            element.yposition - handleSize / 2,
            handleSize,
            handleSize
          );

          ctx.fillRect(
            element.xposition - handleSize / 2,
            element.yposition + element.ylength - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition - handleSize / 2,
            element.yposition + element.ylength - handleSize / 2,
            handleSize,
            handleSize
          );

          ctx.fillRect(
            element.xposition + element.xlength - handleSize / 2,
            element.yposition + element.ylength - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition + element.xlength - handleSize / 2,
            element.yposition + element.ylength - handleSize / 2,
            handleSize,
            handleSize
          );

          // Edge handles
          ctx.fillRect(
            element.xposition + element.xlength / 2 - handleSize / 2,
            element.yposition - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition + element.xlength / 2 - handleSize / 2,
            element.yposition - handleSize / 2,
            handleSize,
            handleSize
          );

          ctx.fillRect(
            element.xposition + element.xlength / 2 - handleSize / 2,
            element.yposition + element.ylength - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition + element.xlength / 2 - handleSize / 2,
            element.yposition + element.ylength - handleSize / 2,
            handleSize,
            handleSize
          );

          ctx.fillRect(
            element.xposition - handleSize / 2,
            element.yposition + element.ylength / 2 - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition - handleSize / 2,
            element.yposition + element.ylength / 2 - handleSize / 2,
            handleSize,
            handleSize
          );

          ctx.fillRect(
            element.xposition + element.xlength - handleSize / 2,
            element.yposition + element.ylength / 2 - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            element.xposition + element.xlength - handleSize / 2,
            element.yposition + element.ylength / 2 - handleSize / 2,
            handleSize,
            handleSize
          );
        }
      }
    },
    [selectedLayer, canvasState, getAllTables, getAllSeats]
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getMousePosition(event, canvas);
      const hoveredElement = findHoveredElement(x, y);

      if (createMode.type) {
        // Create mode - create new element
        handleCreateElement(x, y);
        return;
      }

      if (hoveredElement) {
        const resizeHandle = getResizeHandle(x, y, hoveredElement);

        if (
          resizeHandle &&
          canvasState.resizeMode &&
          canvasState.selectedElement === hoveredElement
        ) {
          // Start resizing - save state before resize
          stateBeforeDragRef.current = JSON.parse(JSON.stringify(layers));
          setCanvasState((prev) => ({
            ...prev,
            isResizing: true,
            resizeHandle,
            startX: x,
            startY: y,
          }));
        } else if (
          (canvasState.moveMode &&
            canvasState.selectedElement === hoveredElement) ||
          canvasState.dragMode
        ) {
          // Start dragging - save state before drag
          stateBeforeDragRef.current = JSON.parse(JSON.stringify(layers));
          setCanvasState((prev) => ({
            ...prev,
            isDragging: true,
            dragStartX: x - hoveredElement.xposition,
            dragStartY: y - hoveredElement.yposition,
            selectedElement: canvasState.dragMode
              ? hoveredElement
              : prev.selectedElement,
          }));
        } else {
          // Start panning
          setCanvasState((prev) => ({
            ...prev,
            isPanning: true,
            wasPanning: false,
            startX: event.clientX - prev.panX,
            startY: event.clientY - prev.panY,
          }));
        }
      } else {
        // Start panning
        setCanvasState((prev) => ({
          ...prev,
          isPanning: true,
          wasPanning: false,
          startX: event.clientX - prev.panX,
          startY: event.clientY - prev.panY,
        }));
      }
    },
    [
      getMousePosition,
      findHoveredElement,
      getResizeHandle,
      createMode.type,
      canvasState.selectedElement,
      canvasState.moveMode,
      canvasState.resizeMode,
      layers,
    ]
  );

  const handleCreateTableInRoom = useCallback(
    (room: Room, x: number, y: number) => {
      if (!newElementName.trim()) {
        toast.error("Bitte geben Sie einen Namen für den neuen Tisch ein");
        return;
      }

      // Check if a table with the same name already exists across all layers
      const existingTable = layers
        .flatMap((layer) => layer.rooms)
        .flatMap((room) => room.tables)
        .find((table) => table.name === newElementName.trim());
      if (existingTable) {
        toast.error(
          `A table with the name "${newElementName.trim()}" already exists`
        );
        return;
      }

      const table: Table = {
        name: newElementName,
        room: room.name,
        selectable: newTableSelectable,
        seats: [],
        xposition: newTablePosition.x,
        yposition: newTablePosition.y,
        xlength: newTableSize.width,
        ylength: newTableSize.height,
      };

      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((r) =>
                r.name === room.name
                  ? { ...r, tables: [...r.tables, table] }
                  : r
              ),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
      setNewElementName("");
      setNewTablePosition({ x: 100, y: 100 });
      setNewTableSize({ width: 80, height: 60 });
      setNewTableSelectable(true);
      setCreateMode({ type: null });
      toast.success("Table created successfully");
    },
    [
      newElementName,
      newTableSelectable,
      newTablePosition,
      newTableSize,
      layers,
      selectedLayerName,
      onLayersChangeWithHistory,
    ]
  );

  const handleCreateSeatInTable = useCallback(
    (table: Table, x: number, y: number) => {
      if (!newElementName.trim()) {
        toast.error("Please enter a name for the new seat");
        return;
      }

      const seat: Seat = {
        id: newElementName,
        price: newElementPrice,
        table: table.name,
        tableName: table.name,
        xposition: x - 10,
        yposition: y - 10,
        xlength: 20,
        ylength: 20,
      };

      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) => ({
                ...room,
                tables: room.tables.map((t) =>
                  t.name === table.name
                    ? { ...t, seats: [...t.seats, seat] }
                    : t
                ),
              })),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
      setNewElementName("");
      setNewElementPrice(0);
      setCreateMode({ type: null });
      toast.success("Seat created successfully");
    },
    [
      newElementName,
      newElementPrice,
      layers,
      selectedLayerName,
      onLayersChangeWithHistory,
    ]
  );

  const handleCreateElement = useCallback(
    (x: number, y: number) => {
      if (!newElementName.trim()) {
        toast.error("Please enter a name for the new element");
        return;
      }

      if (createMode.type === "room") {
        const room: Room = {
          name: newElementName,
          layer: selectedLayerName,
          tables: [],
          xposition: x - 50,
          yposition: y - 30,
          xlength: 100,
          ylength: 60,
        };

        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? { ...layer, rooms: [...layer.rooms, room] }
            : layer
        );
        onLayersChangeWithHistory(updatedLayers);
        setNewElementName("");
        setCreateMode({ type: null });
        toast.success("Room created successfully");
        return;
      } else if (createMode.type === "table" && createMode.room) {
        handleCreateTableInRoom(createMode.room, x, y);
        return;
      } else if (createMode.type === "seat" && createMode.table) {
        handleCreateSeatInTable(createMode.table, x, y);
        return;
      }

      setNewElementName("");
      setNewElementPrice(0);
      setCreateMode({ type: null });
      toast.success(`${createMode.type} created successfully`);
    },
    [
      createMode,
      newElementName,
      newElementPrice,
      layers,
      selectedLayerName,
      onLayersChangeWithHistory,
      handleCreateTableInRoom,
      handleCreateSeatInTable,
    ]
  );

  const updateElementPosition = useCallback(
    (
      element: Room | Table | Seat,
      newX: number,
      newY: number,
      skipHistory: boolean = false
    ) => {
      if ("tables" in element) {
        // Room
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) =>
                  room.name === element.name
                    ? {
                        ...room,
                        xposition: newX,
                        yposition: newY,
                        tables: room.tables, // Preserve tables array
                      }
                    : room
                ),
              }
            : layer
        );
        if (skipHistory) {
          onLayersChange(updatedLayers);
        } else {
          onLayersChangeWithHistory(updatedLayers);
        }
      } else if ("seats" in element) {
        // Table
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) => ({
                  ...room,
                  tables: room.tables.map((table) =>
                    table.name === element.name
                      ? {
                          ...table,
                          xposition: newX,
                          yposition: newY,
                          seats: table.seats, // Preserve seats array
                        }
                      : table
                  ),
                })),
              }
            : layer
        );
        if (skipHistory) {
          onLayersChange(updatedLayers);
        } else {
          onLayersChangeWithHistory(updatedLayers);
        }
      } else {
        // Seat
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) => ({
                  ...room,
                  tables: room.tables.map((table) => ({
                    ...table,
                    seats: table.seats.map((seat) =>
                      seat.id === element.id
                        ? { ...seat, xposition: newX, yposition: newY }
                        : seat
                    ),
                  })),
                })),
              }
            : layer
        );
        if (skipHistory) {
          onLayersChange(updatedLayers);
        } else {
          onLayersChangeWithHistory(updatedLayers);
        }
      }
    },
    [layers, selectedLayerName, onLayersChange, onLayersChangeWithHistory]
  );

  const updateElementName = useCallback(
    (element: Room | Table | Seat, newName: string) => {
      if ("tables" in element) {
        // Room
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) =>
                  room.name === element.name ? { ...room, name: newName } : room
                ),
              }
            : layer
        );
        onLayersChangeWithHistory(updatedLayers);
      } else if ("seats" in element) {
        // Table
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) => ({
                  ...room,
                  tables: room.tables.map((table) =>
                    table.name === element.name
                      ? { ...table, name: newName }
                      : table
                  ),
                })),
              }
            : layer
        );
        onLayersChangeWithHistory(updatedLayers);
      } else {
        // Seat
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) => ({
                  ...room,
                  tables: room.tables.map((table) => ({
                    ...table,
                    seats: table.seats.map((seat) =>
                      seat.id === element.id ? { ...seat, id: newName } : seat
                    ),
                  })),
                })),
              }
            : layer
        );
        onLayersChangeWithHistory(updatedLayers);
      }
    },
    [layers, selectedLayerName, onLayersChangeWithHistory]
  );

  const updateElementSelectable = useCallback(
    (element: Table, newSelectable: boolean) => {
      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) => ({
                ...room,
                tables: room.tables.map((table) =>
                  table.name === element.name
                    ? { ...table, selectable: newSelectable }
                    : table
                ),
              })),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    },
    [layers, selectedLayerName, onLayersChangeWithHistory]
  );

  const updateElementSize = useCallback(
    (
      element: Room | Table | Seat,
      deltaX: number,
      deltaY: number,
      handle: string,
      skipHistory: boolean = false
    ) => {
      // Find the current element from the selected layer to get the latest dimensions
      let currentElement: Room | Table | Seat | null = null;

      if (!selectedLayer) return;

      if ("tables" in element) {
        // Room
        currentElement =
          selectedLayer.rooms.find((room) => room.name === element.name) ||
          null;
      } else if ("seats" in element) {
        // Table
        for (const room of selectedLayer.rooms) {
          const table = room.tables.find(
            (table) => table.name === element.name
          );
          if (table) {
            currentElement = table;
            break;
          }
        }
      } else {
        // Seat
        for (const room of selectedLayer.rooms) {
          for (const table of room.tables) {
            const seat = table.seats.find((seat) => seat.id === element.id);
            if (seat) {
              currentElement = seat;
              break;
            }
          }
          if (currentElement) break;
        }
      }

      if (!currentElement) {
        return;
      }

      let newX = currentElement.xposition;
      let newY = currentElement.yposition;
      let newWidth = currentElement.xlength;
      let newHeight = currentElement.ylength;

      switch (handle) {
        case "nw":
          newX += deltaX;
          newY += deltaY;
          newWidth -= deltaX;
          newHeight -= deltaY;
          break;
        case "ne":
          newY += deltaY;
          newWidth += deltaX;
          newHeight -= deltaY;
          break;
        case "sw":
          newX += deltaX;
          newWidth -= deltaX;
          newHeight += deltaY;
          break;
        case "se":
          newWidth += deltaX;
          newHeight += deltaY;
          break;
        case "n":
          newY += deltaY;
          newHeight -= deltaY;
          break;
        case "s":
          newHeight += deltaY;
          break;
        case "w":
          newX += deltaX;
          newWidth -= deltaX;
          break;
        case "e":
          newWidth += deltaX;
          break;
      }

      // Ensure minimum size
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);

      if ("tables" in element) {
        // Room
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) =>
                  room.name === element.name
                    ? {
                        ...room,
                        xposition: newX,
                        yposition: newY,
                        xlength: newWidth,
                        ylength: newHeight,
                        tables: room.tables, // Preserve tables array
                      }
                    : room
                ),
              }
            : layer
        );
        if (skipHistory) {
          onLayersChange(updatedLayers);
        } else {
          onLayersChangeWithHistory(updatedLayers);
        }
      } else if ("seats" in element) {
        // Table
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) => ({
                  ...room,
                  tables: room.tables.map((table) =>
                    table.name === element.name
                      ? {
                          ...table,
                          xposition: newX,
                          yposition: newY,
                          xlength: newWidth,
                          ylength: newHeight,
                          seats: table.seats, // Preserve seats array
                        }
                      : table
                  ),
                })),
              }
            : layer
        );
        if (skipHistory) {
          onLayersChange(updatedLayers);
        } else {
          onLayersChangeWithHistory(updatedLayers);
        }
      } else {
        // Seat
        const updatedLayers = layers.map((layer) =>
          layer.name === selectedLayerName
            ? {
                ...layer,
                rooms: layer.rooms.map((room) => ({
                  ...room,
                  tables: room.tables.map((table) => ({
                    ...table,
                    seats: table.seats.map((seat) =>
                      seat.id === element.id
                        ? {
                            ...seat,
                            xposition: newX,
                            yposition: newY,
                            xlength: newWidth,
                            ylength: newHeight,
                          }
                        : seat
                    ),
                  })),
                })),
              }
            : layer
        );
        if (skipHistory) {
          onLayersChange(updatedLayers);
        } else {
          onLayersChangeWithHistory(updatedLayers);
        }
      }
    },
    [
      layers,
      selectedLayerName,
      selectedLayer,
      onLayersChange,
      onLayersChangeWithHistory,
    ]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getMousePosition(event, canvas);

      if (canvasState.isPanning) {
        setCanvasState((prev) => ({
          ...prev,
          panX: event.clientX - prev.startX,
          panY: event.clientY - prev.startY,
          wasPanning: true,
        }));
        return;
      }

      if (canvasState.isDragging && canvasState.selectedElement) {
        const element = canvasState.selectedElement;
        const newX = x - canvasState.dragStartX;
        const newY = y - canvasState.dragStartY;

        // Skip history during dragging
        updateElementPosition(element, newX, newY, true);
        return;
      }

      if (
        canvasState.isResizing &&
        canvasState.selectedElement &&
        canvasState.resizeHandle
      ) {
        const element = canvasState.selectedElement;
        const deltaX = x - canvasState.startX;
        const deltaY = y - canvasState.startY;

        // Skip history during resizing
        updateElementSize(
          element,
          deltaX,
          deltaY,
          canvasState.resizeHandle,
          true
        );
        setCanvasState((prev) => ({
          ...prev,
          startX: x,
          startY: y,
        }));
        return;
      }

      // Update hovered element
      const hoveredElement = findHoveredElement(x, y);
      if (canvasState.hoveredElement !== hoveredElement) {
        setCanvasState((prev) => ({
          ...prev,
          hoveredElement,
        }));

        // Update cursor based on mode and hovered element
        if (canvasState.isPanning) {
          canvas.style.cursor = "default";
        } else if (canvasState.isDragging) {
          canvas.style.cursor = "grabbing";
        } else if (canvasState.isResizing) {
          canvas.style.cursor = getResizeCursor(
            canvasState.resizeHandle || "default"
          );
        } else if (
          hoveredElement &&
          canvasState.selectedElement === hoveredElement
        ) {
          if (canvasState.resizeMode) {
            const resizeHandle = getResizeHandle(x, y, hoveredElement);
            if (resizeHandle) {
              canvas.style.cursor = getResizeCursor(resizeHandle);
            } else {
              canvas.style.cursor = "grab";
            }
          } else if (canvasState.moveMode) {
            canvas.style.cursor = "grab";
          } else {
            canvas.style.cursor = "default";
          }
        } else if (hoveredElement) {
          // Element is not selected, so it's not draggable
          canvas.style.cursor = "default";
        } else {
          canvas.style.cursor = createMode.type ? "crosshair" : "default";
        }
      }
    },
    [
      canvasState,
      getMousePosition,
      findHoveredElement,
      getResizeHandle,
      createMode.type,
      updateElementPosition,
      updateElementSize,
    ]
  );

  const getResizeCursor = useCallback((handle: string): string => {
    switch (handle) {
      case "nw":
      case "se":
        return "nw-resize";
      case "ne":
      case "sw":
        return "ne-resize";
      case "n":
      case "s":
        return "ns-resize";
      case "w":
      case "e":
        return "ew-resize";
      default:
        return "default";
    }
  }, []);

  const getMostCommonPrice = useCallback((table: Table): number => {
    if (table.seats.length === 0) return 0;

    const priceCounts: { [key: number]: number } = {};
    table.seats.forEach((seat) => {
      priceCounts[seat.price] = (priceCounts[seat.price] || 0) + 1;
    });

    let mostCommonPrice = 0;
    let maxCount = 0;

    Object.entries(priceCounts).forEach(([price, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonPrice = Number(price);
      }
    });

    return mostCommonPrice;
  }, []);

  // Update price when dialog opens for seat creation
  useEffect(() => {
    if (createMode.type === "seat" && createMode.table && selectedLayer) {
      const currentTable = selectedLayer.rooms
        .flatMap((room) => room.tables)
        .find((table) => table.name === createMode.table!.name);
      const suggestedPrice = currentTable
        ? getMostCommonPrice(currentTable)
        : 0;
      setNewElementPrice(suggestedPrice);
      setPriceInputValue(suggestedPrice.toString());
    }
  }, [createMode.type, createMode.table, selectedLayer, getMostCommonPrice]);

  const handleMouseUp = useCallback(() => {
    // If we were dragging or resizing, add to history now
    if (
      (canvasState.isDragging || canvasState.isResizing) &&
      stateBeforeDragRef.current
    ) {
      // Check if the state actually changed
      const currentState = JSON.stringify(layers);
      const beforeState = JSON.stringify(stateBeforeDragRef.current);

      if (currentState !== beforeState) {
        // Add to history
        onLayersChangeWithHistory(layers);
      }

      stateBeforeDragRef.current = null;
    }

    setCanvasState((prev) => ({
      ...prev,
      isPanning: false,
      isDragging: false,
      isResizing: false,
      wasPanning: false,
      resizeHandle: null,
      moveMode: false,
      resizeMode: false,
    }));
  }, [
    canvasState.isDragging,
    canvasState.isResizing,
    layers,
    onLayersChangeWithHistory,
  ]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const zoomFactor = 0.1;
      const newZoom =
        event.deltaY < 0
          ? Math.min(canvasState.zoomLevel + zoomFactor, 2.0)
          : Math.max(canvasState.zoomLevel - zoomFactor, 0.1);

      // Calculate the point under the mouse in canvas coordinates before zoom
      const canvasX = (mouseX - canvasState.panX) / canvasState.zoomLevel;
      const canvasY = (mouseY - canvasState.panY) / canvasState.zoomLevel;

      // Calculate new pan to keep the same point under the mouse after zoom
      const newPanX = mouseX - canvasX * newZoom;
      const newPanY = mouseY - canvasY * newZoom;

      setCanvasState((prev) => ({
        ...prev,
        zoomLevel: newZoom,
        panX: newPanX,
        panY: newPanY,
      }));
    },
    [canvasState.zoomLevel, canvasState.panX, canvasState.panY]
  );

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      if (canvasState.wasPanning) {
        setCanvasState((prev) => ({
          ...prev,
          wasPanning: false,
        }));
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getMousePosition(event, canvas);
      const clickedElement = findHoveredElement(x, y);

      if (!createMode.type) {
        setCanvasState((prev) => ({
          ...prev,
          selectedElement: clickedElement,
          moveMode: false,
          resizeMode: false,
        }));
      }
    },
    [
      canvasState.wasPanning,
      getMousePosition,
      findHoveredElement,
      createMode.type,
    ]
  );

  const handleCanvasRightClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getMousePosition(event, canvas);
      const clickedElement = findHoveredElement(x, y);

      if (clickedElement) {
        // If clicking on a room, store the position for potential table creation
        if ("tables" in clickedElement) {
          setNewTablePosition({ x: x - 40, y: y - 30 }); // Center a default 80x60 table on the click
        }
        // If clicking on a table, store the position for potential seat creation
        if ("seats" in clickedElement) {
          setNewSeatPosition({ x: x - 10, y: y - 10 }); // Center a default 20x20 seat on the click
        }
        setContextMenu({
          isOpen: true,
          x: event.clientX,
          y: event.clientY,
          element: clickedElement,
        });
        setCanvasState((prev) => ({
          ...prev,
          selectedElement: clickedElement,
        }));
      } else {
        // Right-click on empty space - show context menu with room creation option
        // Store the clicked position for room creation
        setNewRoomPosition({ x: x, y: y }); // Center the room on the click
        setContextMenu({
          isOpen: true,
          x: event.clientX,
          y: event.clientY,
          element: null, // null indicates empty space
        });
        setCanvasState((prev) => ({
          ...prev,
          selectedElement: null,
        }));
      }
    },
    [getMousePosition, findHoveredElement]
  );

  const deleteSelectedElement = useCallback(() => {
    if (!canvasState.selectedElement) return;

    const element = canvasState.selectedElement;

    if ("tables" in element) {
      // Delete room
      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.filter((room) => room.name !== element.name),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    } else if ("seats" in element) {
      // Delete table
      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) => ({
                ...room,
                tables: room.tables.filter(
                  (table) => table.name !== element.name
                ),
              })),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    } else {
      // Delete seat
      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) => ({
                ...room,
                tables: room.tables.map((table) => ({
                  ...table,
                  seats: table.seats.filter((seat) => seat.id !== element.id),
                })),
              })),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    }

    setCanvasState((prev) => ({
      ...prev,
      selectedElement: null,
    }));

    toast.success("Element deleted successfully");
  }, [
    canvasState.selectedElement,
    layers,
    selectedLayerName,
    onLayersChangeWithHistory,
  ]);

  const resetView = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      zoomLevel: 0.8,
      panX: 0,
      panY: 0,
      selectedElement: null,
      moveMode: false,
      resizeMode: false,
    }));
  }, []);

  const handleContextMenuAction = useCallback(
    (action: string, element: Room | Table | Seat | null) => {
      setContextMenu((prev) => ({ ...prev, isOpen: false }));

      switch (action) {
        case "move":
          // Enable move mode
          if (element) {
            setCanvasState((prev) => ({
              ...prev,
              selectedElement: element,
              moveMode: true,
              resizeMode: false,
            }));
            toast.info(
              "Move mode enabled. Click and drag the element to move it."
            );
          }
          break;
        case "resize":
          // Enable resize mode
          if (element) {
            setCanvasState((prev) => ({
              ...prev,
              selectedElement: element,
              moveMode: false,
              resizeMode: true,
            }));
            toast.info(
              "Resize mode enabled. Use the handles to resize the element."
            );
          }
          break;
        case "rename":
          if (element) {
            setRenameDialog({
              isOpen: true,
              element,
              newName:
                "tables" in element
                  ? element.name
                  : "seats" in element
                  ? element.name
                  : element.id,
            });
          }
          break;
        case "delete":
          if (element) {
            setCanvasState((prev) => ({ ...prev, selectedElement: element }));
            deleteSelectedElement();
          }
          break;
        case "create_table":
          if (element && "tables" in element) {
            setCreateMode({ type: "table", room: element });
          }
          break;
        case "create_seat":
          if (element && "seats" in element) {
            setCreateMode({ type: "seat", table: element });
          }
          break;
        case "create_room":
          // Create room at the clicked position
          setCreateMode({ type: "room" });
          setNewElementName("");
          break;
      }
    },
    [deleteSelectedElement]
  );

  const handleRename = useCallback(() => {
    if (!renameDialog.element || !renameDialog.newName.trim()) return;

    const element = renameDialog.element;
    const newName = renameDialog.newName.trim();

    if ("tables" in element) {
      // Rename room - check for duplicate room names in the same layer
      const selectedLayer = layers.find(
        (layer) => layer.name === selectedLayerName
      );
      const existingRoom = selectedLayer?.rooms.find(
        (room) => room.name === newName && room.name !== element.name
      );
      if (existingRoom) {
        toast.error(
          `A room with the name "${newName}" already exists in this layer`
        );
        return;
      }

      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) =>
                room.name === element.name ? { ...room, name: newName } : room
              ),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    } else if ("seats" in element) {
      // Rename table - check for duplicate table names across all layers
      const existingTable = layers
        .flatMap((layer) => layer.rooms)
        .flatMap((room) => room.tables)
        .find((table) => table.name === newName && table.name !== element.name);
      if (existingTable) {
        toast.error(`A table with the name "${newName}" already exists`);
        return;
      }

      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) => ({
                ...room,
                tables: room.tables.map((table) =>
                  table.name === element.name
                    ? { ...table, name: newName }
                    : table
                ),
              })),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    } else {
      // Rename seat - check for duplicate seat IDs in the same table
      const selectedLayer = layers.find(
        (layer) => layer.name === selectedLayerName
      );
      const table = selectedLayer?.rooms
        .flatMap((room) => room.tables)
        .find((table) => table.seats.some((seat) => seat.id === element.id));
      const existingSeat = table?.seats.find(
        (seat) => seat.id === newName && seat.id !== element.id
      );
      if (existingSeat) {
        toast.error(
          `A seat with the ID "${newName}" already exists in this table`
        );
        return;
      }

      const updatedLayers = layers.map((layer) =>
        layer.name === selectedLayerName
          ? {
              ...layer,
              rooms: layer.rooms.map((room) => ({
                ...room,
                tables: room.tables.map((table) => ({
                  ...table,
                  seats: table.seats.map((seat) =>
                    seat.id === element.id ? { ...seat, id: newName } : seat
                  ),
                })),
              })),
            }
          : layer
      );
      onLayersChangeWithHistory(updatedLayers);
    }

    setRenameDialog({ isOpen: false, element: null, newName: "" });
    toast.success("Element renamed successfully");
  }, [renameDialog, layers, selectedLayerName, onLayersChangeWithHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("contextmenu", handleCanvasRightClick);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("contextmenu", handleCanvasRightClick);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleCanvasClick,
    handleCanvasRightClick,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return; // Don't handle shortcuts when typing in inputs
      }

      const key = event.key.toLowerCase();

      // Handle Ctrl+S (save)
      if ((event.ctrlKey || event.metaKey) && key === "s") {
        event.preventDefault();
        handleSave();
        return;
      }

      // Handle Ctrl+Z (undo) and Ctrl+Y (redo)
      if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (key === "y" || (key === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        handleRedo();
        return;
      }

      switch (key) {
        case "m":
          // Toggle drag mode
          setCanvasState((prev) => ({
            ...prev,
            dragMode: !prev.dragMode,
            moveMode: false,
            resizeMode: false,
          }));
          toast.info(
            canvasState.dragMode
              ? "Drag mode disabled"
              : "Drag mode enabled - All objects are now moveable"
          );
          break;
        case "d":
          // Drag/Move mode
          if (canvasState.selectedElement) {
            setCanvasState((prev) => ({
              ...prev,
              moveMode: true,
              resizeMode: false,
              dragMode: false,
            }));
            // Update cursor immediately
            const canvas = canvasRef.current;
            if (
              canvas &&
              canvasState.hoveredElement === canvasState.selectedElement
            ) {
              canvas.style.cursor = "grab";
            }
            toast.info(
              "Move mode enabled. Click and drag the element to move it."
            );
          } else {
            toast.error("Bitte wähle zuerst ein Element aus");
          }
          break;
        case "s":
          // Resize mode
          if (canvasState.selectedElement) {
            setCanvasState((prev) => ({
              ...prev,
              moveMode: false,
              resizeMode: true,
            }));
            // Update cursor immediately
            const canvas = canvasRef.current;
            if (
              canvas &&
              canvasState.hoveredElement === canvasState.selectedElement
            ) {
              canvas.style.cursor = "grab";
            }
            toast.info(
              "Resize mode enabled. Use the handles to resize the element."
            );
          } else {
            toast.error("Bitte wähle zuerst ein Element aus");
          }
          break;
        case "a":
          // Add table/seat mode
          if (canvasState.selectedElement) {
            if ("tables" in canvasState.selectedElement) {
              // Room selected - create table
              setNewElementName("");
              setCreateMode({
                type: "table",
                room: canvasState.selectedElement,
              });
            } else if ("seats" in canvasState.selectedElement) {
              // Table selected - create seat
              setNewElementName("");
              // Calculate most common price for this table
              const currentTable = selectedLayer?.rooms
                .flatMap((room) => room.tables)
                .find(
                  (table) =>
                    table.name === (canvasState.selectedElement as Table).name
                );
              const suggestedPrice = currentTable
                ? getMostCommonPrice(currentTable)
                : 0;
              setNewElementPrice(suggestedPrice);
              setPriceInputValue(suggestedPrice.toString());
              setCreateMode({
                type: "seat",
                table: canvasState.selectedElement,
              });
            } else {
              toast.error("Cannot create elements in seats");
            }
          } else {
            toast.error("Bitte wähle zuerst einen Raum oder Tisch aus");
          }
          break;
        case "r":
          // Rename mode
          if (canvasState.selectedElement) {
            setRenameDialog({
              isOpen: true,
              element: canvasState.selectedElement,
              newName:
                "tables" in canvasState.selectedElement
                  ? canvasState.selectedElement.name
                  : "seats" in canvasState.selectedElement
                  ? canvasState.selectedElement.name
                  : canvasState.selectedElement.id,
            });
          } else {
            toast.error("Bitte wähle zuerst ein Element aus");
          }
          break;
        case "escape":
          // Cancel modes
          setCanvasState((prev) => ({
            ...prev,
            moveMode: false,
            resizeMode: false,
            dragMode: false,
          }));
          setCreateMode({ type: null });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canvasState.selectedElement,
    canvasState.moveMode,
    canvasState.resizeMode,
    selectedLayer,
    handleUndo,
    handleRedo,
    handleSave,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Update property inputs when selected element changes
  useEffect(() => {
    if (canvasState.selectedElement) {
      setPropertyInputs({
        x: canvasState.selectedElement.xposition.toFixed(2),
        y: canvasState.selectedElement.yposition.toFixed(2),
        width: canvasState.selectedElement.xlength.toFixed(2),
        height: canvasState.selectedElement.ylength.toFixed(2),
        price:
          "price" in canvasState.selectedElement
            ? canvasState.selectedElement.price.toFixed(2)
            : "",
        name:
          "tables" in canvasState.selectedElement
            ? canvasState.selectedElement.name
            : "seats" in canvasState.selectedElement
            ? canvasState.selectedElement.name
            : canvasState.selectedElement.id,
        selectable:
          "selectable" in canvasState.selectedElement
            ? canvasState.selectedElement.selectable
            : false,
      });
    }
  }, [canvasState.selectedElement]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.isOpen) {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu.isOpen]);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-hidden min-w-0">
      <h1 className="text-2xl font-bold">Sitz Konfiguration</h1>

      {/* Layer Selection */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Label htmlFor="layer-select" className="text-sm font-medium">
            Ebene:
          </Label>
          <Select
            value={selectedLayerName}
            onValueChange={setSelectedLayerName}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Wähle eine Ebene" />
            </SelectTrigger>
            <SelectContent>
              {layers.map((layer) => (
                <SelectItem key={layer.name} value={layer.name}>
                  {layer.name} (Level {layer.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setShowLayerDialog(true)}
          variant="outline"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ebene erstellen
        </Button>
        {selectedLayer && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewLayerNameForRename(selectedLayer.name);
                setRenameLayerDialogOpen(true);
              }}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Umbenennen
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewLayerPicture(selectedLayer.picture || "");
                setImagePreview(
                  selectedLayer.picture
                    ? `data:image/jpeg;base64,${selectedLayer.picture}`
                    : ""
                );
                setShowEditPictureDialog(true);
              }}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              {selectedLayer.picture ? "Bild bearbeiten" : "Bild hinzufügen"}
            </Button>

            {!selectedLayer.picture && (
              <div className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-md text-sm font-medium">
                ⚠ Kein Bild gesetzt - könnte Käufer verwirren
              </div>
            )}

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleDeleteLayer}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {hasUnsavedChanges && (
            <div className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-md text-sm font-medium">
              ⚠ Ungespeicherte Änderungen
            </div>
          )}
          {canvasState.dragMode && (
            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-md text-sm font-medium">
              🎯 Zieh-Modus aktiviert
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleUndo}
            variant="outline"
            size="sm"
            disabled={historyIndex <= 0}
            title="Rückgängig (Strg+Z)"
          >
            <Undo className="w-4 h-4 mr-2" />
            Rückgängig
          </Button>
          <Button
            onClick={handleRedo}
            variant="outline"
            size="sm"
            disabled={historyIndex >= history.length - 1}
            title="Wiederherstellen (Strg+Y)"
          >
            <Redo className="w-4 h-4 mr-2" />
            Wiederherstellen
          </Button>
          <Button onClick={resetView} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Ansicht zurücksetzen
          </Button>
          <Button onClick={handleSave} variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Konfiguration speichern
          </Button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-40"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onMouseLeave={() =>
            setContextMenu((prev) => ({ ...prev, isOpen: false }))
          }
        >
          {contextMenu.element === null ? (
            // Empty space context menu
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => handleContextMenuAction("create_room", null)}
            >
              <Plus className="w-4 h-4" />
              Raum erstellen
            </button>
          ) : "tables" in contextMenu.element ? (
            // Room context menu
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("move", contextMenu.element!)
                }
              >
                <Move className="w-4 h-4" />
                Verschieben
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("resize", contextMenu.element!)
                }
              >
                <Maximize2 className="w-4 h-4" />
                Größe ändern
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("rename", contextMenu.element!)
                }
              >
                <Edit3 className="w-4 h-4" />
                Umbenennen
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("create_table", contextMenu.element!)
                }
              >
                <Plus className="w-4 h-4" />
                Tisch erstellen
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("delete", contextMenu.element!)
                }
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </>
          ) : "seats" in contextMenu.element ? (
            // Table context menu
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("move", contextMenu.element!)
                }
              >
                <Move className="w-4 h-4" />
                Verschieben
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("resize", contextMenu.element!)
                }
              >
                <Maximize2 className="w-4 h-4" />
                Größe ändern
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("rename", contextMenu.element!)
                }
              >
                <Edit3 className="w-4 h-4" />
                Umbenennen
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("create_seat", contextMenu.element!)
                }
              >
                <Plus className="w-4 h-4" />
                Platz erstellen
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("delete", contextMenu.element!)
                }
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </>
          ) : (
            // Seat context menu
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("move", contextMenu.element!)
                }
              >
                <Move className="w-4 h-4" />
                Verschieben
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("resize", contextMenu.element!)
                }
              >
                <Maximize2 className="w-4 h-4" />
                Größe ändern
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("rename", contextMenu.element!)
                }
              >
                <Edit3 className="w-4 h-4" />
                Umbenennen
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
                onClick={() =>
                  handleContextMenuAction("delete", contextMenu.element!)
                }
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </>
          )}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.isOpen}
        onOpenChange={(open) =>
          setRenameDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Element umbenennen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="renameInput">Neuer Name</Label>
              <Input
                id="renameInput"
                value={renameDialog.newName}
                onChange={(e) =>
                  setRenameDialog((prev) => ({
                    ...prev,
                    newName: e.target.value,
                  }))
                }
                placeholder="Neuen Namen eingeben"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                onClick={() =>
                  setRenameDialog({ isOpen: false, element: null, newName: "" })
                }
              >
                Abbrechen
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                onClick={handleRename}
              >
                Umbenennen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Element Dialog */}
      <Dialog
        open={createMode.type !== null}
        onOpenChange={(open) => !open && setCreateMode({ type: null })}
      >
        <DialogContent className="border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>
              Neues{" "}
              {createMode.type === "room"
                ? "Zimmer"
                : createMode.type === "table"
                ? "Tisch"
                : "Platz"}{" "}
              erstellen
            </DialogTitle>
            <DialogDescription>
              {createMode.type === "room"
                ? "Geben Sie einen Namen ein und passen Sie die Position/Größe des neuen Raums an."
                : createMode.type === "table"
                ? "Geben Sie einen Namen für den neuen Tisch ein."
                : `Geben Sie einen Preis für den neuen Platz ein. Vorgeschlagener Preis: €${(() => {
                    if (!createMode.table || !selectedLayer) return "0";
                    const currentTable = selectedLayer.rooms
                      .flatMap((room) => room.tables)
                      .find((table) => table.name === createMode.table!.name);
                    return currentTable ? getMostCommonPrice(currentTable) : 0;
                  })()}`}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (createMode.type === "room" && newElementName.trim()) {
                // Check if a room with the same name already exists in this layer
                const selectedLayer = layers.find(
                  (layer) => layer.name === selectedLayerName
                );
                const existingRoom = selectedLayer?.rooms.find(
                  (room) => room.name === newElementName.trim()
                );
                if (existingRoom) {
                  toast.error(
                    `Ein Raum mit dem Namen "${newElementName.trim()}" existiert bereits in dieser Ebene`
                  );
                  return;
                }

                const room: Room = {
                  name: newElementName,
                  layer: selectedLayerName,
                  tables: [],
                  xposition: newRoomPosition.x,
                  yposition: newRoomPosition.y,
                  xlength: newRoomSize.width,
                  ylength: newRoomSize.height,
                };

                const updatedLayers = layers.map((layer) =>
                  layer.name === selectedLayerName
                    ? { ...layer, rooms: [...layer.rooms, room] }
                    : layer
                );
                onLayersChangeWithHistory(updatedLayers);
                setNewElementName("");
                setNewRoomPosition({ x: 100, y: 100 });
                setNewRoomSize({ width: 200, height: 150 });
                setCreateMode({ type: null });
                toast.success("Raum erfolgreich erstellt");
              } else if (
                createMode.type === "table" &&
                createMode.room &&
                newElementName.trim()
              ) {
                // Check if a table with the same name already exists across all layers
                const existingTable = layers
                  .flatMap((layer) => layer.rooms)
                  .flatMap((room) => room.tables)
                  .find((table) => table.name === newElementName.trim());
                if (existingTable) {
                  toast.error(
                    `Ein Tisch mit dem Namen "${newElementName.trim()}" existiert bereits`
                  );
                  return;
                }

                const table: Table = {
                  name: newElementName,
                  seats: [],
                  xposition: newTablePosition.x,
                  yposition: newTablePosition.y,
                  xlength: newTableSize.width,
                  ylength: newTableSize.height,
                  room: createMode.room.name, // This will be removed before sending to backend
                  selectable: newTableSelectable,
                };
                const updatedLayers = layers.map((layer) =>
                  layer.name === selectedLayerName
                    ? {
                        ...layer,
                        rooms: layer.rooms.map((room) =>
                          room.name === createMode.room!.name
                            ? { ...room, tables: [...room.tables, table] }
                            : room
                        ),
                      }
                    : layer
                );
                onLayersChangeWithHistory(updatedLayers);
                setNewElementName("");
                setNewTablePosition({ x: 100, y: 100 });
                setNewTableSize({ width: 80, height: 60 });
                setNewTableSelectable(true);
                setCreateMode({ type: null });
                toast.success("Tisch erfolgreich erstellt");
              } else if (createMode.type === "seat" && createMode.table) {
                const seat: Seat = {
                  id: crypto.randomUUID(),
                  price: newElementPrice,
                  xposition: newSeatPosition.x,
                  yposition: newSeatPosition.y,
                  xlength: 20,
                  ylength: 20,
                };
                const updatedLayers = layers.map((layer) =>
                  layer.name === selectedLayerName
                    ? {
                        ...layer,
                        rooms: layer.rooms.map((room) => ({
                          ...room,
                          tables: room.tables.map((table) =>
                            table.name === createMode.table!.name
                              ? { ...table, seats: [...table.seats, seat] }
                              : table
                          ),
                        })),
                      }
                    : layer
                );
                onLayersChangeWithHistory(updatedLayers);
                setNewElementName("");
                setNewSeatPosition({ x: 100, y: 100 }); // Reset after creation
                setCreateMode({ type: null });
                toast.success("Platz erfolgreich erstellt");
              } else if (createMode.type === "table") {
                toast.error(
                  "Bitte geben Sie einen Namen für den neuen Tisch ein"
                );
              } else if (createMode.type === "room") {
                toast.error(
                  "Bitte geben Sie einen Namen für den neuen Raum ein"
                );
              }
            }}
          >
            <div className="space-y-4">
              {createMode.type === "room" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="createElementName">Raum-Name</Label>
                    <Input
                      id="createElementName"
                      value={newElementName}
                      onChange={(e) => setNewElementName(e.target.value)}
                      placeholder="Raum-Namen eingeben"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="roomX"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        X-Position
                      </Label>
                      <Input
                        id="roomX"
                        type="number"
                        value={newRoomPosition.x}
                        onChange={(e) =>
                          setNewRoomPosition((prev) => ({
                            ...prev,
                            x: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="roomY"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        Y-Position
                      </Label>
                      <Input
                        id="roomY"
                        type="number"
                        value={newRoomPosition.y}
                        onChange={(e) =>
                          setNewRoomPosition((prev) => ({
                            ...prev,
                            y: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="roomWidth"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        Breite
                      </Label>
                      <Input
                        id="roomWidth"
                        type="number"
                        value={newRoomSize.width}
                        onChange={(e) =>
                          setNewRoomSize((prev) => ({
                            ...prev,
                            width: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="roomHeight"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        Höhe
                      </Label>
                      <Input
                        id="roomHeight"
                        type="number"
                        value={newRoomSize.height}
                        onChange={(e) =>
                          setNewRoomSize((prev) => ({
                            ...prev,
                            height: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </>
              )}
              {createMode.type === "table" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="createElementName">Name</Label>
                    <Input
                      id="createElementName"
                      value={newElementName}
                      onChange={(e) => setNewElementName(e.target.value)}
                      placeholder="Tisch-Namen eingeben"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="tableX"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        X-Position
                      </Label>
                      <Input
                        id="tableX"
                        type="number"
                        value={newTablePosition.x}
                        onChange={(e) =>
                          setNewTablePosition((prev) => ({
                            ...prev,
                            x: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="tableY"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        Y-Position
                      </Label>
                      <Input
                        id="tableY"
                        type="number"
                        value={newTablePosition.y}
                        onChange={(e) =>
                          setNewTablePosition((prev) => ({
                            ...prev,
                            y: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="tableWidth"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        Breite
                      </Label>
                      <Input
                        id="tableWidth"
                        type="number"
                        value={newTableSize.width}
                        onChange={(e) =>
                          setNewTableSize((prev) => ({
                            ...prev,
                            width: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="tableHeight"
                        className="text-xs text-gray-700 dark:text-gray-300 block text-center"
                      >
                        Höhe
                      </Label>
                      <Input
                        id="tableHeight"
                        type="number"
                        value={newTableSize.height}
                        onChange={(e) =>
                          setNewTableSize((prev) => ({
                            ...prev,
                            height: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="tableSelectable"
                      className="text-sm flex items-center gap-1"
                    >
                      Auswählbar
                      <span className="cursor-help relative group">
                        <Info className="w-3 h-3 text-gray-400" />
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {newTableSelectable
                            ? "Bei 'ausgewählbaren' Tischen ist nur der gesamte Tisch auswählbar"
                            : "Bei nicht ausgewählbaren Tischen sind nur die Plätze verfügbar"}
                        </span>
                      </span>
                    </Label>
                    <input
                      id="tableSelectable"
                      type="checkbox"
                      checked={newTableSelectable}
                      onChange={(e) => setNewTableSelectable(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                </>
              )}
              {createMode.type === "seat" && (
                <div className="space-y-1.5">
                  <Label htmlFor="createElementPrice">Preis (€)</Label>
                  <Input
                    id="createElementPrice"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]{0,2}"
                    value={priceInputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers, one decimal point, and max 2 decimal places
                      if (/^\d*\.?\d{0,2}$/.test(value)) {
                        setPriceInputValue(value);
                        setNewElementPrice(Number(value) || 0);
                      }
                      // If invalid, don't update anything (input stays the same)
                    }}
                    autoFocus
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                  onClick={() => {
                    setCreateMode({ type: null });
                    setNewElementName("");
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                >
                  {createMode.type === "room"
                    ? "Raum"
                    : createMode.type === "table"
                    ? "Tisch"
                    : "Platz"}{" "}
                  erstellen
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Layer Dialog */}
      <Dialog open={showLayerDialog} onOpenChange={setShowLayerDialog}>
        <DialogContent className="border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Neue Ebene erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Ebene (Stockwerk) für Ihre Veranstaltung.
              Sie können Räume, Tische und Sitzplätze zu dieser Ebene
              hinzufügen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="layerName">Name der Ebene</Label>
              <Input
                id="layerName"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="z.B. Erdgeschoss, 1. Stock, Balkon"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="layerLevel">Stufe (zur Sortierung)</Label>
              <Input
                id="layerLevel"
                type="number"
                value={newLayerLevel}
                onChange={(e) => setNewLayerLevel(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="layerPicture">Hintergrundbild</Label>
              <div className="space-y-2">
                {/* Image Upload Area */}
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() =>
                    document.getElementById("layerPictureFile")?.click()
                  }
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Ebenen-Vorschau"
                        className="max-h-32 mx-auto rounded"
                      />
                      <div className="flex justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            document
                              .getElementById("layerPictureFile")
                              ?.click();
                          }}
                          disabled={isUploadingImage}
                        >
                          {isUploadingImage
                            ? "Wird hochgeladen..."
                            : "Bild ändern"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage();
                          }}
                        >
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-gray-500 dark:text-gray-400">
                        <svg
                          className="mx-auto h-12 w-12"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className="mt-2">
                          {isUploadingImage
                            ? "Wird hochgeladen..."
                            : "Klicken zum Hochladen oder Bild hierher ziehen"}
                        </p>
                        <p className="text-xs">PNG, JPG, GIF bis zu 10MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  id="layerPictureFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Manual base64 input (fallback) */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <details>
                    <summary className="cursor-pointer">
                      Erweitert: Manuelle Base64-Eingabe
                    </summary>
                    <Input
                      value={newLayerPicture}
                      onChange={(e) => setNewLayerPicture(e.target.value)}
                      placeholder="Base64-kodierte Bilddaten hier einfügen"
                      className="mt-2"
                    />
                  </details>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optional: Fügen Sie ein Hintergrundbild für diese Ebene hinzu.
                Dies hilft Käufern, das Layout besser zu verstehen.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                onClick={() => {
                  setShowLayerDialog(false);
                  setNewLayerName("");
                  setNewLayerLevel(0);
                  setNewLayerPicture("");
                  setImagePreview("");
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateLayer}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Ebene erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Layer Picture Dialog */}
      <Dialog
        open={showEditPictureDialog}
        onOpenChange={setShowEditPictureDialog}
      >
        <DialogContent className="border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Ebenenbild bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie das Hintergrundbild für die Ebene "
              {selectedLayer?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editLayerPicture">Hintergrundbild</Label>
              <div className="space-y-2">
                {/* Image Upload Area */}
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() =>
                    document.getElementById("editLayerPictureFile")?.click()
                  }
                >
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Ebenen-Vorschau"
                        className="max-h-32 mx-auto rounded"
                      />
                      <div className="flex justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            document
                              .getElementById("editLayerPictureFile")
                              ?.click();
                          }}
                          disabled={isUploadingImage}
                        >
                          {isUploadingImage
                            ? "Wird hochgeladen..."
                            : "Bild ändern"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage();
                          }}
                        >
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-gray-500 dark:text-gray-400">
                        <svg
                          className="mx-auto h-12 w-12"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className="mt-2">
                          {isUploadingImage
                            ? "Wird hochgeladen..."
                            : "Klicken zum Hochladen oder Bild hierher ziehen"}
                        </p>
                        <p className="text-xs">PNG, JPG, GIF bis zu 10MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  id="editLayerPictureFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Manual base64 input (fallback) */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <details>
                    <summary className="cursor-pointer">
                      Erweitert: Manuelle Base64-Eingabe
                    </summary>
                    <Input
                      value={newLayerPicture}
                      onChange={(e) => setNewLayerPicture(e.target.value)}
                      placeholder="Base64-kodierte Bilddaten hier einfügen"
                      className="mt-2"
                    />
                  </details>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Dieses Bild wird als Hintergrund für die Ebenen-Leinwand
                angezeigt.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                onClick={() => {
                  setShowEditPictureDialog(false);
                  setNewLayerPicture("");
                  setImagePreview("");
                }}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleUpdateLayerPicture}
              >
                Bild aktualisieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Layer Dialog */}
      <Dialog
        open={renameLayerDialogOpen}
        onOpenChange={setRenameLayerDialogOpen}
      >
        <DialogContent className="border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Ebene umbenennen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="renameLayerInput">Neuer Name</Label>
              <Input
                id="renameLayerInput"
                value={newLayerNameForRename}
                onChange={(e) => setNewLayerNameForRename(e.target.value)}
                placeholder="Neuen Namen eingeben"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                onClick={() => setRenameLayerDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                onClick={handleRenameLayer}
              >
                Umbenennen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Canvas */}
      <Card>
        <CardContent className="p-4">
          <div ref={containerRef} className="w-full h-150 min-h-125">
            {selectedLayer ? (
              <canvas
                ref={canvasRef}
                className="border border-gray-300 cursor-grab active:cursor-grabbing w-full h-full"
                style={{
                  width: `${containerSize.width}px`,
                  height: `${containerSize.height}px`,
                }}
              />
            ) : (
              <div className="flex justify-center items-center h-full bg-gray-100 dark:bg-gray-700 rounded">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    Keine Ebene ausgewählt
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Wähle eine Ebene aus dem Dropdown oben aus oder erstelle
                    eine neue.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions and Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-center">Anleitung</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-4">
            {/* Basic Controls */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
              <h4 className="font-semibold text-xs mb-2 text-center">
                Grundsteuerung
              </h4>
              <div className="space-y-1">
                <p>
                  <strong>Auswahl:</strong> Linksklick auf einen Raum, Tisch
                  oder Platz
                </p>
                <p>
                  <strong>Raum erstellen:</strong> Rechtsklick auf leeren
                  Bereich
                </p>
                <p>
                  <strong>Verschieben:</strong> Linksklick und Ziehen auf leeren
                  Bereich
                </p>
                <p>
                  <strong>Zoom:</strong> Mausrad zum Vergrößern/Verkleinern
                  verwenden
                </p>
                <p>
                  <strong>Kontextmenü:</strong> Rechtsklick für weitere Optionen
                </p>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
              <h4 className="font-semibold text-xs mb-2 text-center">
                Tastaturkürzel
              </h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    Strg+S
                  </kbd>
                  <span className="text-xs">- Konfiguration speichern</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    Strg+Z
                  </kbd>
                  <span className="text-xs">- Rückgängig</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    Strg+Y
                  </kbd>
                  <span className="text-xs">- Wiederherstellen</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    M
                  </kbd>
                  <span className="text-xs">- Zieh-Modus umschalten</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    D
                  </kbd>
                  <span className="text-xs">
                    - Verschiebungsmodus aktivieren
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    S
                  </kbd>
                  <span className="text-xs">
                    - Größeänderungsmodus aktivieren
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    A
                  </kbd>
                  <span className="text-xs">- Tisch/Platz hinzufügen</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    R
                  </kbd>
                  <span className="text-xs">- Element umbenennen</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                    Esc
                  </kbd>
                  <span className="text-xs">- Modus abbrechen</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Object Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Objekteigenschaften</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            {canvasState.selectedElement ? (
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs text-gray-600 dark:text-gray-400">
                      Typ
                    </span>
                    <span className="text-xs font-semibold">
                      {"tables" in canvasState.selectedElement
                        ? "Raum"
                        : "seats" in canvasState.selectedElement
                        ? "Tisch"
                        : "Platz"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label
                        htmlFor="elementName"
                        className="text-xs text-gray-500 block text-center"
                      >
                        {"tables" in canvasState.selectedElement
                          ? "Name"
                          : "seats" in canvasState.selectedElement
                          ? "Name"
                          : "ID"}
                      </Label>
                      {"tables" in canvasState.selectedElement ||
                      "seats" in canvasState.selectedElement ? (
                        <Input
                          id="elementName"
                          value={propertyInputs.name}
                          onChange={(e) =>
                            setPropertyInputs((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            if (propertyInputs.name.trim()) {
                              updateElementName(
                                canvasState.selectedElement!,
                                propertyInputs.name.trim()
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              propertyInputs.name.trim()
                            ) {
                              updateElementName(
                                canvasState.selectedElement!,
                                propertyInputs.name.trim()
                              );
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      ) : (
                        <div className="h-7 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md flex items-center text-gray-600 dark:text-gray-400">
                          {propertyInputs.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Position
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor="posX"
                          className="text-xs text-gray-500 block text-center"
                        >
                          X
                        </Label>
                        <Input
                          id="posX"
                          type="number"
                          step="0.01"
                          value={propertyInputs.x}
                          onChange={(e) =>
                            setPropertyInputs((prev) => ({
                              ...prev,
                              x: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const newX = parseFloat(propertyInputs.x) || 0;
                            updateElementPosition(
                              canvasState.selectedElement!,
                              newX,
                              canvasState.selectedElement!.yposition
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newX = parseFloat(propertyInputs.x) || 0;
                              updateElementPosition(
                                canvasState.selectedElement!,
                                newX,
                                canvasState.selectedElement!.yposition
                              );
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="posY"
                          className="text-xs text-gray-500 block text-center"
                        >
                          Y
                        </Label>
                        <Input
                          id="posY"
                          type="number"
                          step="0.01"
                          value={propertyInputs.y}
                          onChange={(e) =>
                            setPropertyInputs((prev) => ({
                              ...prev,
                              y: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const newY = parseFloat(propertyInputs.y) || 0;
                            updateElementPosition(
                              canvasState.selectedElement!,
                              canvasState.selectedElement!.xposition,
                              newY
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newY = parseFloat(propertyInputs.y) || 0;
                              updateElementPosition(
                                canvasState.selectedElement!,
                                canvasState.selectedElement!.xposition,
                                newY
                              );
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Größe
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor="sizeW"
                          className="text-xs text-gray-500 block text-center"
                        >
                          Breite
                        </Label>
                        <Input
                          id="sizeW"
                          type="number"
                          step="0.01"
                          value={propertyInputs.width}
                          onChange={(e) =>
                            setPropertyInputs((prev) => ({
                              ...prev,
                              width: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const newWidth =
                              parseFloat(propertyInputs.width) || 0;
                            updateElementSize(
                              canvasState.selectedElement!,
                              newWidth - canvasState.selectedElement!.xlength,
                              0,
                              "e"
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newWidth =
                                parseFloat(propertyInputs.width) || 0;
                              updateElementSize(
                                canvasState.selectedElement!,
                                newWidth - canvasState.selectedElement!.xlength,
                                0,
                                "e"
                              );
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="sizeH"
                          className="text-xs text-gray-500 block text-center"
                        >
                          Höhe
                        </Label>
                        <Input
                          id="sizeH"
                          type="number"
                          step="0.01"
                          value={propertyInputs.height}
                          onChange={(e) =>
                            setPropertyInputs((prev) => ({
                              ...prev,
                              height: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const newHeight =
                              parseFloat(propertyInputs.height) || 0;
                            updateElementSize(
                              canvasState.selectedElement!,
                              0,
                              newHeight - canvasState.selectedElement!.ylength,
                              "s"
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newHeight =
                                parseFloat(propertyInputs.height) || 0;
                              updateElementSize(
                                canvasState.selectedElement!,
                                0,
                                newHeight -
                                  canvasState.selectedElement!.ylength,
                                "s"
                              );
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {"price" in canvasState.selectedElement && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Preis
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={propertyInputs.price}
                        onChange={(e) =>
                          setPropertyInputs((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                        onBlur={() => {
                          const newPrice =
                            parseFloat(propertyInputs.price) || 0;
                          const selectedSeat =
                            canvasState.selectedElement as Seat;
                          const updatedLayers = layers.map((layer) =>
                            layer.name === selectedLayerName
                              ? {
                                  ...layer,
                                  rooms: layer.rooms.map((room) => ({
                                    ...room,
                                    tables: room.tables.map((table) => ({
                                      ...table,
                                      seats: table.seats.map((seat) =>
                                        seat.id === selectedSeat.id
                                          ? { ...seat, price: newPrice }
                                          : seat
                                      ),
                                    })),
                                  })),
                                }
                              : layer
                          );
                          onLayersChangeWithHistory(updatedLayers);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const newPrice =
                              parseFloat(propertyInputs.price) || 0;
                            const selectedSeat =
                              canvasState.selectedElement as Seat;
                            const updatedLayers = layers.map((layer) =>
                              layer.name === selectedLayerName
                                ? {
                                    ...layer,
                                    rooms: layer.rooms.map((room) => ({
                                      ...room,
                                      tables: room.tables.map((table) => ({
                                        ...table,
                                        seats: table.seats.map((seat) =>
                                          seat.id === selectedSeat.id
                                            ? { ...seat, price: newPrice }
                                            : seat
                                        ),
                                      })),
                                    })),
                                  }
                                : layer
                            );
                            onLayersChangeWithHistory(updatedLayers);
                            e.currentTarget.blur();
                          }
                        }}
                        className="h-7 text-xs [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Eigenschaften
                  </div>
                  <div className="space-y-1">
                    {"selectable" in canvasState.selectedElement && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          Auswählbar
                          <span className="cursor-help relative group">
                            <Info className="w-3 h-3 text-gray-400" />
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {propertyInputs.selectable
                                ? "Bei 'ausgewählbaren' Tischen ist nur der gesamte Tisch auswählbar"
                                : "Bei nicht ausgewählbaren Tischen sind nur die Plätze verfügbar"}
                            </span>
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={propertyInputs.selectable}
                          onChange={(e) => {
                            setPropertyInputs((prev) => ({
                              ...prev,
                              selectable: e.target.checked,
                            }));
                            updateElementSelectable(
                              canvasState.selectedElement as Table,
                              e.target.checked
                            );
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                    )}
                    {"tables" in canvasState.selectedElement && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Tische</span>
                        <span className="text-xs font-medium">
                          {canvasState.selectedElement.tables.length}
                        </span>
                      </div>
                    )}
                    {"seats" in canvasState.selectedElement && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Plätze</span>
                        <span className="text-xs font-medium">
                          {canvasState.selectedElement.seats.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                  <Button
                    onClick={deleteSelectedElement}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {"tables" in canvasState.selectedElement
                      ? "Raum"
                      : "seats" in canvasState.selectedElement
                      ? "Tisch"
                      : "Platz"}{" "}
                    löschen
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Kein Objekt ausgewählt</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

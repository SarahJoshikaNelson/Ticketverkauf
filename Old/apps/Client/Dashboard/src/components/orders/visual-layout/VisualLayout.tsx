import { useRef, useEffect, useState, useCallback } from "react";
import { Room, Table, Seat } from "@ticket-system/models/order";
import { CanvasUtils } from "./utils/canvas-utils";
import { ZoomUtils } from "./utils/zoom-utils";
import { InteractionUtils } from "./utils/interaction-utils";
import { SelectionUtils } from "./utils/selection-utils";

interface VisualLayoutProps {
  rooms: Room[];
  selectedOrderSeats?: Seat[];
  onSeatClick?: (seat: Seat) => void;
  width?: number;
  height?: number;
  backgroundImage?: string;
}

interface CanvasState {
  zoomLevel: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  wasPanning: boolean;
  hoveredElement: Table | Seat | null;
  startX: number;
  startY: number;
}

export default function VisualLayout({
  rooms,
  selectedOrderSeats = [],
  onSeatClick,
  width = 800,
  height = 600,
  backgroundImage,
}: VisualLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: width,
    height: height,
  });
  const [cachedBackgroundImage, setCachedBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoomLevel: 0.8,
    panX: 0,
    panY: 0,
    isPanning: false,
    wasPanning: false,
    hoveredElement: null,
    startX: 0,
    startY: 0,
  });

  // Initialize utility classes
  const canvasUtils = useRef(new CanvasUtils());
  const zoomUtils = useRef(new ZoomUtils());
  const interactionUtils = useRef(new InteractionUtils());
  const selectionUtils = useRef(new SelectionUtils(interactionUtils.current));

  const getAllTables = useCallback((): Table[] => {
    return rooms.flatMap((room) => room.tables);
  }, [rooms]);

  const getAllSeats = useCallback((): Seat[] => {
    return rooms.flatMap((room) => room.tables.flatMap((table) => table.seats));
  }, [rooms]);

  // Load background image when backgroundImage prop changes
  useEffect(() => {
    if (backgroundImage) {
      // Check if the base64 string is too long (limit to 1MB)
      if (backgroundImage.length > 1000000) {
        setCachedBackgroundImage(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        setCachedBackgroundImage(img);
      };
      img.onerror = () => {
        setCachedBackgroundImage(null);
      };

      // Handle base64 data URLs properly
      if (backgroundImage.startsWith("data:")) {
        img.src = backgroundImage;
      } else if (
        backgroundImage.startsWith("iVBORw0KGgo") ||
        backgroundImage.startsWith("/9j/")
      ) {
        // Handle raw base64 strings by converting to proper data URL
        const mimeType = backgroundImage.startsWith("iVBORw0KGgo")
          ? "image/png"
          : "image/jpeg";
        img.src = `data:${mimeType};base64,${backgroundImage}`;
      } else {
        img.src = backgroundImage;
      }
    } else {
      setCachedBackgroundImage(null);
    }
  }, [backgroundImage]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: Math.max(rect.width, 400), // Min width 400px, use full width
          height: Math.max(rect.height, 500), // Min height 500px, use full height
        });
      }
    };

    // Initial size
    handleResize();

    // Add resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use responsive size
    const canvasWidth = containerSize.width;
    const canvasHeight = containerSize.height;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(canvasState.panX, canvasState.panY);
    ctx.scale(canvasState.zoomLevel, canvasState.zoomLevel);

    // Draw background image if available
    if (cachedBackgroundImage) {
      ctx.drawImage(cachedBackgroundImage, 0, 0);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (canvasState.zoomLevel < zoomUtils.current.roomsZoomThreshold) {
      canvasUtils.current.drawRooms(ctx, rooms);
    } else {
      const allTables = getAllTables();
      const allSeats = getAllSeats();
      // Draw seat lines first so they appear behind tables and seats
      canvasUtils.current.drawSeatLines(ctx, allTables);
      canvasUtils.current.drawTables(
        ctx,
        allTables,
        selectedOrderSeats,
        canvasState.hoveredElement,
        new Set(selectedOrderSeats.map((seat) => seat.id))
      );
      canvasUtils.current.drawRooms(ctx, rooms, false, true); // Show headers when zoomed in
    }

    ctx.restore();
  }, [
    rooms,
    canvasState,
    selectedOrderSeats,
    getAllTables,
    getAllSeats,
    cachedBackgroundImage,
  ]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "grabbing";
    }

    setCanvasState((prev) => ({
      ...prev,
      isPanning: true,
      wasPanning: false,
      startX: event.clientX - prev.panX,
      startY: event.clientY - prev.panY,
    }));
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (canvasState.isPanning) {
        setCanvasState((prev) => ({
          ...prev,
          panX: event.clientX - prev.startX,
          panY: event.clientY - prev.startY,
          wasPanning: true,
        }));
        return;
      }

      const { x, y } = interactionUtils.current.getMousePosition(
        event,
        canvas,
        canvasState.panX,
        canvasState.panY,
        canvasState.zoomLevel
      );

      const newHoveredElement = interactionUtils.current.findHoveredElement(
        x,
        y,
        getAllTables(),
        new Set(selectedOrderSeats.map((seat) => seat.id))
      );

      if (canvasState.hoveredElement !== newHoveredElement) {
        setCanvasState((prev) => ({
          ...prev,
          hoveredElement: newHoveredElement,
        }));

        // Change cursor based on hovered element
        if (newHoveredElement && "id" in newHoveredElement) {
          // Hovering over a seat - show pointer cursor
          canvas.style.cursor = "pointer";
        } else if (newHoveredElement) {
          // Hovering over a table - show default cursor
          canvas.style.cursor = "default";
        } else {
          // Not hovering over anything - show grab cursor for panning
          canvas.style.cursor = "grab";
        }
      }
    },
    [
      canvasState.isPanning,
      canvasState.startX,
      canvasState.startY,
      canvasState.panX,
      canvasState.panY,
      canvasState.zoomLevel,
      canvasState.hoveredElement,
      getAllTables,
      selectedOrderSeats,
      containerSize,
    ]
  );

  const findClickedSeat = useCallback(
    (x: number, y: number, allTables: Table[]): Seat | null => {
      for (const table of allTables) {
        if (table.seats) {
          for (const seat of table.seats) {
            if (interactionUtils.current.isPointInRect(x, y, seat)) {
              return seat;
            }
          }
        }
      }

      return null;
    },
    []
  );

  const handleSeatClick = useCallback(
    (x: number, y: number, allTables: Table[]) => {
      // Find clicked seat
      const clickedSeat = findClickedSeat(x, y, allTables);

      if (!clickedSeat) {
        return;
      }

      // Call the onSeatClick callback to select the order
      if (onSeatClick) {
        onSeatClick(clickedSeat);
      }
    },
    [onSeatClick, findClickedSeat]
  );

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      if (canvasState.isPanning || canvasState.wasPanning) {
        setCanvasState((prev) => ({
          ...prev,
          wasPanning: false,
        }));
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = interactionUtils.current.getMousePosition(
        event,
        canvas,
        canvasState.panX,
        canvasState.panY,
        canvasState.zoomLevel
      );

      if (canvasState.zoomLevel < zoomUtils.current.roomsZoomThreshold) {
        selectionUtils.current.handleRoomSelection(
          x,
          y,
          rooms,
          canvas,
          zoomUtils.current.roomZoom,
          (targetX, targetY, targetZoom) => {
            zoomUtils.current.animateZoom(
              targetX,
              targetY,
              targetZoom,
              canvasState.zoomLevel,
              canvasState.panX,
              canvasState.panY,
              canvas,
              (zoom, panX, panY) => {
                setCanvasState((prev) => ({
                  ...prev,
                  zoomLevel: zoom,
                  panX: panX,
                  panY: panY,
                }));
              }
            );
          }
        );
      } else {
        const allTables = getAllTables();
        handleSeatClick(x, y, allTables);
      }
    },
    [
      canvasState.isPanning,
      canvasState.wasPanning,
      canvasState.zoomLevel,
      canvasState.panX,
      canvasState.panY,
      rooms,
      getAllTables,
      handleSeatClick,
    ]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (canvasState.isPanning) {
        setCanvasState((prev) => ({
          ...prev,
          isPanning: false,
        }));
        return;
      }

      setCanvasState((prev) => ({
        ...prev,
        wasPanning: false,
      }));
    },
    [canvasState.isPanning]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const result =
        event.deltaY < 0
          ? zoomUtils.current.zoomIn(
              event.clientX,
              event.clientY,
              canvasState.zoomLevel,
              canvasState.panX,
              canvasState.panY,
              canvasRef.current!
            )
          : zoomUtils.current.zoomOut(
              event.clientX,
              event.clientY,
              canvasState.zoomLevel,
              canvasState.panX,
              canvasState.panY,
              canvasRef.current!
            );

      setCanvasState((prev) => ({
        ...prev,
        zoomLevel: result.zoomLevel,
        panX: result.panX,
        panY: result.panY,
      }));
    },
    [canvasState.zoomLevel, canvasState.panX, canvasState.panY]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);
    canvas.addEventListener("click", handleCanvasClick); // Add separate click event listener

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("click", handleCanvasClick);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleCanvasClick,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[600px] min-h-[500px] overflow-hidden max-w-full"
    >
      <canvas
        ref={canvasRef}
        className="border border-gray-300 cursor-grab active:cursor-grabbing w-full h-full max-w-full"
        style={{
          width: `${containerSize.width}px`,
          height: `${containerSize.height}px`,
          maxWidth: "100%",
        }}
      />
    </div>
  );
}

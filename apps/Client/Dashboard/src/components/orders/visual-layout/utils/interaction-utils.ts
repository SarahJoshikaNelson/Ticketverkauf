import { Table, Seat } from '@ticket-system/models/order';

interface Rect {
  xposition: number;
  yposition: number;
  xlength: number;
  ylength: number;
}

export class InteractionUtils {
  private hasTakenSeats(table: Table, selectedSeatIds: Set<string> = new Set()): boolean {
    return table.seats.some(seat => selectedSeatIds.has(seat.id) || seat.taken);
  }

  isPointInRect(x: number, y: number, rect: Rect): boolean {
    // Handle both camelCase and snake_case property names
    const xPos = rect.xposition || (rect as any).xPosition || 0;
    const yPos = rect.yposition || (rect as any).yPosition || 0;
    const xLen = rect.xlength || (rect as any).xLength || 0;
    const yLen = rect.ylength || (rect as any).yLength || 0;

    return (
      x >= xPos &&
      x <= xPos + xLen &&
      y >= yPos &&
      y <= yPos + yLen
    );
  }

  getMousePosition(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    panX: number,
    panY: number,
    zoomLevel: number
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - panX) / zoomLevel,
      y: (event.clientY - rect.top - panY) / zoomLevel,
    };
  }

  findHoveredElement(
    x: number,
    y: number,
    tables: Table[],
    selectedSeatIds: Set<string> = new Set()
  ): Table | Seat | null {
    // First check for seats (higher priority)
    for (const table of tables) {
      const hoveredSeat = table.seats.find((seat) =>
        this.isPointInRect(x, y, seat)
      );
      if (hoveredSeat) {
        // Return seat for hover effect (no selection logic)
        return hoveredSeat;
      }
    }

    // Then check for tables
    const hoveredTable = tables.find((table) =>
      this.isPointInRect(x, y, table)
    );

    if (hoveredTable) {
      // Return table for hover effect (no selection logic)
      return hoveredTable;
    }

    return null;
  }
}

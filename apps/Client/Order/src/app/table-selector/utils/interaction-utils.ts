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
    return (
      x >= rect.xposition &&
      x <= rect.xposition + rect.xlength &&
      y >= rect.yposition &&
      y <= rect.yposition + rect.ylength
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
        // Only return seat if it's selectable (not taken, not selected by others, and on unselectable table)
        const isSelectable = !hoveredSeat.taken && !selectedSeatIds.has(hoveredSeat.id) && !table.selectable;
        if (isSelectable) {
          return hoveredSeat;
        }
      }
    }

    // Then check for tables
    const hoveredTable = tables.find((table) =>
      this.isPointInRect(x, y, table)
    );

    if (hoveredTable) {
      // Only return table if it's selectable and has available seats
      const isTableSelectable = hoveredTable.selectable;
      const hasAvailableSeats = hoveredTable.seats.some(seat => !selectedSeatIds.has(seat.id) && !seat.taken);

      if (isTableSelectable && hasAvailableSeats) {
        return hoveredTable;
      }
    }

    return null;
  }
} 
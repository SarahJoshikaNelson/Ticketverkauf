import { Room, Table, Seat } from '@ticket-system/models/order';

const COLORS = {
  TABLE_SELECTABLE: '#6b7280', // Gray for all tables
  TABLE_UNSELECTABLE: '#6b7280', // Gray for all tables
  TABLE_SELECTED: '#6b7280', // Gray for all tables
  TABLE_HOVERED: '#6b7280', // Gray for all tables
  SEAT_SELECTABLE: '#ef4444', // Red for available seats
  SEAT_UNSELECTABLE: '#ef4444', // Red for available seats
  SEAT_SELECTABLE_TABLE: '#ef4444', // Red for available seats
  SEAT_TAKEN: '#57dcff', // Green for bought seats
  SEAT_SELECTED: '#30b34a', // Dark green for selected order seats
  SEAT_HOVERED: '#ef4444', // Red for hovered available seats
  SEAT_LINE: 'gray',
  ROOM_FILL: 'rgba(0, 0, 255, 0.3)',
  ROOM_STROKE: 'blue',
  ROOM_TEXT: 'white',
  TABLE_TEXT: 'white'
};

export class CanvasUtils {
  // Color definitions using shared constants
  private readonly ROOM_FILL_COLOR = COLORS.ROOM_FILL;
  private readonly ROOM_STROKE_COLOR = COLORS.ROOM_STROKE;
  private readonly ROOM_TEXT_COLOR = COLORS.ROOM_TEXT;
  private readonly TABLE_SELECTABLE_COLOR = COLORS.TABLE_SELECTABLE;
  private readonly TABLE_UNSELECTABLE_COLOR = COLORS.TABLE_UNSELECTABLE;
  private readonly TABLE_SELECTED_COLOR = COLORS.TABLE_SELECTED;
  private readonly TABLE_HOVERED_COLOR = COLORS.TABLE_HOVERED;
  private readonly TABLE_TEXT_COLOR = COLORS.TABLE_TEXT;
  private readonly SEAT_SELECTABLE_COLOR = COLORS.SEAT_SELECTABLE;
  private readonly SEAT_UNSELECTABLE_COLOR = COLORS.SEAT_UNSELECTABLE;
  private readonly SEAT_SELECTABLE_TABLE_COLOR = COLORS.SEAT_SELECTABLE_TABLE;
  private readonly SEAT_TAKEN_COLOR = COLORS.SEAT_TAKEN;
  private readonly SEAT_SELECTED_COLOR = COLORS.SEAT_SELECTED;
  private readonly SEAT_HOVERED_COLOR = COLORS.SEAT_HOVERED;
  private readonly SEAT_LINE_COLOR = COLORS.SEAT_LINE;

  private colorCache: { [className: string]: string } = {};

  getTailwindColor(className: string): string {
    if (this.colorCache[className]) {
      return this.colorCache[className];
    }
    const element = document.createElement('div');
    element.className = className;
    document.body.appendChild(element);
    const color = getComputedStyle(element).backgroundColor;
    document.body.removeChild(element);

    this.colorCache[className] = color;
    return color;
  }

  /**
   * Calculate the brightness of a color (0-255)
   * Higher values mean lighter colors
   */
  private getColorBrightness(color: string): number {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    }
    
    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        return (r * 299 + g * 587 + b * 114) / 1000;
      }
    }
    
    // Default to white text for unknown formats
    return 0;
  }

  /**
   * Get appropriate text color (black or white) based on background brightness
   */
  private getTextColor(backgroundColor: string): string {
    const brightness = this.getColorBrightness(backgroundColor);
    return brightness > 128 ? 'black' : 'white';
  }

  /**
   * Lighten a color by a given amount (0-1)
   */
  private lightenColor(color: string, amount: number): string {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * amount));
      const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * amount));
      const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * amount));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = Math.min(255, parseInt(matches[0]) + Math.round(255 * amount));
        const g = Math.min(255, parseInt(matches[1]) + Math.round(255 * amount));
        const b = Math.min(255, parseInt(matches[2]) + Math.round(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
      }
    }

    // Return original color if we can't parse it
    return color;
  }

  drawRooms(ctx: CanvasRenderingContext2D, rooms: Room[], drawFill: boolean = true, showHeaders: boolean = false) {
    rooms.forEach((room) => {
      // Handle both camelCase and snake_case property names
      const xPos = room.xposition || (room as any).xPosition || 0;
      const yPos = room.yposition || (room as any).yPosition || 0;
      const xLen = room.xlength || (room as any).xLength || 100;
      const yLen = room.ylength || (room as any).yLength || 100;

      if (drawFill) {
        ctx.fillStyle = this.ROOM_FILL_COLOR;
        ctx.fillRect(xPos, yPos, xLen, yLen);
        ctx.fillStyle = this.ROOM_TEXT_COLOR;
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          room.name,
          xPos + xLen / 2,
          yPos + yLen / 2
        );
      }

      // Draw room headers when zoomed in
      if (showHeaders) {
        this.drawRoomHeader(ctx, room.name, xPos, yPos, xLen);
      }

      // Always draw the border
      ctx.strokeStyle = this.ROOM_STROKE_COLOR;
      ctx.lineWidth = 2; // Make the border more visible
      ctx.strokeRect(xPos, yPos, xLen, yLen);
      ctx.lineWidth = 1; // Reset line width
    });
  }

  private drawRoomHeader(ctx: CanvasRenderingContext2D, roomName: string, xPos: number, yPos: number, xLen: number) {
    // Render room name inside the canvas at the room's top-left corner without background
    ctx.fillStyle = this.ROOM_TEXT_COLOR;
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(roomName, xPos + 6, yPos + 6);
  }

  drawTables(
    ctx: CanvasRenderingContext2D,
    tables: Table[],
    selectedSeats: Seat[],
    hoveredElement: Table | Seat | null,
    selectedSeatIds: Set<string> = new Set()
  ) {
    tables.forEach((table) => {
      // Handle both camelCase and snake_case property names
      const xPos = table.xposition || (table as any).xPosition || 0;
      const yPos = table.yposition || (table as any).yPosition || 0;
      const xLen = table.xlength || (table as any).xLength || 100;
      const yLen = table.ylength || (table as any).yLength || 100;

      // All tables are gray
      ctx.fillStyle = this.TABLE_SELECTABLE_COLOR;

      // Draw the table
      ctx.fillRect(xPos, yPos, xLen, yLen);

      // Draw the table name with dynamic text color
      ctx.fillStyle = this.getTextColor(this.TABLE_SELECTABLE_COLOR);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        table.name,
        xPos + xLen / 2,
        yPos + yLen / 2
      );

      // Draw the seats
      if (table.seats) {
        this.drawSeats(ctx, table.seats, selectedSeats, hoveredElement, selectedSeatIds, table);
      }
    });
  }

  drawSeats(
    ctx: CanvasRenderingContext2D,
    allSeats: Seat[],
    selectedSeats: Seat[],
    hoveredElement: Table | Seat | null,
    selectedSeatIds: Set<string> = new Set(),
    table?: Table
  ) {
    allSeats.forEach((seat) => {
      // Handle both camelCase and snake_case property names
      const seatXPos = seat.xposition || (seat as any).xPosition || 0;
      const seatYPos = seat.yposition || (seat as any).yPosition || 0;
      const seatXLen = seat.xlength || (seat as any).xLength || 20;
      const seatYLen = seat.ylength || (seat as any).yLength || 20;

      // Check if this seat is in the currently selected order
      const isInSelectedOrder = selectedSeats.some(selectedSeat => selectedSeat.id === seat.id);
      // Check if this seat is taken (already booked)
      const isTaken = seat.taken || (seat as any).isTaken?.() || false;

      // Check if this seat is being hovered
      const isHovered = hoveredElement && 'id' in hoveredElement && hoveredElement.id === seat.id;

      // Determine the seat color based on its state
      if (isInSelectedOrder) {
        // Dark green for seats in the currently selected order
        ctx.fillStyle = this.SEAT_SELECTED_COLOR;
      } else if (isTaken) {
        // Light blue for bought seats
        ctx.fillStyle = this.SEAT_TAKEN_COLOR;
      } else {
        // Red for available seats
        ctx.fillStyle = this.SEAT_SELECTABLE_COLOR;
      }

      // Apply hover effect (slightly lighter color)
      if (isHovered) {
        // Make the color slightly lighter for hover effect
        const currentColor = ctx.fillStyle;
        ctx.fillStyle = this.lightenColor(currentColor, 0.2);
      }

      // Store the background color for text color calculation
      const seatBackgroundColor = ctx.fillStyle;

      // Draw the seat rectangle
      ctx.fillRect(seatXPos, seatYPos, seatXLen, seatYLen);

      // Draw seat border only for selected order seats
      if (isInSelectedOrder) {
        ctx.strokeStyle = this.getTextColor(seatBackgroundColor);
        ctx.lineWidth = 2;
        ctx.strokeRect(seatXPos, seatYPos, seatXLen, seatYLen);
      }

      // Draw seat price with dynamic text color
      ctx.fillStyle = this.getTextColor(seatBackgroundColor);
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `€${seat.price}`,
        seatXPos + seatXLen / 2,
        seatYPos + seatYLen / 2
      );
    });
  }

  drawSeatLines(ctx: CanvasRenderingContext2D, tables: Table[]) {
    tables.forEach((table) => {
      const xPos = table.xposition || (table as any).xPosition || 0;
      const yPos = table.yposition || (table as any).yPosition || 0;
      const xLen = table.xlength || (table as any).xLength || 100;
      const yLen = table.ylength || (table as any).yLength || 100;

      if (table.seats) {
        table.seats.forEach((seat) => {
          const seatXPos = seat.xposition || (seat as any).xPosition || 0;
          const seatYPos = seat.yposition || (seat as any).yPosition || 0;
          const seatXLen = seat.xlength || (seat as any).xLength || 20;
          const seatYLen = seat.ylength || (seat as any).yLength || 20;

          const tableCenterX = xPos + xLen / 2;
          const tableCenterY = yPos + yLen / 2;
          const seatCenterX = seatXPos + seatXLen / 2;
          const seatCenterY = seatYPos + seatYLen / 2;

          ctx.strokeStyle = this.SEAT_LINE_COLOR;
          ctx.beginPath();
          ctx.moveTo(tableCenterX, tableCenterY);
          ctx.lineTo(seatCenterX, seatCenterY);
          ctx.stroke();
        });
      }
    });
  }
}

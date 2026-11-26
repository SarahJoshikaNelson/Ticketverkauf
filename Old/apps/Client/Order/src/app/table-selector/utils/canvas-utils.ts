import { Room, Table, Seat } from '@ticket-system/models/order';
import { COLORS } from '../colors';

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

  drawRooms(ctx: CanvasRenderingContext2D, rooms: Room[], drawFill: boolean = true) {
    rooms.forEach((room) => {
      if (drawFill) {
        ctx.fillStyle = this.ROOM_FILL_COLOR;
        ctx.fillRect(room.xposition, room.yposition, room.xlength, room.ylength);
        ctx.fillStyle = this.ROOM_TEXT_COLOR;
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          room.name,
          room.xposition + room.xlength / 2,
          room.yposition + room.ylength / 2
        );
      }
      // Always draw the border
      ctx.strokeStyle = this.ROOM_STROKE_COLOR;
      ctx.lineWidth = 2; // Make the border more visible
      ctx.strokeRect(
        room.xposition,
        room.yposition,
        room.xlength,
        room.ylength
      );
      ctx.lineWidth = 1; // Reset line width
    });
  }

  drawTables(
    ctx: CanvasRenderingContext2D,
    tables: Table[],
    selectedSeats: Seat[],
    hoveredElement: Table | Seat | null,
    selectedSeatIds: Set<string> = new Set()
  ) {
    tables.forEach((table) => {
      // Check if table has any selected seats by current user
      const hasSelectedSeats = table.seats.some(seat => selectedSeats.some(selectedSeat => selectedSeat.id === seat.id));
      
      // Check if all seats in table are already selected (by anyone)
      const allSeatsSelected = table.seats.length > 0 && table.seats.every(seat => selectedSeatIds.has(seat.id) || seat.taken);

      // Determine the table color based on its state
      if (hasSelectedSeats) {
        // If the table has seats selected by current user, it should be green (highest priority)
        ctx.fillStyle = this.TABLE_SELECTED_COLOR;
      } else if (allSeatsSelected) {
        // If all seats are selected or taken (but not by current user), show as gray
        ctx.fillStyle = this.TABLE_UNSELECTABLE_COLOR;
      } else if (hoveredElement === table) {
        // If the table is being hovered, show hover color
        ctx.fillStyle = this.TABLE_HOVERED_COLOR;
      } else if (!table.selectable) {
        // If the table is not selectable, show gray
        ctx.fillStyle = this.TABLE_UNSELECTABLE_COLOR;
      } else {
        // Default color for selectable tables - dark blue
        ctx.fillStyle = this.TABLE_SELECTABLE_COLOR;
      }

      // Store the background color for text and border color calculation
      const currentFillStyle = ctx.fillStyle;

      // Draw the table
      ctx.fillRect(
        table.xposition,
        table.yposition,
        table.xlength,
        table.ylength
      );

      // Draw border for selectable tables using dynamic text color
      if (table.selectable) {
        ctx.strokeStyle = this.getTextColor(currentFillStyle);
        ctx.lineWidth = 2;
        ctx.strokeRect(
          table.xposition,
          table.yposition,
          table.xlength,
          table.ylength
        );
      }

      // Draw the table name with dynamic text color
      ctx.fillStyle = this.getTextColor(currentFillStyle);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        table.name,
        table.xposition + table.xlength / 2,
        table.yposition + table.ylength / 2
      );

      // Draw the seats
      this.drawSeats(ctx, table.seats, selectedSeats, hoveredElement, selectedSeatIds, table);
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
      // Check if this seat is selected by current user
      const isSelectedByUser = selectedSeats.some(selectedSeat => selectedSeat.id === seat.id);
      // Check if this seat is selected by other users (regardless of current user selection)
      const isSelectedByOthers = selectedSeatIds.has(seat.id);
      // Check if this seat is taken (already booked)
      const isTaken = seat.taken;
      const isHovered = hoveredElement === seat;

      // Determine the seat color based on its state
      if (isTaken) {
        ctx.fillStyle = this.SEAT_TAKEN_COLOR;
      } else if (isSelectedByUser) {
        ctx.fillStyle = this.SEAT_SELECTED_COLOR;
      } else if (isSelectedByOthers) {
        ctx.fillStyle = this.SEAT_TAKEN_COLOR;
      } else if (isHovered) {
        ctx.fillStyle = this.SEAT_HOVERED_COLOR;
      } else {
        // Check if seat is selectable (not taken and not selected by others)
        const isSelectable = !isTaken && !isSelectedByOthers;
        
        if (isSelectable && table && !table.selectable) {
          // If seat is selectable AND on an unselectable table, use dark blue
          ctx.fillStyle = this.SEAT_SELECTABLE_COLOR;
        } else {
          // If seat is not selectable OR on a selectable table, color depends on table selectability
          if (table && table.selectable) {
            // Seats on selectable tables get light gray (regardless of seat availability)
            ctx.fillStyle = this.SEAT_SELECTABLE_TABLE_COLOR;
          } else {
            // Seats on unselectable tables get dark gray
            ctx.fillStyle = this.SEAT_UNSELECTABLE_COLOR;
          }
        }
      }

      // Store the background color for text color calculation
      const seatBackgroundColor = ctx.fillStyle;

      // Draw the seat rectangle
      ctx.fillRect(seat.xposition, seat.yposition, seat.xlength, seat.ylength);

      // Draw seat border only for selectable seats using dynamic text color
      const isSeatSelectable = !isTaken && !isSelectedByOthers && table && !table.selectable;
      if (isSeatSelectable) {
        ctx.strokeStyle = this.getTextColor(seatBackgroundColor);
        ctx.lineWidth = 1;
        ctx.strokeRect(seat.xposition, seat.yposition, seat.xlength, seat.ylength);
      }

      // Draw seat price with dynamic text color
      ctx.fillStyle = this.getTextColor(seatBackgroundColor);
      ctx.font = '10px Arial'; // Reduced from 12px to 10px
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `€${seat.price}`,
        seat.xposition + seat.xlength / 2,
        seat.yposition + seat.ylength / 2
      );
    });
  }

  drawSeatLines(ctx: CanvasRenderingContext2D, tables: Table[]) {
    tables.forEach((table) => {
      table.seats.forEach((seat) => {
        const tableCenterX = table.xposition + table.xlength / 2;
        const tableCenterY = table.yposition + table.ylength / 2;
        const seatCenterX = seat.xposition + seat.xlength / 2;
        const seatCenterY = seat.yposition + seat.ylength / 2;

        ctx.strokeStyle = this.SEAT_LINE_COLOR;
        ctx.beginPath();
        ctx.moveTo(tableCenterX, tableCenterY);
        ctx.lineTo(seatCenterX, seatCenterY);
        ctx.stroke();
      });
    });
  }
} 
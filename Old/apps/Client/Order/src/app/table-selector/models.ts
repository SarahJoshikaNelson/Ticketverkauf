import { Seat, Table, Room } from '@ticket-system/models/order';
import { Order } from '@ticket-system/models/order';

export class RoomModel implements Room {
  constructor(
    public name: string,
    public tables: TableModel[],
    public xposition: number,
    public yposition: number,
    public xlength: number,
    public ylength: number,
    public layer: string = '' // layer name reference
  ) {}
}

export class TableModel implements Table {
  constructor(
    public name: string,
    public room: string, // room name reference
    public selectable: boolean,
    public seats: SeatModel[],
    public xposition: number,
    public yposition: number,
    public xlength: number,
    public ylength: number,
    public selected: boolean = false
  ) {}

  /**
   * Calculate total price for all seats at this table
   */
  getTotalPrice(): number {
    return this.seats.reduce((total, seat) => total + seat.price, 0);
  }

  /**
   * Get number of seats at this table
   */
  getSeatCount(): number {
    return this.seats.length;
  }
}

export class SeatModel implements Seat {
  constructor(
    public id: string,
    public price: number,
    public xposition: number,
    public yposition: number,
    public xlength: number,
    public ylength: number,
    public table?: string | undefined, // table name reference
    public order?: string | undefined,  // order reference (optional)
    public taken?: boolean | undefined  // indicates if seat is already booked
  ) {}

  /**
   * Check if this seat is available (not selected by others and not taken)
   */
  isAvailable(selectedSeatIds: Set<string>): boolean {
    return !selectedSeatIds.has(this.id) && !this.taken;
  }

  /**
   * Check if this seat is selected by current user
   */
  isSelectedByUser(userSelectedSeatIds: Set<string>): boolean {
    return userSelectedSeatIds.has(this.id);
  }
} 
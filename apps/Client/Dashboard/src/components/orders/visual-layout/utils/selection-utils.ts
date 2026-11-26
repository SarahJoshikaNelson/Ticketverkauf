import { Room, Table, Seat } from '@ticket-system/models/order';
import { InteractionUtils } from './interaction-utils';

export class SelectionUtils {
  constructor(private interactionUtils: InteractionUtils) {}

  handleRoomSelection(
    x: number,
    y: number,
    rooms: Room[],
    canvas: HTMLCanvasElement,
    roomZoom: number,
    onZoom: (targetX: number, targetY: number, targetZoom: number) => void
  ): boolean {
    const clickedRoom = rooms.find((room) =>
      this.interactionUtils.isPointInRect(x, y, room)
    );
    if (clickedRoom) {
      const xPos = clickedRoom.xposition || (clickedRoom as any).xPosition || 0;
      const yPos = clickedRoom.yposition || (clickedRoom as any).yPosition || 0;
      const xLen = clickedRoom.xlength || (clickedRoom as any).xLength || 100;
      const yLen = clickedRoom.ylength || (clickedRoom as any).yLength || 100;

      const roomCenterX = xPos + xLen / 2;
      const roomCenterY = yPos + yLen / 2;

      // Calculate the zoom needed to fit the room, but ensure we zoom enough to see tables/seats
      const fitZoom = Math.min(
        (canvas.width / xLen) * roomZoom,
        (canvas.height / yLen) * roomZoom
      );
      
      // If the calculated zoom is below the threshold for table/seat view, zoom to that threshold
      const roomsZoomThreshold = 0.5; // Same as in zoom-utils.ts
      const targetRoomZoom = Math.max(fitZoom, roomsZoomThreshold);
      onZoom(roomCenterX, roomCenterY, targetRoomZoom);
      return true;
    }
    return false;
  }

  private hasTakenSeats(table: Table): boolean {
    return table.seats.some(seat => seat.order !== undefined && seat.order !== null);
  }

  private hasTakenSeatsNotSelected(table: Table, selectedTables: Table[]): boolean {
    const isSelected = selectedTables.some(t => t.name === table.name);
    return this.hasTakenSeats(table) && !isSelected;
  }

  handleTableSelection(
    x: number,
    y: number,
    tables: Table[],
    selectedTables: Table[],
    onSelectionChange: (tables: Table[]) => void
  ): boolean {
    const clickedTable = tables.find((table) =>
      this.interactionUtils.isPointInRect(x, y, table)
    );
    if (clickedTable && clickedTable.selectable) {
      // Check if the table is already in our selection
      const isSelected = selectedTables.some(t => t.name === clickedTable.name);
      
      // If the table has taken seats and is not already selected, don't allow selection
      if (this.hasTakenSeatsNotSelected(clickedTable, selectedTables)) {
        return false;
      }
      
      if (isSelected) {
        // When unselecting, first send the unselection message to the backend
        const tableToUnselect = { ...clickedTable, seats: [] };
        onSelectionChange([tableToUnselect]);
        
        // Then update the local state by removing the table from selection
        const newSelectedTables = selectedTables.filter(t => t.name !== clickedTable.name);
        onSelectionChange(newSelectedTables);
      } else {
        // When selecting, add the table with all its seats
        const newSelectedTables = [...selectedTables, clickedTable];
        onSelectionChange(newSelectedTables);
      }
      return true;
    }
    return false;
  }

  handleSeatSelection(
    x: number,
    y: number,
    tables: Table[],
    selectedTables: Table[],
    onSelectionChange: (tables: Table[]) => void
  ): boolean {
    let clickedSeat: Seat | null = null;
    let parentTable: Table | null = null;

    for (const table of tables) {
      if (!table.selectable && Array.isArray(table.seats)) {
        const seat = table.seats.find((seat) =>
          this.interactionUtils.isPointInRect(x, y, seat)
        );
        if (seat) {
          clickedSeat = seat;
          parentTable = table;
          break;
        }
      }
    }

    if (clickedSeat && parentTable) {
      const newSelectedTables = [...selectedTables];
      let selectedTable = newSelectedTables.find(
        (t) => t.name === parentTable!.name
      );

      if (!selectedTable) {
        // If table not in selection, add it with just this seat
        selectedTable = { ...parentTable, seats: [clickedSeat] };
        newSelectedTables.push(selectedTable);
      } else {
        // If table is in selection, check if seat is selected
        const seatIndex = selectedTable.seats.findIndex(
          (s) => s.id === clickedSeat!.id
        );
        if (seatIndex > -1) {
          // Seat is selected, unselect it
          selectedTable.seats.splice(seatIndex, 1);
          // If no seats left, remove the table from selection
          if (selectedTable.seats.length === 0) {
            const tableIndex = newSelectedTables.findIndex(
              (t) => t.name === selectedTable!.name
            );
            newSelectedTables.splice(tableIndex, 1);
          }
        } else {
          // Seat is not selected, add it
          selectedTable.seats.push(clickedSeat);
        }
      }

      onSelectionChange(newSelectedTables);
      return true;
    }
    return false;
  }
}

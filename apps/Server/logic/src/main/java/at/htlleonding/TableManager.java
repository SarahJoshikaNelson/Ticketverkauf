package at.htlleonding;

import at.htlleonding.repositories.LayerRepo;
import at.htlleonding.repositories.RoomRepo;
import at.htlleonding.repositories.SeatRepo;
import at.htlleonding.repositories.TableRepo;
import at.htlleonding.types.Layer;
import at.htlleonding.types.Room;
import at.htlleonding.types.Seat;
import at.htlleonding.types.Table;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class TableManager {
    private TableRepo tableRepo;
    private RoomRepo roomRepo;
    private SeatRepo seatRepo;
    private LayerRepo layerRepo;
    
    public List<Room> getRooms() {
        return roomRepo.listAll();
    }

    public List<Layer> getLayers() {
        return layerRepo.listAll();
    }

    public List<Table> getTablesFromRoom(String roomId) {
        Room room = roomRepo.find("name", roomId).singleResultOptional()
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
        return tableRepo.find("room", room).list();
    }

    @jakarta.transaction.Transactional
    public boolean updateAllRooms(List<Room> rooms) {
        try {
            // Get all existing rooms from database
            List<Room> existingRooms = roomRepo.listAll();
            
            // Create sets of room names, table names, and seat IDs from frontend data
            Set<String> frontendRoomNames = new java.util.HashSet<>();
            Set<String> frontendTableNames = new java.util.HashSet<>();
            Set<java.util.UUID> frontendSeatIds = new java.util.HashSet<>();
            
            for (Room room : rooms) {
                frontendRoomNames.add(room.getName());
                if (room.getTables() != null) {
                    for (Table table : room.getTables()) {
                        frontendTableNames.add(table.getName());
                        if (table.getSeats() != null) {
                            for (Seat seat : table.getSeats()) {
                                frontendSeatIds.add(seat.getId());
                            }
                        }
                    }
                }
            }
            
            // Delete in proper order: seats first, then tables, then rooms
            // This prevents Hibernate transient object exceptions
            
            // First, identify rooms that will be deleted
            java.util.Set<String> roomsToDelete = new java.util.HashSet<>();
            for (Room existingRoom : existingRooms) {
                if (!frontendRoomNames.contains(existingRoom.getName())) {
                    roomsToDelete.add(existingRoom.getName());
                }
            }
            
            // Delete seats from tables that belong to rooms being deleted
            List<Seat> allExistingSeats = seatRepo.listAll();
            for (Seat existingSeat : allExistingSeats) {
                if (roomsToDelete.contains(existingSeat.getTable().getRoom().getName()) || 
                    !frontendSeatIds.contains(existingSeat.getId())) {
                    seatRepo.delete(existingSeat);
                }
            }
            
            // Delete tables from rooms being deleted or tables not in frontend
            List<Table> allExistingTables = tableRepo.listAll();
            for (Table existingTable : allExistingTables) {
                if (roomsToDelete.contains(existingTable.getRoom().getName()) || 
                    !frontendTableNames.contains(existingTable.getName())) {
                    tableRepo.delete(existingTable);
                }
            }
            
            // Finally delete the rooms
            for (Room existingRoom : existingRooms) {
                if (!frontendRoomNames.contains(existingRoom.getName())) {
                    roomRepo.delete(existingRoom);
                }
            }
            
            // Now process the frontend data (update existing and create new)
            for (Room room : rooms) {
                Room existingRoom = roomRepo.findById(room.getName());
                
                if (existingRoom != null) {
                    // Update existing room properties
                    existingRoom.setXPosition(room.getXPosition());
                    existingRoom.setYPosition(room.getYPosition());
                    existingRoom.setXLength(room.getXLength());
                    existingRoom.setYLength(room.getYLength());
                    
                    // Update tables
                    if (room.getTables() != null) {
                        for (Table table : room.getTables()) {
                            Table existingTable = tableRepo.findById(table.getName());
                            
                            if (existingTable != null) {
                                // Update existing table
                                existingTable.setXPosition(table.getXPosition());
                                existingTable.setYPosition(table.getYPosition());
                                existingTable.setXLength(table.getXLength());
                                existingTable.setYLength(table.getYLength());
                                existingTable.setSelectable(table.isSelectable());
                                
                                // Update seats
                                if (table.getSeats() != null) {
                                    for (Seat seat : table.getSeats()) {
                                        Seat existingSeat = seatRepo.findById(seat.getId());
                                        
                                        if (existingSeat != null) {
                                            // Update existing seat
                                            existingSeat.setXPosition(seat.getXPosition());
                                            existingSeat.setYPosition(seat.getYPosition());
                                            existingSeat.setXLength(seat.getXLength());
                                            existingSeat.setYLength(seat.getYLength());
                                            existingSeat.setPrice(seat.getPrice());
                                        } else {
                                            // New seat
                                            seat.setTable(existingTable);
                                            seatRepo.persist(seat);
                                        }
                                    }
                                }
                                tableRepo.persist(existingTable);
                            } else {
                                // New table
                                table.setRoom(existingRoom);
                                tableRepo.persist(table);
                                
                                // Persist seats
                                if (table.getSeats() != null) {
                                    for (Seat seat : table.getSeats()) {
                                        seat.setTable(table);
                                        seatRepo.persist(seat);
                                    }
                                }
                            }
                        }
                    }
                    roomRepo.persist(existingRoom);
                } else {
                    // New room - create it with all tables and seats
                    roomRepo.persist(room);
                    
                    if (room.getTables() != null) {
                        for (Table table : room.getTables()) {
                            table.setRoom(room);
                            tableRepo.persist(table);
                            
                            if (table.getSeats() != null) {
                                for (Seat seat : table.getSeats()) {
                                    seat.setTable(table);
                                    seatRepo.persist(seat);
                                }
                            }
                        }
                    }
                }
            }
            
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Table findTableById(String tabledId) {
        return tableRepo.find("name", tabledId).singleResultOptional().orElseThrow(() -> new IllegalArgumentException("Table not found"));
    }
}
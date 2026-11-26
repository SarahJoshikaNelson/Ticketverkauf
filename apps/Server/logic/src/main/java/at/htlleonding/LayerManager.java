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
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class LayerManager {
    private LayerRepo layerRepo;
    private RoomRepo roomRepo;
    private TableRepo tableRepo;
    private SeatRepo seatRepo;
    private static final Logger log = LoggerFactory.getLogger(LayerManager.class);
    
    public List<Layer> getLayers() {
        return layerRepo.listAll();
    }

    private void cleanupOrphanedData() {
        log.info("Cleaning up orphaned data...");
        
        // Delete seats that belong to tables with null room references
        List<Seat> allSeats = seatRepo.listAll();
        int deletedSeats = 0;
        for (Seat seat : allSeats) {
            if (seat.getTable() == null || seat.getTable().getRoom() == null) {
                seatRepo.delete(seat);
                deletedSeats++;
            }
        }
        if (deletedSeats > 0) {
            log.info("Deleted {} orphaned seats", deletedSeats);
        }
        
        // Delete tables that belong to rooms with null layer references
        List<Table> allTables = tableRepo.listAll();
        int deletedTables = 0;
        for (Table table : allTables) {
            if (table.getRoom() == null || table.getRoom().getLayer() == null) {
                tableRepo.delete(table);
                deletedTables++;
            }
        }
        if (deletedTables > 0) {
            log.info("Deleted {} orphaned tables", deletedTables);
        }
        
        // Delete rooms that have null layer references
        List<Room> allRooms = roomRepo.listAll();
        int deletedRooms = 0;
        for (Room room : allRooms) {
            if (room.getLayer() == null) {
                roomRepo.delete(room);
                deletedRooms++;
            }
        }
        if (deletedRooms > 0) {
            log.info("Deleted {} orphaned rooms", deletedRooms);
        }
        
        log.info("Orphaned data cleanup completed");
    }

    @Transactional
    public boolean updateAllLayers(List<Layer> layers) {
        try {
            // Clean up orphaned data first (rooms/tables/seats without proper layer relationships)
            cleanupOrphanedData();
            
            // Get all existing layers from database
            List<Layer> existingLayers = layerRepo.listAll();
            
            // Create sets of layer names, room names, table names, and seat IDs from frontend data
            java.util.Set<String> frontendLayerNames = new java.util.HashSet<>();
            java.util.Set<String> frontendRoomNames = new java.util.HashSet<>();
            java.util.Set<String> frontendTableNames = new java.util.HashSet<>();
            java.util.Set<java.util.UUID> frontendSeatIds = new java.util.HashSet<>();
            
            for (Layer layer : layers) {
                frontendLayerNames.add(layer.getName());
                if (layer.getRooms() != null) {
                    for (Room room : layer.getRooms()) {
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
                }
            }
            
            // Delete in proper order: seats first, then tables, then rooms, then layers
            // This prevents Hibernate transient object exceptions
            
            // First, identify layers that will be deleted
            java.util.Set<String> layersToDelete = new java.util.HashSet<>();
            for (Layer existingLayer : existingLayers) {
                if (!frontendLayerNames.contains(existingLayer.getName())) {
                    layersToDelete.add(existingLayer.getName());
                }
            }
            
            // Delete seats from tables that belong to rooms being deleted
            List<Seat> allExistingSeats = seatRepo.listAll();
            for (Seat existingSeat : allExistingSeats) {
                // Check if the seat's room has a layer and if that layer is being deleted
                boolean shouldDeleteSeat = false;
                if (existingSeat.getTable() != null && 
                    existingSeat.getTable().getRoom() != null && 
                    existingSeat.getTable().getRoom().getLayer() != null) {
                    shouldDeleteSeat = layersToDelete.contains(existingSeat.getTable().getRoom().getLayer().getName());
                }
                
                // Also delete seats that are not in the frontend data
                if (shouldDeleteSeat || !frontendSeatIds.contains(existingSeat.getId())) {
                    seatRepo.delete(existingSeat);
                }
            }
            
            // Delete tables from rooms being deleted or tables not in frontend
            List<Table> allExistingTables = tableRepo.listAll();
            for (Table existingTable : allExistingTables) {
                // Check if the table's room has a layer and if that layer is being deleted
                boolean shouldDeleteTable = false;
                if (existingTable.getRoom() != null && 
                    existingTable.getRoom().getLayer() != null) {
                    shouldDeleteTable = layersToDelete.contains(existingTable.getRoom().getLayer().getName());
                }
                
                // Also delete tables that are not in the frontend data
                if (shouldDeleteTable || !frontendTableNames.contains(existingTable.getName())) {
                    tableRepo.delete(existingTable);
                }
            }
            
            // Delete rooms from layers being deleted or rooms not in frontend
            List<Room> allExistingRooms = roomRepo.listAll();
            for (Room existingRoom : allExistingRooms) {
                // Check if the room has a layer and if that layer is being deleted
                boolean shouldDeleteRoom = false;
                if (existingRoom.getLayer() != null) {
                    shouldDeleteRoom = layersToDelete.contains(existingRoom.getLayer().getName());
                }
                
                // Also delete rooms that are not in the frontend data
                if (shouldDeleteRoom || !frontendRoomNames.contains(existingRoom.getName())) {
                    roomRepo.delete(existingRoom);
                }
            }
            
            // Finally delete the layers
            for (Layer existingLayer : existingLayers) {
                if (!frontendLayerNames.contains(existingLayer.getName())) {
                    layerRepo.delete(existingLayer);
                }
            }
            
            // Now process the frontend data (update existing and create new)
            for (Layer layer : layers) {
                Layer existingLayer = layerRepo.find("name", layer.getName()).singleResultOptional().orElse(null);
                
                if (existingLayer != null) {
                    // Update existing layer properties
                    existingLayer.setLevel(layer.getLevel());
                    existingLayer.setPicture(layer.getPicture());
                    
                    // Update rooms
                    if (layer.getRooms() != null) {
                        for (Room room : layer.getRooms()) {
                            Room existingRoom = roomRepo.find("name", room.getName()).singleResultOptional().orElse(null);
                            
                            if (existingRoom != null) {
                                // Update existing room properties
                                existingRoom.setXPosition(room.getXPosition());
                                existingRoom.setYPosition(room.getYPosition());
                                existingRoom.setXLength(room.getXLength());
                                existingRoom.setYLength(room.getYLength());
                                
                                // Update tables
                                if (room.getTables() != null) {
                                    for (Table table : room.getTables()) {
                                        Table existingTable = tableRepo.find("name", table.getName()).singleResultOptional().orElse(null);
                                        
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
                                room.setLayer(existingLayer);
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
                    }
                    layerRepo.persist(existingLayer);
                } else {
                    // New layer - create it with all rooms, tables and seats
                    layerRepo.persist(layer);
                    
                    if (layer.getRooms() != null) {
                        for (Room room : layer.getRooms()) {
                            room.setLayer(layer);
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
                }
            }
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}

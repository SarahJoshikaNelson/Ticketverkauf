package at.htlleonding.types.dtos;

import at.htlleonding.types.Seat;
import at.htlleonding.types.Ticket;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public record ReservationBookingReqDTO(
        CustomerDTO customer,
        List<TicketBookingEndpointDto> tickets,
        List<Seat> seats,
        String token
) {
    public static ReservationBookingReqDTO fromJson(String json) {
        try {
            return new ObjectMapper().readValue(json, ReservationBookingReqDTO.class);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return null;
        }
    }
    
    public String toJson() {
        try {
            return new ObjectMapper().writeValueAsString(this);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ReservationDTO toReservationDTO(double additionalChargeForPhysicalTickets, List<Ticket> tickets) {
        return new ReservationDTO(
                customer,
                tickets,
                additionalChargeForPhysicalTickets,
                seats,
                token
        );
    }
}
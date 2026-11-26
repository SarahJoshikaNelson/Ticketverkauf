package at.htlleonding.conversion;

import at.htlleonding.repositories.SeatRepo;
import at.htlleonding.types.dtos.TicketCountDTO;
import at.htlleonding.types.dtos.WaitingListSummary;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonObjectBuilder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@ApplicationScoped
@NoArgsConstructor
@AllArgsConstructor
public class JsonConverter {
  private SeatRepo seatRepo;

  public JsonObject toJsonTicket(TicketCountDTO ticketCountDTO) {
    JsonObjectBuilder builder = Json.createObjectBuilder();
    builder.add("count", ticketCountDTO.count());
    return builder.build();
  }

  public JsonObject toJsonWaitingListSummary(WaitingListSummary waitingListSummary) {
    JsonObjectBuilder builder = Json.createObjectBuilder();
    builder.add("currentlyWaiting", waitingListSummary.currentlyWaiting());
    builder.add("inFrontOfSessionHolder", waitingListSummary.inFrontOfSessionHolder());
    builder.add("sessionId", waitingListSummary.sessionId());
    builder.add("isNew", waitingListSummary.isNew());
    return builder.build();
  }
}

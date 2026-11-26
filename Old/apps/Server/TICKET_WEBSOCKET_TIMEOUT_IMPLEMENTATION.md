# Ticket WebSocket Timeout Implementation

## Overview
Implemented a 15-second timeout mechanism for the ticket WebSocket to preserve selected tickets when users refresh the Order application, similar to the existing queue system.

## Changes Made

### 1. Server-Side Changes

#### TimeOutManager (`logic/src/main/java/at/htlleonding/TimeOutManager.java`)
- Added `soonDeletedTicketSessions` list to track temporarily disconnected ticket sessions
- Added `removeSoonDeletedTicketSession()` method to clean up ticket session timeouts
- Added `SoonDeletedTicketSession` record to store connection ID, selected ticket count, and timeout future

**Key additions:**
```java
public List<SoonDeletedTicketSession> soonDeletedTicketSessions = new ArrayList<>();

public void removeSoonDeletedTicketSession(String connectionId) {
    soonDeletedTicketSessions.removeIf(session -> session.connectionId().equals(connectionId));
}

public record SoonDeletedTicketSession(String connectionId, int selectedTickets, ScheduledFuture<?> future) {
}
```

#### TicketWebSocket (`service/src/main/java/at/htlleonding/WebSockets/TicketWebSocket.java`)
- Injected `TimeOutManager` and `CookieReader` dependencies
- Modified `ConnectionData` record to include `sessionId` for tracking users across reconnections
- Updated `@OnOpen` to:
  - Extract session cookie from handshake request
  - Check for existing session in `soonDeletedTicketSessions`
  - Restore selected ticket count if session is found within 15 seconds
  - Cancel the deletion timeout if user reconnects
- Updated `@OnClose` to:
  - Add session to `soonDeletedTicketSessions` with 15-second timeout instead of immediate removal
  - Preserve selected ticket count during the timeout period
- Updated `@OnTextMessage` to maintain session ID when updating ticket counts

**Session Restoration Flow:**
1. User selects tickets → stored in `ConnectionData` with session ID
2. User closes/refreshes → session added to `soonDeletedTicketSessions` with 15s timeout
3. User reconnects within 15s → session found, ticket count restored, timeout cancelled
4. If timeout expires → selected tickets are released and other users are notified

### 2. Client-Side Changes

#### TicketWebSocketService (`Order/src/app/ticket-web-socket.service.ts`)
- Added optional `initialTicketCount` parameter to `connect()` method
- Added `onopen` handler to send initial ticket count after connection is established
- Ensures server and client are synchronized after reconnection

**Key changes:**
```typescript
async connect(initialTicketCount?: number): Promise<Observable<SocketTicketCount>> {
  // ... connection setup ...
  
  this.socket.onopen = () => {
    if (initialTicketCount !== undefined && initialTicketCount > 0) {
      this.sendTicketCount(initialTicketCount);
    }
  };
}
```

#### TicketSelectionComponent (`Order/src/app/ticket-selection/ticket-selection.component.ts`)
- Modified `fetchSalesProgress()` to calculate current ticket count from sessionStorage
- Passes current ticket count to WebSocket `connect()` method
- Ensures selected tickets are synchronized with server after page refresh

## How It Works

### Session Persistence Flow:

1. **Initial Connection:**
   - User opens Order app and connects to ticket WebSocket
   - Server generates or extracts session ID from cookie
   - Connection is established with 0 tickets selected

2. **Ticket Selection:**
   - User selects N tickets
   - Client saves to sessionStorage and sends count to server
   - Server stores `ConnectionData(connection, N, sessionId)`

3. **Page Refresh:**
   - Client loads N tickets from sessionStorage
   - WebSocket connection closes
   - Server adds `SoonDeletedTicketSession(sessionId, N, 15s timeout)` to pending list
   - Selected tickets remain reserved for 15 seconds

4. **Reconnection (within 15 seconds):**
   - Client reconnects with same session cookie
   - Server finds session in `soonDeletedTicketSessions`
   - Server restores ticket count: `ConnectionData(newConnection, N, sessionId)`
   - Timeout is cancelled and removed from pending list
   - Client sends current count from sessionStorage to confirm sync
   - User continues with same ticket selection intact

5. **Timeout Expiry (after 15 seconds):**
   - If user doesn't reconnect, timeout executes
   - Selected tickets are released
   - All connected clients are notified of updated ticket count

## Benefits

- **Improved User Experience:** Users don't lose their ticket selection on accidental page refresh
- **Grace Period:** 15-second window allows for page reload without losing progress
- **Consistency:** Same pattern used across all WebSocket systems (queue, active reservations, tickets)
- **Fair System:** Tickets are eventually released if user doesn't return

## Testing Recommendations

1. **Normal Flow:**
   - Select tickets → verify count updates
   - Refresh page within 15s → verify tickets restored
   - Continue order process → verify selection persists

2. **Timeout Flow:**
   - Select tickets → disconnect/close tab
   - Wait 15+ seconds
   - Reconnect → verify tickets are not restored (clean slate)

3. **Multiple Users:**
   - User A selects 5 tickets → refresh within 15s
   - User B views ticket count → should see correct total
   - User A's tickets remain reserved during grace period

4. **Session Cookie:**
   - Verify session cookie is properly sent with WebSocket handshake
   - Test with/without existing session cookie
   - Verify new session IDs are generated when needed

## Files Modified

### Server:
- `/apps/Server/logic/src/main/java/at/htlleonding/TimeOutManager.java`
- `/apps/Server/service/src/main/java/at/htlleonding/WebSockets/TicketWebSocket.java`

### Client:
- `/apps/Client/Order/src/app/ticket-web-socket.service.ts`
- `/apps/Client/Order/src/app/ticket-selection/ticket-selection.component.ts`

## Configuration

- **Timeout Duration:** 15000ms (15 seconds) - hardcoded in `TicketWebSocket.onClose()`
- **Session Cookie Name:** `__session` - same as queue system
- **WebSocket Path:** `/api/ticket`

## Notes

- The implementation uses the same pattern as `WaitingSystemWebSocket` and `ActiveReservationWebSocket`
- Session IDs are cookie-based, ensuring consistency across page refreshes
- The client's sessionStorage works in tandem with the server's timeout mechanism
- Console logging has been added for debugging and monitoring


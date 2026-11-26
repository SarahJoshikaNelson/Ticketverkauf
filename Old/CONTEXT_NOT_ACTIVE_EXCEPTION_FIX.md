# Context Not Active Exception Fix

## Issue

When implementing email sending for status changes, we encountered this error:

```
jakarta.enterprise.context.ContextNotActiveException: Cannot use the EntityManager/Session 
because neither a transaction nor a CDI request context is active.
```

And then:

```
org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: 
at.htlleonding.types.Order.seats: could not initialize proxy - no Session
```

These occurred because:
1. The `MailManager.sendConfirmationMail()` method was calling `ticketManager.getAdditionalChargeForPhysicalTicketFormatted()` from within a background thread
2. The template rendering was trying to access lazy-loaded `seats` collection and nested relationships (`seat.table`, `table.room`)

All of these required database access where the transaction context was no longer active.

## Root Cause

The problem was in the flow:

1. **Transaction starts** in `OrderManager.toggleOrderStatus()` (annotated with `@Transactional`)
2. **DTO is prepared** within the transaction
3. **Background thread is spawned** to send the email
4. **Transaction ends** (method returns)
5. **Background thread executes** `MailManager.sendConfirmationMail()`
6. **Error occurs** when trying to access database via `ticketManager.getAdditionalChargeForPhysicalTicketFormatted()`

### Why This Happens

- CDI and JPA contexts are bound to the transaction scope
- Background threads don't inherit the transaction context
- Database access (lazy loading, repository queries) requires an active context
- When the background thread tries to call a method that needs database access, there's no context available

## Solution

### Approach: Prepare All Data Within Transaction AND Force-Load Lazy Collections

The fix involves:
1. Fetching **all required data within the transaction** before spawning the background thread
2. **Force-loading lazy-loaded collections** by explicitly iterating through them and accessing nested relationships

#### OrderManager.java

```java
// Prepare mail DTOs synchronously within the transaction (so the entity manager is active)
ConfirmationMailDTO confirmationMailDTO = null;
String confirmationRecipientEmail = null;
String additionalChargeFormatted = null;  // <-- Fetch this BEFORE background thread!

if (toggle == OrderStatus.CONFIRMED && previousStatus != OrderStatus.CONFIRMED) {
    try {
        // Force lazy-loaded collections to initialize within transaction
        // This ensures all nested relationships are loaded before leaving the transaction
        List<Seat> seats = new ArrayList<>();
        if (order.getSeats() != null) {
            for (Seat seat : order.getSeats()) {
                // Access the table to force loading
                if (seat.getTable() != null) {
                    seat.getTable().getName(); // Force load table
                    if (seat.getTable().getRoom() != null) {
                        seat.getTable().getRoom().getName(); // Force load room
                    }
                }
                seats.add(seat);
            }
        }
        
        confirmationMailDTO = new ConfirmationMailDTO(...);
        confirmationRecipientEmail = order.getCustomer().getMailAddress();
        
        // Fetch formatted charge while transaction is still active
        additionalChargeFormatted = ticketManager.getAdditionalChargeForPhysicalTicketFormatted();
        
    } catch (Exception e) {
        log.error("Failed to prepare confirmation email for order {}", id, e);
    }
}

// Send confirmation email in a background thread with all data prepared
if (confirmationMailDTO != null && confirmationRecipientEmail != null && additionalChargeFormatted != null) {
    final ConfirmationMailDTO mailDTOToSend = confirmationMailDTO;
    final String recipientEmailToSend = confirmationRecipientEmail;
    final String chargeFormatted = additionalChargeFormatted;
    
    new Thread(() -> {
        try {
            // Now we pass the pre-fetched data, no DB access needed!
            mailManager.sendConfirmationMail(recipientEmailToSend, mailDTOToSend, chargeFormatted);
            log.info("Confirmation email sent successfully for order {}", id);
        } catch (Exception e) {
            log.error("Failed to send confirmation email for order {}", id, e);
        }
    }).start();
}
```

#### MailManager.java

Updated the method signature to accept the formatted charge as a parameter:

```java
// BEFORE (caused ContextNotActiveException):
public boolean sendConfirmationMail(String recipient, ConfirmationMailDTO dto) {
    var text = Templates.confirmationMail(dto, ticketManager.getAdditionalChargeForPhysicalTicketFormatted())
            .render();
    // ...
}

// AFTER (receives pre-fetched data):
public boolean sendConfirmationMail(String recipient, ConfirmationMailDTO dto, String additionalChargeFormatted) {
    var text = Templates.confirmationMail(dto, additionalChargeFormatted)
            .render();
    // ...
}
```

## Key Principles

### ✅ Do's

1. **Fetch all data within transaction** before spawning background threads
2. **Pass data as parameters** to methods in background threads
3. **Use final variables** when capturing for lambda/thread execution
4. **Prepare DTOs synchronously** within the transactional method
5. **Fetch lazy-loaded relationships** explicitly before transaction ends

### ❌ Don'ts

1. **Don't access entity managers** from background threads
2. **Don't call repository methods** outside transaction context
3. **Don't rely on lazy loading** in background threads
4. **Don't call services that need DB access** from background threads
5. **Don't assume CDI contexts** are available everywhere

## Common Scenarios

### Scenario 1: Lazy-Loaded Relationships

**Problem:**
```java
Order order = orderRepo.findById(id);
new Thread(() -> {
    // This will fail if tickets are lazy-loaded!
    int count = order.getTickets().size();
}).start();
```

**Solution:**
```java
Order order = orderRepo.findById(id);
int ticketCount = order.getTickets().size();  // Force load within transaction
new Thread(() -> {
    // Now we can use the pre-loaded data
    log.info("Ticket count: {}", ticketCount);
}).start();
```

### Scenario 2: Nested Lazy-Loaded Relationships

**Problem:**
```java
Order order = orderRepo.findById(id);
List<Seat> seats = new ArrayList<>(order.getSeats());
new Thread(() -> {
    // This will fail when template tries to access seat.table.room!
    emailTemplate.render(seats);
}).start();
```

**Solution:**
```java
Order order = orderRepo.findById(id);
List<Seat> seats = new ArrayList<>();
if (order.getSeats() != null) {
    for (Seat seat : order.getSeats()) {
        // Force load nested relationships
        if (seat.getTable() != null) {
            seat.getTable().getName(); // Force load table
            if (seat.getTable().getRoom() != null) {
                seat.getTable().getRoom().getName(); // Force load room
            }
        }
        seats.add(seat);
    }
}
new Thread(() -> {
    // Now all relationships are loaded
    emailTemplate.render(seats);
}).start();
```

### Scenario 2: Service/Manager Calls

**Problem:**
```java
new Thread(() -> {
    // This will fail!
    String formatted = ticketManager.getFormattedPrice();
}).start();
```

**Solution:**
```java
String formatted = ticketManager.getFormattedPrice();  // Fetch before thread
new Thread(() -> {
    // Use the pre-fetched value
    log.info("Price: {}", formatted);
}).start();
```

### Scenario 3: Complex DTO Preparation

**Problem:**
```java
new Thread(() -> {
    // This will fail if adminManager needs DB access!
    OrderMailDTO dto = adminManager.getOrderMailDto(orderId);
    mailManager.sendEmail(dto);
}).start();
```

**Solution:**
```java
OrderMailDTO dto = adminManager.getOrderMailDto(orderId);  // Prepare within transaction
new Thread(() -> {
    // Use the pre-prepared DTO
    mailManager.sendEmail(dto);
}).start();
```

## Alternative Solutions (Not Used)

### 1. @ActivateRequestContext

```java
@ActivateRequestContext
public void sendEmailInBackground() {
    // This activates a request context but NOT a transaction
    // Won't work if you need database access
}
```

❌ **Not suitable** because we need transaction/entity manager context, not just request context.

### 2. @Transactional on Background Thread Method

```java
@Transactional
public void sendEmailInBackground() {
    // This creates a NEW transaction
}
```

❌ **Not suitable** because:
- Background threads don't properly support CDI contexts
- Creates separate transaction (may have visibility issues)
- Complicates error handling

### 3. CompletableFuture with ManagedExecutor

```java
@Inject
ManagedExecutorService executor;

CompletableFuture.runAsync(() -> {
    // Send email
}, executor);
```

⚠️ **Could work** but:
- More complex setup
- Still need to prepare data before async execution
- Overkill for simple background email sending

## Testing Considerations

When testing methods that spawn background threads:

```java
@Test
void testEmailSending() {
    // Given
    when(ticketManager.getAdditionalChargeForPhysicalTicketFormatted()).thenReturn("5,00 €");
    
    // When
    orderManager.toggleOrderStatus(orderId, OrderStatus.CONFIRMED);
    
    // Then
    // Give background thread time to execute
    Thread.sleep(100);
    
    // Verify with timeout to wait for background thread
    verify(mailManager, timeout(500).times(1)).sendConfirmationMail(any(), any(), any());
}
```

## Summary

The fix ensures that:
- ✅ All database access happens within the transaction
- ✅ Background threads only work with pre-fetched data
- ✅ No CDI context issues
- ✅ Clean separation between data fetching and background processing
- ✅ Maintainable and testable code

This pattern should be followed for any background task that needs data from the database!


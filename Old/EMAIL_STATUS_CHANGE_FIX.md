# Email Status Change Fix

## Issue Summary

When admins switched order statuses to "bestätigt" (CONFIRMED) or "bezahlt" (PAID) via the Dashboard, emails were **not being sent** to customers. This resulted in poor user experience as customers were not notified of status changes.

## Root Cause Analysis

The issue was in the `OrderManager.toggleOrderStatus()` method:

1. **For CONFIRMED status**: The method only changed the status in the database but did NOT send any confirmation email
2. **For PAID status**: The method correctly sent payment confirmation emails

The confusion arose because there were TWO methods for confirming orders:
- `confirmOrder()` - Used when customers confirm via activation link (sends email ✓)
- `toggleOrderStatus()` - Used by admins in Dashboard (did NOT send email for CONFIRMED ✗)

## Solution Implemented

### Changes Made

**File: `/apps/Server/logic/src/main/java/at/htlleonding/OrderManager.java`**

Added email sending logic for CONFIRMED status transitions in the `toggleOrderStatus()` method (lines 84-118):

```java
// Send confirmation email when status changes to CONFIRMED
if (toggle == OrderStatus.CONFIRMED && previousStatus != OrderStatus.CONFIRMED) {
    try {
        // Prepare DTO synchronously within transaction
        ConfirmationMailDTO mailDTO = new ConfirmationMailDTO(
                order.getId(),
                new ReservationDTO(
                        new CustomerDTO(order.getCustomer().getFirstName(), order.getCustomer().getLastName(),
                                order.getCustomer().getMailAddress().toLowerCase(),
                                order.getCustomer().getPhoneNumber(), null,
                                order.getCustomer().isMale(), order.getCustomer().getStreet(),
                                order.getCustomer().getStreetNumber(),
                                order.getCustomer().getZipCode(), order.getCustomer().getTown()),
                        new ArrayList<>(order.getTickets()),
                        ticketManager.getAdditionalChargeForPhysicalTicket(),
                        order.getSeats(), null),
                dataManager.getData());

        String recipientEmail = order.getCustomer().getMailAddress();

        // Send mail in background thread
        new Thread(() -> {
            try {
                mailManager.sendConfirmationMail(recipientEmail, mailDTO);
                log.info("Confirmation email sent successfully for order {}", id);
            } catch (Exception e) {
                log.error("Failed to send confirmation email for order {}", id, e);
            }
        }).start();

    } catch (Exception e) {
        // Log error but don't fail the status change
        log.error("Failed to prepare confirmation email for order {}", id, e);
    }
}
```

### Test Updates

**File: `/apps/Server/logic/src/test/java/at/htlleonding/OrderManagerTest.java`**

Updated two tests to verify email sending:

1. **`testToggleOrderStatus_ToConfirmed`**: Now verifies that `sendConfirmationMail()` is called
2. **`testToggleOrderStatus_ToPaid_GeneratesInvoice`**: Now verifies that `sendPaymentConfirmationMail()` and `generatePDF()` are called

Both tests pass successfully ✓

## Email Flow

### CONFIRMED Status
1. Admin switches order to "bestätigt" in Dashboard
2. Dashboard calls `PUT /api/v2/order/status/{id}` with `OrderStatus.CONFIRMED`
3. Backend calls `OrderManager.toggleOrderStatus()`
4. Status is updated in database
5. **NEW**: Confirmation email is sent to customer with:
   - Order details
   - Payment information
   - Customer account details
   - Ticket/seat information

### PAID Status
1. Admin switches order to "bezahlt" in Dashboard
2. Dashboard calls `PUT /api/v2/order/status/{id}` with `OrderStatus.PAID`
3. Backend calls `OrderManager.toggleOrderStatus()`
4. Status is updated in database
5. Invoice number is generated (if not already assigned)
6. **EXISTING**: Payment confirmation email is sent with:
   - Bill PDF attachment
   - Digital ticket PDF attachments
   - Payment confirmation message

## Benefits

- ✅ Customers now receive confirmation emails when admin confirms their order
- ✅ Customers receive payment confirmation emails when admin marks order as paid
- ✅ Consistent email behavior regardless of how order status changes (user vs admin)
- ✅ Better user experience and communication
- ✅ Background threading prevents blocking the admin interface
- ✅ Graceful error handling (status change succeeds even if email fails)

## Testing

Run the updated tests:
```bash
cd apps/Server
./gradlew :logic:test --tests OrderManagerTest.testToggleOrderStatus_ToConfirmed
./gradlew :logic:test --tests OrderManagerTest.testToggleOrderStatus_ToPaid_GeneratesInvoice
```

Both tests should pass successfully.

## Related Files

- `/apps/Server/logic/src/main/java/at/htlleonding/OrderManager.java` - Main fix
- `/apps/Server/logic/src/main/java/at/htlleonding/MailManager.java` - Email sending logic
- `/apps/Server/service/src/main/java/at/htlleonding/api/OrderResource.java` - API endpoint
- `/apps/Client/Dashboard/src/utils/order-edit-utils.ts` - Frontend status change function
- `/apps/Client/Dashboard/src/components/orders/details/SettingButtons.tsx` - Dashboard UI
- `/apps/Server/logic/src/main/resources/templates/MailManager/confirmationMail.html` - Email template

## Notes

- Emails are sent in background threads to avoid blocking the transaction
- Email failures are logged but don't prevent status changes
- Only sends emails when status actually changes (prevents duplicate emails)
- Respects existing mail configuration (SMTP settings, templates, etc.)


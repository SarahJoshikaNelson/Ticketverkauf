# Quick Start: Testing Email Status Change Fix

## What Was Fixed

✅ Emails are now sent to customers when admins switch orders to:
- **"bestätigt" (CONFIRMED)** - Sends confirmation email
- **"bezahlt" (PAID)** - Sends payment confirmation email with bill and tickets

## How to Test

### Prerequisites
1. Ensure your mail server is configured (check `application.properties`)
2. Start the backend server
3. Start the Dashboard frontend

### Test Scenario 1: CONFIRMED Status Change

1. **Create a test order** with status `WAITING`
   - Use a valid email address you can check
   
2. **Open Dashboard** and navigate to Orders
   
3. **Find your test order** and click on it to view details
   
4. **Change status to "Bestätigt"** using the dropdown or settings buttons
   
5. **Check email inbox** - You should receive:
   - Subject: `Ihre Reservierungsbestätigung - #{orderId}`
   - Body: Order details, payment information, customer details
   
6. **Check server logs** for:
   ```
   Confirmation email sent successfully for order {orderId}
   ```

### Test Scenario 2: PAID Status Change

1. **Create a test order** with status `CONFIRMED` or `WAITING`
   - Use a valid email address you can check
   
2. **Open Dashboard** and navigate to Orders
   
3. **Find your test order** and click on it to view details
   
4. **Change status to "Bezahlt"** using the dropdown or settings buttons
   
5. **Check email inbox** - You should receive:
   - Subject: `Ihre Rechnung - #{orderId}`
   - Attachments: Bill PDF + Digital ticket PDFs
   - Body: Payment confirmation message
   
6. **Check server logs** for:
   ```
   Payment confirmation email sent successfully for order {orderId}
   ```

## Verification Commands

### Run Unit Tests
```bash
cd apps/Server
./gradlew :logic:test --tests OrderManagerTest
```

### Check Logs
```bash
# If using Docker
docker logs ticketverkauf-backend-1 | grep -i "email sent"

# If running locally
tail -f logs/application.log | grep -i "email"
```

### Manual API Testing

Using curl or Postman:

```bash
# Get auth token first (admin user)
TOKEN="your-jwt-token"

# Change status to CONFIRMED
curl -X PUT http://localhost:8080/api/v2/order/status/{orderId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '"CONFIRMED"'

# Change status to PAID
curl -X PUT http://localhost:8080/api/v2/order/status/{orderId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '"PAID"'
```

## Troubleshooting

### No Email Received

1. **Check mail configuration**:
   - Verify SMTP settings in `application.properties`
   - Test mail server connectivity
   
2. **Check server logs**:
   ```bash
   grep -i "Failed to send.*email" logs/application.log
   ```

3. **Verify customer email**:
   - Ensure order has valid customer email
   - Check for typos in email address

4. **Check spam folder**:
   - Confirmation emails might be filtered

### Error in Logs

If you see errors like:
```
Failed to send confirmation email for order {id}
```

Check:
- Mail server is running and accessible
- SMTP credentials are correct
- Email template exists: `confirmationMail.html` and `paymentConfirmationMail.html`

### Order Status Changes But No Email

This is expected behavior! The status change is not blocked by email failures. Check logs to see what went wrong with email sending.

## Expected Behavior

| Action | Status Change | Email Sent | Attachments |
|--------|---------------|------------|-------------|
| Admin confirms order | WAITING → CONFIRMED | ✅ Confirmation | None |
| Admin marks as paid | * → PAID | ✅ Payment | Bill + Tickets |
| Admin cancels | * → CANCELLED | ❌ No email | N/A |
| Admin marks done | * → DONE | ❌ No email | N/A |

## Success Indicators

✅ **In Dashboard**: Toast notification "Status erfolgreich geändert"
✅ **In Server Logs**: "Confirmation/Payment email sent successfully"
✅ **In Customer Inbox**: Email with correct subject and content
✅ **Status Updated**: Database shows new status

## Related Documentation

- [EMAIL_STATUS_CHANGE_FIX.md](./EMAIL_STATUS_CHANGE_FIX.md) - Detailed technical documentation
- [MAIL_SENDER_FEATURE.md](./MAIL_SENDER_FEATURE.md) - General mail configuration
- [MAIL_SENDER_TROUBLESHOOTING.md](./MAIL_SENDER_TROUBLESHOOTING.md) - Mail debugging guide


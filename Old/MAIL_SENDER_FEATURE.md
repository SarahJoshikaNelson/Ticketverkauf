# Mail Sender Feature Documentation

## Overview
A comprehensive mail sender feature that allows administrators to send bulk emails to customers based on their order status. The feature includes the ability to attach bills for paid orders and provides detailed feedback on the sending process.

## Features Implemented

### 1. Backend Components

#### DTOs (Data Transfer Objects)
- **BulkMailRequestDTO**: Request structure for bulk mail operations
  - `subject`: Email subject line
  - `content`: Email body content (HTML)
  - `targetStatuses`: List of order statuses to filter (null/empty = all)
  - `includeBills`: Boolean flag to attach bills for PAID orders

- **BulkMailResponseDTO**: Response structure with sending results
  - `totalRecipients`: Total number of recipients
  - `successCount`: Number of successfully sent emails
  - `failureCount`: Number of failed emails
  - `failedOrderIds`: List of order IDs where sending failed

#### Repository Changes (OrderRepo.java)
- `findAllActive()`: Retrieves all orders excluding cancelled ones
- `findByStatuses(List<OrderStatus>)`: Retrieves orders filtered by status list

#### Business Logic (MailManager.java)
- `sendBulkMail(BulkMailRequestDTO)`: Main bulk email sending method
  - Filters orders by status
  - Sends personalized emails to each customer
  - Optionally attaches bills for PAID orders
  - Handles errors gracefully per recipient
  - Returns detailed statistics

#### API Endpoint (MailSenderResource.java)
- **POST** `/api/v2/mail-sender/send`: Send bulk emails
  - Requires admin authentication (@AdminOnly)
  - Validates request parameters
  - Returns sending statistics
  
- **GET** `/api/v2/mail-sender/available-statuses`: Get available order statuses
  - Returns list of statuses (excludes CANCELLED)

### 2. Frontend Components

#### Mail Sender Page (`/mail-sender`)
Located at: `apps/Client/Dashboard/src/pages/mail-sender/index.tsx`

Features:
- **Subject Input**: Customizable email subject
- **Content Textarea**: Full HTML email body editor
- **Status Filter**: Multi-select checkboxes for order statuses
  - "All Customers" option (sends to all non-cancelled orders)
  - Individual status checkboxes (ACTIVE, CONFIRMED, WAITING, PAID, DONE)
- **Include Bills Option**: Checkbox to attach bills for PAID orders
- **Send Button**: Initiates bulk email sending with loading state
- **Results Card**: Displays sending statistics after completion
  - Total recipients
  - Success count
  - Failure count
  - Failed order IDs (if any)

#### Navigation
- Added to sidebar under "Bestellungen" (Orders) section
- Label: "E-Mail-Versand"
- Description: "Senden Sie Massen-E-Mails an Kunden basierend auf ihrem Bestellstatus"
- Available at route: `/mail-sender`

## Technical Details

### Order Status Filtering
The feature supports filtering by these order statuses:
- **ACTIVE**: Active orders
- **CONFIRMED**: Confirmed orders
- **WAITING**: Waiting orders (unconfirmed)
- **PAID**: Paid orders
- **DONE**: Completed/delivered orders

**Note**: CANCELLED orders are automatically excluded from all operations.

### Bill Attachments
- Bills are only attached when `includeBills` is true
- Only attached to emails sent to PAID order customers
- Bill PDFs are retrieved from: `src/main/resources/META_INF/resources/pdf/bills/Rechnung_{orderId}.pdf`
- If a bill PDF is not found, the email is still sent without the attachment (with a warning logged)

### Error Handling
- Customer validation: Skips orders with null customer or email
- Individual email failures don't stop the bulk operation
- All failures are logged with order IDs
- Failed order IDs are returned in the response

## Usage Instructions

### For Administrators

1. **Navigate to Mail Sender**
   - Open the Dashboard
   - Click on "Bestellungen" in the sidebar
   - Select "E-Mail-Versand"

2. **Compose Your Email**
   - Enter a subject line (required)
   - Write your email content (required)
   - The email will be sent as HTML

3. **Select Recipients**
   - Choose "Alle Kunden" to send to all non-cancelled orders
   - OR select specific statuses (ACTIVE, CONFIRMED, WAITING, PAID, DONE)
   - Multiple statuses can be selected

4. **Optional: Include Bills**
   - Check "Rechnungen als Anhang hinzufügen"
   - Bills will only be attached for PAID customers

5. **Send Emails**
   - Click "E-Mails senden"
   - Wait for the process to complete
   - Review the results summary

### Example Use Cases

1. **Send payment reminder to WAITING orders**
   - Subject: "Zahlungserinnerung für Ihre Bestellung"
   - Select only "WAITING" status
   - Include payment instructions in content

2. **Send receipts to all PAID orders**
   - Subject: "Ihre Rechnung"
   - Select only "PAID" status
   - Enable "Include Bills" option

3. **Send event information to all customers**
   - Subject: "Wichtige Information zum Event"
   - Select "Alle Kunden"
   - Include event details in content

## API Documentation

### Send Bulk Mail
```
POST /api/v2/mail-sender/send
Content-Type: application/json
Authorization: Bearer {admin-token}

Request Body:
{
  "subject": "Your Email Subject",
  "content": "Your email content here",
  "targetStatuses": ["PAID", "CONFIRMED"],  // or null for all
  "includeBills": true
}

Response:
{
  "totalRecipients": 150,
  "successCount": 148,
  "failureCount": 2,
  "failedOrderIds": ["uuid1", "uuid2"]
}
```

### Get Available Statuses
```
GET /api/v2/mail-sender/available-statuses
Authorization: Bearer {admin-token}

Response:
["ACTIVE", "CONFIRMED", "WAITING", "PAID", "DONE"]
```

## Files Modified/Created

### Backend
- ✅ Created: `apps/Server/interface/src/main/java/at/htlleonding/types/dtos/BulkMailRequestDTO.java`
- ✅ Created: `apps/Server/interface/src/main/java/at/htlleonding/types/dtos/BulkMailResponseDTO.java`
- ✅ Modified: `apps/Server/api/src/main/java/at/htlleonding/repositories/OrderRepo.java`
- ✅ Modified: `apps/Server/logic/src/main/java/at/htlleonding/MailManager.java`
- ✅ Created: `apps/Server/service/src/main/java/at/htlleonding/api/MailSenderResource.java`

### Frontend
- ✅ Created: `apps/Client/Dashboard/src/pages/mail-sender/index.tsx`
- ✅ Modified: `apps/Client/Dashboard/src/App.tsx`
- ✅ Modified: `apps/Client/Dashboard/src/components/global/nav.tsx`

## Security
- All endpoints require admin authentication via `@AdminOnly` interceptor
- Email addresses are validated before sending
- Failed operations are logged for auditing

## Performance Considerations
- Emails are sent synchronously within a single request
- For very large recipient lists, consider adding pagination or async processing
- Email sending failures don't affect other recipients

## Future Enhancements
- Email templates with placeholders (e.g., {customerName}, {orderId})
- Preview email before sending
- Schedule email sending for later
- Email history/audit log
- Rich text editor for email content
- Attach custom files (not just bills)

## Testing Checklist

- [ ] Send email to all customers
- [ ] Send email to specific status (WAITING)
- [ ] Send email to multiple statuses (PAID + CONFIRMED)
- [ ] Send email with bill attachments to PAID orders
- [ ] Verify cancelled orders are excluded
- [ ] Test with invalid/null customer emails
- [ ] Test with missing bill PDFs
- [ ] Verify error handling and reporting
- [ ] Check navigation and UI responsiveness
- [ ] Verify admin-only access

## Troubleshooting

### Emails not being sent
1. Check SMTP configuration in `application.properties`
2. Verify email credentials are correct
3. Check logs for authentication errors

### Bills not attached
1. Verify order status is PAID
2. Check that bill PDF exists at the expected path
3. Review logs for file reading errors

### Failed order IDs reported
1. Check customer email addresses in database
2. Verify SMTP server limits
3. Review specific error messages in server logs


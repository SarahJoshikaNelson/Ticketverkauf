# Mail Sender Feature - Quick Start Guide

## What's New?

A new **E-Mail-Versand** (Mail Sender) feature has been added to the Dashboard that allows administrators to send bulk emails to customers based on their order status.

## Where to Find It?

1. Login to the Dashboard
2. Navigate to **Bestellungen** → **E-Mail-Versand** in the sidebar
3. Or directly access: `http://your-dashboard-url/mail-sender`

## Quick Usage

### Basic Email to All Customers
1. Enter subject: `"Important Event Update"`
2. Write your message in the content field
3. Keep "Alle Kunden" checked
4. Click "E-Mails senden"

### Targeted Email (e.g., Payment Reminders)
1. Enter subject: `"Zahlungserinnerung"`
2. Write payment reminder content
3. Uncheck "Alle Kunden"
4. Check only "Wartend" status
5. Click "E-Mails senden"

### Send Receipts with Bills
1. Enter subject: `"Ihre Rechnung"`
2. Write receipt message
3. Check only "Bezahlt" status
4. Check "Rechnungen als Anhang hinzufügen"
5. Click "E-Mails senden"

## Key Features

✅ **Flexible Filtering**: Send to all or specific order statuses  
✅ **Bill Attachments**: Automatically attach bills for paid orders  
✅ **Real-time Feedback**: See success/failure counts immediately  
✅ **Safe Operation**: Cancelled orders are automatically excluded  
✅ **Error Resilience**: Individual failures don't stop the entire process  

## Available Order Statuses

- **Aktiv** (ACTIVE)
- **Bestätigt** (CONFIRMED)
- **Wartend** (WAITING) - Unconfirmed orders
- **Bezahlt** (PAID)
- **Abgeschlossen** (DONE)

## Important Notes

⚠️ **Required Fields**: Both subject and content must be filled  
⚠️ **Bills Only for Paid**: Bill attachments only work with "Bezahlt" orders  
⚠️ **Cancelled Excluded**: Stornierte (cancelled) orders never receive emails  
⚠️ **Admin Only**: This feature requires admin authentication  

## Technical Stack

### Backend
- **Endpoint**: `/api/v2/mail-sender/send`
- **Method**: POST
- **Auth**: Admin-only

### Frontend
- **Route**: `/mail-sender`
- **Framework**: React + TypeScript
- **UI**: Shadcn/UI components

## Need Help?

Refer to the full documentation: `MAIL_SENDER_FEATURE.md`


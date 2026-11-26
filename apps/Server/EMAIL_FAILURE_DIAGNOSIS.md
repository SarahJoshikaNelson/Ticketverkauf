# Email Failure Diagnosis & Fix

## Problem
Payment confirmation emails fail in **production** (`docker-compose.yml`) but work in **dev** (`docker-compose-dev.yml`).

Error message:
```
2026-01-09 22:54:48,307 ERROR [at.htl.OrderManager] (Thread-13) Failed to send payment confirmation email: {0}
```

## Root Cause Analysis

Since line 71 in `MailManager.sendPaymentConfirmationMail()` completes successfully (ticket PDFs generated), the error occurs in **lines 72-84**.

### Most Likely Causes (in order of probability):

### 1. ✅ **NULL Customer Email Address** 
**Production database might have orders with NULL email addresses**

```java
dto.customer().mailAddress().trim().toLowerCase()  // NPE if email is null
```

**Fix Applied:** Added null check and detailed logging

### 2. 📁 **Bill PDF File Not Found**
The path `src/main/resources/META_INF/resources/pdf/bills/Rechnung_*.pdf` might not exist in the Docker container.

**Fix Applied:** Added logging to show absolute path and file existence check

### 3. 📧 **SMTP Configuration Missing/Wrong**
Production might be missing mail configuration.

**Fix Applied:** Added try-catch around mailer.send() with detailed error logging

### 4. 🗄️ **Outdated Database Schema**

**Critical missing columns in production:**

#### `ticket.is_physical` (boolean)
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ticket' AND column_name = 'isphysical';

-- Add if missing
ALTER TABLE ticket ADD COLUMN isphysical BOOLEAN NOT NULL DEFAULT false;
```

#### `order.invoice_number` (bigint)
```sql
-- Check if column exists  
SELECT column_name FROM information_schema.columns 
WHERE table_name = '"order"' AND column_name = 'invoicenumber';

-- Add if missing
ALTER TABLE "order" ADD COLUMN invoicenumber BIGINT UNIQUE;
```

## Applied Fixes

### 1. Enhanced Logging in `MailManager.java`
- ✅ Check customer email is not null
- ✅ Log bill PDF path and existence
- ✅ Log each attachment step
- ✅ Log SMTP send attempt with error details
- ✅ Better exception messages

### 2. Improved Error Logging in `OrderManager.java`
- ✅ Changed from `{0}` placeholder to proper `{}` with exception object
- ✅ Now logs full stack trace for debugging

## How to Diagnose in Production

### Step 1: Check Database Schema
Run the SQL migration script in production:
```bash
# Connect to production database
docker exec -it postgres-db psql -U admin -d tickettrade -f /tmp/fix_production_db.sql
```

Location of migration script: `/tmp/fix_production_db.sql`

### Step 2: Check Logs
After deploying the updated code, the logs will now show:
- ✅ "Starting payment confirmation email for order: X"
- ✅ "Recipient email: user@example.com"
- ✅ "Bill PDF path: /path/to/file, exists: true/false"
- ✅ "Bill PDF read successfully, size: X bytes"
- ✅ "Retrieved X digital ticket PDFs"
- ✅ "Added bill PDF attachment"
- ✅ "Added ticket PDF attachment X/Y"
- ✅ "Payment confirmation email sent successfully"

OR detailed error at the exact failing step.

### Step 3: Check Mail Configuration
Verify production has SMTP settings in `application.properties`:
```properties
quarkus.mailer.from=noreply@example.com
quarkus.mailer.host=smtp.example.com
quarkus.mailer.port=587
quarkus.mailer.username=...
quarkus.mailer.password=...
quarkus.mailer.start-tls=REQUIRED
```

## Next Steps

1. **Deploy updated code** to production
2. **Run database migration** (fix_production_db.sql)
3. **Trigger a payment confirmation** 
4. **Check logs** - they will now pinpoint the exact failure
5. **Report back** with the detailed error message

## Files Modified
- ✅ `apps/Server/logic/src/main/java/at/htlleonding/MailManager.java`
- ✅ `apps/Server/logic/src/main/java/at/htlleonding/OrderManager.java`

## Database Migration Files Created
- ✅ `/tmp/fix_production_db.sql` - Adds missing columns
- ✅ `/tmp/check_columns.sql` - Checks for column existence


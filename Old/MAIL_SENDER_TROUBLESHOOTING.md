# Mail Sender - Rechnungsanhang Fehlerbehebung

## Problem
Rechnungen werden nicht korrekt als E-Mail-Anhang hinzugefügt.

## Behobene Probleme

### 1. Verbessertes Logging
Die Implementierung enthält jetzt detailliertes Logging:
- Absoluter Dateipfad wird geloggt
- Existenz der Datei wird überprüft
- Erfolg/Fehler beim Anhängen wird geloggt

### 2. HTML-Formatierung
Der E-Mail-Inhalt wird jetzt korrekt als HTML formatiert mit `<br>` für Zeilenumbrüche.

## Debugging-Schritte

### 1. Server-Logs überprüfen
Suchen Sie nach folgenden Log-Einträgen:

```
Looking for bill PDF at: /path/to/file (exists: true/false)
Successfully added bill attachment for order: <UUID>
Bill PDF not found for paid order <UUID> at path: <path>
```

### 2. Rechnungen existieren?
Überprüfen Sie, ob die Rechnung bereits generiert wurde:

```bash
# Im Docker Container oder Server
ls -la src/main/resources/META_INF/resources/pdf/bills/
```

Die Rechnungen sollten das Format `Rechnung_<OrderID>.pdf` haben.

### 3. Bestellstatus überprüfen
Rechnungen werden **nur** für Bestellungen mit Status `PAID` angehängt!

```sql
-- Bestellstatus überprüfen
SELECT id, status FROM "order" WHERE id = '<UUID>';
```

### 4. includeBills Flag überprüfen
Im Frontend muss die Checkbox "Rechnungen als Anhang hinzufügen" aktiviert sein.

## Häufige Ursachen

### ❌ Rechnung wurde nie generiert
**Problem:** Die Rechnung existiert nicht im Dateisystem.

**Lösung:** 
1. Überprüfen Sie, ob der PDFManager korrekt läuft
2. Stellen Sie sicher, dass beim Setzen des Status auf PAID die Rechnung generiert wird
3. Prüfen Sie die Logs des PDFManagers

### ❌ Falscher Bestellstatus
**Problem:** Die Bestellung hat nicht den Status `PAID`.

**Lösung:**
- Nur Bestellungen mit Status `PAID` erhalten Rechnungsanhänge
- Überprüfen Sie den Status in der Datenbank
- Ändern Sie den Status im Dashboard wenn nötig

### ❌ includeBills ist false
**Problem:** Die Checkbox im Frontend ist nicht aktiviert.

**Lösung:**
- Aktivieren Sie "Rechnungen als Anhang hinzufügen" im Mail-Sender
- Überprüfen Sie im Browser-Netzwerk-Tab, ob `includeBills: true` gesendet wird

### ❌ Dateipfad-Problem in Docker
**Problem:** In Docker ist der relative Pfad anders.

**Aktueller Status:**
- Der Pfad `src/main/resources/META_INF/resources/pdf/bills/` wird konsistent verwendet
- Sowohl PDFManager (zum Erstellen) als auch MailManager (zum Lesen) nutzen diesen Pfad
- Dies funktioniert in der aktuellen Setup

**Falls Probleme auftreten:**
```bash
# Im Docker Container
cd /deployments
find . -name "Rechnung*.pdf"
```

## Test-Szenario

### Manueller Test
1. **Bestellung auf PAID setzen:**
   - Im Dashboard → Bestellungen → Status auf "Bezahlt" ändern
   - Warten bis Rechnung generiert wurde (Check Logs)

2. **Rechnung verifizieren:**
   ```bash
   ls -la src/main/resources/META_INF/resources/pdf/bills/Rechnung_<OrderID>.pdf
   ```

3. **E-Mail senden:**
   - Mail-Sender öffnen (`/mail-sender`)
   - Betreff und Inhalt eingeben
   - Nur "Bezahlt" Status auswählen
   - "Rechnungen als Anhang hinzufügen" aktivieren
   - Senden

4. **Logs überprüfen:**
   ```bash
   docker logs <container-name> | grep "bill"
   ```

### Erwartete Log-Ausgabe (Erfolg)
```
INFO  Starting bulk mail send: subject='Test', targetStatuses=[PAID], includeBills=true
INFO  Found 1 orders matching criteria
INFO  Looking for bill PDF at: /path/to/Rechnung_UUID.pdf (exists: true)
INFO  Successfully added bill attachment for order: UUID
INFO  Payment confirmation email sent successfully to: email@example.com
INFO  Bulk mail send completed: total=1, success=1, failure=0
```

### Erwartete Log-Ausgabe (Rechnung fehlt)
```
INFO  Starting bulk mail send: subject='Test', targetStatuses=[PAID], includeBills=true
INFO  Found 1 orders matching criteria
INFO  Looking for bill PDF at: /path/to/Rechnung_UUID.pdf (exists: false)
WARN  Bill PDF not found for paid order UUID at path: /path/to/file
INFO  Payment confirmation email sent successfully to: email@example.com
INFO  Bulk mail send completed: total=1, success=1, failure=0
```
*Hinweis: Die E-Mail wird trotzdem gesendet, nur ohne Anhang*

## Weitere Hilfe

Falls das Problem weiterhin besteht:

1. **Überprüfen Sie die PDFManager-Logs:**
   ```bash
   docker logs <container> | grep PDFManager
   ```

2. **Verifizieren Sie den Dateisystem-Zugriff:**
   ```bash
   docker exec -it <container> bash
   cd src/main/resources/META_INF/resources/pdf/bills/
   ls -la
   ```

3. **Testen Sie mit dem Payment Confirmation Mail:**
   - Wenn `sendPaymentConfirmationMail()` funktioniert, sollte auch der Bulk-Mailer funktionieren
   - Beide nutzen denselben Pfad

## Code-Referenzen

### PDFManager (Erstellt Rechnungen)
```java
String pdfPath = "src/main/resources/META_INF/resources/pdf/bills/";
String filePath = String.format("%s%s.pdf", pdfPath, pdfName);
```

### MailManager.sendBulkMail (Liest Rechnungen)
```java
String billPath = String.format("src/main/resources/META_INF/resources/pdf/bills/Rechnung_%s.pdf", 
        order.getId());
File billFile = new File(billPath);
```

Beide verwenden denselben Pfad! ✅


# Mail Sender - Template Variablen

## Übersicht
Der Mail-Sender unterstützt jetzt Template-Variablen für personalisierte E-Mails!

## Verfügbare Variablen

### `{{fullName}}`
**Beschreibung:** Vollständiger Name des Kunden (Vorname + Nachname)

**Beispiel:**
- Input: `{{fullName}}`
- Output: `Max Mustermann`

**Verwendung:**
```
Betreff: Hallo {{fullName}}, wichtige Info!
Inhalt: Lieber {{fullName}}, ...
```

### `{{orderId}}`
**Beschreibung:** Eindeutige Bestellungs-ID (UUID)

**Beispiel:**
- Input: `{{orderId}}`
- Output: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Verwendung:**
```
Betreff: Ihre Bestellung {{orderId}}
Inhalt: Bestellnummer: {{orderId}}
```

## Beispiele

### Beispiel 1: Zahlungserinnerung
**Betreff:**
```
Zahlungserinnerung für {{fullName}} - Bestellung {{orderId}}
```

**Inhalt:**
```
Sehr geehrte/r {{fullName}},

Ihre Bestellung mit der ID {{orderId}} wartet noch auf Ihre Zahlung.

Bitte überweisen Sie den Betrag innerhalb der nächsten 7 Tage.

Mit freundlichen Grüßen
Ihr Maturaballkomitee
```

**Ergebnis für Max Mustermann:**
- Betreff: `Zahlungserinnerung für Max Mustermann - Bestellung a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Inhalt personalisiert mit echten Werten

### Beispiel 2: Event-Information
**Betreff:**
```
Wichtige Information zum Event
```

**Inhalt:**
```
Hallo {{fullName}}!

Wir freuen uns, Sie bei unserem Event begrüßen zu dürfen.

Ihre Bestellnummer: {{orderId}}

Bitte bringen Sie diese Nummer zur Abholung mit.

Freundliche Grüße
```

### Beispiel 3: Persönliche Danksagung
**Betreff:**
```
Vielen Dank für Ihre Bestellung, {{fullName}}!
```

**Inhalt:**
```
Liebe/r {{fullName}},

vielen Dank für Ihre Bestellung ({{orderId}}).

Wir haben Ihre Zahlung erhalten und werden Ihre Tickets bald versenden.

Beste Grüße
Das Maturaballkomitee
```

## Technische Details

### Backend-Implementierung
Die Variablen werden im `MailManager.sendBulkMail()` für **jede** E-Mail individuell ersetzt:

```java
String fullName = order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName();

// Ersetzen in Betreff
String personalizedSubject = request.subject()
    .replace("{{fullName}}", fullName)
    .replace("{{orderId}}", order.getId().toString());

// Ersetzen in Inhalt
String personalizedContent = request.content()
    .replace("{{fullName}}", fullName)
    .replace("{{orderId}}", order.getId().toString());
```

### Frontend-Unterstützung
Die verfügbaren Variablen werden unter den Eingabefeldern angezeigt:

```
Verfügbare Variablen: {{fullName}}, {{orderId}}
```

## Hinweise

### ✅ Groß-/Kleinschreibung
- Die Variablen sind **case-sensitive**
- Verwenden Sie genau: `{{fullName}}` und `{{orderId}}`
- Falsch: `{{FullName}}`, `{{fullname}}`, `{{OrderId}}`

### ✅ Leerzeichen
- Keine Leerzeichen innerhalb der geschweiften Klammern
- Richtig: `{{fullName}}`
- Falsch: `{{ fullName }}` oder `{{fullName }}`

### ✅ Mehrfache Verwendung
Sie können die Variablen mehrmals verwenden:
```
Hallo {{fullName}}!

Liebe/r {{fullName}}, Ihre Bestellung {{orderId}} wurde bestätigt.

Bestellnummer: {{orderId}}
```

### ✅ In Betreff und Inhalt
Die Variablen funktionieren sowohl im Betreff als auch im Inhalt der E-Mail.

### ⚠️ Ungültige Variablen
Variablen, die nicht existieren, werden **nicht** ersetzt:
- `{{unknownVariable}}` → bleibt als `{{unknownVariable}}` im Text

## Zukünftige Erweiterungen

Mögliche zusätzliche Variablen:
- `{{firstName}}` - Nur Vorname
- `{{lastName}}` - Nur Nachname
- `{{email}}` - E-Mail-Adresse
- `{{ticketCount}}` - Anzahl der Tickets
- `{{totalPrice}}` - Gesamtpreis
- `{{eventDate}}` - Event-Datum
- `{{invoiceNumber}}` - Rechnungsnummer
- `{{seatNumbers}}` - Sitznummern

## FAQ

**Q: Werden die Variablen in jeder E-Mail ersetzt?**
A: Ja, für jeden Empfänger werden die Variablen mit seinen individuellen Daten ersetzt.

**Q: Was passiert wenn ein Kunde keinen Nachnamen hat?**
A: Die Variable wird trotzdem ersetzt, eventuell mit leerem String für fehlende Daten.

**Q: Kann ich eigene Variablen definieren?**
A: Nein, aktuell sind nur `{{fullName}}` und `{{orderId}}` verfügbar.

**Q: Funktionieren die Variablen auch bei Rechnungsanhängen?**
A: Ja, die Variablen funktionieren unabhängig davon, ob Rechnungen angehängt werden oder nicht.

## Testing

### Test-Szenario
1. Erstellen Sie eine Test-E-Mail mit:
   ```
   Betreff: Test für {{fullName}}
   Inhalt: Hallo {{fullName}}, Ihre ID: {{orderId}}
   ```

2. Senden Sie an eine Test-Bestellung

3. Überprüfen Sie die empfangene E-Mail:
   - Betreff sollte den echten Namen enthalten
   - Inhalt sollte Name und ID enthalten
   - Keine `{{...}}` sollten mehr sichtbar sein

## Support

Bei Problemen mit Template-Variablen:
1. Überprüfen Sie die Schreibweise (case-sensitive!)
2. Prüfen Sie auf Leerzeichen innerhalb `{{}}`
3. Schauen Sie in die Server-Logs nach Fehlern


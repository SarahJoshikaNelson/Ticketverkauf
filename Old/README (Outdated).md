# Sprint-Planung

Link to our Backlog: [tree.taiga](https://tree.taiga.io/project/eros-klein-kartenverkauf/backlog)

| Sprint    | Auftrag                                  | Datum        |
|-----------|------------------------------------------|--------------|
| 1. Sprint | GUI Mockups                              | 1. Oktober   |
| 2. Sprint | Ticketverkauf auf dieses Jahr updaten    | 5. November  |
| 3. Sprint | Ticketverkauf bis auf Qr Code activation | 26. November |


# Ticketverkauf

### Frontend

[Backend Repository](https://github.com/Ticketverkauf/frontend)

### Backend

[Frontend Repository](https://github.com/Ticketverkauf/backend)

## Technologien

systemarchitecture:
![systemarchitecture](./systemarchitecturemt.png)



## User Storys


### Admin

Als Root Admin (in der datenbank voreingetragen), kann ich mich über ldap(keycloak) authentifizieren und verfüge automatisch über Admin Berechtigungen. 

Als Admin moechte ich andere Verantwortliche(Ihren ldap-keycloak User), ebenso zu admins machen koennen

Ich als Admin moechte den Preis der jeweiligen Karten auf einer Adminpage einstellen koennen 

Ich als Admin moechte die Anzahl an zur verfügung stehenden Tickets einstellen können

Ich als Admin moechte das Datum der Freischaltung der Karten für Maturanten bzw dem allgmeinverkauf einstellen können

Ich als Admin moechte all diese sachen auf /admin einstellen können, und möchte auch dass niemand außer andere Admins darauf zugreifen können

*Ich als Admin moechte Tische erstellen und Ihre Position managen können* (Noch nicht)

Ich als Admin moechte Tische im saalplan einsehen können

Ich als Admin moechte eine Übersicht aller Tickets und Bestellungen und reservierten Tischen einsehen können und diese nach einfachem Predicate filtern können

Ich als Admin moechte Tickets nachdem sie bezahlt wurden aktivieren können (Scannen von QR-Code -> anzeige des zu zahlenden Preises -> aktivierung nach überreichung von Geld durch Knopfdruck)

### Schueler

Ich als Schueler moechte mich mit Keycloak authentifizieren können, um keine informationen angeben zu müssen / um früheren zugang zu erhalten

Ich als Schueler moechte eine verbilligte Karte kaufen können (validierung durch Keycloak authentication)

Ich als Maturant moechte Karten schon ab Vorverkaufsbeginn kaufen können 

Ich als Maturant moechte eine Karte gratis bekommen (restliche zum Normal-Extern-Preis)

### Gast Kunde

Ich als Gast muss meine Kontaktdaten (mindestestens Email-Addresse mit Bestätigung) angeben

Ich als Gast moechte externe Karten bestellen koennen

Ich als Gast moechte Tische reservieren können

Ich als Kunde moechte meine Tickets in Form von PDFs (Eine PDF per Ticket, Bestellüberischt im Mail body) in meiner Email einsehen können

Ich als Gast moechte vorort abendkarten kaufen (dem palais Karten zur verfügung stellen, die bereits aktiviert sind)

### Security

Ich als Security moechte einfachst mit meinem mobiltelefon ein Ticket scannen und anschließend einfach die Informationen entnehmen können, weiters sollte das Ticket damit entwertet werden (speichern wann entwertet um evntl. missverständnisse zu lösen)



## Notes

Table einen Price hinzufügen

Warteliste - Ticketrückgabe

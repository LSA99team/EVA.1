# Fahrplan-Struktur Dokumentation

## Ordnerstruktur

```
data/fahrplan/
├── RB/           # Regionalbahn
│   ├── RB101.json
│   └── RB201.json
├── RE/           # Regionalexpress
│   └── RE103.json
├── SSMB/         # Sonderverkehr/Spezialtyp
│   └── SSMB501.json
├── NSMB/         # Sonderverkehr/Spezialtyp
│   └── NSMB601.json
└── S-bahn/       # S-Bahn
    └── SMSB/
        └── SMSB701.json
```

## JSON-Struktur einer Fahrplan-Datei

```json
{
  "zugtyp": "RB",
  "liniennummer": "101",
  "startstation": "Berlin Hbf",
  "zielstation": "Potsdam Hbf",
  "fahrten": [
    {
      "variant": "0101",
      "uhrzeit": "08:00",
      "gueltig_von": "2026-01-01",
      "gueltig_bis": "2026-01-31",
      "wochentage": ["Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      "halte": [
        {
          "halt_nummer": 1,
          "station": "Berlin Hbf",
          "ankunft": null,
          "abfahrt": "08:00",
          "versp_standard": 0
        },
        {
          "halt_nummer": 2,
          "station": "Berlin Charlottenburg",
          "ankunft": "08:14",
          "abfahrt": "08:15",
          "versp_standard": 0
        }
      ],
      "ausfaelle": [
        {
          "datum": "2026-01-03",
          "typ": "ganz"
        },
        {
          "datum": "2026-01-10",
          "typ": "halt",
          "halt_nummer": 2
        }
      ],
      "zusatzhalt": [
        {
          "datum": "2026-01-05",
          "halt_nummer": 5,
          "station": "Potsdam Charlottenhof",
          "zeit": "08:42",
          "abfahrt": "08:43"
        }
      ]
    }
  ]
}
```

## Erklärung der Felder

### Hauptebene
- **zugtyp**: Der Zugtyp (RB, RE, SSMB, NSMB, S-Bahn)
- **liniennummer**: Die Liniernummer (z.B. "101")
- **startstation**: Startpunkt der kompletten Route
- **zielstation**: Endpunkt der kompletten Route

### Fahrt (wiederholende Route)
- **variant**: Eindeutige Varianten-Nummer (z.B. "0101" für RB101 Variante 01)
- **uhrzeit**: Die Standardabfahrtszeit (z.B. "08:00")
- **gueltig_von**: Startdatum im Format YYYY-MM-DD
- **gueltig_bis**: Enddatum im Format YYYY-MM-DD
- **wochentage**: Array mit Wochentagen als Zwei-Buchstaben-Codes:
  - "Mo" = Montag
  - "Di" = Dienstag
  - "Mi" = Mittwoch
  - "Do" = Donnerstag
  - "Fr" = Freitag
  - "Sa" = Samstag
  - "So" = Sonntag

### Haltestelle (halt)
- **halt_nummer**: Laufende Nummer der Haltestelle (1, 2, 3, ...)
- **station**: Name der Haltestelle (muss in orte.txt existieren)
- **ankunft**: Ankunftszeit oder null für Startbahnhof
- **abfahrt**: Abfahrtszeit oder null für Zielbahnhof
- **versp_standard**: Standard-Verspätung in Minuten (0 für pünktlich)

### Ausfälle (ausfaelle)
#### Ganz-Ausfall (die komplette Fahrt fährt nicht)
```json
{
  "datum": "2026-01-03",
  "typ": "ganz"
}
```

#### Halt-Ausfall (eine Haltestelle fällt weg)
```json
{
  "datum": "2026-01-10",
  "typ": "halt",
  "halt_nummer": 2
}
```
⚠️ Wenn eine Haltestelle ausfällt, verschieben sich die Zeiten aller nachfolgenden Haltestellen automatisch

### Zusatzhalt (zusatzhalt)
```json
{
  "datum": "2026-01-05",
  "halt_nummer": 5,
  "station": "Potsdam Charlottenhof",
  "zeit": "08:42",
  "abfahrt": "08:43"
}
```
⚠️ Zusatzhaltestellen erfordern 2 Minuten Aufenthalt, danach verschieben sich alle nachfolgenden Zeiten

## Beispiele

### Beispiel 1: Normale wiederholende Fahrt (Mo-Fr)
```json
{
  "variant": "0101",
  "uhrzeit": "08:00",
  "gueltig_von": "2026-01-01",
  "gueltig_bis": "2026-01-31",
  "wochentage": ["Mo", "Di", "Mi", "Do", "Fr"],
  "halte": [...]
}
```
Diese Fahrt fährt jeden Arbeitstag von 1.1. bis 31.1.2026 um 08:00 Uhr ab.

### Beispiel 2: Tägliche Fahrt mit Sonntagen
```json
{
  "variant": "0102",
  "uhrzeit": "14:00",
  "gueltig_von": "2026-01-01",
  "gueltig_bis": "2026-01-31",
  "wochentage": ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  "halte": [...]
}
```
Diese Fahrt fährt JEDEN Tag (Mo-So).

### Beispiel 3: Mit Ausfällen
```json
{
  "ausfaelle": [
    {
      "datum": "2026-01-03",
      "typ": "ganz"
    },
    {
      "datum": "2026-01-10",
      "typ": "halt",
      "halt_nummer": 2
    }
  ]
}
```
- Am 3.1.2026 fährt die ganze Fahrt nicht
- Am 10.1.2026 hält der Zug nicht an der 2. Station

### Beispiel 4: Mit Zusatzhaltestellen
```json
{
  "zusatzhalt": [
    {
      "datum": "2026-01-05",
      "halt_nummer": 5,
      "station": "Potsdam Charlottenhof",
      "zeit": "08:42",
      "abfahrt": "08:43"
    }
  ]
}
```
Am 5.1.2026 wird zwischen Halt 4 und dem ursprünglichen Halt 5 eine zusätzliche Haltestelle eingefügt.

## Neue Fahrplan-Datei erstellen

1. Erstelle eine neue JSON-Datei im entsprechenden Zugtyp-Ordner
2. Bennene sie nach dem Schema: `{ZUGTYP}{LINIENNUMMER}.json` (z.B. `RB205.json`)
3. Kopiere die JSON-Struktur von einer existierenden Datei
4. Bearbeite die Felder entsprechend
5. Stelle sicher, dass alle Stationen in `data/orte.txt` existieren
6. **WICHTIG**: Füge die Datei auch in `script.js` in die `fahrplanDateien` Array ein!

## Wichtig: Dateien in script.js registrieren

Damit neue Fahrplan-Dateien geladen werden, müssen sie in `script.js` in der `loadFahrplaene()` Funktion eingetragen werden:

```javascript
const fahrplanDateien = [
    'data/fahrplan/RB/RB101.json',
    'data/fahrplan/RB/RB201.json',
    // ... weitere Dateien
    'data/fahrplan/RB/RB205.json'  // ← Neue Datei hinzufügen
];
```

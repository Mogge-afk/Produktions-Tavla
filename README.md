# 📋 PLANERINGSTAVLA – Digital Produktion, QR-spårning & Realtids-API

En modern, digital planeringstavla för tillverkande industri och verkstäder. Byggd som en full-stack-applikation med **React 19**, **TypeScript**, **Tailwind CSS**, **Express.js**, **Server-Sent Events (SSE)** och **Vite**.

Systemet ersätter analoga tavlor och magnetremsor med en interaktiv digital tavla på TV-skärm, automatisk import från **IFS Applications / Excel**, utskrift av **följesedlar med QR-koder**, samt **realtidsflytt mellan stationer** när operatörer skannar på golvet.

---

## 🌟 Huvudfunktioner i Översikt

```
           [ IFS Applications / ERP ]
                       │
                       ▼ (Excel / CSV export)
            ┌─────────────────────┐
            │   PLANERINGSTAVLA   │ ◄────── (Central TV-skärm på väggen)
            └──────────┬──────────┘
                       │ (Skriver ut A4 Följesedel med QR)
                       ▼
       ┌───────────────────────────────┐
       │ Följesedel följer pallen/lådan │
       └───────────────┬───────────────┘
                       │
         Skanna vid station med mobil / handskanner
                       │
                       ▼ (POST /api/scan via Wi-Fi / USB)
    [ Express Backend med Server-Sent Events ]
                       │ (Direktpush < 0.1s)
                       ▼
     TV-tavlan flyttar ordern automatiskt!
    (Planerat ➔ Material ➔ Montering ➔ Test ➔ Packning ➔ Klar)
```

---

## 🚀 Detaljerad Funktionsbeskrivning

### 1. Digital Planeringstavla på TV-skärm
- **6 standardstationer**: *Planerat, Material uttaget, Montering, Test, Packning, Klar för leverans*.
- **Flexibel anpassning**: Byt namn på rubriker direkt på tavlan eller skapa egna linor via kolumnhanteraren.
- **Dra och släpp**: Flytta orderkort manuellt med mus/touch eller med snabbknappar.
- **Kiosk- och TV-läge**: Helskärmsvisning med realtidsklocka, skiftinformation och synkronisering.

### 2. Import från IFS Applications (Excel & CSV)
- **Direktknapp i menyn**: Importera `.xlsx`, `.xls` eller `.csv` direkt till kolumnen *Planerat*.
- **Automatisk kolumnmappning**: Känner automatiskt igen vanliga IFS-rubriker:
  - **Ordernummer** (`ORDER_NO`, `Ordernr`, `Order ID`)
  - **Artikelnamn** (`PART_DESCRIPTION`, `Benämning`, `Artikelnamn`)
  - **Artikelnummer** (`PART_NO`, `Artikelnr`, `Artikel`)
  - **Antal** (`QTY_COMPLETE`, `Antal`, `Batch`, `Kvantitet`)
  - **Planerat Leveransdatum** (`PLANNED_DUE_DATE`, `Leveransdatum`, `Klardatum`)
- **Dubletthantering**: Välj om befintliga ordrar ska uppdateras eller hoppas över vid import.
- **Ladda ner mall**: Inbyggd knapp för att ladda ner en färdig testfil för Excel.

### 3. Automatisk Prioritering efter Leveransdatum
- Beräknar automatiskt prioritet utifrån hur nära leveransdatumet är:
  - 🔴 **AKUT**: Förfallet eller leverans inom 2 dagar.
  - 🟡 **HÖG**: Leverans inom 3–7 dagar.
  - ⚪ **NORMAL**: Leverans om mer än 7 dagar.
- Tydlig nedräkning på varje orderkort (t.ex. *"3 dagar kvar"* eller *"Förfallen 1 dag"*).
- Enkelt att manuellt överstyra eller uppdatera alla ordrars prioriteringar med ett klick.

### 4. Utskrift av Följesedlar (Job Travelers) & Etiketter
- **A4 Följesedel**: Genererar en komplett följesedel som följer pallen eller lådan genom verkstaden.
- **QR-koder per station**: Varje stationsrad har en unik QR-kod som anger vart ordern flyttas (t.ex. `➔ Test`).
- **Garanterat fritt från `@`-tecken**: Koderna är ren industristräng eller webblänk. Mobilkameror och skannrar misstolkar dem **aldrig som e-post**.
- **Fristående HTML-export**: Om webbläsarens utskriftsdialog blockeras i en sandboxad miljö finns en knapp för att ladda ner utskriften som en ren `.html`-fil redo att skrivas ut eller sparas som PDF.

### 5. Autoflytt vid Skanning (Montering ➔ Test osv.)
- **Blixtsnabbt flöde på golvet**:
  - När QR-koden för **Montering** skannas flyttas ordern direkt till **Test**.
  - När QR-koden för **Test** skannas flyttas ordern till **Packning**.
  - När QR-koden för **Packning** skannas flyttas ordern till **Klar för leverans**.
- **Växlingsknapp i menyn (`⚡ Autoflytt vid QR: PÅ / AV`)**:
  - **PÅ**: Direkt flytt utan att operatören behöver klicka eller bekräfta.
  - **AV**: Öppnar rapportrutan för manuell inmatning av antal och operatörsnamn.
- **Ångra-funktion**: Rutan som bekräftar flytten innehåller en tydlig **[Ångra]**-knapp om fel kod råkade skannas.

### 6. Arkiv och Slutförda Ordrar
- När en order är klar vid sista stationen kan den slutföras och flyttas till **Arkivet**.
- Egen arkivvy med sökning, historiklogg, stationsrapporter och möjlighet att:
  - Återställa en order till valfri kolumn på tavlan.
  - Exportera arkiverade ordrar till en Excel-rapport.
  - Radera slutförda ordrar permanent (med säkerhetsdialog).

---

## 📱 Golvskanning & Hårdvarulösningar

Systemet stöder tre sätt att skanna på verkstadsgolvet:

### Alternativ 1: Mobiltelefon / Surfplatta (Rekommenderas – 0 kr i hårdvara)
1. Klicka på **”Golvskanner & API”** i toppmenyn på tavlan.
2. Rikta mobilens kamera mot den stora QR-koden på skärmen (eller gå till `https://[tavlans-url]/?mode=scanner`).
3. Mobilen förvandlas omedelbart till en trådlös golvskanner via Wi-Fi.
4. Operatören skannar följesedeln vid maskinen:
   - Mobilen vibrerar och plingar.
   - Skärmen visar grön bekräftelse (*"AO-2026-101: Flyttad till Test"*).
   - **TV-tavlan på väggen plingar till och flyttar orderkortet i samma sekund!**

### Alternativ 2: Trådlös RF-pistol (2.4 GHz med USB-basstation)
- En trådlös industriskanner (t.ex. Netum eller Inateck för ca 500–800 kr).
- USB-vaggan/dongeln kopplas in i datorn som driver TV-skärmen.
- **Räckvidd**: 50–100 meter genom väggar och stålkonstruktioner (betydligt stabilare än Bluetooth).
- Skannern skickar koden rakt in i tavlan som en tangentbordsinmatning (HID wedge).

### Alternativ 3: Zebra / Honeywell Android-handdator
- Professionell handdator med inbyggd laserskanner (t.ex. Zebra TC21/TC26).
- Använder Wi-Fi och anropar tavlans REST API direkt vid avtryck.

---

## 🔌 REST API & Webhooks

Planeringstavlan har ett inbyggt API på port `3000`:

### 1. Skanna och flytta en order: `POST /api/scan`

**Begäran:**
```bash
curl -X POST "http://localhost:3000/api/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "scan": "ORD:AO-2026-101:col-montering",
    "operator": "Kalle.K"
  }'
```

Alternativt med explicita parametrar:
```json
{
  "orderId": "AO-2026-101",
  "stationId": "col-montering",
  "operator": "Kalle.K",
  "quantity": 100
}
```

**Svar (200 OK):**
```json
{
  "success": true,
  "orderId": "AO-2026-101",
  "from": "Montering",
  "to": "Test",
  "message": "✓ Order AO-2026-101 flyttad från \"Montering\" till \"Test\"!"
}
```

### 2. Hämta tavlans status: `GET /api/state`
Returnerar aktuell konfiguration för alla ordrar, kolumner och arkiv i JSON-format.

### 3. Realtidsström (SSE): `GET /api/events`
Server-Sent Events ström som pushar händelser (`ORDER_MOVED`, `ORDERS_UPDATED`, etc.) till alla anslutna skärmar utan fördröjning.

### 4. Python-exempel (Raspberry Pi / Automatiserad lina)
```python
import requests

url = "http://192.168.1.100:3000/api/scan"
data = {
    "scan": "ORD:AO-2026-101:col-montering",
    "operator": "Robot-Cell-1"
}

response = requests.post(url, json=data)
print(response.json())
```

---

## 🛠️ Installation & Drift

### 1. Förutsättningar
- [Node.js](https://nodejs.org/) v18 eller senare.
- npm eller bun installerat.

### 2. Snabbstart lokalt
```bash
# 1. Klona projektet
git clone https://github.com/DITT-NAMN/planeringstavla.git
cd planeringstavla

# 2. Installera beroenden
npm install

# 3. Starta servern i utvecklingsläge
npm run dev
```
Öppna webbläsaren på `http://localhost:3000`.

### 3. Produktionsbygge
```bash
# Bygg frontend
npm run build

# Starta servern för produktion
npm start
```

### 4. Drift på verkstadsgolvet med PM2 (Autostart vid strömavbrott)
Om du kör tavlan på en liten dator (t.ex. Intel NUC eller Raspberry Pi kopplad till TV:n):
```bash
npm install -g pm2
pm2 start server.ts --name "planeringstavla" --interpreter tsx
pm2 save
pm2 startup
```

---

## 📁 Projektstruktur

```
├── server.ts                       # Express backend med REST API och SSE realtidspush
├── data/
│   └── production-state.json       # Persistent databaslagring för ordrar och kolumner
├── src/
│   ├── App.tsx                     # Huvudapplikation och orkestrering
│   ├── components/
│   │   ├── BoardView.tsx           # Själva planeringstavlan med kolumner
│   │   ├── BoardColumn.tsx         # Stationskolumn med drag-and-drop
│   │   ├── OrderCard.tsx           # Orderkort med prioritetsbadge och datumstatus
│   │   ├── Header.tsx              # Toppmeny, klocka, filter, snabbknappar och status
│   │   ├── MobileScannerView.tsx   # Mobilanpassad golvskanner för telefoner
│   │   ├── HardwareGuideModal.tsx  # Guide för skannrar, mobilkoppling och REST API
│   │   ├── ExcelImportModal.tsx    # Excel/IFS import med automatisk kolumnigenkänning
│   │   ├── PrintLabelsModal.tsx    # Dialog för A4-följesedlar och klisteretiketter
│   │   ├── QuickUpdateModal.tsx    # Manuell avrapportering vid skanning
│   │   ├── OrderDetailModal.tsx    # Detaljvy för orderhistorik och ritningar
│   │   ├── StationModeModal.tsx    # Kioskläge för surfplattor vid stationer
│   │   ├── ColumnManagerModal.tsx  # Anpassa rubriker och färgteman
│   │   ├── ArchiveModal.tsx        # Arkivvy med sökning och Excel-export
│   │   └── StatsBar.tsx            # KPI-översikt för ledning och produktion
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces (ProductionOrder, etc.)
│   └── utils/
│       ├── apiSync.ts              # Klient för realtids-SSE och REST API anrop
│       ├── audio.ts                # Industriella ljudpip via Web Audio API
│       ├── excelParser.ts          # Parser för IFS Applications och Excel (.xlsx/.csv)
│       ├── priority.ts             # Automatisk prioritetsberäkning utifrån datum
│       ├── printDocument.ts        # HTML/CSS-generator för A4 följesedlar
│       ├── qr.ts                   # QR-kodgenerering och payload-tolkning (utan @)
│       └── storage.ts              # LocalStorage fallback & synkronisering
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Säkerhet & Nätverk på Företaget
- Servern lyssnar som standard på alla gränssnitt (`0.0.0.0:3000`).
- Se till att datorn som kör tavlan har en fast IP-adress på ert lokala nätverk (t.ex. `192.168.1.50`).
- Alla enheter på samma Wi-Fi kan då nå tavlan och skannern via `http://192.168.1.50:3000`.

---

## 📄 Licens
Detta projekt är fritt att använda, anpassa och bygga vidare på inom er verksamhet.

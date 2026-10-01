# 📋 PLANERINGSTAVLA – Digital Produktion, QR-spårning & Realtids-API

En modern, digital planeringstavla för tillverkande industri och mekaniska/elektroniska verkstäder. Byggd som en full-stack-applikation med **React 19**, **TypeScript**, **Tailwind CSS**, **Express.js**, **Server-Sent Events (SSE)** och **Vite**.

Systemet ersätter analoga whiteboards och magnetremsor med en interaktiv tavla på TV-skärm, automatisk import från **ERP-system / Excel**, utskrift av **följesedlar med QR-koder**, samt **realtidsflytt mellan stationer** när operatörer skannar på golvet – med fullt **Offline-skydd om nätverket skulle gå ner**.

---

## 📑 Innehållsförteckning

1. [Systemöversikt & Arbetsflöde](#-systemöversikt--arbetsflöde)
2. [Huvudfunktioner i Tavlan](#-huvudfunktioner-i-tavlan)
3. [Skanning på Golvet: Bluetooth vs 2.4 GHz vs Mobil](#-skanning-på-golvet-bluetooth-vs-24-ghz-vs-mobil)
4. [Offline-kö & Hantering av Nätverksbortfall](#-offline-kö--hantering-av-nätverksbortfall)
5. [Utskrift av Följesedlar & QR-koder](#-utskrift-av-följesedlar--qr-koder)
6. [Import från ERP-system (Excel & CSV)](#-import-från-erp-system-excel--csv)
7. [REST API & Webhooks Dokumentation](#-rest-api--webhooks-dokumentation)
8. [Installation & Driftsättning](#-installation--driftsättning)
9. [Projektstruktur](#-projektstruktur)
10. [Vanliga Frågor (FAQ) & Felsökning](#-vanliga-frågor-faq--felsökning)

---

## 🌟 Systemöversikt & Arbetsflöde

```
                 [ ERP-System ]
                         │
                         ▼ (Excel / CSV export med tillverkningsordrar)
              ┌─────────────────────┐
              │   PLANERINGSTAVLA   │ ◄────── (Central TV-skärm på verkstadsväggen)
              └──────────┬──────────┘
                         │ (Skriver ut A4 Följesedel med stationsunika QR-koder)
                         ▼
         ┌───────────────────────────────┐
         │ Följesedel följer pall/låda   │
         └───────────────┬───────────────┘
                         │
        Operatören skannar QR vid avslutad operation
         (Mobilkamera / 2.4GHz handskanner / Zebra)
                         │ (Skannas 1 gång ➔ fönstret stängs ➔ ordern flyttas!)
                         ▼
        ┌────────────────────────────────┐
        │  Har enheten nätverkskontakt?  │
        └───────┬────────────────┬───────┘
           JA   │                │   NEJ (Internet/Wi-Fi nere)
                ▼                ▼
    [ POST /api/scan ]    [ Sparas i lokal Offline-kö ]
         (Blixtsnabbt)           │ (Ingen data tappas!)
                │                ▼
                │         Nätverket återvänder:
                │         Tömmer kön automatiskt (FIFO)
                │                │
                └────────┬───────┘
                         ▼
       [ Express Backend med SSE-Push ]
                         │ (< 0.1 sek fördröjning)
                         ▼
         TV-tavlan flyttar orderkortet!
  (Planerat ➔ Material ➔ Montering ➔ Test ➔ Packning ➔ Klar)
```

---

## 🚀 Huvudfunktioner i Tavlan

### 1. Digital Planeringstavla på TV-skärm
- **6 standardstationer**: *Planerat, Material uttaget, Montering, Test, Packning, Klar för leverans*.
- **Flexibel anpassning**: Byt namn på rubriker och färger direkt på tavlan eller skapa egna linor via kolumnhanteraren.
- **Dra och släpp**: Flytta orderkort manuellt med mus/touch eller med snabbknappar.
- **Kiosk- och TV-läge**: Helskärmsvisning med realtidsklocka, skiftinformation och direkt live-synkronisering.

### 2. Autoflytt vid QR-skanning (Montering ➔ Test osv.)
- **Blixtsnabbt flöde på golvet**:
  - När QR-koden för **Montering** skannas flyttas ordern direkt till **Test**.
  - När QR-koden för **Test** skannas flyttas ordern till **Packning**.
  - När QR-koden för **Packning** skannas flyttas ordern till **Klar för leverans**.
- **Växlingsknapp i menyn (`⚡ Autoflytt vid QR: PÅ / AV`)**:
  - **PÅ**: Direkt stationsflytt utan att operatören behöver klicka eller bekräfta.
  - **AV**: Öppnar rapportfönstret för manuell inmatning av antal, godkända enheter och operatörsnamn.
- **Ångra-knapp**: Bekräftelse-toasten har en direkt **[Ångra]**-knapp om fel kod råkade skannas.

### 3. Automatisk Prioritering efter Leveransdatum
- Beräknar automatiskt prioritet utifrån hur nära leveransdatumet är:
  - 🔴 **AKUT**: Förfallet eller leverans inom 2 dagar.
  - 🟡 **HÖG**: Leverans inom 3–7 dagar.
  - ⚪ **NORMAL**: Leverans om mer än 7 dagar.
- Tydlig nedräkning på varje orderkort (t.ex. *"3 dagar kvar"* eller *"Förfallen 1 dag"*).

### 4. Arkiv och Slutförda Ordrar
- När en order nått sista stationen kan den flyttas till **Arkivet**.
- Egen arkivvy med sökning, historiklogg, stationsrapporter och möjlighet att:
  - Återställa en order tillbaka till valfri kolumn på tavlan.
  - Exportera arkiverade ordrar till en Excel-rapport.
  - Radera slutförda ordrar permanent (med säkerhetsdialog).

---

## 📱 Skanning på Golvet: Bluetooth vs 2.4 GHz vs Mobil

Användare frågar ofta: *"Skulle jag kunna ha en Bluetooth handskanner inkopplad till tavlan, eller finns det en bättre lösning?"*

Här är en överskådlig jämförelse av de olika alternativen för en tillverkningsverkstad:

| Lösning | Räckvidd | Kostnad | Fördelar | Nackdelar & Risker |
| :--- | :--- | :--- | :--- | :--- |
| **Alternativ 1: Mobiltelefon / Surfplatta (Wi-Fi)** *(Bäst start)* | Hela verkstaden (Wi-Fi/4G) | **0 kr** (Finns redan) | Operatören bär den i fickan, kamerasökare, haptisk vibration, fungerar direkt | Kräver Wi-Fi eller mobilnät (men har fullt offline-stöd) |
| **Alternativ 2: Trådlös 2.4 GHz RF-pistol med USB-vagga** *(Bäst för fast station)* | **50–100 meter** | 500–800 kr | Tränger igenom plåt och stålkonstruktioner, stabilare än Bluetooth, plug & play | Kräver att USB-dongeln sitter i datorn vid TV-skärmen |
| **Alternativ 3: Bluetooth Handskanner** | **Max 8–10 meter** | 400–1200 kr | Trådlös utan kablar | **Varning i verkstad:** Tappar lätt anslutning bakom stålskåp/maskiner. Operatören måste gå fram till TV:n för att para om. |
| **Alternativ 4: Zebra / Honeywell Android-handdator** | Obegränsad (Wi-Fi) | 3000–6000 kr | Blixtsnabb laser, tål fall i betonggolv, anropar REST API | Högre inköpspris |

### Vår rekommendation:
1. **Börja med mobilen**: Klicka på **”Golvskanner & API”** i menyn på TV-tavlan, skanna QR-koden med mobilen (eller gå till `https://[tavlans-ip]/?mode=scanner`). Nu har ni en trådlös golvskanner utan att ha köpt en enda pryl!
2. **Vid fast packstation eller montering**: Köp en **2.4 GHz RF-skanner** (med liten USB-dongel som sätts i TV-datorn, t.ex. från Inateck eller Netum). Det är mycket mer driftsäkert än Bluetooth i industriell miljö.

---

## 📴 Offline-kö & Hantering av Nätverksbortfall

I en verkstad kan Wi-Fi tillfälligt försvinna, en operatör kan gå bakom ett plåtskåp där täckningen är noll, eller internetleverantören kan ha ett avbrott. 

**Med denna planeringstavla går inga skanningar förlorade:**

```
[ Operatör skannar QR ]
           │
           ▼
Finns nätverkskontakt?
 ├── JA  ➔ Skickas direkt via POST /api/scan ➔ TV-tavlan flyttar ordern direkt.
 └── NEJ ➔ Sparas i lokal Offline-kö (LocalStorage i webbläsaren / mobilen).
           Visar gul bekräftelse: "✓ Sparad offline! Flyttas till Test vid uppkoppling."
           Operatören kan tryggt fortsätta arbeta och skanna nästa order.
           │
           ▼ (Nätverket återvänder)
Systemet upptäcker automatiskt anslutningen (online-event + health check).
Tömmer offline-kön automatiskt i FIFO-ordning (först in, först ut).
TV-tavlan flyttar orderna och visar grön notis:
"✓ Återansluten! X offline-skanningar har synkats till tavlan."
```

### Egenskaper hos Offline-kön:
1. **Persistent lagring**: Skanningarna sparas i webbläsarens interna `LocalStorage`. Om mobilen stängs av, webbläsaren stängs eller laddas om finns kön kvar orörd.
2. **Automatisk detektering**: Lyssnar på `window.online`-händelser och pollar `/api/health` var 5:e sekund när det finns osparade poster i kön.
3. **Visuell indikator**: Både på TV-tavlan och i mobilen visas en gul pulserande badge: **`[ ⏳ X väntar på nätverk ]`**.
4. **Hanteringsmodal**: Klicka på badgen för att se alla köade skanningar (ordernummer, klockslag, station, operatör), tvinga en manuell synkronisering, eller slå på **"Simulera nätverksbortfall"** för att testa funktionen direkt i webbläsaren!

---

## 📄 Utskrift av Följesedlar & QR-koder

Systemet innehåller en dedikerad generator för **A4 Följesedlar (Job Travelers)** och **klisteretiketter**:

1. **A4 Följesedel**:
   - Skrivs ut när ordern startas och placeras i en plastficka på pallen eller i transportlådan.
   - Innehåller stor Master-QR för ordern samt en tabell med alla operationer.
   - **Stationsunika QR-koder**: Varje rad (t.ex. *Material*, *Montering*, *Test*, *Packning*) har en egen QR-kod märkt med vart ordern flyttas (t.ex. `➔ Test`).
2. **Garanterat fritt från `@`-tecken**:
   - Koderna använder rena format (`ORD:AO-2026-101:col-montering` eller rena webblänkar).
   - Mobiltelefoner och streckkodsläsare tolkar dem **aldrig som e-postadresser**, utan alltid som giltiga produktionskoder!
3. **Fristående HTML-export**:
   - Om webbläsarens utskriftsdialog blockeras i sandboxad miljö finns knappen **"Exportera som HTML / Skriv ut"** som laddar ner följesedeln som en ren `.html`-fil redo att öppnas och skrivas ut på valfri skrivare.

---

## 📊 Import från ERP-system (Excel & CSV)

Det är enkelt att få in tillverkningsordrar från företagets ERP-system:

1. Klicka på **”Importera Excel / ERP”** i toppmenyn.
2. Dra in din exporterade `.xlsx`-, `.xls`- eller `.csv`-fil från ert affärssystem (t.ex. listan *Tillverkningsordrar* eller *Tillverkningsorderförteckning*).
3. Systemet känner automatiskt igen standardkolumner från ERP-system och affärssystem:
   - **Ordernummer**: `Ordernr`, `Order ID`, `Tillverkningsorder`, `ORDER_NO`, `Tillvorder`
   - **Artikelnummer**: `Artikelnr`, `Artikelnummer`, `PART_NO`, `Artikel`, `Materialnr`
   - **Artikelnamn / Benämning**: `Benämning`, `Artikelbenämning`, `PART_DESCRIPTION`, `Beskrivning`
   - **Antal**: `Antal`, `Orderantal`, `QTY_COMPLETE`, `Kvantitet`, `Batch`
   - **Planerat Leveransdatum**: `Leveransdatum`, `Klardatum`, `Färdigdatum`, `PLANNED_DUE_DATE`
   - **Kund / Projekt**: `Kund`, `Kundnamn`, `CUSTOMER_NAME`, `Mottagare`
   - **Ritningsnummer**: `Ritningsnummer`, `Ritningsnr`, `Drawing_No`
4. Välj måldestination (standard är kolumnen *Planerat*) samt dubletthantering:
   - **Uppdatera befintliga**: Om ordern redan finns uppdateras datum, antal och status utan att förlora historik eller loggar.
   - **Hoppa över befintliga**: Lägger endast till nya ordrar.
5. Inbyggd knapp för att ladda ner en färdig testfil i Excel-format (**"Ladda ner ERP / Excel-exempelfil"**) finns i dialogen.

---

## 🔌 REST API & Webhooks Dokumentation

Planeringstavlan har ett inbyggt REST API på port `3000`:

### 1. Registrera skanning & flytta order: `POST /api/scan`

Kan anropas av handdatorer, mobiltelefoner, automatiserade robotceller eller externa skript:

**Begäran:**
```bash
curl -X POST "http://localhost:3000/api/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "scan": "ORD:AO-2026-101:col-montering",
    "operator": "Kalle.K",
    "quantity": 100
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
  "message": "✓ Order AO-2026-101 flyttad från \"Montering\" till \"Test\"!",
  "order": { ... }
}
```

### 2. Batch-skanning (vid återanslutning från offline): `POST /api/scan/batch`
Används när en mobil eller handskanner varit offline och vill skicka flera ackumulerade skanningar på en gång:
```json
{
  "scans": [
    { "scan": "ORD:AO-2026-101:col-material", "operator": "Kalle.K" },
    { "scan": "ORD:AO-2026-102:col-montering", "operator": "Lisa.M" }
  ]
}
```

### 3. Hämta tavlans hela status: `GET /api/state`
Returnerar aktuell konfiguration för alla aktiva ordrar, kolumner och arkiverade ordrar:
```json
{
  "orders": [ ... ],
  "columns": [ ... ],
  "archivedOrders": [ ... ],
  "lastUpdated": "2026-09-30T10:15:30.000Z"
}
```

### 4. Realtidsström (SSE): `GET /api/events`
Server-Sent Events ström som pushar händelser (`ORDER_MOVED`, `ORDERS_UPDATED`, `COLUMNS_UPDATED`) till alla anslutna skärmar utan fördröjning.

### 5. Hälsokontroll: `GET /api/health`
Returnerar anslutningsstatus och antal anslutna skärmar:
```json
{
  "status": "ok",
  "connectedClients": 3,
  "ordersCount": 12,
  "archivedCount": 45,
  "lastUpdated": "2026-09-30T10:15:30.000Z"
}
```

### 6. Python-exempel (Raspberry Pi / Automatiserad cell / PLC)
```python
import requests

url = "http://192.168.1.50:3000/api/scan"
payload = {
    "scan": "ORD:AO-2026-101:col-montering",
    "operator": "Robot-Cell-3",
    "quantity": 50
}

try:
    response = requests.post(url, json=payload, timeout=3)
    data = response.json()
    if data.get("success"):
        print(f"Order flyttad till {data.get('to')}!")
except requests.exceptions.RequestException as e:
    print(f"Nätverksfel – spara i lokal offline-fil: {e}")
```

---

## 🛠️ Installation & Driftsättning

### 1. Förutsättningar
- [Node.js](https://nodejs.org/) v18 eller senare.
- npm eller bun installerat.

### 2. Snabbstart lokalt (Utveckling)
```bash
# 1. Klona eller ladda ner projektet
git clone https://github.com/DITT-FORETAG/planeringstavla.git
cd planeringstavla

# 2. Installera beroenden
npm install

# 3. Starta full-stack servern (Express + Vite middlewares på port 3000)
npm run dev
```
Öppna webbläsaren på `http://localhost:3000`.

### 3. Produktionsbygge
```bash
# Bygg frontend
npm run build

# Starta servern i produktionsläge
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

### 5. Starta TV-skärmen automatiskt i Kioskläge (Helskärm)
Lägg till ett autostart-skript på datorn som startar webbläsaren i ren helskärm utan menyer:
```bash
# Google Chrome / Chromium i helskärm:
google-chrome --kiosk --noerrdialogs --disable-infobars http://localhost:3000
```

---

## 📁 Projektstruktur

```
├── server.ts                       # Express backend med REST API, batch-skanning och SSE realtidspush
├── data/
│   └── production-state.json       # Persistent databaslagring för ordrar, kolumner och arkiv
├── src/
│   ├── App.tsx                     # Huvudapplikation med orkestrering, tangentbordslyssnare och offline-hantering
│   ├── components/
│   │   ├── BoardView.tsx           # Själva planeringstavlan med stationer
│   │   ├── BoardColumn.tsx         # Kolumn med drag-and-drop och orderkort
│   │   ├── OrderCard.tsx           # Orderkort med prioritetsbadge och datumstatus
│   │   ├── Header.tsx              # Toppmeny, klocka, filter, offline-köbadge och snabbknappar
│   │   ├── MobileScannerView.tsx   # Mobilanpassad golvskanner för telefoner med offline-stöd
│   │   ├── OfflineQueueModal.tsx   # Modal för att hantera och synka väntande offline-skanningar
│   │   ├── HardwareGuideModal.tsx  # Guide för skannrar, mobilkoppling, offline-drift och REST API
│   │   ├── ExcelImportModal.tsx    # Excel- och ERP-system import med automatisk kolumnigenkänning
│   │   ├── PrintLabelsModal.tsx    # Dialog för A4-följesedlar och klisteretiketter (utan @-tecken)
│   │   ├── QuickUpdateModal.tsx    # Manuell avrapportering vid skanning
│   │   ├── OrderDetailModal.tsx    # Detaljvy för orderhistorik, ritningar och rapporter
│   │   ├── StationModeModal.tsx    # Kioskläge för surfplatta på en specifik station
│   │   ├── ColumnManagerModal.tsx  # Anpassa rubriker, färger och linor
│   │   ├── ArchiveModal.tsx        # Arkivvy med sökning, återställning och Excel-export
│   │   └── StatsBar.tsx            # KPI-översikt (aktiva ordrar, akuta, förfallna)
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces (ProductionOrder, ColumnConfig, etc.)
│   └── utils/
│       ├── offlineQueue.ts         # Offline-first köhanterare med LocalStorage och auto-synk
│       ├── apiSync.ts              # Klient för realtids-SSE och REST API anrop
│       ├── audio.ts                # Industriella ljudpip via Web Audio API
│       ├── excelParser.ts          # Parser för ERP-system / Excel (.xlsx/.csv)
│       ├── priority.ts             # Automatisk prioritetsberäkning utifrån leveransdatum
│       ├── printDocument.ts        # HTML/CSS-generator för A4 följesedlar
│       ├── qr.ts                   # QR-kodgenerering och payload-tolkning
│       └── storage.ts              # LocalStorage fallback & synkronisering
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ❓ Vanliga Frågor (FAQ) & Felsökning

### Q1: Varför tolkas min QR-kod som en e-postadress i telefonen?
**Svar:** Vissa QR-kodläsare tolkar koder som innehåller `@` eller vissa specialtecken som e-postadresser (`mailto:`). Denna planeringstavla har specialanpassats så att alla genererade koder är **100% garanterat fria från `@`** och använder standardiserade industriprefix (`ORD:AO-2026-101:col-montering`) eller rena webblänkar. Dessutom tvättar skannern automatiskt bort eventuella `mailto:`-prefix om en tredjeparts-app skulle lägga till det.

### Q2: Vad händer om strömmen går eller servern startas om?
**Svar:** All data sparas i JSON-filen `data/production-state.json` på disk samt i webbläsarens `LocalStorage`. När servern startar upp igen laddas det exakta läget direkt och alla skärmar återansluts automatiskt via SSE.

### Q3: Kan flera skärmar visa tavlan samtidigt?
**Svar:** Ja! Flera TV-apparater, datorer på kontoret och surfplattor vid maskinerna kan ha tavlan öppen samtidigt. När någon flyttar en order på tavlan eller skannar en QR-kod på golvet uppdateras **alla skärmar inom en tiondels sekund**.

### Q4: Hur testar jag offline-kön utan att dra ut nätverkskabeln?
**Svar:** 
1. Klicka på **Offline-kö (0)** i toppmenyn.
2. Slå på **"Testa funktionen (Simulera nätverksbortfall)"**.
3. Skanna en order med QR eller handskanner.
4. Se hur den direkt sparas i kön och visar en tydlig gul bekräftelse.
5. Slå av simuleringen (eller klicka på "Synka nu") och se ordern omedelbart flytta sig på tavlan med en grön ljudsignal!

---

## 🔒 Nätverk & Säkerhet
- Servern lyssnar som standard på alla nätverkskort (`0.0.0.0:3000`).
- Sätt en fast IP på datorn som driver TV-skärmen (t.ex. `192.168.1.100`).
- Alla enheter på samma Wi-Fi når tavlan via `http://192.168.1.100:3000`.
- Ingen extern internetuppkoppling krävs – systemet fungerar helt lokalt i ert interna nätverk!

---

## 📄 Licens
Detta system är framtaget för att underlätta och digitalisera svensk tillverkningsindustri. Fritt att använda, anpassa och utveckla vidare i er verksamhet!

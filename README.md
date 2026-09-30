# PLANERINGSTAVLA – Digital Produktion & QR-spårning

En modern, digital planeringstavla för verkstäder och tillverkande industri. Byggd med React, TypeScript, Vite och Tailwind CSS.

Inspirerad av fysiska planeringstavlor med anpassningsbara kolumnrubriker, stations- och produktbundna QR-koder, följesedlar och realtidsinrapportering.

https://mogge-afk.github.io/Planerings-tavla/

---

## 🚀 Funktioner

1. **Digital Planeringstavla**
   - 6 standardstationer med färgkodning från verkstadsunderlaget: *Planerat, Material uttaget, Montering, Test, Packning, Klar för leverans*.
   - Möjlighet att byta namn på rubriker direkt på tavlan eller via kolumnhanteraren.
   - Dra och släpp kort mellan stationer eller använd snabbpilar.

2. **Stations- & Produktbundna QR-koder**
   - Varje stationssteg på följesedeln har en unik QR-kod som binder både ordern och den specifika stationen (t.ex. `AO-2026-101@col-montering`).
   - Vid skanning öppnas direkt formuläret med:
     - **Namn**: Operatörens namn (t.ex. `Kalle.K`), sparas lokalt.
     - **Antal**: Antal klara detaljer i aktuell delbatch (t.ex. `30` st).
     - **Totalt**: Ackumuleras automatiskt (t.ex. `30` av `100` st).
     - **Order**: Hela orderns kvantitet (t.ex. `100` st).
   - Resten av informationen (kund, artikelnummer, ritningsnummer, historik) visas automatiskt.

3. **Utskrift av Följesedlar (Job Travelers) & Etiketter**
   - Skriv ut A4-följesedlar med alla stations-QR-koder och signaturrader redo för verkstadsgolvet.
   - Skriv ut kompakta klisteretiketter för pallar och backar.

4. **Stationsläge / Arbetsplatsterminal**
   - Kioskläge för surfplattor monterade vid specifika stationer (t.ex. montering eller test).

5. **Realtidssynkning**
   - Uppdateringar synkas direkt mellan öppna flikar och enheter (t.ex. mellan en skannande mobil och en TV-skärm på väggen) via `BroadcastChannel`.

---

## 🛠️ Kom igång lokalt

1. **Klona repot**:
   ```bash
   git clone https://github.com/DITT-ANVANDARNAMN/planeringstavla.git
   cd planeringstavla
   ```

2. **Installera beroenden**:
   ```bash
   npm install
   ```

3. **Starta utvecklingsservern**:
   ```bash
   npm run dev
   ```
   Öppna webbläsaren på `http://localhost:3000`.

4. **Bygg för produktion**:
   ```bash
   npm run build
   ```

---

## 🌐 Publicera till GitHub & Visa upp

### Steg 1: Skapa ett nytt repo på GitHub
1. Gå till [github.com/new](https://github.com/new).
2. Döp repot till t.ex. `planeringstavla` eller `digital-production-board`.
3. Välj **Public** och klicka **Create repository**.

### Steg 2: Länka och pusha koden från terminalen
```bash
git init
git add .
git commit -m "Initial commit: Digital Planeringstavla med QR-flöde"
git branch -M main
git remote add origin https://github.com/DITT-ANVANDARNAMN/planeringstavla.git
git push -u origin main
```

---

## ⚡ Enkel publicering av live-demo (Gratis)

För att andra ska kunna testa appen live via en länk:

### Alternativ A: Vercel (Rekommenderas – 1 minut)
1. Gå till [vercel.com](https://vercel.com) och logga in med ditt GitHub-konto.
2. Klicka **Add New Project** och välj ditt `planeringstavla`-repo.
3. Klicka **Deploy**. Vercel bygger appen automatiskt och ger dig en länk (t.ex. `https://planeringstavla.vercel.app`).

### Alternativ B: GitHub Pages
1. Installera `gh-pages`:
   ```bash
   npm install -D gh-pages
   ```
2. Lägg till i `package.json`:
   ```json
   "homepage": "https://DITT-ANVANDARNAMN.github.io/planeringstavla",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
3. Kör:
   ```bash
   npm run deploy
   ```

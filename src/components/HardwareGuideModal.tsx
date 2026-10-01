import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Scan, 
  Radio, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  ArrowRight,
  Tv,
  HelpCircle,
  Sparkles,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { generateQRCodeDataUrl } from '../utils/qr';

interface HardwareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMobileMode: () => void;
  onOpenOfflineQueue?: () => void;
}

export const HardwareGuideModal: React.FC<HardwareGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenMobileMode,
  onOpenOfflineQueue,
}) => {
  const [activeTab, setActiveTab] = useState<'recommendation' | 'mobile_pairing' | 'bluetooth_vs_rf' | 'offline_queue' | 'api_docs'>('recommendation');
  const [mobileUrlQR, setMobileUrlQR] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Generate pairing QR for mobile
  React.useEffect(() => {
    if (!isOpen) return;
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const mobileScannerUrl = `${currentOrigin}?mode=scanner`;
    generateQRCodeDataUrl(mobileScannerUrl, { width: 280, margin: 2 }).then(setMobileUrlQR);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://dintavla.se';
  const mobileScannerUrl = `${currentOrigin}?mode=scanner`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const curlExample = `curl -X POST "${currentOrigin}/api/scan" \\
  -H "Content-Type: application/json" \\
  -d '{"scan": "ORD:AO-2026-101:col-montering", "operator": "Kalle.K"}'`;

  const pythonExample = `import requests

# Exempel: Körs från Raspberry Pi, automatisk streckkodsläsare eller ERP-system-integration
url = "${currentOrigin}/api/scan"
payload = {
    "scan": "ORD:AO-2026-101:col-montering",
    "operator": "Kalle.K"
}
response = requests.post(url, json=payload)
print(response.json()) # Returnerar: {"success": True, "to": "Test", ...}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-neutral-950 font-black">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase font-sans">
                Guide: Skannrar, Golvhårdvara & Realtids-API
              </h2>
              <p className="text-xs text-neutral-400">
                Hur du kopplar skannrar på verkstadsgolvet mot planeringstavlan i realtid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-100 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('recommendation')}
            className={`py-3 px-4 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer border-b-2 ${
              activeTab === 'recommendation'
                ? 'border-neutral-950 text-neutral-950 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Vilken lösning är bäst?</span>
          </button>

          <button
            onClick={() => setActiveTab('mobile_pairing')}
            className={`py-3 px-4 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer border-b-2 ${
              activeTab === 'mobile_pairing'
                ? 'border-neutral-950 text-neutral-950 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Koppla Mobil som Golvskanner</span>
          </button>

          <button
            onClick={() => setActiveTab('bluetooth_vs_rf')}
            className={`py-3 px-4 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer border-b-2 ${
              activeTab === 'bluetooth_vs_rf'
                ? 'border-neutral-950 text-neutral-950 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Scan className="w-4 h-4 text-sky-600" />
            <span>Bluetooth vs 2.4 GHz vs Handdator</span>
          </button>

          <button
            onClick={() => setActiveTab('offline_queue')}
            className={`py-3 px-4 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer border-b-2 ${
              activeTab === 'offline_queue'
                ? 'border-neutral-950 text-neutral-950 bg-white font-black'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <WifiOff className="w-4 h-4 text-amber-600" />
            <span>Offline & Nätverksbortfall</span>
          </button>

          <button
            onClick={() => setActiveTab('api_docs')}
            className={`py-3 px-4 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer border-b-2 ${
              activeTab === 'api_docs'
                ? 'border-neutral-950 text-neutral-950 bg-white font-black'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Server className="w-4 h-4 text-purple-600" />
            <span>Realtids-API (POST /api/scan)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-800">

          {/* TAB 1: Recommendations */}
          {activeTab === 'recommendation' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
                <h3 className="font-black text-emerald-950 text-base mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Svar: Är Bluetooth-skanner till TV:n bäst, eller finns en bättre lösning?</span>
                </h3>
                <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                  En Bluetooth-skanner kopplad direkt till TV-datorn fungerar <strong>bara om operatören står nära TV:n</strong> (max 10 meter). På ett verkstadsgolv med maskiner, stålpelare och avstånd tappar Bluetooth snabbt signalen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Option 1 */}
                <div className="p-4 bg-white border-2 border-emerald-500 rounded-xl shadow-xs space-y-2 relative">
                  <span className="absolute -top-3 right-3 px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-full tracking-wider">
                    Enklast & Gratis
                  </span>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <Smartphone className="w-5 h-5" />
                    <h4>1. Mobiltelefon / Surfplatta</h4>
                  </div>
                  <p className="text-xs text-neutral-600">
                    Operatörerna använder sin vanliga mobiltelefon eller en gemensam surfplatta via företagets Wi-Fi.
                  </p>
                  <ul className="text-xs space-y-1 text-neutral-700 list-disc pl-4">
                    <li>Räckvidd: Hela fabriken (Wi-Fi).</li>
                    <li>Kostnad: 0 kr (ingen ny hårdvara).</li>
                    <li>TV:n på väggen uppdateras direkt i realtid via API:et.</li>
                  </ul>
                  <button
                    onClick={() => setActiveTab('mobile_pairing')}
                    className="w-full mt-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded transition cursor-pointer"
                  >
                    Visa QR för att koppla mobil →
                  </button>
                </div>

                {/* Option 2 */}
                <div className="p-4 bg-white border-2 border-sky-400 rounded-xl shadow-xs space-y-2 relative">
                  <span className="absolute -top-3 right-3 px-2 py-0.5 bg-sky-600 text-white font-black text-[10px] uppercase rounded-full tracking-wider">
                    Industriell PC
                  </span>
                  <div className="flex items-center gap-2 text-sky-800 font-bold">
                    <Radio className="w-5 h-5" />
                    <h4>2. Trådlös 2.4 GHz RF-pistol</h4>
                  </div>
                  <p className="text-xs text-neutral-600">
                    En streckkodsläsare med <strong>USB-basstation/dongel</strong> inkopplad i datorn som driver TV-skärmen (inte Bluetooth).
                  </p>
                  <ul className="text-xs space-y-1 text-neutral-700 list-disc pl-4">
                    <li>Räckvidd: 50–100 meter genom väggar.</li>
                    <li>Robust stöttålig pistol (t.ex. Netum eller Inateck för ca 400–700 kr).</li>
                    <li>Skannar rakt in i tavlan som tangentbord.</li>
                  </ul>
                </div>

                {/* Option 3 */}
                <div className="p-4 bg-white border-2 border-purple-400 rounded-xl shadow-xs space-y-2 relative">
                  <span className="absolute -top-3 right-3 px-2 py-0.5 bg-purple-600 text-white font-black text-[10px] uppercase rounded-full tracking-wider">
                    Proffs / Fabrik
                  </span>
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <Scan className="w-5 h-5" />
                    <h4>3. Zebra / Honeywell Handdator</h4>
                  </div>
                  <p className="text-xs text-neutral-600">
                    Dedikerad Android-streckkodsterminal (t.ex. Zebra TC21/TC26) med inbyggd laserskanner.
                  </p>
                  <ul className="text-xs space-y-1 text-neutral-700 list-disc pl-4">
                    <li>Kopplad över Wi-Fi.</li>
                    <li>Skickar skanningar direkt till tavlans <code>POST /api/scan</code>.</li>
                    <li>Extremt tålig och snabb för industrimiljöer.</li>
                  </ul>
                </div>

              </div>

              {/* Real-time sync explanation */}
              <div className="p-4 bg-neutral-50 border border-neutral-300 rounded-xl space-y-2">
                <h4 className="font-black text-neutral-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Hur hänger Fronten (TV:n) och Operatörerna ihop i realtid?</span>
                </h4>
                <div className="text-xs text-neutral-700 space-y-1.5 leading-relaxed">
                  <p>
                    Nu har vi byggt en komplett <strong>Full-Stack arkitektur</strong> med en backend-server:
                  </p>
                  <div className="p-3 bg-neutral-900 text-neutral-200 rounded-lg font-mono text-xs space-y-1">
                    <div>1. <strong>Operatören skannar</strong> vid sin maskin (med mobil, Zebra eller handskanner).</div>
                    <div>2. Skanningen skickas automatiskt till servern: <code>POST /api/scan</code>.</div>
                    <div>3. Servern flyttar ordern (t.ex. Montering ➔ Test) och sparar i databasen.</div>
                    <div>4. Servern <strong>skickar direkt en signal via Server-Sent Events (SSE)</strong> till alla öppna skärmar.</div>
                    <div className="text-emerald-400 font-bold">5. TV:n på väggen plingar till och flyttar orderkortet automatiskt på under 0.1 sekund!</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Mobile Pairing */}
          {activeTab === 'mobile_pairing' && (
            <div className="space-y-6">
              <div className="text-center max-w-lg mx-auto space-y-2">
                <h3 className="text-lg font-black text-neutral-900">
                  Koppla en mobiltelefon som golvskanner
                </h3>
                <p className="text-xs text-neutral-600">
                  Rikta din mobiltelefons kamera mot QR-koden nedan för att öppna den mobila skannern. Telefonen blir en trådlös golvskanner kopplad mot denna tavla!
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl max-w-sm mx-auto">
                {mobileUrlQR ? (
                  <img
                    src={mobileUrlQR}
                    alt="Mobilskanner QR"
                    className="w-56 h-56 p-2 bg-white rounded-xl border border-neutral-300 shadow-md"
                  />
                ) : (
                  <div className="w-56 h-56 bg-neutral-200 animate-pulse rounded-xl" />
                )}

                <div className="mt-4 text-center space-y-1">
                  <span className="font-mono text-xs font-bold text-neutral-900 block truncate max-w-xs">
                    {mobileScannerUrl}
                  </span>
                  <button
                    onClick={() => copyToClipboard(mobileScannerUrl, 'url')}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-bold text-xs transition cursor-pointer"
                  >
                    {copiedText === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'url' ? 'Kopierad länk!' : 'Kopiera länk'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Testa direkt i denna webbläsare:</span>
                </div>
                <p>
                  Vill du provköra den mobila operatörsvyn direkt på denna dator?
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenMobileMode();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Växla till mobil skannervy här</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Bluetooth vs RF vs Handheld */}
          {activeTab === 'bluetooth_vs_rf' && (
            <div className="space-y-4">
              <h3 className="font-black text-neutral-900 text-base">
                Jämförelse av hårdvarualternativ på verkstadsgolvet
              </h3>

              <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 text-white">
                      <th className="p-3">Lösning</th>
                      <th className="p-3">Räckvidd</th>
                      <th className="p-3">Hur det kopplas</th>
                      <th className="p-3">Fördelar</th>
                      <th className="p-3">Nackdelar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr className="bg-white">
                      <td className="p-3 font-bold text-neutral-900">
                        📱 Mobiltelefon / Surfplatta
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">Obegränsad (Wi-Fi)</td>
                      <td className="p-3">Öppna tavlans mobillänk</td>
                      <td className="p-3 text-emerald-700 font-medium">Kostnadsfritt, ingen extra hårdvara, vibrationsfeedback</td>
                      <td className="p-3 text-neutral-500">Kräver att operatören har telefon eller platta</td>
                    </tr>
                    <tr className="bg-neutral-50">
                      <td className="p-3 font-bold text-neutral-900">
                        📡 2.4 GHz RF Trådlös pistol
                      </td>
                      <td className="p-3 font-mono font-bold text-sky-700">50–100 meter</td>
                      <td className="p-3">USB-dongel i TV-datorn</td>
                      <td className="p-3 text-sky-700 font-medium">Mycket bra räckvidd, stöttålig pistol, snabb laser</td>
                      <td className="p-3 text-neutral-500">Måste ladda pistolen i vagga</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-3 font-bold text-neutral-900">
                        📶 Bluetooth-handskanner
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-700">10–15 meter</td>
                      <td className="p-3">Parkopplas med TV-datorn</td>
                      <td className="p-3 text-neutral-700 font-medium">Enkel installation om TV:n står mitt i rummet</td>
                      <td className="p-3 text-rose-700 font-medium">Tappar kontakt bakom stålpelare och maskiner</td>
                    </tr>
                    <tr className="bg-neutral-50">
                      <td className="p-3 font-bold text-neutral-900">
                        🏭 Zebra / Honeywell Android
                      </td>
                      <td className="p-3 font-mono font-bold text-purple-700">Obegränsad (Wi-Fi)</td>
                      <td className="p-3">Kopplas mot REST API (/api/scan)</td>
                      <td className="p-3 text-purple-700 font-medium">Maximal industristandard, blixtsnabb laser, tål stryk</td>
                      <td className="p-3 text-neutral-500">Dyrare hårdvaruinköp (3000–6000 kr)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 space-y-1">
                <span className="font-bold block text-sky-900">Vår rekommendation till er:</span>
                <p>
                  1. Börja direkt med <strong>Mobiltelefoner / Surfplattor</strong> – det är färdigbyggt nu, kostar 0 kr och kräver inga installationer.<br />
                  2. Om ni vill ha en dedikerad fysisk pistol vid packning eller montering: Köp en <strong>2.4 GHz trådlös industriskanner med USB-basstation</strong> (kostar under en tusenlapp och fungerar direkt utan räckviddsproblem).
                </p>
              </div>
            </div>
          )}

          {/* TAB: Offline queue & internet loss handling */}
          {activeTab === 'offline_queue' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-neutral-950 rounded-lg">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-amber-950 text-base">
                    Vad händer om verkstadens Wi-Fi eller internet går ner?
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                  Systemet har ett inbyggt <strong>Offline-First kösystem</strong>. Om nätverket tillfälligt försvinner, en operatör går in i ett hörn av lagret utan Wi-Fi-täckning, eller om servern startas om, <strong>går inga QR-skanningar förlorade</strong>!
                </p>
              </div>

              {/* How it works 3-step diagram */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-neutral-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Steg 1: Lokal buffert</span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900">Sparas i webbläsaren</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    När en QR-kod skannas utan nätverkskontakt sparas hela registreringsunderlaget i webbläsarens interna <code>LocalStorage</code>. Även om telefonen stängs av finns skanningen kvar.
                  </p>
                </div>

                <div className="p-4 bg-white border border-neutral-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-sky-600 font-black text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Steg 2: Tydlig feedback</span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900">Operatören vet läget</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Skärmen visar en gul bekräftelse: <em>"Sparad offline! Flyttas till Test så fort kontakten återupprättas."</em> Operatören kan fortsätta jobba utan avbrott.
                  </p>
                </div>

                <div className="p-4 bg-white border border-neutral-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Steg 3: Automatisk tömning</span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900">Auto-synk i FIFO-ordning</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Så fort enheten får Wi-Fi eller nätverkskontakt skickas alla sparade skanningar i exakt kronologisk ordning. TV-tavlan flyttar orderna och kvitterar med en grön ljudsignal.
                  </p>
                </div>
              </div>

              {/* Action & Direct access */}
              <div className="p-4 bg-neutral-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-black text-sm text-white">Vill du se eller testa offline-kön?</h4>
                  <p className="text-xs text-neutral-400">
                    Öppna kön för att se väntande skanningar, tvinga synkronisering eller slå på test-simulering.
                  </p>
                </div>
                {onOpenOfflineQueue && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenOfflineQueue();
                    }}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black rounded-lg text-xs transition cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Öppna Offline-kön</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Real-time API documentation */}
          {activeTab === 'api_docs' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-black text-neutral-900 text-base">
                  REST API & Webhooks för automatisering
                </h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Alla externa enheter, handdatorer, automatiserade robotar eller skript kan anropa serverns API direkt:
                </p>
              </div>

              {/* Endpoint 1 */}
              <div className="p-4 bg-neutral-900 text-neutral-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500 text-neutral-950 font-black text-xs rounded">
                      POST
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      /api/scan
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(curlExample, 'curl')}
                    className="inline-flex items-center gap-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-neutral-300 cursor-pointer"
                  >
                    {copiedText === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Kopiera cURL</span>
                  </button>
                </div>

                <p className="text-xs text-neutral-400">
                  Tar emot en skannad sträng eller order- och stations-ID. Flyttar automatiskt ordern till nästa position och pushar direkt till TV-skärmen i realtid!
                </p>

                <pre className="p-3 bg-black/60 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
                  {curlExample}
                </pre>
              </div>

              {/* Endpoint 2: SSE */}
              <div className="p-4 bg-neutral-100 border border-neutral-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-sky-600 text-white font-black text-xs rounded">
                    GET
                  </span>
                  <span className="font-mono text-xs font-bold text-neutral-900">
                    /api/events (Server-Sent Events)
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Alla anslutna webbläsare, TV-skärmar och mobiler prenumererar på denna ström. När en order flyttas sänds ett event:
                </p>
                <pre className="p-2.5 bg-neutral-900 text-neutral-200 rounded font-mono text-[11px] overflow-x-auto">
{`{
  "type": "ORDER_MOVED",
  "orderId": "AO-2026-101",
  "fromStation": "Montering",
  "toStation": "Test",
  "toColumnId": "col-test"
}`}
                </pre>
              </div>

              {/* Python Example */}
              <div className="p-4 bg-neutral-900 text-neutral-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Python integration (Raspberry Pi / Scanner skript)
                  </span>
                  <button
                    onClick={() => copyToClipboard(pythonExample, 'python')}
                    className="inline-flex items-center gap-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-neutral-300 cursor-pointer"
                  >
                    {copiedText === 'python' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Kopiera</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/60 rounded-lg text-xs font-mono text-neutral-300 overflow-x-auto">
                  {pythonExample}
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-mono">
            Planeringstavla API v2.0 · Live Push via Express SSE
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg cursor-pointer transition"
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
};

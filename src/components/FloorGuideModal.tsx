import React, { useState } from 'react';
import { 
  X, 
  Monitor, 
  QrCode, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  Tv, 
  Smartphone, 
  Scan, 
  HelpCircle,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface FloorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExcelImport: () => void;
  onOpenPrintModal: () => void;
}

export const FloorGuideModal: React.FC<FloorGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenExcelImport,
  onOpenPrintModal,
}) => {
  const [testScanInput, setTestScanInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testScanInput.trim()) return;
    setTestResult(`Skanning mottagen: "${testScanInput.trim()}". Din skanner eller externa produkt skickar korrekt data till systemet!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500 text-neutral-950">
              <Tv className="w-5 h-5 font-black" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase font-sans">
                Guide: Så fungerar flödet på verkstadsgolvet
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Hur affärs- och ERP-system, planeringstavlan på TV-skärmen, QR-etiketter och skannrar kopplas samman
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-neutral-50/50 text-neutral-800 text-sm">
          
          {/* Visual Step-by-Step Flow */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 mb-3">
              Det kompletta produktionsflödet steg för steg
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Step 1 */}
              <div className="bg-white p-4 rounded-xl border-2 border-neutral-200 shadow-xs relative">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center mb-2">
                  1
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ERP &rarr; Planerat</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Ta ut din orderfil från ert ERP-system (Excel eller CSV) och klicka på <strong>"Importera Excel / ERP"</strong>. Alla ordrar läggs direkt i kolumnen <strong>"Planerat"</strong> med automatisk prioritet utifrån måldatum.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-4 rounded-xl border-2 border-neutral-200 shadow-xs relative">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center mb-2">
                  2
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-neutral-700" />
                  <span>Skriv ut följesedel</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Klicka på <strong>"Skriv ut QR"</strong> för att generera en A4-följesedel eller etiketter med unika QR-koder per station. Följesedeln följer med pallen/boxen ut i produktionen.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-4 rounded-xl border-2 border-neutral-200 shadow-xs relative">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center mb-2">
                  3
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-sky-600" />
                  <span>TV-tavla på golvet</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Ha denna sida öppen på en storskärm eller TV på golvet (klicka på helskärmssymbolen i menyn). Alla ser i realtid vad som är påbörjat, vad som är akut och var varje order befinner sig.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white p-4 rounded-xl border-2 border-neutral-200 shadow-xs relative">
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center mb-2">
                  4
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1 flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-emerald-600" />
                  <span>Skanna & Rapportera</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  När operatören vid en maskin är klar scannas QR-koden med er skannerprodukt. Operatören anger Namn och Antal — ordern flyttas och tavlan blinkar till direkt!
                </p>
              </div>
            </div>
          </div>

          {/* Scanner Compatibility Section */}
          <div className="bg-white p-5 rounded-xl border-2 border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-neutral-950 uppercase tracking-tight flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Hur er externa skannerprodukt kopplas ihop</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="font-bold text-xs text-neutral-900 mb-1 flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-neutral-700" />
                  <span>Handskanner (USB/Bluetooth)</span>
                </div>
                <p className="text-xs text-neutral-600">
                  En vanlig industriell handskanner (streckkodspistol) fungerar som ett tangentbord. <strong>Tavlan har en inbyggd direktlyssnare:</strong> tryck av mot QR-koden, så öppnas ordern automatiskt utan att klicka!
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="font-bold text-xs text-neutral-900 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-600" />
                  <span>Mobil eller Surfplatta</span>
                </div>
                <p className="text-xs text-neutral-600">
                  Operatören kan använda mobilens kamera eller appens "Skanna QR-kod". QR-koderna på följesedeln länkar direkt till ordern och stationen.
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="font-bold text-xs text-neutral-900 mb-1 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  <span>Dedikerad Stationsplatta</span>
                </div>
                <p className="text-xs text-neutral-600">
                  Klicka på <strong>"Stationsläge"</strong> i menyn för att låsa skärmen till en specifik station (t.ex. Montering) för supersnabb rapportering.
                </p>
              </div>
            </div>

            {/* Test Scanner Input Box */}
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <span className="text-xs font-bold text-neutral-800 block mb-1">
                Testa din skanner här (tryck av med pistolen eller skriv in ett ordernr):
              </span>
              <form onSubmit={handleTestScan} className="flex gap-2">
                <input
                  type="text"
                  value={testScanInput}
                  onChange={(e) => setTestScanInput(e.target.value)}
                  placeholder="Rikta skannern hit eller skriv AO-2026-101..."
                  className="font-mono text-xs px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg flex-1 focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg cursor-pointer transition"
                >
                  Testa
                </button>
              </form>

              {testResult && (
                <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{testResult}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t-2 border-neutral-900 bg-neutral-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg cursor-pointer"
          >
            Stäng guide
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPrintModal();
              }}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Skriv ut QR / följesedlar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExcelImport();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Öppna Excel-import</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

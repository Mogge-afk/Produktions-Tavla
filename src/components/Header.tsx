import React, { useEffect, useState } from 'react';
import { 
  QrCode, 
  Plus, 
  Printer, 
  Sliders, 
  Monitor, 
  Search, 
  Filter, 
  Maximize2, 
  Minimize2, 
  FileSpreadsheet,
  Tv,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Archive,
  Zap
} from 'lucide-react';
import { Priority } from '../types';

interface HeaderProps {
  onOpenScanner: () => void;
  onOpenNewOrder: () => void;
  onOpenColumnManager: () => void;
  onOpenPrintModal: () => void;
  onOpenStationMode: () => void;
  onOpenExcelImport: () => void;
  onOpenFloorGuide: () => void;
  onOpenArchive: () => void;
  onRefreshPriorities: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: Priority | 'all';
  onPriorityChange: (p: Priority | 'all') => void;
  totalOrdersCount: number;
  archivedOrdersCount: number;
  autoAdvanceEnabled: boolean;
  onToggleAutoAdvance: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScanner,
  onOpenNewOrder,
  onOpenColumnManager,
  onOpenPrintModal,
  onOpenStationMode,
  onOpenExcelImport,
  onOpenFloorGuide,
  onOpenArchive,
  onRefreshPriorities,
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  totalOrdersCount,
  archivedOrdersCount,
  autoAdvanceEnabled,
  onToggleAutoAdvance,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="bg-white border-b border-neutral-300 shadow-xs sticky top-0 z-30">
      {/* Top Banner with Workshop Title & Controls */}
      <div className="max-w-[1920px] mx-auto px-4 lg:px-6 py-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-neutral-900 uppercase font-sans">
                  PLANERINGSTAVLA
                </h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Realtid</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Produktionsflöde & QR-spårning · {totalOrdersCount} aktiva tillverkningsordrar
              </p>
            </div>

            {/* Live Clock Display (Shop Floor Style) */}
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-neutral-200 text-neutral-700">
              <div className="font-mono text-xl font-bold tracking-tight text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                {currentTime}
              </div>
              <div className="text-xs capitalize text-neutral-500 leading-tight">
                {currentDate}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Excel / IFS Import Button - High visibility */}
            <button
              onClick={onOpenExcelImport}
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer ring-2 ring-emerald-500/30"
              title="Importera tillverkningsordrar från IFS Excel/CSV direkt till Planerat"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Importera Excel / IFS</span>
            </button>

            {/* Primary Action: QR Scanner */}
            <button
              onClick={onOpenScanner}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              title="Skanna QR-kod eller streckkod från följesedel"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Skanna QR</span>
            </button>

            {/* Quick Auto-Advance Toggle (Montering ➔ Test automatiskt) */}
            <button
              onClick={onToggleAutoAdvance}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition cursor-pointer active:scale-95 ${
                autoAdvanceEnabled
                  ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950 border-amber-600 shadow-xs ring-2 ring-amber-400/30'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border-neutral-300'
              }`}
              title="Autoflytt vid QR-skanning: När aktiverad hoppar ordern direkt till nästa station i flödet (t.ex. Montering ➔ Test) utan att operatören behöver klicka"
            >
              <Zap className={`w-4 h-4 ${autoAdvanceEnabled ? 'text-neutral-950 fill-neutral-950' : 'text-neutral-400'}`} />
              <span className="hidden sm:inline">Autoflytt vid QR:</span>
              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${autoAdvanceEnabled ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-200 text-neutral-700'}`}>
                {autoAdvanceEnabled ? 'PÅ' : 'AV'}
              </span>
            </button>

            {/* Station / Terminal Mode */}
            <button
              onClick={onOpenStationMode}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg text-sm font-medium transition cursor-pointer"
              title="Kioskläge för surfplatta på en specifik station"
            >
              <Monitor className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Stationsläge</span>
            </button>

            {/* Print Labels & Routing Sheets */}
            <button
              onClick={onOpenPrintModal}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-sm font-medium transition cursor-pointer"
              title="Skriv ut QR-etiketter och följesedlar"
            >
              <Printer className="w-4 h-4 text-neutral-600" />
              <span className="hidden sm:inline">Skriv ut QR</span>
            </button>

            {/* New Work Order Manual */}
            <button
              onClick={onOpenNewOrder}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-sm font-medium transition cursor-pointer"
              title="Skapa en enskild manuell tillverkningsorder"
            >
              <Plus className="w-4 h-4 text-neutral-600" />
              <span className="hidden sm:inline">Manuell order</span>
            </button>

            {/* Column Manager */}
            <button
              onClick={onOpenColumnManager}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-sm font-medium transition cursor-pointer"
              title="Ändra rubriker, kolumnordning och färgkoder"
            >
              <Sliders className="w-4 h-4 text-neutral-600" />
              <span className="hidden lg:inline">Rubriker</span>
            </button>

            {/* Shop Floor & Scanner Guide */}
            <button
              onClick={onOpenFloorGuide}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-sm font-medium transition cursor-pointer"
              title="Guide för hur tavla på golvet och skannrar hänger ihop"
            >
              <Tv className="w-4 h-4 text-amber-700" />
              <span className="hidden md:inline">Golvguide</span>
            </button>

            {/* Archive / Completed Orders */}
            <button
              onClick={onOpenArchive}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-sm font-medium transition cursor-pointer"
              title="Visa arkiverade och slutförda ordrar"
            >
              <Archive className="w-4 h-4 text-purple-700" />
              <span className="hidden sm:inline">Arkiv</span>
              {archivedOrdersCount > 0 && (
                <span className="font-mono text-xs font-bold px-1.5 py-0.2 bg-purple-600 text-white rounded-full">
                  {archivedOrdersCount}
                </span>
              )}
            </button>

            {/* Fullscreen TV Mode */}
            <button
              onClick={toggleFullscreen}
              type="button"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg border border-neutral-300 transition cursor-pointer"
              title={isFullscreen ? 'Avsluta helskärm' : 'Helskärm / TV-skärm'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-3 pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Sök ordernr, produkt, artikel, kund..."
                className="w-full pl-9 pr-3 py-1.5 text-xs lg:text-sm bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Priority filter + Auto-priority trigger */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                <Filter className="w-3 h-3" /> Prioritet:
              </span>
              <div className="inline-flex rounded-md bg-neutral-100 p-0.5 border border-neutral-200">
                <button
                  type="button"
                  onClick={() => onPriorityChange('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition ${
                    selectedPriority === 'all'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Alla
                </button>
                <button
                  type="button"
                  onClick={() => onPriorityChange('urgent')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition ${
                    selectedPriority === 'urgent'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Akut
                </button>
                <button
                  type="button"
                  onClick={() => onPriorityChange('high')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition ${
                    selectedPriority === 'high'
                      ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  Hög
                </button>
                <button
                  type="button"
                  onClick={() => onPriorityChange('normal')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition ${
                    selectedPriority === 'normal'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Normal
                </button>
              </div>
            </div>

            {/* Quick Auto-Priority Refresh Button */}
            <button
              type="button"
              onClick={onRefreshPriorities}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md border border-neutral-300 transition cursor-pointer"
              title="Uppdatera alla prioriteringar automatiskt utifrån leveransdatum (Akut om <= 2 dagar, Hög om <= 7 dagar)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Auto-prioritera</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Barcode, 
  Sparkles, 
  AlertCircle, 
  Search, 
  Info,
  Layers,
  ArrowRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { ProductionOrder, ColumnConfig } from '../types';
import { extractScanPayload } from '../utils/qr';
import { playScanSuccessSound } from '../utils/audio';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderIdentified: (orderId: string, stationId?: string, forceAuto?: boolean) => void;
  allOrders: ProductionOrder[];
  columns: ColumnConfig[];
  autoAdvanceEnabled: boolean;
  onToggleAutoAdvance: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onOrderIdentified,
  allOrders,
  columns,
  autoAdvanceEnabled,
  onToggleAutoAdvance,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'barcode' | 'simulator'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [simulatorSearch, setSimulatorSearch] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-qr-reader';
  const isProcessingScanRef = useRef(false);

  // Reset scan latch whenever modal opens
  useEffect(() => {
    if (isOpen) {
      isProcessingScanRef.current = false;
    }
  }, [isOpen]);

  // Start Camera Scanner when camera tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Guard: Only scan once, stop scanner, close window, and move to next step!
            if (isProcessingScanRef.current) return;
            isProcessingScanRef.current = true;

            playScanSuccessSound();
            const { orderId, stationId } = extractScanPayload(decodedText);
            stopCamera();
            onClose(); // Stäng rutan omedelbart
            onOrderIdentified(orderId, stationId, true); // Flytta direkt till nästa steg!
          },
          () => {
            // ignore scan frame misses
          }
        );
        if (isMounted) setIsScanning(true);
      } catch (err: unknown) {
        console.warn('Camera scan initialization failed:', err);
        if (isMounted) {
          setCameraError(
            'Kunde inte starta kameran. Kontrollera kamerabehörighet i webbläsaren eller använd handskanner / simulator.'
          );
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab, autoAdvanceEnabled]);

  const stopCamera = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
        } else {
          scannerRef.current.clear();
        }
      } catch {
        // ignore cleanup error
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isProcessingScanRef.current) return;
    const { orderId, stationId } = extractScanPayload(manualInput);
    if (!orderId) return;

    isProcessingScanRef.current = true;
    playScanSuccessSound();
    stopCamera();
    onClose();
    onOrderIdentified(orderId, stationId, true);
    setManualInput('');
  };

  const handleSimulatorSelect = (orderId: string, stationId?: string) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;
    playScanSuccessSound();
    stopCamera();
    onClose();
    onOrderIdentified(orderId, stationId, true);
  };

  const filteredOrders = allOrders.filter(
    (o) =>
      o.id.toLowerCase().includes(simulatorSearch.toLowerCase()) ||
      o.title.toLowerCase().includes(simulatorSearch.toLowerCase()) ||
      o.customer.toLowerCase().includes(simulatorSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 text-emerald-400 border border-neutral-700">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase font-sans">
                Skanna Följesedel & QR
              </h2>
              <p className="text-xs text-neutral-400">
                Kamera, USB-handskanner eller snabbsimulering
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

        {/* Global Auto-Advance Toggle Banner */}
        <div className="px-5 py-3 bg-amber-50/90 border-b border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${autoAdvanceEnabled ? 'text-amber-600 fill-amber-600' : 'text-neutral-400'}`} />
            <div>
              <span className="text-xs font-bold text-neutral-900 block leading-tight">
                Autoflytt till nästa station vid skanning:
              </span>
              <span className="text-[11px] text-neutral-600 leading-tight">
                {autoAdvanceEnabled
                  ? 'PÅ: Skanna Montering ➔ ordern hoppar direkt till Test!'
                  : 'AV: Öppnar rapportfönster för manuell kvantitet'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleAutoAdvance}
            className={`px-3 py-1 rounded-md text-xs font-black uppercase transition cursor-pointer ${
              autoAdvanceEnabled
                ? 'bg-amber-500 text-neutral-950 shadow-xs ring-1 ring-amber-600'
                : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
            }`}
          >
            {autoAdvanceEnabled ? 'AKTIVERAD' : 'AVSTÄNGD'}
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-100 text-xs font-bold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 ${
              activeTab === 'camera'
                ? 'border-neutral-950 text-neutral-950 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Kamera / Mobil</span>
          </button>

          <button
            onClick={() => setActiveTab('barcode')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 ${
              activeTab === 'barcode'
                ? 'border-neutral-950 text-neutral-950 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Barcode className="w-4 h-4 text-sky-600" />
            <span>Handskanner / Text</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 ${
              activeTab === 'simulator'
                ? 'border-neutral-950 text-neutral-950 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Snabbtest (Klick)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          
          {/* TAB 1: Live Webcam / Mobile Camera */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center">
              <div
                id={scannerContainerId}
                className="w-full max-w-[320px] aspect-square rounded-xl overflow-hidden border-2 border-neutral-900 bg-black flex items-center justify-center relative shadow-inner"
              >
                {!isScanning && !cameraError && (
                  <div className="text-white text-xs flex flex-col items-center gap-2 p-4 text-center">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Initierar videokamera...</span>
                  </div>
                )}
              </div>

              {cameraError ? (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start gap-2 max-w-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Kamerafel:</span>
                    <span>{cameraError}</span>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setActiveTab('simulator')}
                        className="px-2.5 py-1 bg-white border border-rose-300 text-rose-900 rounded font-medium cursor-pointer"
                      >
                        Använd snabbtest
                      </button>
                      <button
                        onClick={() => setActiveTab('barcode')}
                        className="px-2.5 py-1 bg-white border border-rose-300 text-rose-900 rounded font-medium cursor-pointer"
                      >
                        Skriv in ordernr
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 mt-3 text-center">
                  Rikta kameran mot QR-koden på följesedeln för stationen.
                </p>
              )}
            </div>
          )}

          {/* TAB 2: Barcode / Handheld gun */}
          {activeTab === 'barcode' && (
            <div className="space-y-4">
              <div className="p-3 bg-neutral-100 rounded-lg border border-neutral-300 text-xs text-neutral-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span>
                  Skanna med din USB- eller Bluetooth-streckkodsläsare. Den skickar order och stationskod (t.ex. <code>ORD:AO-2026-101:col-montering</code> eller bara ordernr).
                </span>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Order / QR-sträng
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="t.ex. AO-2026-101 eller ORD:AO-2026-101:col-montering"
                    className="w-full font-mono text-base px-3.5 py-2.5 bg-white border-2 border-neutral-900 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Identifiera & flytta</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Simulator with Station Picker */}
          {activeTab === 'simulator' && (
            <div className="space-y-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-center justify-between">
                <span>
                  Klicka på en stationsknapp för att testa autoflytt direkt:
                </span>
                <span className="font-bold font-mono">{filteredOrders.length} ordrar</span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={simulatorSearch}
                  onChange={(e) => setSimulatorSearch(e.target.value)}
                  placeholder="Sök order att simulera skanning på..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredOrders.map((order) => {
                  const currentCol = columns.find((c) => c.id === order.columnId);
                  return (
                    <div
                      key={order.id}
                      className="p-3 bg-white rounded-xl border-2 border-neutral-800 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                            {order.id}
                          </span>
                          <span className="text-xs font-bold text-neutral-900">
                            {order.title}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                          Nuvarande läge: <strong className="text-neutral-900">{currentCol?.title || 'Okänd'}</strong>
                        </div>
                      </div>

                      {/* Station specific quick scan buttons */}
                      <div className="pt-2 border-t border-neutral-200">
                        <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1.5">
                          Simulera skanning vid station:
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {columns.map((col, idx) => {
                            const nextCol = idx < columns.length - 1 ? columns[idx + 1] : null;
                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => handleSimulatorSelect(order.id, col.id)}
                                style={{ backgroundColor: col.headerBg }}
                                className="px-2 py-1 rounded text-[11px] font-bold text-neutral-900 border border-neutral-400 hover:border-neutral-900 hover:scale-105 transition cursor-pointer"
                                title={`Simulera skanning av ${col.title}-QR ➔ Hoppar till ${nextCol ? nextCol.title : 'Klar/Arkiv'}`}
                              >
                                {col.title} {nextCol ? `➔ ${nextCol.title}` : '➔ Slutför'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

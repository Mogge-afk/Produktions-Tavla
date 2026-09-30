import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Barcode, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Tv, 
  RefreshCw, 
  Zap, 
  Wifi, 
  WifiOff, 
  Layers,
  Sparkles,
  Volume2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { ProductionOrder, ColumnConfig } from '../types';
import { apiSync, ScanApiResponse, SyncStatus } from '../utils/apiSync';
import { offlineQueue, QueuedScanItem } from '../utils/offlineQueue';
import { playScanSuccessSound } from '../utils/audio';
import { OfflineQueueModal } from './OfflineQueueModal';

interface MobileScannerViewProps {
  columns: ColumnConfig[];
  allOrders: ProductionOrder[];
  onExitMobileMode: () => void;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({
  columns,
  allOrders,
  onExitMobileMode,
}) => {
  const [activeStationId, setActiveStationId] = useState<string>('auto');
  const [operatorName, setOperatorName] = useState<string>(() => {
    return localStorage.getItem('planering_operator_name') || 'Operatör';
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  
  // Last scan feedback
  const [lastScanResult, setLastScanResult] = useState<ScanApiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'mobile-live-reader';

  // Listen to server connection status & queue updates
  useEffect(() => {
    setQueueCount(offlineQueue.getQueueCount());
    const unsubStatus = apiSync.onStatusChange(setSyncStatus);
    const unsubQueue = offlineQueue.onQueueChange((q) => setQueueCount(q.length));
    return () => {
      unsubStatus();
      unsubQueue();
    };
  }, []);

  // Initialize camera scanner
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        await new Promise((r) => setTimeout(r, 300));
        if (!isMounted) return;

        const html5Qr = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScanPayload(decodedText);
          },
          () => {}
        );

        if (isMounted) setIsScanning(true);
      } catch (err: any) {
        console.warn('Camera failed:', err);
        if (isMounted) {
          setCameraError('Kamerabehörighet saknas eller stöds ej. Använd manuell inmatning nedan.');
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch {}
      }
    };
  }, []);

  const handleScanPayload = async (rawString: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Haptic vibration feedback on phones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }

    playScanSuccessSound();

    try {
      const payload: any = { scan: rawString, operator: operatorName.trim() };
      if (activeStationId !== 'auto') {
        payload.stationId = activeStationId;
      }

      const res = await apiSync.postScan(payload);
      setLastScanResult(res);

      if (res.success) {
        // Clear message after 4.5 seconds
        setTimeout(() => {
          setLastScanResult(null);
        }, 4500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScanPayload(manualInput.trim());
    setManualInput('');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans select-none">
      
      {/* Top Mobile Bar */}
      <header className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-black">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight text-white leading-tight">
              Golvskanner · Mobil
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              {syncStatus === 'connected' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Kopplad mot TV-tavla
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Ansluter...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queueCount > 0 && (
            <button
              onClick={() => setIsOfflineModalOpen(true)}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black rounded-lg text-xs transition cursor-pointer shadow-xs animate-pulse"
              title="Visa offline-kö för QR-skanningar"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{queueCount} i kö</span>
            </button>
          )}

          <button
            onClick={onExitMobileMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5 text-sky-400" />
            <span>Visa Tavla</span>
          </button>
        </div>
      </header>

      {/* Offline Status Warning Strip if connection lost or queue has items */}
      {(syncStatus === 'offline' || queueCount > 0) && (
        <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              {syncStatus === 'offline' 
                ? 'Nätverk nere: Skanningar sparas i telefonen och synkas automatiskt.'
                : `${queueCount} skanning(ar) ligger i kön och väntar på synkronisering.`}
            </span>
          </div>
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            className="underline font-bold text-amber-400 hover:text-white cursor-pointer"
          >
            Hantera kö
          </button>
        </div>
      )}

      {/* Operator & Station Filter Controls */}
      <div className="p-3 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
          <span className="text-neutral-400 font-bold">Operatör:</span>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => {
              setOperatorName(e.target.value);
              localStorage.setItem('planering_operator_name', e.target.value);
            }}
            placeholder="Ditt namn..."
            className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white focus:outline-hidden focus:border-emerald-500 font-bold"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 font-bold">Station:</span>
          <select
            value={activeStationId}
            onChange={(e) => setActiveStationId(e.target.value)}
            className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-emerald-400 font-bold focus:outline-hidden"
          >
            <option value="auto">⚡ Auto från QR</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500 bg-black relative shadow-2xl">
          <div id={scannerContainerId} className="w-full h-full" />
          
          {/* Scan Target Reticle */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-dashed border-emerald-400/80 rounded-xl relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 px-2 text-[10px] font-black text-emerald-400 tracking-wider uppercase rounded border border-emerald-500/40">
                Rikta mot QR
              </span>
            </div>
          </div>
        </div>

        {cameraError && (
          <div className="mt-3 p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-200 text-center max-w-xs">
            {cameraError}
          </div>
        )}

        {/* Live Feedback Banner on Scan */}
        {lastScanResult && (
          <div
            className={`mt-4 w-full max-w-sm p-4 rounded-xl border-2 text-center animate-in zoom-in-95 duration-150 shadow-2xl ${
              lastScanResult.queuedOffline
                ? 'bg-amber-950/90 border-amber-400 text-amber-100'
                : lastScanResult.success
                ? 'bg-emerald-950 border-emerald-400 text-emerald-100'
                : 'bg-rose-950 border-rose-500 text-rose-100'
            }`}
          >
            {lastScanResult.queuedOffline ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-sm uppercase tracking-wide">
                  <Clock className="w-5 h-5 animate-pulse" />
                  <span>Sparad Offline ({lastScanResult.orderId})</span>
                </div>
                <p className="text-xs text-amber-200">
                  {lastScanResult.message}
                </p>
                <div className="text-[10px] text-amber-400 font-mono mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Ligger tryggt i kön · Flyttas automatiskt vid uppkoppling</span>
                </div>
              </div>
            ) : lastScanResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-base">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{lastScanResult.orderId} FLYTTAD!</span>
                </div>
                <div className="text-xs text-neutral-300">
                  {lastScanResult.from ? (
                    <span>
                      Från <strong className="text-white">{lastScanResult.from}</strong> ➔ Till <strong className="text-emerald-300 text-sm">{lastScanResult.to}</strong>
                    </span>
                  ) : (
                    lastScanResult.message
                  )}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-mono mt-1">
                  ✓ Uppdaterad i realtid på TV-tavlan
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{lastScanResult.error || lastScanResult.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Input Footer (For Barcode Pistols or Typing) */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Skriv in ordernr eller skanna med Bluetooth-pistol..."
            className="flex-1 px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!manualInput.trim() || isSubmitting}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-neutral-950 font-black rounded-lg text-sm transition cursor-pointer flex items-center gap-1"
          >
            <span>Skicka</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-neutral-500 text-center mt-2">
          Varje skanning uppdaterar direkt planeringstavlan på TV-skärmen i realtid via serverns API.
        </p>
      </div>

      {/* Offline Queue Details Modal */}
      <OfflineQueueModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        columns={columns}
      />

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';
import { offlineQueue, QueuedScanItem } from '../utils/offlineQueue';
import { ColumnConfig } from '../types';

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onManualSyncTriggered?: () => void;
}

export const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({
  isOpen,
  onClose,
  columns,
  onManualSyncTriggered,
}) => {
  const [queue, setQueue] = useState<QueuedScanItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setQueue(offlineQueue.getQueue());
    setIsOnline(offlineQueue.isOnline());
    setIsSimulating(offlineQueue.isSimulatingOffline());

    const unsubQueue = offlineQueue.onQueueChange((newQueue) => {
      setQueue(newQueue);
    });

    const unsubConn = offlineQueue.onConnectionChange((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubQueue();
      unsubConn();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSimulate = () => {
    const nextState = !isSimulating;
    setIsSimulating(nextState);
    offlineQueue.setSimulateOffline(nextState);
    setIsOnline(!nextState && navigator.onLine);
    setSyncFeedback(
      nextState
        ? '⚠️ Offline-simulering aktiverad! Nya skanningar kommer nu att hamna i offline-kön.'
        : '🟢 Offline-simulering avstängd! Nätverksanrop återupptagna.'
    );
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      setSyncFeedback('⚠️ Kan inte synka: Applikationen är i offlineläge (eller offline-simulering är på).');
      return;
    }

    setIsSyncing(true);
    setSyncFeedback('🔄 Försöker ansluta och synkronisera köade skanningar...');

    try {
      const res = await offlineQueue.processQueue();
      if (res.processed > 0) {
        setSyncFeedback(`✓ Klart! ${res.processed} skanningar synkades framgångsrikt till tavlan!`);
        if (onManualSyncTriggered) onManualSyncTriggered();
      } else if (res.failed > 0) {
        setSyncFeedback(`⚠️ ${res.failed} skanningar misslyckades att synkas. Kontrollera servern.`);
      } else {
        setSyncFeedback('ℹ️ Inga väntande skanningar att synka.');
      }
    } catch (err: any) {
      setSyncFeedback(`❌ Fel vid synkning: ${err.message || 'Servern svarade inte'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleRemoveItem = (id: string) => {
    offlineQueue.removeQueueItem(id);
  };

  const handleClearAll = () => {
    if (window.confirm('Är du säker på att du vill rensa alla väntande skanningar i offline-kön?')) {
      offlineQueue.clearQueue();
      setSyncFeedback('Kön har rensats.');
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return `${diffSec} sekunder sedan`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} minuter sedan`;
      return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const getStationName = (stationId?: string) => {
    if (!stationId) return 'Auto (från order)';
    const col = columns.find((c) => c.id === stationId);
    return col?.title || stationId;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Offline-kö för QR-skanningar</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isOnline
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                }`}>
                  {isOnline ? '🟢 Online' : '🔴 Offline / Väntar'}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Säkerställer att ingen skanning tappas om Wi-Fi eller internet tillfälligt ligger nere
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Status banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isOnline ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="text-xs space-y-1">
              <h3 className="font-bold text-sm">
                {isOnline ? 'Systemet har kontakt med servern' : 'Nätverket är nere – Automatisk kö aktiv!'}
              </h3>
              <p className="leading-relaxed opacity-90">
                {isOnline
                  ? 'Alla skanningar skickas direkt i realtid till TV-tavlan. Om anslutningen skulle brytas sparas alla skanningar automatiskt här i webbläsaren.'
                  : 'Du kan fortsätta skanna som vanligt! Varje QR-kod sparas tryggt i webbläsarens interna lagring. Så fort kontakten återupprättas skickas alla skanningar automatiskt till tavlan och orderna flyttas vidare till nästa kolumn.'}
              </p>
            </div>
          </div>

          {/* Feedback message if any */}
          {syncFeedback && (
            <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Queue List Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800">
                Väntande skanningar ({queue.length})
              </h3>
              {queue.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {queue.length} i kö
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={handleClearAll}
                  type="button"
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
                >
                  Rensa alla
                </button>
              )}
              <button
                onClick={handleSyncNow}
                disabled={isSyncing || queue.length === 0}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isSyncing ? 'Synkroniserar...' : 'Synka nu'}</span>
              </button>
            </div>
          </div>

          {/* Queue Items Container */}
          {queue.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-neutral-800">Kön är tom</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Inga skanningar väntar på uppkoppling. Alla tidigare registrerade QR-koder har skickats till TV-tavlan.
              </p>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100 bg-white shadow-xs">
              {queue.map((item, idx) => (
                <div key={item.id} className="p-3.5 hover:bg-neutral-50 transition flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-neutral-400 w-5 text-right">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-neutral-900">
                          {item.orderId}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                          {getStationName(item.stationId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {formatTimeAgo(item.timestamp)}
                        </span>
                        <span>•</span>
                        <span>Operatör: <strong className="text-neutral-700">{item.operator}</strong></span>
                        {item.retryCount > 0 && (
                          <span className="text-amber-600 font-semibold">
                            (Försök: {item.retryCount})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Väntar på nätverk
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Ta bort från kön"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Test Simulation Switch (Very helpful for user testing) */}
          <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Testa funktionen (Simulera nätverksbortfall)</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Slå på för att låtsas att internet är nere. Skanna sedan en kod och se att den sparas i kön utan att gå förlorad.
              </p>
            </div>
            <button
              onClick={handleToggleSimulate}
              type="button"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isSimulating ? 'bg-amber-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isSimulating ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Automatisk omsynkning körs så fort nätverket är tillgängligt</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-bold transition cursor-pointer"
          >
            Stäng
          </button>
        </div>

      </div>
    </div>
  );
};

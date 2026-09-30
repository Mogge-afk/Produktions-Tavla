import React, { useState, useEffect } from 'react';
import { 
  X, 
  Monitor, 
  User, 
  CheckCircle2, 
  Sparkles,
  QrCode
} from 'lucide-react';
import { ColumnConfig, ProductionOrder } from '../types';
import { extractScanPayload } from '../utils/qr';
import { playScanSuccessSound } from '../utils/audio';
import { getStoredOperatorName, setStoredOperatorName } from '../utils/storage';

interface StationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  allOrders: ProductionOrder[];
  onOrderStationReport: (
    orderId: string,
    stationId: string,
    operator: string,
    quantity: number,
    totalSoFar: number,
    moveNextStage: boolean,
    targetNextColumnId?: string,
    noteText?: string
  ) => void;
}

export const StationModeModal: React.FC<StationModeModalProps> = ({
  isOpen,
  onClose,
  columns,
  allOrders,
  onOrderStationReport,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>(columns[2]?.id || columns[0]?.id || '');
  const [scannedInput, setScannedInput] = useState('');
  const [operator, setOperator] = useState('Kalle.K');
  const [activeReportOrder, setActiveReportOrder] = useState<ProductionOrder | null>(null);
  const [quantity, setQuantity] = useState<number>(30);
  const [noteText, setNoteText] = useState('');
  const [lastCheckinMessage, setLastCheckinMessage] = useState<string | null>(null);

  useEffect(() => {
    setOperator(getStoredOperatorName() || 'Kalle.K');
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStation = columns.find((c) => c.id === selectedStationId);
  const currentStationIndex = columns.findIndex((c) => c.id === selectedStationId);
  const nextColumn = currentStationIndex >= 0 && currentStationIndex < columns.length - 1 
    ? columns[currentStationIndex + 1] 
    : null;

  const stationOrders = allOrders.filter((o) => o.columnId === selectedStationId);

  const handleOrderScan = (rawText: string) => {
    const { orderId, stationId } = extractScanPayload(rawText);
    if (!orderId) return;

    const found = allOrders.find((o) => o.id.toLowerCase() === orderId.toLowerCase());
    if (!found) {
      alert(`Order ${orderId} hittades inte.`);
      return;
    }

    if (stationId) {
      setSelectedStationId(stationId);
    }

    const prevDone = found.stationProgress?.[stationId || selectedStationId] || 0;
    const remaining = Math.max(0, found.batchSize - prevDone);
    setQuantity(remaining > 0 ? (remaining >= 30 ? 30 : remaining) : found.batchSize);

    setActiveReportOrder(found);
    setScannedInput('');
  };

  const handleConfirmReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportOrder || !operator.trim() || quantity <= 0) return;

    setStoredOperatorName(operator.trim());

    const prevDone = activeReportOrder.stationProgress?.[selectedStationId] || 0;
    const totalSoFar = prevDone + Number(quantity);
    const orderTotal = activeReportOrder.batchSize;
    const isCompleted = totalSoFar >= orderTotal;

    onOrderStationReport(
      activeReportOrder.id,
      selectedStationId,
      operator.trim(),
      Number(quantity),
      totalSoFar,
      isCompleted,
      nextColumn?.id,
      noteText.trim()
    );

    playScanSuccessSound();
    setLastCheckinMessage(
      `✓ Rapport sparad: ${operator.trim()} registrerade ${quantity} st på ${activeReportOrder.id} (${activeReportOrder.title})!`
    );

    setActiveReportOrder(null);
    setNoteText('');

    setTimeout(() => {
      setLastCheckinMessage(null);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight font-sans">
                Stationsläge / Arbetsplatsterminal
              </h2>
              <p className="text-xs text-neutral-400">
                Kopplat till specifik station för snabb inrapportering av Antal & Totalt
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

        {/* Station Selector Bar */}
        <div className="p-4 bg-neutral-100 border-b border-neutral-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-800">
              Aktiv Station:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((col) => {
                const isSelected = col.id === selectedStationId;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setSelectedStationId(col.id);
                      setActiveReportOrder(null);
                    }}
                    style={{
                      backgroundColor: isSelected ? col.headerBg : '#ffffff',
                      borderColor: isSelected ? '#171717' : '#d4d4d4',
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-neutral-950 text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:border-neutral-500'
                    }`}
                  >
                    {col.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="Namn..."
              className="text-xs font-bold px-2 py-1 bg-white border border-neutral-300 rounded max-w-[120px]"
            />
          </div>
        </div>

        {/* Main Terminal View */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          
          {/* Left: Input & Scan Form */}
          <div className="space-y-4">
            
            {/* If no order active: prompt for scan */}
            {!activeReportOrder ? (
              <div
                style={{ backgroundColor: currentStation?.headerBg }}
                className="p-5 rounded-2xl border-2 border-neutral-900 text-center shadow-xs"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                  Skanningspunkt
                </span>
                <h3 className="text-2xl font-black text-neutral-950 mt-1 uppercase font-sans">
                  Station: {currentStation?.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">
                  Skanna följesedelns QR-kod eller skriv in ordernummer.
                </p>

                {lastCheckinMessage && (
                  <div className="mt-4 p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">
                    {lastCheckinMessage}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOrderScan(scannedInput);
                  }}
                  className="mt-4 space-y-3"
                >
                  <input
                    type="text"
                    autoFocus
                    value={scannedInput}
                    onChange={(e) => setScannedInput(e.target.value)}
                    placeholder="Skanna ordernummer..."
                    className="w-full text-center font-mono text-lg font-black px-4 py-3 bg-white border-2 border-neutral-900 rounded-xl focus:outline-hidden focus:ring-4 focus:ring-neutral-900/20"
                  />

                  <button
                    type="submit"
                    disabled={!scannedInput.trim()}
                    className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    Öppna stationsrapport →
                  </button>
                </form>
              </div>
            ) : (
              /* If order is active: show the exact Namn, Antal, Totalt, Order reporting card */
              <form
                onSubmit={handleConfirmReport}
                className="bg-neutral-50 p-5 rounded-2xl border-2 border-neutral-900 space-y-4 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
                  <div>
                    <span className="font-mono text-base font-black bg-neutral-900 text-white px-2 py-0.5 rounded">
                      {activeReportOrder.id}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 mt-1">
                      {activeReportOrder.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveReportOrder(null)}
                    className="text-xs font-bold text-neutral-500 hover:text-neutral-900"
                  >
                    Avbryt
                  </button>
                </div>

                {/* Namn */}
                <div>
                  <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-1">
                    Namn:
                  </label>
                  <input
                    type="text"
                    required
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full font-bold text-sm px-3 py-2 bg-white border-2 border-neutral-800 rounded-lg"
                  />
                </div>

                {/* Antal, Totalt, Order */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-2.5 rounded-lg border-2 border-neutral-800">
                    <span className="block text-xs font-black text-neutral-900 uppercase">Antal:</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full font-mono text-xl font-black focus:outline-hidden"
                    />
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-lg border-2 border-emerald-600">
                    <span className="block text-xs font-black text-emerald-950 uppercase">Totalt:</span>
                    <div className="font-mono text-xl font-black text-emerald-950">
                      {(activeReportOrder.stationProgress?.[selectedStationId] || 0) + Number(quantity)}
                    </div>
                  </div>

                  <div className="bg-neutral-100 p-2.5 rounded-lg border-2 border-neutral-300">
                    <span className="block text-xs font-black text-neutral-600 uppercase">Order:</span>
                    <div className="font-mono text-xl font-black text-neutral-900">
                      {activeReportOrder.batchSize} {activeReportOrder.unit}
                    </div>
                  </div>
                </div>

                {/* Optional note */}
                <div>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Valfri stationsnotering..."
                    className="w-full text-xs px-3 py-2 bg-white border border-neutral-300 rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
                >
                  Bekräfta & Registrera {quantity} st på {currentStation?.title} →
                </button>
              </form>
            )}

            {/* Quick picker to test */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                Klicka på en order för att simulera skanning till {currentStation?.title}:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allOrders.map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleOrderScan(ord.id)}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-900 hover:text-white border border-neutral-300 rounded text-xs font-mono font-bold transition cursor-pointer"
                  >
                    {ord.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Active Work Orders at This Station */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Pågående på denna station ({stationOrders.length})
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {currentStation?.title}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {stationOrders.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs">
                  Inga aktiva ordrar på denna station just nu.
                </div>
              ) : (
                stationOrders.map((ord) => {
                  const done = ord.stationProgress?.[selectedStationId] || 0;
                  const total = ord.batchSize || 100;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => handleOrderScan(ord.id)}
                      className="p-3 bg-white rounded-xl border-2 border-neutral-900 shadow-xs flex items-center justify-between hover:border-neutral-500 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                            {ord.id}
                          </span>
                          <span className="text-xs font-bold text-neutral-900">
                            {ord.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-1">
                          {ord.customer} · Order: {total} {ord.unit} · Operatör: {ord.operator || '–'}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {done}/{total} {ord.unit}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

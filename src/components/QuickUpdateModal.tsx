import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Layers, 
  CheckSquare, 
  QrCode,
  Calendar,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { ColumnConfig, ProductionOrder, ProductionNote, ProductionReport, ChecklistItem } from '../types';
import { getStoredOperatorName, setStoredOperatorName } from '../utils/storage';
import { playScanSuccessSound } from '../utils/audio';

interface QuickUpdateModalProps {
  order: ProductionOrder | null;
  columns: ColumnConfig[];
  targetStationId?: string; // Pre-bound station from QR scan
  isOpen: boolean;
  onClose: () => void;
  onArchiveOrder?: (orderId: string) => void;
  onSaveReport: (
    orderId: string,
    stationId: string,
    operator: string,
    quantity: number,
    totalSoFar: number,
    moveNextStage: boolean,
    targetNextColumnId?: string,
    noteText?: string,
    noteType?: ProductionNote['type']
  ) => void;
}

export const QuickUpdateModal: React.FC<QuickUpdateModalProps> = ({
  order,
  columns,
  targetStationId,
  isOpen,
  onClose,
  onArchiveOrder,
  onSaveReport,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [operator, setOperator] = useState<string>('Kalle.K');
  const [quantity, setQuantity] = useState<number>(30);
  const [noteText, setNoteText] = useState<string>('');
  const [noteType, setNoteType] = useState<ProductionNote['type']>('approved');
  const [shouldAdvanceToNext, setShouldAdvanceToNext] = useState<boolean>(false);
  const [shouldArchive, setShouldArchive] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      // If QR specifically bound to a station, use it; otherwise use order's current column
      const initialStation = targetStationId || order.columnId || columns[0]?.id || '';
      setSelectedStationId(initialStation);
      
      const savedOp = getStoredOperatorName();
      setOperator(savedOp || 'Kalle.K');

      // Suggested quantity: default to 30 or remaining quantity
      const currentDone = order.stationProgress?.[initialStation] || 0;
      const remaining = Math.max(0, order.batchSize - currentDone);
      setQuantity(remaining > 0 ? (remaining >= 30 ? 30 : remaining) : order.batchSize);

      setNoteText('');
      setNoteType('approved');
      setShouldAdvanceToNext(false);
    }
  }, [order, targetStationId, isOpen, columns]);

  if (!isOpen || !order) return null;

  const currentStation = columns.find((c) => c.id === selectedStationId);
  const currentStationIndex = columns.findIndex((c) => c.id === selectedStationId);
  const nextColumn = currentStationIndex >= 0 && currentStationIndex < columns.length - 1 
    ? columns[currentStationIndex + 1] 
    : null;

  // Previous completed at this station
  const previouslyCompleted = order.stationProgress?.[selectedStationId] || 0;
  const currentBatchReport = Number(quantity) || 0;
  const calculatedTotal = previouslyCompleted + currentBatchReport;
  const orderTotal = order.batchSize || 100;
  const percentComplete = Math.min(100, Math.round((calculatedTotal / orderTotal) * 100));

  const handleStationChange = (newStationId: string) => {
    setSelectedStationId(newStationId);
    const prevDone = order.stationProgress?.[newStationId] || 0;
    const rem = Math.max(0, order.batchSize - prevDone);
    setQuantity(rem > 0 ? (rem >= 30 ? 30 : rem) : order.batchSize);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator.trim() || currentBatchReport <= 0) return;

    setStoredOperatorName(operator.trim());

    onSaveReport(
      order.id,
      selectedStationId,
      operator.trim(),
      currentBatchReport,
      calculatedTotal,
      shouldAdvanceToNext || calculatedTotal >= orderTotal,
      nextColumn ? nextColumn.id : undefined,
      noteText.trim(),
      noteType
    );

    if (shouldArchive && onArchiveOrder) {
      onArchiveOrder(order.id);
    }

    playScanSuccessSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Top Header - Industrial Scan Identification */}
        <div className="px-5 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-neutral-950 font-black flex items-center gap-1">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                  {order.id}
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  QR Skanning Godkänd
                </span>
              </div>
              <h2 className="text-sm font-bold text-neutral-200 mt-0.5">
                {order.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Order Metadata Card ("Resten av info finns redan på sidan") */}
        <div className="bg-neutral-100 px-5 py-2.5 border-b border-neutral-300 text-xs flex flex-wrap items-center justify-between gap-2 text-neutral-700">
          <div className="flex items-center gap-3">
            <span>Kund: <strong className="text-neutral-900">{order.customer}</strong></span>
            <span>·</span>
            <span>Artikelnr: <strong className="font-mono text-neutral-900">{order.articleNumber}</strong></span>
            {order.drawingNumber && (
              <>
                <span>·</span>
                <span>Ritning: <strong className="font-mono text-neutral-900">{order.drawingNumber}</strong></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-300">
            Order: {orderTotal} {order.unit}
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Station selector (bound from QR code) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Produktionsstation (Kopplad till QR-koden)
              </label>
              {targetStationId && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Bunden till denna station
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {columns.map((col) => {
                const isSelected = selectedStationId === col.id;
                const stationDone = order.stationProgress?.[col.id] || 0;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleStationChange(col.id)}
                    style={{
                      backgroundColor: isSelected ? col.headerBg : '#ffffff',
                      borderColor: isSelected ? '#171717' : '#d4d4d4',
                    }}
                    className={`p-2 rounded-lg border-2 text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-neutral-950 font-black shadow-xs'
                        : 'font-medium hover:border-neutral-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-900">{col.title}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-neutral-600 mt-1 font-mono">
                      {stationDone}/{orderTotal} {order.unit} klart
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN FORM: Namn, Antal, Totalt, Order (Strictly following user example) */}
          <div className="bg-neutral-50 p-4 rounded-xl border-2 border-neutral-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-900">
                Registrera stationsrapport
              </span>
              <span className="text-xs text-neutral-500">
                Fylls i vid varje delbatch / skift
              </span>
            </div>

            {/* Row 1: Namn */}
            <div>
              <label className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-4 h-4 text-neutral-700" />
                Namn / Operatör *
              </label>
              <input
                type="text"
                required
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="t.ex. Kalle.K"
                className="w-full font-bold text-sm px-3.5 py-2.5 bg-white border-2 border-neutral-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-950"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Exempel: Kalle.K (sparas för kommande skanningar på denna enhet)
              </span>
            </div>

            {/* Row 2: Antal, Totalt, Order (The 3 fields specified by user) */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              
              {/* Field 1: Antal (User input) */}
              <div className="bg-white p-3 rounded-lg border-2 border-neutral-800 shadow-xs">
                <label className="block text-xs font-black text-neutral-900 uppercase tracking-wider mb-1">
                  Antal *
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full font-mono text-xl font-black text-neutral-950 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold text-neutral-600 font-mono">
                    {order.unit}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block leading-tight">
                  Klara nu
                </span>
              </div>

              {/* Field 2: Totalt (Calculated) */}
              <div className="bg-emerald-50 p-3 rounded-lg border-2 border-emerald-600">
                <span className="block text-xs font-black text-emerald-950 uppercase tracking-wider mb-1">
                  Totalt
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl font-black text-emerald-950">
                    {calculatedTotal}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 font-mono">
                    {order.unit}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-800 mt-1 block leading-tight">
                  Tidigare: {previouslyCompleted} + {currentBatchReport}
                </span>
              </div>

              {/* Field 3: Order (Total order batch size) */}
              <div className="bg-neutral-100 p-3 rounded-lg border-2 border-neutral-300">
                <span className="block text-xs font-black text-neutral-600 uppercase tracking-wider mb-1">
                  Order
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl font-black text-neutral-900">
                    {orderTotal}
                  </span>
                  <span className="text-xs font-bold text-neutral-700 font-mono">
                    {order.unit}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block leading-tight">
                  Hela ordern
                </span>
              </div>
            </div>

            {/* Visual Progress Bar on this station */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs font-bold text-neutral-800">
                <span>Framsteg på {currentStation?.title}:</span>
                <span className="font-mono">{calculatedTotal} av {orderTotal} {order.unit} ({percentComplete}%)</span>
              </div>
              <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden border border-neutral-400">
                <div
                  style={{ width: `${percentComplete}%` }}
                  className={`h-full transition-all duration-300 ${
                    percentComplete >= 100 ? 'bg-emerald-600' : 'bg-neutral-900'
                  }`}
                />
              </div>
            </div>

            {/* Advance to next stage option or Archive option if final stage */}
            {nextColumn ? (
              <label className="flex items-start gap-2.5 p-2.5 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg cursor-pointer border border-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={shouldAdvanceToNext || calculatedTotal >= orderTotal}
                  onChange={(e) => setShouldAdvanceToNext(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-neutral-900 flex items-center gap-1">
                    <span>Flytta ordern till nästa station:</span>
                    <strong className="text-emerald-700 underline">{nextColumn.title}</strong>
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    {calculatedTotal >= orderTotal
                      ? 'Alla ' + orderTotal + ' st är klara! Ordern markeras redo för nästa steg.'
                      : 'Bocka i om delbatchen nu skickas vidare till ' + nextColumn.title + '.'}
                  </span>
                </div>
              </label>
            ) : (
              <label className="flex items-start gap-2.5 p-2.5 bg-emerald-50 hover:bg-emerald-100/70 rounded-lg cursor-pointer border border-emerald-300 select-none">
                <input
                  type="checkbox"
                  checked={shouldArchive}
                  onChange={(e) => setShouldArchive(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-emerald-800 focus:ring-emerald-800 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 flex items-center gap-1">
                    <span>Slutför leverans & Flytta direkt till arkiv</span>
                  </span>
                  <span className="text-[11px] text-emerald-800 block mt-0.5">
                    Ordern är på slutstationen. Bocka i för att avsluta ordern och flytta den till arkivet så tavlan hålls ren.
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Optional Note / Deviation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Notering / Avvikelse (Valfritt)
              </label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setNoteType('approved')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    noteType === 'approved' ? 'bg-emerald-700 text-white font-bold' : 'text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Godkänd
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType('deviation')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    noteType === 'deviation' ? 'bg-rose-600 text-white font-bold' : 'text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Avvikelse
                </button>
              </div>
            </div>

            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="t.ex. 'Första 30 st klara och godkända' eller 'Smärre repa noterat'..."
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </form>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 border-t-2 border-neutral-900 bg-neutral-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg transition cursor-pointer"
          >
            Avbryt
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-sm font-black shadow-md transition active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Bekräfta & Spara ({currentBatchReport} st)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { ColumnConfig, ProductionOrder } from '../types';
import { generateQRCodeDataUrl, formatStationQRPayload } from '../utils/qr';

interface QuickStationQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  columns: ColumnConfig[];
  onOpenOrderDetail?: (order: ProductionOrder) => void;
  onOpenPrint?: (order: ProductionOrder) => void;
}

export const QuickStationQRModal: React.FC<QuickStationQRModalProps> = ({
  isOpen,
  onClose,
  order,
  columns,
  onOpenOrderDetail,
  onOpenPrint,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Always sync to the order's current active column whenever order changes or modal opens
  useEffect(() => {
    if (order && isOpen) {
      setSelectedStationId(order.columnId || columns[0]?.id || '');
    }
  }, [order?.id, order?.columnId, isOpen, columns]);

  // Generate QR whenever station changes
  useEffect(() => {
    if (order && selectedStationId && isOpen) {
      const payload = formatStationQRPayload(order.id, selectedStationId);
      generateQRCodeDataUrl(payload, { width: 340, margin: 2 }).then(setQrDataUrl);
    }
  }, [order?.id, selectedStationId, isOpen]);

  if (!isOpen || !order) return null;

  const currentColumnIndex = columns.findIndex((c) => c.id === order.columnId);
  const effectiveCurrentIndex = currentColumnIndex >= 0 ? currentColumnIndex : 0;
  const currentColumn = columns[effectiveCurrentIndex] || columns[0];

  const selectedColIndex = columns.findIndex((c) => c.id === selectedStationId);
  const selectedColumn = columns[selectedColIndex] || currentColumn;

  const isCurrentActiveStation = selectedStationId === order.columnId;
  const isLastColumn = effectiveCurrentIndex >= columns.length - 1;
  const nextColumn = !isLastColumn ? columns[effectiveCurrentIndex + 1] : null;

  const payloadText = formatStationQRPayload(order.id, selectedStationId);

  const handleCopyPayload = () => {
    navigator.clipboard?.writeText(payloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-base font-black text-neutral-900 tracking-tight">
                  {order.id}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-200 text-neutral-800">
                  {order.batchSize} {order.unit}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium truncate max-w-[280px] sm:max-w-[340px]">
                {order.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition cursor-pointer"
            title="Stäng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">

          {/* Station Stepper / Flow chain */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-neutral-600 mb-2">
              <span>Produktionskedja ({effectiveCurrentIndex + 1} av {columns.length}):</span>
              <span className="text-[11px] font-mono text-neutral-500">
                Aktiv station: <strong className="text-emerald-700">{currentColumn?.title}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {columns.map((col, idx) => {
                const isSelected = col.id === selectedStationId;
                const isCurrentActive = col.id === order.columnId;
                const isPassed = idx < effectiveCurrentIndex;

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedStationId(col.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer border ${
                      isCurrentActive
                        ? isSelected
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-400'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                        : isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : isPassed
                        ? 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{idx + 1}. {col.title}</span>
                    {isCurrentActive && (
                      <span className="text-[9px] bg-white/25 px-1 py-0.2 rounded font-black uppercase">
                        Aktiv
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Station Banner / SPÄRR status */}
          {isCurrentActiveStation ? (
            <div className="bg-emerald-50 border-2 border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">
                  {isLastColumn
                    ? `Sista stationen: ${selectedColumn.title} (Slutför & Arkivera)`
                    : `Rätt QR-kod för ${selectedColumn.title} (Aktuell station)`}
                </p>
                <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                  {isLastColumn ? (
                    <>
                      Skanna denna kod för att <strong>slutföra ordern</strong> vid sista steget. Ordern arkiveras automatiskt och flyttas till <strong className="underline font-bold text-emerald-950">Arkiv (Slutförda leveranser)</strong>!
                    </>
                  ) : (
                    <>
                      Skanna denna kod vid stationen för att slutföra steget. Ordern flyttas därefter automatiskt till{' '}
                      <strong className="underline font-bold text-emerald-950">
                        {nextColumn ? nextColumn.title : 'Arkiv'}
                      </strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">
                    Visar kod för &quot;{selectedColumn.title}&quot; (Inte orderns nuvarande station)
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Ordern befinner sig på <strong>{currentColumn?.title}</strong>. Skannas denna kod aktiveras spärren.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStationId(order.columnId)}
                className="shrink-0 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer transition"
              >
                Återgå till aktiv
              </button>
            </div>
          )}

          {/* QR Code Container */}
          <div className="bg-neutral-50 rounded-2xl border-2 border-neutral-900 p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-inner">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-2">
              Station: {selectedColumn.title}
            </span>

            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl border border-neutral-300 shadow-sm mb-3">
                <img
                  src={qrDataUrl}
                  alt={`QR för ${order.id} vid ${selectedColumn.title}`}
                  className="w-52 h-52 sm:w-60 sm:h-60 mx-auto"
                />
              </div>
            ) : (
              <div className="w-52 h-52 sm:w-60 sm:h-60 bg-neutral-200 rounded-xl animate-pulse mb-3" />
            )}

            {/* QR Payload Tag & Copy */}
            <div className="flex items-center gap-1.5 bg-white border border-neutral-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-neutral-900 shadow-2xs max-w-full truncate">
              <span className="truncate">{payloadText}</span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 hover:text-neutral-900 transition cursor-pointer shrink-0"
                title="Kopiera payload"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 mt-2 max-w-xs">
              Rikta skannern mot koden för att rapportera och flytta ordern vidare.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`QR_${order.id}_${selectedColumn.title.replace(/\s+/g, '_')}.png`}
                className="py-2.5 px-3 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-neutral-600" />
                <span>Ladda ner QR-bild</span>
              </a>
            )}

            {onOpenPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrint(order);
                }}
                className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Skriv ut följesedel</span>
              </button>
            )}
          </div>

          {onOpenOrderDetail && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOrderDetail(order);
              }}
              className="w-full py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Öppna fullständiga orderdetaljer & historik</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-100 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};

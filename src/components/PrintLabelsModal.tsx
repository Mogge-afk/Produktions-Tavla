import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Tag, 
  Download, 
  Check, 
  AlertCircle, 
  Maximize2, 
  Minimize2,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Smartphone,
  Scan
} from 'lucide-react';
import { ColumnConfig, ProductionOrder } from '../types';
import { generateQRCodeDataUrl, formatStationQRPayload } from '../utils/qr';
import { downloadPrintableFile, triggerHiddenIframePrint } from '../utils/printDocument';

interface PrintLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  columns: ColumnConfig[];
  initialSelectedOrderId?: string;
}

export const PrintLabelsModal: React.FC<PrintLabelsModalProps> = ({
  isOpen,
  onClose,
  orders,
  columns,
  initialSelectedOrderId,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printFormat, setPrintFormat] = useState<'traveler' | 'station_stickers'>('traveler');
  const [qrFormatType, setQrFormatType] = useState<'compact' | 'web_link'>('compact');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [stationQrMap, setStationQrMap] = useState<Record<string, Record<string, string>>>({});
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedOrderId) {
      setSelectedIds([initialSelectedOrderId]);
    } else {
      setSelectedIds(orders.slice(0, 3).map((o) => o.id));
    }
  }, [initialSelectedOrderId, orders, isOpen]);

  // Pre-generate main QR codes and station-specific QR codes (NO '@' symbol!)
  useEffect(() => {
    if (!isOpen) return;

    const generateQRs = async () => {
      const mainMap: Record<string, string> = {};
      const stMap: Record<string, Record<string, string>> = {};

      for (const order of orders) {
        if (selectedIds.includes(order.id)) {
          // Master QR (Clean Order ID, no email symbol)
          const masterPayload = qrFormatType === 'web_link' && typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}?order=${encodeURIComponent(order.id)}&auto=1`
            : `ORD:${order.id.trim()}`;

          const url = await generateQRCodeDataUrl(masterPayload, {
            width: 200,
            margin: 1,
          });
          mainMap[order.id] = url;

          // Station-specific QRs: Order + Station bound!
          stMap[order.id] = {};
          for (const col of columns) {
            const isWebLink = qrFormatType === 'web_link';
            const payload = formatStationQRPayload(order.id, col.id, isWebLink);
            const stationUrl = await generateQRCodeDataUrl(payload, {
              width: 150,
              margin: 1,
            });
            stMap[order.id][col.id] = stationUrl;
          }
        }
      }
      setQrMap(mainMap);
      setStationQrMap(stMap);
    };

    generateQRs();
  }, [selectedIds, orders, columns, isOpen, qrFormatType]);

  if (!isOpen) return null;

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));

  // Multi-method print execution:
  // 1. Attempts hidden iframe print
  // 2. Attempts window.print()
  // 3. If sandbox prevents it, prompts download of standalone printable file
  const handlePrint = async () => {
    setPrintNotice(null);
    const success = await triggerHiddenIframePrint(selectedOrders, columns, printFormat, qrMap, stationQrMap);
    
    if (!success) {
      try {
        window.print();
      } catch (err) {
        console.warn('Browser print blocked:', err);
        setPrintNotice(
          'Webbläsaren i denna förhandsgranskning blockerar utskriftsdialogen. Klicka på knappen "Ladda ner följesedel (.html)" nedan för att öppna eller spara utskriften direkt!'
        );
      }
    }
  };

  const handleDownloadFile = () => {
    downloadPrintableFile(selectedOrders, columns, printFormat, qrMap, stationQrMap);
  };

  return (
    <div className={`print-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 ${isFullPreview ? 'p-0 bg-white' : ''}`}>
      <div className={`print-modal-dialog bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] ${isFullPreview ? 'max-w-none max-h-none h-full rounded-none border-0' : ''}`}>
        
        {/* Modal Top Header (Hidden in Print) */}
        <div className="print:hidden px-5 py-3.5 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 text-emerald-400 border border-neutral-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase font-sans">
                Följesedlar & Stations-QR för utskrift
              </h2>
              <p className="text-xs text-neutral-400">
                A4-följesedlar med unika QR-koder per station — skanning flyttar automatiskt ordern till nästa fas!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullPreview(!isFullPreview)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title={isFullPreview ? 'Minska vy' : 'Helskärmsgranskning'}
            >
              {isFullPreview ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Format & QR Type Selector Bar (Hidden in Print) */}
        <div className="print:hidden px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            
            {/* 1. Layout Format */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-700 uppercase tracking-wider">Layout:</span>
              <div className="inline-flex rounded-lg bg-neutral-200 p-0.5 border border-neutral-300">
                <button
                  type="button"
                  onClick={() => setPrintFormat('traveler')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                    printFormat === 'traveler'
                      ? 'bg-neutral-950 text-white shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A4 Följesedel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('station_stickers')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                    printFormat === 'station_stickers'
                      ? 'bg-neutral-950 text-white shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Etiketter</span>
                </button>
              </div>
            </div>

            {/* 2. QR Code Type */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-700 uppercase tracking-wider">QR-kodstyp:</span>
              <div className="inline-flex rounded-lg bg-neutral-200 p-0.5 border border-neutral-300">
                <button
                  type="button"
                  onClick={() => setQrFormatType('compact')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition cursor-pointer ${
                    qrFormatType === 'compact'
                      ? 'bg-neutral-950 text-white shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                  title="Kompakt stationskod (ORD:ID:STATION) — perfekt för streckkodspistol och handskanner (utan @, aldrig e-post)"
                >
                  <Scan className="w-3 h-3 text-emerald-400" />
                  <span>Handskanner (ORD:ID:STATION)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrFormatType('web_link')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition cursor-pointer ${
                    qrFormatType === 'web_link'
                      ? 'bg-neutral-950 text-white shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                  title="Webblänk — perfekt om operatörer skannar med mobiltelefonens kamera för att direkt öppna och flytta ordern (aldrig e-post)"
                >
                  <Smartphone className="w-3 h-3 text-sky-400" />
                  <span>Mobilkamera (Webblänk)</span>
                </button>
              </div>
            </div>

            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Garanterat fri från @-tecken (visas aldrig som e-post)</span>
            </span>

          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-bold text-neutral-700 hover:text-neutral-900 underline cursor-pointer"
            >
              {selectedIds.length === orders.length ? 'Avmarkera alla' : 'Välj alla ordrar'}
            </button>
            <span className="text-neutral-400">·</span>
            <span className="font-mono text-xs font-bold text-neutral-900">
              {selectedIds.length} valda
            </span>
          </div>
        </div>

        {/* Order Selector Chips (Hidden in Print) */}
        <div className="print:hidden px-5 py-2 bg-neutral-100 border-b border-neutral-200 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {orders.map((ord) => {
            const isSelected = selectedIds.includes(ord.id);
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => toggleSelectOrder(ord.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-neutral-950 text-white border-neutral-950 font-bold'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
                }`}
              >
                <span className="font-mono">{ord.id}</span>
                <span className="truncate max-w-[120px]">{ord.title}</span>
              </button>
            );
          })}
        </div>

        {/* Info notice banner if print blocked or advice */}
        {printNotice && (
          <div className="print:hidden mx-5 mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{printNotice}</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadFile}
              className="px-3 py-1 bg-amber-900 text-white font-bold rounded text-xs shrink-0 cursor-pointer"
            >
              Ladda ner fil nu
            </button>
          </div>
        )}

        {/* Printable Area */}
        <div className="print-scroll-area p-4 sm:p-6 overflow-y-auto flex-1 bg-neutral-200/50 print:bg-white print:p-0">
          {selectedOrders.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              Välj minst en order ovan för att förhandsgranska och skriva ut.
            </div>
          ) : (
            <div className="space-y-6 print:space-y-0">
              {selectedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border-2 border-neutral-900 p-6 shadow-sm print:shadow-none print:border-2 print:border-black print:rounded-none print:break-after-page max-w-3xl mx-auto"
                >
                  {/* Följesedel Top Header */}
                  <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4 mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
                        TILLVERKNINGSORDER & FÖLJESEDEL
                      </span>
                      <h1 className="text-2xl font-black text-neutral-950 uppercase font-sans tracking-tight">
                        {order.title}
                      </h1>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-700 font-medium">
                        <span>Ordernr: <strong className="font-mono text-neutral-950">{order.id}</strong></span>
                        <span>·</span>
                        <span>Artikelnr: <strong className="font-mono text-neutral-950">{order.articleNumber}</strong></span>
                        <span>·</span>
                        <span>Kund: <strong className="text-neutral-950">{order.customer}</strong></span>
                        {order.drawingNumber && (
                          <>
                            <span>·</span>
                            <span>Ritning: <strong className="font-mono text-neutral-950">{order.drawingNumber}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Master QR Code */}
                    <div className="text-center shrink-0 ml-4">
                      {qrMap[order.id] && (
                        <img
                          src={qrMap[order.id]}
                          alt="Huvud-QR"
                          className="w-20 h-20 border border-neutral-400 p-1 mx-auto bg-white"
                        />
                      )}
                      <div className="font-mono text-xs font-black text-neutral-900 mt-0.5">
                        {order.id}
                      </div>
                    </div>
                  </div>

                  {/* Order Spec Badges */}
                  <div className="grid grid-cols-4 gap-2 text-xs mb-5">
                    <div className="p-2 border border-neutral-300 rounded bg-neutral-50 print:bg-transparent">
                      <span className="text-[10px] text-neutral-500 font-bold block uppercase">Orderkvantitet</span>
                      <span className="font-mono text-base font-black text-neutral-950">
                        {order.batchSize} {order.unit}
                      </span>
                    </div>
                    <div className="p-2 border border-neutral-300 rounded bg-neutral-50 print:bg-transparent">
                      <span className="text-[10px] text-neutral-500 font-bold block uppercase">Prioritet</span>
                      <span className="font-bold uppercase text-neutral-950">
                        {order.priority}
                      </span>
                    </div>
                    <div className="p-2 border border-neutral-300 rounded bg-neutral-50 print:bg-transparent">
                      <span className="text-[10px] text-neutral-500 font-bold block uppercase">Leveransmål</span>
                      <span className="font-mono text-sm font-bold text-neutral-950">
                        {order.targetDate}
                      </span>
                    </div>
                    <div className="p-2 border border-neutral-300 rounded bg-neutral-50 print:bg-transparent">
                      <span className="text-[10px] text-neutral-500 font-bold block uppercase">Utskriven</span>
                      <span className="font-mono text-xs text-neutral-700">
                        {new Date().toLocaleDateString('sv-SE')}
                      </span>
                    </div>
                  </div>

                  {/* ROUTING TABLE */}
                  {printFormat === 'traveler' ? (
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                          Stationsflöde & Inrapporterings-QR:
                        </h3>
                        <span className="text-[10px] text-neutral-500 italic">
                          Skanning flyttar ordern automatiskt vidare till nästa fas på tavlan
                        </span>
                      </div>

                      <table className="w-full text-left border-collapse border-2 border-neutral-900 text-xs">
                        <thead>
                          <tr className="bg-neutral-100 print:bg-neutral-200">
                            <th className="border border-neutral-900 p-2 font-black w-10 text-center">Fas</th>
                            <th className="border border-neutral-900 p-2 font-black">Stationsnamn</th>
                            <th className="border border-neutral-900 p-2 font-black w-24 text-center">Skanna QR</th>
                            <th className="border border-neutral-900 p-2 font-black w-28">Operatör (Namn)</th>
                            <th className="border border-neutral-900 p-2 font-black w-24">Antal / Totalt</th>
                            <th className="border border-neutral-900 p-2 font-black w-24">Datum / Sign</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columns.map((col, idx) => {
                            const stationQR = stationQrMap[order.id]?.[col.id];
                            const currentProgress = order.stationProgress?.[col.id] || 0;
                            return (
                              <tr key={col.id} className="h-16">
                                <td className="border border-neutral-900 p-2 text-center font-mono font-bold">
                                  {idx + 1}
                                </td>
                                <td className="border border-neutral-900 p-2">
                                  <div className="font-black text-neutral-900">{col.title}</div>
                                  <div className="text-[10px] text-neutral-500 font-mono">
                                    {order.id} : {col.title}
                                  </div>
                                </td>
                                <td className="border border-neutral-900 p-1 text-center align-middle">
                                  {stationQR ? (
                                    <div className="flex flex-col items-center">
                                      <img
                                        src={stationQR}
                                        alt={`QR ${col.title}`}
                                        className="w-14 h-14 p-0.5 border border-neutral-400 bg-white"
                                      />
                                      <span className="text-[8px] font-mono font-bold text-neutral-800 mt-0.5 leading-tight">
                                        ➔ {columns[idx + 1] ? columns[idx + 1].title : 'Klar'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 bg-neutral-100 mx-auto" />
                                  )}
                                </td>
                                <td className="border border-neutral-900 p-2 text-neutral-800">
                                  {order.reports.find((r) => r.stationId === col.id)?.operator || ''}
                                </td>
                                <td className="border border-neutral-900 p-2 font-mono font-bold">
                                  {currentProgress > 0 ? `${currentProgress} / ${order.batchSize} ${order.unit}` : ''}
                                </td>
                                <td className="border border-neutral-900 p-2"></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Station Sticker Grid */
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                      {columns.map((col) => {
                        const stationQR = stationQrMap[order.id]?.[col.id];
                        return (
                          <div
                            key={col.id}
                            className="p-3 border-2 border-neutral-900 rounded-lg text-center bg-white"
                          >
                            <span className="text-[10px] font-black uppercase text-neutral-500 block">
                              STATIONS-ETIKETT
                            </span>
                            <div className="text-sm font-black text-neutral-950 mt-0.5">
                              {col.title}
                            </div>
                            {stationQR && (
                              <img
                                src={stationQR}
                                alt="QR"
                                className="w-24 h-24 p-1 border border-neutral-300 mx-auto my-2"
                              />
                            )}
                            <div className="font-mono text-xs font-bold text-neutral-900">
                              {order.id} : {col.title}
                            </div>
                            <div className="text-[10px] text-neutral-600 truncate">
                              Order: {order.batchSize} {order.unit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer instruction note */}
                  <div className="border border-neutral-900 rounded p-2.5 text-xs bg-neutral-50/50 print:bg-transparent flex items-center justify-between">
                    <div>
                      <span className="font-bold text-neutral-900 block">
                        Instruktion för operatör vid arbetsstation:
                      </span>
                      <span className="text-[11px] text-neutral-600">
                        Skanna stationens QR-kod. Ordern flyttas automatiskt vidare till nästa fas på tavlan. Vid sista stationen arkiveras ordern.
                      </span>
                    </div>
                    <div className="text-right font-mono text-[10px] text-neutral-400 shrink-0 ml-4">
                      PROD-QR v2.0
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions (Hidden in Print) */}
        <div className="print:hidden px-5 py-3.5 border-t-2 border-neutral-900 bg-neutral-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg cursor-pointer"
          >
            Stäng
          </button>

          <div className="flex items-center gap-2">
            {/* Download Clean Standalone Printable File */}
            <button
              type="button"
              disabled={selectedOrders.length === 0}
              onClick={handleDownloadFile}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border-2 border-neutral-800 disabled:opacity-50 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Ladda ner följesedeln som en fristående HTML/PDF-fil som kan skrivas ut i vilken webbläsare som helst"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ladda ner följesedel (.html)</span>
            </button>

            {/* Direct Print Button */}
            <button
              type="button"
              disabled={selectedOrders.length === 0}
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-black shadow-md transition active:scale-95 cursor-pointer"
              title="Skriv ut direkt via webbläsaren"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Skriv ut följesedlar ({selectedOrders.length} st)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

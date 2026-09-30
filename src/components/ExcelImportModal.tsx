import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  Layers, 
  Calendar,
  Sparkles,
  HelpCircle,
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { ColumnConfig, ProductionOrder, Priority } from '../types';
import { 
  parseExcelFile, 
  processRowsWithMapping, 
  ColumnMapping, 
  ParsedRow, 
  downloadSampleIFSExcel 
} from '../utils/excelParser';
import { 
  loadPrioritySettings, 
  savePrioritySettings, 
  PrioritySettings, 
  getDueStatus 
} from '../utils/priority';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  existingOrders: ProductionOrder[];
  onImportOrders: (orders: ProductionOrder[], targetColumnId: string, duplicateStrategy: 'update' | 'skip') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  columns,
  existingOrders,
  onImportOrders,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prioritySettings, setPrioritySettings] = useState<PrioritySettings>(() => loadPrioritySettings());
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    orderId: '',
    title: '',
    articleNumber: '',
    batchSize: '',
    targetDate: '',
  });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  
  // Destination column (default to "Planerat" or first column)
  const defaultCol = columns.find((c) => c.title.toLowerCase().includes('plan')) || columns[0];
  const [targetColumnId, setTargetColumnId] = useState<string>(defaultCol?.id || 'col-planerat');
  
  // Duplicate strategy
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setFileName(file.name);
      const res = await parseExcelFile(file, prioritySettings);

      if (res.headers.length === 0) {
        setErrorMessage('Filen verkar tom eller innehåller inga läsbara kolumner.');
        setIsLoading(false);
        return;
      }

      setHeaders(res.headers);
      setMapping(res.suggestedMapping);

      // Extract raw rows
      const rawData = res.rows.map((r) => r.raw);
      setRawRows(rawData);
      setParsedRows(res.rows);

      // Select all rows by default
      const allIndices = new Set<number>(res.rows.map((r) => r.rowIndex));
      setSelectedRowIndices(allIndices);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Kunde inte läsa Excel-filen: ${err?.message || 'Kontrollera filformatet (.xlsx, .xls, .csv)'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, selectedHeader: string) => {
    const updatedMapping = { ...mapping, [field]: selectedHeader };
    setMapping(updatedMapping);
    if (rawRows.length > 0) {
      const updatedRows = processRowsWithMapping(rawRows, updatedMapping, prioritySettings);
      setParsedRows(updatedRows);
    }
  };

  const handleToggleRow = (rowIndex: number) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIndices.size === parsedRows.length) {
      setSelectedRowIndices(new Set());
    } else {
      setSelectedRowIndices(new Set(parsedRows.map((r) => r.rowIndex)));
    }
  };

  const handleToggleAutoPriority = () => {
    const nextSettings = {
      ...prioritySettings,
      autoPriorityEnabled: !prioritySettings.autoPriorityEnabled,
    };
    setPrioritySettings(nextSettings);
    savePrioritySettings(nextSettings);
    if (rawRows.length > 0) {
      const updatedRows = processRowsWithMapping(rawRows, mapping, nextSettings);
      setParsedRows(updatedRows);
    }
  };

  const handleSubmitImport = () => {
    const toImport = parsedRows.filter((r) => selectedRowIndices.has(r.rowIndex) && r.isValid);
    if (toImport.length === 0) return;

    const newProductionOrders: ProductionOrder[] = toImport.map((row) => {
      return {
        id: row.orderId.toUpperCase(),
        title: row.title,
        articleNumber: row.articleNumber || `ART-${Math.floor(10000 + Math.random() * 90000)}`,
        customer: row.customer || 'IFS Order',
        batchSize: row.batchSize,
        unit: row.unit || 'st',
        priority: row.priority,
        columnId: targetColumnId,
        targetDate: row.targetDate,
        drawingNumber: row.drawingNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        operator: 'IFS Importerad',
        notes: [
          {
            id: 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: new Date().toISOString(),
            operator: 'IFS Import',
            text: `Importerad från Excel (${fileName || 'IFS-fil'}). Planerat leveransdatum: ${row.targetDate}.`,
            type: 'info',
            stageName: columns.find((c) => c.id === targetColumnId)?.title || 'Planerat',
          },
        ],
        reports: [],
        stationProgress: {},
        checklists: {},
        tags: ['IFS'],
        qrPayload: row.orderId.toUpperCase(),
      };
    });

    onImportOrders(newProductionOrders, targetColumnId, duplicateStrategy);
    onClose();
  };

  const existingOrderIds = new Set(existingOrders.map((o) => o.id.toUpperCase()));
  const destinationColumn = columns.find((c) => c.id === targetColumnId) || columns[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-neutral-950 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight uppercase font-sans">
                  Importera Ordrar från Excel / IFS
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                  IFS Kompatibel
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Läs in tillverkningsordrar direkt från IFS-exportfil (.xlsx, .xls, .csv) till tavlan
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-neutral-50/50">
          
          {/* File Upload / Drag & Drop Area */}
          {!parsedRows.length ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-2xl p-8 sm:p-12 text-center bg-white transition cursor-pointer group hover:bg-neutral-50/80"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-700 rounded-2xl flex items-center justify-center mx-auto mb-4 transition">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                Klicka eller dra din Excel-fil hit
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                Stöder <strong className="text-neutral-700">IFS Applications-rapporter</strong>, standard 
                <strong className="text-neutral-700"> .xlsx, .xls</strong> och <strong className="text-neutral-700">.csv</strong>. 
                Alla fält identifieras automatiskt.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSampleIFSExcel();
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Ladda ner IFS-exempelfil (.xlsx)</span>
                </button>
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2 max-w-lg mx-auto text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* File Info Bar */}
              <div className="bg-white border-2 border-neutral-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 text-sm">{fileName}</span>
                    <div className="text-xs text-neutral-500">
                      {rawRows.length} rader hittades · {headers.length} kolumner identifierade
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setRawRows([]);
                      setHeaders([]);
                      setFileName(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg border border-neutral-300 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Byt fil</span>
                  </button>
                </div>
              </div>

              {/* Column Mapping Section */}
              <div className="bg-white border-2 border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                      <span>1. Kolumnkoppling från IFS</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Auto-matchad
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Kontrollera att IFS-kolumnerna matchar rätt fält (Ordernr, Artikelnamn, Artikelnummer, Antal, Leveransdatum)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadSampleIFSExcel()}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ladda ner mall</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Ordernr */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="block text-[11px] font-black uppercase text-neutral-700 tracking-wider mb-1">
                      Ordernr / Tillverkningsorder *
                    </label>
                    <select
                      value={mapping.orderId}
                      onChange={(e) => handleMappingChange('orderId', e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                    >
                      <option value="">-- Välj kolumn --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Artikelnamn */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="block text-[11px] font-black uppercase text-neutral-700 tracking-wider mb-1">
                      Artikelnamn / Benämning *
                    </label>
                    <select
                      value={mapping.title}
                      onChange={(e) => handleMappingChange('title', e.target.value)}
                      className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                    >
                      <option value="">-- Välj kolumn --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Artikelnummer */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="block text-[11px] font-black uppercase text-neutral-700 tracking-wider mb-1">
                      Artikelnummer / Artikelnr *
                    </label>
                    <select
                      value={mapping.articleNumber}
                      onChange={(e) => handleMappingChange('articleNumber', e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                    >
                      <option value="">-- Välj kolumn --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Antal */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="block text-[11px] font-black uppercase text-neutral-700 tracking-wider mb-1">
                      Antal / Kvantitet *
                    </label>
                    <select
                      value={mapping.batchSize}
                      onChange={(e) => handleMappingChange('batchSize', e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                    >
                      <option value="">-- Välj kolumn --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Planerat leveransdatum */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="block text-[11px] font-black uppercase text-neutral-700 tracking-wider mb-1 flex items-center justify-between">
                      <span>Planerat leveransdatum *</span>
                      <Calendar className="w-3 h-3 text-neutral-500" />
                    </label>
                    <select
                      value={mapping.targetDate}
                      onChange={(e) => handleMappingChange('targetDate', e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                    >
                      <option value="">-- Välj kolumn --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kund / Projekt (Valfritt) */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <label className="block text-[11px] font-black uppercase text-neutral-500 tracking-wider mb-1">
                      Kund / Beställare (Valfritt)
                    </label>
                    <select
                      value={mapping.customer || ''}
                      onChange={(e) => handleMappingChange('customer', e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                    >
                      <option value="">-- Ingen (standard) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Import Settings Bar: Destination Column & Auto-Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Destination Column */}
                <div className="bg-white border-2 border-neutral-200 rounded-xl p-4 shadow-xs">
                  <label className="block text-xs font-black uppercase text-neutral-800 tracking-tight mb-1 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-neutral-600" />
                    <span>Målkolumn på tavlan</span>
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Ordrar läggs direkt i vald kolumn (rekommenderat: Planerat)
                  </p>
                  <select
                    value={targetColumnId}
                    onChange={(e) => setTargetColumnId(e.target.value)}
                    className="w-full text-sm font-bold px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Auto-Priority Configuration */}
                <div className="bg-white border-2 border-neutral-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black uppercase text-neutral-800 tracking-tight flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Automatisk prioritet</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={prioritySettings.autoPriorityEnabled}
                      onChange={handleToggleAutoPriority}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Beräknas automatiskt utifrån leveransdatum:
                  </p>
                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-700 font-bold">🔴 Akut:</span>
                      <span className="font-mono text-neutral-700">≤ {prioritySettings.urgentDaysThreshold} dagar kvar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 font-bold">🟡 Hög:</span>
                      <span className="font-mono text-neutral-700">3 till {prioritySettings.highDaysThreshold} dagar kvar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600 font-bold">⚪ Normal:</span>
                      <span className="font-mono text-neutral-700">&gt; {prioritySettings.highDaysThreshold} dagar kvar</span>
                    </div>
                  </div>
                </div>

                {/* 3. Duplicate Handling */}
                <div className="bg-white border-2 border-neutral-200 rounded-xl p-4 shadow-xs">
                  <label className="block text-xs font-black uppercase text-neutral-800 tracking-tight mb-1 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-neutral-600" />
                    <span>Dubbletthantering</span>
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Om ett ordernummer redan finns på tavlan:
                  </p>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as 'update' | 'skip')}
                    className="w-full text-xs font-bold px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                  >
                    <option value="update">Uppdatera befintlig (datum & antal)</option>
                    <option value="skip">Hoppa över befintlig (behåll befintlig status)</option>
                  </select>
                </div>
              </div>

              {/* Preview Table of Rows to Import */}
              <div className="bg-white border-2 border-neutral-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-3 bg-neutral-100 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-neutral-900 uppercase tracking-tight">
                      Förhandsgranskning av ordrar
                    </span>
                    <span className="font-mono px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-bold">
                      {selectedRowIndices.size} av {parsedRows.length} valda
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="font-bold text-neutral-700 hover:text-neutral-950 underline cursor-pointer"
                  >
                    {selectedRowIndices.size === parsedRows.length ? 'Avmarkera alla' : 'Välj alla'}
                  </button>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[11px] font-black uppercase text-neutral-600">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRowIndices.size === parsedRows.length && parsedRows.length > 0}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Ordernr</th>
                        <th className="p-3">Artikelnamn</th>
                        <th className="p-3">Artikelnr</th>
                        <th className="p-3 text-right">Antal</th>
                        <th className="p-3">Planerat datum</th>
                        <th className="p-3">Prioritet</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {parsedRows.map((row) => {
                        const isSelected = selectedRowIndices.has(row.rowIndex);
                        const isDuplicate = existingOrderIds.has(row.orderId.toUpperCase());
                        const dueStatus = getDueStatus(row.targetDate);

                        return (
                          <tr
                            key={row.rowIndex}
                            onClick={() => handleToggleRow(row.rowIndex)}
                            className={`transition cursor-pointer ${
                              isSelected ? 'bg-sky-50/40 hover:bg-sky-50' : 'bg-white hover:bg-neutral-50 opacity-60'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRow(row.rowIndex)}
                                className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-neutral-900">
                              <span className="bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                                {row.orderId}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-neutral-900">
                              {row.title}
                            </td>
                            <td className="p-3 font-mono text-neutral-600">
                              {row.articleNumber || '-'}
                            </td>
                            <td className="p-3 font-mono font-bold text-neutral-900 text-right">
                              {row.batchSize} {row.unit}
                            </td>
                            <td className="p-3 font-mono">
                              <div className="flex flex-col">
                                <span className="font-bold text-neutral-900">{row.targetDate}</span>
                                <span className="text-[10px] text-neutral-500">{dueStatus.label}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {row.priority === 'urgent' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                                  Akut
                                </span>
                              )}
                              {row.priority === 'high' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-neutral-950">
                                  Hög
                                </span>
                              )}
                              {row.priority === 'normal' && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                                  Normal
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {isDuplicate ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                  Befintlig ({duplicateStrategy === 'update' ? 'Uppdateras' : 'Hoppas över'})
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Ny order
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t-2 border-neutral-900 bg-neutral-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-600 font-medium">
            {parsedRows.length > 0 && (
              <span>
                Lägger till i <strong className="text-neutral-950">"{destinationColumn.title}"</strong> med direkt QR-kod och följesedel.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg cursor-pointer transition"
            >
              Avbryt
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                disabled={selectedRowIndices.size === 0}
                onClick={handleSubmitImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-sm font-black shadow-md transition active:scale-95 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                <span>Importera {selectedRowIndices.size} ordrar till "{destinationColumn.title}"</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  User, 
  Layers, 
  Printer, 
  Download, 
  Trash2, 
  Send, 
  CheckSquare, 
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  Clock,
  Sparkles,
  Edit2,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { ColumnConfig, ProductionOrder, ProductionNote, ProductionReport, ChecklistItem, Priority } from '../types';
import { generateQRCodeDataUrl, formatStationQRPayload } from '../utils/qr';
import { getStoredOperatorName, setStoredOperatorName } from '../utils/storage';
import { getDueStatus, calculatePriorityFromDate } from '../utils/priority';

interface OrderDetailModalProps {
  order: ProductionOrder | null;
  columns: ColumnConfig[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateOrder: (updated: ProductionOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onArchiveOrder: (orderId: string) => void;
  onPrintLabel: (order: ProductionOrder) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  columns,
  isOpen,
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onArchiveOrder,
  onPrintLabel,
}) => {
  const [selectedStationQR, setSelectedStationQR] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<ProductionNote['type']>('info');
  const [operator, setOperator] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('normal');
  const [editBatchSize, setEditBatchSize] = useState(1);
  const [editArticleNumber, setEditArticleNumber] = useState('');

  useEffect(() => {
    if (order) {
      const activeStation = selectedStationQR || order.columnId || columns[0]?.id || '';
      setSelectedStationQR(activeStation);
      setOperator(getStoredOperatorName() || order.operator || 'Kalle.K');
      setEditDate(order.targetDate);
      setEditPriority(order.priority);
      setEditBatchSize(order.batchSize);
      setEditArticleNumber(order.articleNumber);
      setIsEditingSpecs(false);
    }
  }, [order, isOpen, columns]);

  // Update QR preview whenever selected station changes
  useEffect(() => {
    if (order && selectedStationQR) {
      const payload = formatStationQRPayload(order.id, selectedStationQR);
      generateQRCodeDataUrl(payload, { width: 300, margin: 2 }).then(setQrDataUrl);
    }
  }, [order, selectedStationQR]);

  if (!isOpen || !order) return null;

  const currentColumn = columns.find((c) => c.id === order.columnId);
  const orderTotal = order.batchSize || 1;
  const dueStatus = getDueStatus(order.targetDate);

  const handleStageChange = (newColId: string) => {
    if (newColId === order.columnId) return;
    const targetCol = columns.find((c) => c.id === newColId);
    const newNote: ProductionNote = {
      id: 'note_' + Date.now(),
      timestamp: new Date().toISOString(),
      operator: operator || 'Operatör',
      text: `Status ändrad från "${currentColumn?.title}" till "${targetCol?.title}".`,
      type: 'stage_change',
      stageName: targetCol?.title,
    };

    const updated: ProductionOrder = {
      ...order,
      columnId: newColId,
      updatedAt: new Date().toISOString(),
      notes: [newNote, ...order.notes],
    };
    onUpdateOrder(updated);
  };

  const handleSaveSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProductionOrder = {
      ...order,
      targetDate: editDate,
      priority: editPriority,
      batchSize: Number(editBatchSize) || 1,
      articleNumber: editArticleNumber.trim(),
      updatedAt: new Date().toISOString(),
      notes: [
        {
          id: 'note_spec_' + Date.now(),
          timestamp: new Date().toISOString(),
          operator: operator || 'Produktionsledare',
          text: `Orderdata uppdaterad: Leveransdatum ${editDate}, Prioritet ${editPriority}, Antal ${editBatchSize} ${order.unit}.`,
          type: 'info',
          stageName: currentColumn?.title,
        },
        ...order.notes,
      ],
    };
    onUpdateOrder(updated);
    setIsEditingSpecs(false);
  };

  const handleAutoSetPriority = () => {
    const calculated = calculatePriorityFromDate(editDate);
    setEditPriority(calculated);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    if (operator.trim()) setStoredOperatorName(operator.trim());

    const note: ProductionNote = {
      id: 'note_' + Date.now(),
      timestamp: new Date().toISOString(),
      operator: operator.trim() || 'Operatör',
      text: newNoteText.trim(),
      type: newNoteType,
      stageName: currentColumn?.title,
    };

    const updated: ProductionOrder = {
      ...order,
      updatedAt: new Date().toISOString(),
      operator: operator.trim() || order.operator,
      notes: [note, ...order.notes],
    };
    onUpdateOrder(updated);
    setNewNoteText('');
  };

  const handleToggleChecklist = (colId: string, itemId: string) => {
    const list = order.checklists?.[colId] || [];
    const updatedList = list.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed: !item.completed,
            completedBy: !item.completed ? operator || 'Operatör' : undefined,
            completedAt: !item.completed ? new Date().toISOString() : undefined,
          }
        : item
    );

    const updated: ProductionOrder = {
      ...order,
      checklists: {
        ...order.checklists,
        [colId]: updatedList,
      },
    };
    onUpdateOrder(updated);
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const currentList = order.checklists?.[order.columnId] || [];
    const newItem: ChecklistItem = {
      id: 'chk_' + Date.now(),
      text: newChecklistText.trim(),
      completed: false,
    };

    const updated: ProductionOrder = {
      ...order,
      checklists: {
        ...order.checklists,
        [order.columnId]: [...currentList, newItem],
      },
    };
    onUpdateOrder(updated);
    setNewChecklistText('');
  };

  const currentChecklist = order.checklists?.[order.columnId] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-black px-2.5 py-1 rounded bg-white text-neutral-950">
              {order.id}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">
                  {order.title}
                </h2>
                {order.priority === 'urgent' && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                    AKUT
                  </span>
                )}
                {order.priority === 'high' && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950">
                    HÖG
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Artikelnr: {order.articleNumber} · Kund: {order.customer} · Order: {orderTotal} {order.unit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onArchiveOrder(order.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
              title="Slutför och flytta denna order till arkivet"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arkivera order</span>
            </button>
            <button
              onClick={() => onPrintLabel(order)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition cursor-pointer"
              title="Skriv ut följesedel med stations-QR"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Skriv ut följesedel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* Left 2 Cols: Details, Station Progress, Reports & Timeline */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Delivery Date & Order Spec Card */}
            <div className="bg-white p-4 rounded-xl border-2 border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-neutral-700" />
                  <span>Leveransmål & Specifikation</span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsEditingSpecs(!isEditingSpecs)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingSpecs ? 'Avbryt ändring' : 'Redigera'}</span>
                </button>
              </div>

              {!isEditingSpecs ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase">Planerat leveransdatum</span>
                    <span className="font-mono text-sm font-black text-neutral-900 block mt-0.5">
                      {order.targetDate}
                    </span>
                    <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] ${dueStatus.badgeColorClass}`}>
                      {dueStatus.label}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase">Prioritet</span>
                    <span className="font-bold text-sm uppercase text-neutral-900 block mt-0.5">
                      {order.priority}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-1">
                      {order.priority === 'urgent' ? '🔴 Brådskande' : order.priority === 'high' ? '🟡 Hög' : '⚪ Normal'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase">Orderkvantitet</span>
                    <span className="font-mono text-sm font-black text-neutral-900 block mt-0.5">
                      {order.batchSize} {order.unit}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-1">Total batch</span>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase">Artikelnummer</span>
                    <span className="font-mono text-xs font-bold text-neutral-900 block mt-0.5 truncate" title={order.articleNumber}>
                      {order.articleNumber || '-'}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-1 truncate">{order.customer}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveSpecs} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Leveransdatum
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full font-mono text-xs px-2.5 py-1.5 border border-neutral-300 rounded-md"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-neutral-700 uppercase">
                          Prioritet
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoSetPriority}
                          className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 hover:underline"
                        >
                          <Sparkles className="w-3 h-3" /> Auto
                        </button>
                      </div>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as Priority)}
                        className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 rounded-md"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">Hög</option>
                        <option value="urgent">Brådskande / Akut</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Antal ({order.unit})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editBatchSize}
                        onChange={(e) => setEditBatchSize(Number(e.target.value))}
                        className="w-full font-mono text-xs px-2.5 py-1.5 border border-neutral-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                        Artikelnummer
                      </label>
                      <input
                        type="text"
                        value={editArticleNumber}
                        onChange={(e) => setEditArticleNumber(e.target.value)}
                        className="w-full font-mono text-xs px-2.5 py-1.5 border border-neutral-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingSpecs(false)}
                      className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-md font-medium"
                    >
                      Avbryt
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs bg-neutral-900 text-white rounded-md font-bold hover:bg-neutral-800"
                    >
                      Spara ändringar
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Status Selection */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider block mb-2">
                Aktiv produktionsfas på tavlan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((col) => {
                  const isActive = col.id === order.columnId;
                  const done = order.stationProgress?.[col.id] || 0;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleStageChange(col.id)}
                      style={{
                        backgroundColor: isActive ? col.headerBg : '#ffffff',
                        borderColor: isActive ? '#171717' : '#d4d4d4',
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs border-2 transition cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'font-black text-neutral-900 ring-2 ring-neutral-900 shadow-xs'
                          : 'font-medium text-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900" />}
                      <span>{col.title}</span>
                      <span className="font-mono text-[10px] text-neutral-500">
                        ({done}/{orderTotal})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inrapporterade delbatcher (Namn, Antal, Totalt, Order) */}
            <div className="bg-white p-4 rounded-xl border-2 border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Inrapporterade batcher ({order.reports?.length || 0})
                </span>
                <span className="text-xs font-mono font-bold text-neutral-700">
                  Order: {orderTotal} {order.unit}
                </span>
              </div>

              {order.reports && order.reports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-300 text-neutral-500">
                        <th className="py-1.5 font-bold">Station</th>
                        <th className="py-1.5 font-bold">Operatör (Namn)</th>
                        <th className="py-1.5 font-bold font-mono">Antal</th>
                        <th className="py-1.5 font-bold font-mono">Totalt</th>
                        <th className="py-1.5 font-bold">Tidpunkt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 font-medium text-neutral-800">
                      {order.reports.map((rep) => (
                        <tr key={rep.id} className="hover:bg-neutral-50">
                          <td className="py-1.5 font-bold text-neutral-900">{rep.stationName}</td>
                          <td className="py-1.5">{rep.operator}</td>
                          <td className="py-1.5 font-mono text-emerald-700 font-black">
                            +{rep.quantity} {order.unit}
                          </td>
                          <td className="py-1.5 font-mono font-bold">
                            {rep.totalSoFar} / {rep.orderTotal} {order.unit}
                          </td>
                          <td className="py-1.5 text-neutral-400 font-mono text-[11px]">
                            {new Date(rep.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}{' '}
                            {new Date(rep.timestamp).toLocaleDateString('sv-SE', { month: 'numeric', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic py-2">
                  Inga rapporter inlagda ännu. Skanna QR-koden vid stationen för att rapportera antal och namn.
                </p>
              )}
            </div>

            {/* Checklist per Station */}
            <div className="bg-white p-4 rounded-xl border border-neutral-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-neutral-600" />
                  Kvalitetskontroller vid {currentColumn?.title}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {currentChecklist.filter((c) => c.completed).length}/{currentChecklist.length} klara
                </span>
              </div>

              {/* Checklist Items */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {currentChecklist.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Inga kontrollpunkter definierade för detta steg.</p>
                ) : (
                  currentChecklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-200 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(order.columnId, item.id)}
                        className="mt-0.5 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className={item.completed ? 'line-through text-neutral-400' : 'text-neutral-800 font-medium'}>
                          {item.text}
                        </span>
                        {item.completed && item.completedBy && (
                          <span className="block text-[10px] text-neutral-400 mt-0.5">
                            Signerad av {item.completedBy}
                          </span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Add checklist item */}
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Lägg till kontrollpunkt (t.ex. Provtryckning, Moment...)"
                  className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-white rounded-md text-xs font-bold transition cursor-pointer"
                >
                  Lägg till
                </button>
              </form>
            </div>

            {/* Complete Production Log / Timeline */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                Fullständig historik ({order.notes.length})
              </span>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      placeholder="Ditt namn..."
                      className="text-xs px-2 py-1 bg-white border border-neutral-300 rounded font-medium max-w-[140px]"
                    />
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-600 font-medium">{currentColumn?.title}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewNoteType('info')}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                        newNoteType === 'info' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-600'
                      }`}
                    >
                      Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNoteType('approved')}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                        newNoteType === 'approved' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-700'
                      }`}
                    >
                      Godkänd
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNoteType('deviation')}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                        newNoteType === 'deviation' ? 'bg-rose-600 text-white font-bold' : 'text-rose-700'
                      }`}
                    >
                      Avvikelse
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Skriv kommentar, notering eller avvikelse..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Spara</span>
                  </button>
                </div>
              </form>

              {/* Timeline Items */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {order.notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-xl border text-xs ${
                      note.type === 'deviation'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : note.type === 'approved'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : note.type === 'stage_change'
                        ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                        : 'bg-white border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900">{note.operator}</span>
                        {note.stageName && (
                          <span className="text-neutral-500 font-medium">[{note.stageName}]</span>
                        )}
                      </div>
                      <span className="text-neutral-400 font-mono">
                        {new Date(note.timestamp).toLocaleTimeString('sv-SE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {new Date(note.timestamp).toLocaleDateString('sv-SE', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Stationsbunden QR-kod */}
          <div className="space-y-4">
            <div className="bg-neutral-50 p-4 rounded-xl border-2 border-neutral-900 text-center flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-700 mb-1">
                Stationsbunden QR-kod
              </span>

              {/* Station selector for QR preview */}
              <div className="w-full mb-3">
                <label className="text-[10px] text-neutral-500 font-bold block mb-1">
                  Välj station att visa QR för:
                </label>
                <select
                  value={selectedStationQR}
                  onChange={(e) => setSelectedStationQR(e.target.value)}
                  className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-lg border border-neutral-300 shadow-xs mb-2">
                  <img src={qrDataUrl} alt="Station QR" className="w-44 h-44 mx-auto" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-neutral-200 rounded-lg animate-pulse mb-2" />
              )}

              <div className="font-mono text-xs font-black text-neutral-900 mb-1">
                {order.id} : {columns.find((c) => c.id === selectedStationQR)?.title}
              </div>
              <p className="text-[11px] text-neutral-500 leading-tight mb-3">
                Skanna denna kod vid stationen för att öppna formuläret med Namn, Antal och Totalt.
              </p>

              <div className="flex flex-col w-full gap-2">
                <button
                  type="button"
                  onClick={() => onPrintLabel(order)}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Skriv ut följesedel</span>
                </button>
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`QR_${order.id}_${selectedStationQR}.png`}
                    className="w-full py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ladda ner QR-bild</span>
                  </a>
                )}
              </div>
            </div>

            {/* Action buttons: Archive & Delete */}
            <div className="pt-2 border-t border-neutral-200 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onArchiveOrder(order.id);
                  onClose();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-98"
                title="Slutför och flytta denna order till arkivet"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Slutför & Flytta till arkiv</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ta bort tillverkningsorder</span>
              </button>
            </div>
          </div>
        </div>

        {/* In-Modal Delete Confirmation Box (No window.confirm!) */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="bg-white rounded-xl border-2 border-neutral-900 shadow-2xl w-full max-w-md p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-950 uppercase tracking-tight">
                    Ta bort order permanent?
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Vill du verkligen ta bort <strong className="font-mono text-neutral-900">{order.id}</strong> ({order.title}) helt? Tips: Du kan också välja <em>"Slutför & Flytta till arkiv"</em> för att behålla historiken.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 rounded-lg cursor-pointer"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteOrder(order.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                >
                  Ja, ta bort order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

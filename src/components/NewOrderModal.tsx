import React, { useState } from 'react';
import { X, Plus, Sparkles, Building, Layers, Calendar } from 'lucide-react';
import { ColumnConfig, ProductionOrder, Priority } from '../types';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  defaultColumnId?: string;
  onCreateOrder: (newOrder: ProductionOrder) => void;
  existingCount: number;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  columns,
  defaultColumnId,
  onCreateOrder,
  existingCount,
}) => {
  const nextNum = 100 + existingCount + 1;
  const [orderId, setOrderId] = useState(`AO-2026-${nextNum}`);
  const [title, setTitle] = useState('');
  const [articleNumber, setArticleNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [unit, setUnit] = useState('st');
  const [priority, setPriority] = useState<Priority>('normal');
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || 'col-planerat');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [drawingNumber, setDrawingNumber] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [operator, setOperator] = useState('Produktionsledare');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !orderId.trim()) return;

    const initialNotes = initialNote.trim()
      ? [
          {
            id: 'n_' + Date.now(),
            timestamp: new Date().toISOString(),
            operator: operator || 'Produktionsledare',
            text: initialNote.trim(),
            type: 'info' as const,
            stageName: columns.find((c) => c.id === columnId)?.title,
          },
        ]
      : [];

    const newOrder: ProductionOrder = {
      id: orderId.trim().toUpperCase(),
      title: title.trim(),
      articleNumber: articleNumber.trim() || `ART-${Math.floor(10000 + Math.random() * 90000)}`,
      customer: customer.trim() || 'Intern tillverkning',
      batchSize: Number(batchSize) || 1,
      unit,
      priority,
      columnId,
      targetDate,
      drawingNumber: drawingNumber.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operator,
      notes: initialNotes,
      reports: [],
      stationProgress: {},
      checklists: {},
      tags: [],
      qrPayload: orderId.trim().toUpperCase(),
    };

    onCreateOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b-2 border-neutral-800 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500 text-neutral-950">
              <Plus className="w-5 h-5 font-black" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase font-sans">
                Ny tillverkningsorder
              </h2>
              <p className="text-xs text-neutral-400">
                Skapa order och generera direkt QR-kod för följesedel
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Order ID & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Ordernummer / ID *
              </label>
              <input
                type="text"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full font-mono font-bold text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Prioritet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-medium"
              >
                <option value="normal">Normal prioritet</option>
                <option value="high">Hög prioritet</option>
                <option value="urgent">Brådskande / Akut</option>
              </select>
            </div>
          </div>

          {/* Product Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Produkt / Detaljnamn *
            </label>
            <input
              type="text"
              required
              placeholder="t.ex. Flänsfäste FL-50 Rostfritt eller Styrpanel SP-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Article Number & Drawing Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Artikelnummer
              </label>
              <input
                type="text"
                placeholder="t.ex. ART-90210"
                value={articleNumber}
                onChange={(e) => setArticleNumber(e.target.value)}
                className="w-full font-mono text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Ritningsnummer
              </label>
              <input
                type="text"
                placeholder="t.ex. RIT-2026-B"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                className="w-full font-mono text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Customer & Batch Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Kund / Projekt
              </label>
              <input
                type="text"
                placeholder="t.ex. ABB Robotics, Scania, Intern"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Antal
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full font-mono text-sm px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Enhet
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full text-sm px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Initial Column & Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Startkolumn på tavlan
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900 font-medium"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Måldatum / Leverans
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Initial Note */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Startnotering (valfritt)
            </label>
            <textarea
              rows={2}
              placeholder="Instruktioner till beredning/operatör..."
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t-2 border-neutral-800 bg-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg cursor-pointer"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            Skapa order & generera QR
          </button>
        </div>
      </div>
    </div>
  );
};

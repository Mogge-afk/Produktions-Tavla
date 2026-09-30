import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  RotateCcw, 
  Sliders, 
  Palette,
  Sparkles
} from 'lucide-react';
import { ColumnConfig } from '../types';
import { DEFAULT_COLUMNS, TEMPLATES } from '../utils/storage';

interface ColumnManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSaveColumns: (newColumns: ColumnConfig[]) => void;
}

const COLOR_PRESETS = [
  { name: 'Ljusblå (Planerat)', bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  { name: 'Ljusgrön (Material)', bg: '#dcfce7', border: '#86efac', text: '#14532d' },
  { name: 'Ljusgul (Montering)', bg: '#fef3c7', border: '#fde047', text: '#713f12' },
  { name: 'Lila (Test)', bg: '#f3e8ff', border: '#d8b4fe', text: '#581c87' },
  { name: 'Rosa (Packning)', bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
  { name: 'Salviagrön (Leverans)', bg: '#ccfbf1', border: '#5eead4', text: '#115e59' },
  { name: 'Persika / Orange', bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
  { name: 'Ljusgrå / Neutral', bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' },
];

export const ColumnManagerModal: React.FC<ColumnManagerModalProps> = ({
  isOpen,
  onClose,
  columns,
  onSaveColumns,
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  if (!isOpen) return null;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localColumns.length) return;

    const copy = [...localColumns];
    const item = copy.splice(index, 1)[0];
    copy.splice(targetIndex, 0, item);
    setLocalColumns(copy);
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    setLocalColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, title: newTitle } : col))
    );
  };

  const handleColorChange = (index: number, presetIndex: number) => {
    const preset = COLOR_PRESETS[presetIndex];
    setLocalColumns((prev) =>
      prev.map((col, i) =>
        i === index
          ? {
              ...col,
              headerBg: preset.bg,
              borderColor: preset.border,
              headerTextColor: preset.text,
            }
          : col
      )
    );
  };

  const handleDeleteColumn = (id: string) => {
    if (localColumns.length <= 1) {
      alert('Tavlan måste ha minst en kolumn.');
      return;
    }
    setLocalColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    const preset = COLOR_PRESETS[selectedColorIndex % COLOR_PRESETS.length];
    const newCol: ColumnConfig = {
      id: 'col_' + Date.now(),
      title: newColumnTitle.trim(),
      headerBg: preset.bg,
      borderColor: preset.border,
      headerTextColor: preset.text,
    };

    setLocalColumns((prev) => [...prev, newCol]);
    setNewColumnTitle('');
  };

  const handleApplyTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey];
    if (template) {
      setLocalColumns(template.columns);
    }
  };

  const handleSaveAndClose = () => {
    onSaveColumns(localColumns);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-neutral-800 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-800 text-amber-400 border border-neutral-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase font-sans">
                Anpassa kolumner & rubriker
              </h2>
              <p className="text-xs text-neutral-400">
                Ändra namn på produktionssteg, ordning och färgkodning
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

        {/* Templates quick bar */}
        <div className="px-5 py-2.5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-neutral-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Färdiga mallar:
          </span>
          <button
            type="button"
            onClick={() => handleApplyTemplate('original')}
            className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded font-medium transition cursor-pointer"
          >
            Original (från bild)
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('mechanical')}
            className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded font-medium transition cursor-pointer"
          >
            Mekanisk bearbetning
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('electronics')}
            className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded font-medium transition cursor-pointer"
          >
            Elektronik & PCB
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
              Aktiva kolumner på tavlan ({localColumns.length})
            </span>

            {localColumns.map((col, index) => (
              <div
                key={col.id}
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-300 hover:border-neutral-500 transition"
              >
                {/* Drag / Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-900 disabled:opacity-20 cursor-pointer"
                    title="Flytta vänster på tavlan"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === localColumns.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-900 disabled:opacity-20 cursor-pointer"
                    title="Flytta höger på tavlan"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Color sample */}
                <div
                  style={{ backgroundColor: col.headerBg }}
                  className="w-8 h-8 rounded-lg border-2 border-neutral-800 shrink-0 shadow-xs flex items-center justify-center font-bold text-xs"
                >
                  {index + 1}
                </div>

                {/* Editable title input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={col.title}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                    className="w-full font-bold text-sm px-3 py-1.5 bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                    placeholder="Kolumnrubrik..."
                  />
                </div>

                {/* Color picker dropdown/swatches */}
                <div className="flex items-center gap-1">
                  {COLOR_PRESETS.slice(0, 5).map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleColorChange(index, pIdx)}
                      style={{ backgroundColor: preset.bg }}
                      className={`w-5 h-5 rounded-md border transition cursor-pointer ${
                        col.headerBg === preset.bg
                          ? 'ring-2 ring-neutral-900 scale-110 border-neutral-800'
                          : 'border-neutral-400 hover:scale-105'
                      }`}
                      title={preset.name}
                    />
                  ))}
                </div>

                {/* Delete Column button */}
                <button
                  type="button"
                  onClick={() => handleDeleteColumn(col.id)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Ta bort kolumn"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Column Form */}
          <form
            onSubmit={handleAddColumn}
            className="p-4 bg-neutral-100 rounded-xl border border-dashed border-neutral-400 space-y-3"
          >
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
              + Lägg till ny kolumn / produktionsfas
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Rubrik (t.ex. Slutbesiktning, Pulverlackering...)"
                className="flex-1 px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              />

              <div className="flex items-center gap-1.5 self-center">
                {COLOR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    style={{ backgroundColor: p.bg }}
                    className={`w-6 h-6 rounded-md border transition cursor-pointer ${
                      selectedColorIndex === idx
                        ? 'ring-2 ring-neutral-900 border-neutral-800 scale-110'
                        : 'border-neutral-400'
                    }`}
                    title={p.name}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={!newColumnTitle.trim()}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Lägg till
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t-2 border-neutral-800 bg-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setLocalColumns(DEFAULT_COLUMNS)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Återställ standard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              Spara rubriker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

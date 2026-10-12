import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Check } from 'lucide-react';

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCount: number;
  archivedCount: number;
  onConfirmDelete: (includeArchive: boolean) => void;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({
  isOpen,
  onClose,
  activeCount,
  archivedCount,
  onConfirmDelete,
}) => {
  const [includeArchive, setIncludeArchive] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-rose-900 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-rose-950 text-white flex items-center justify-between border-b-2 border-rose-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600 text-white shadow-xs">
              <Trash2 className="w-5 h-5 font-black" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight uppercase font-sans">
                Radera alla ordrar
              </h3>
              <p className="text-xs text-rose-300">
                Tömmer produktionstavlan helt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 bg-neutral-50/50">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-950 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block font-black text-rose-950 mb-0.5">
                Är du säker på att du vill radera allt?
              </strong>
              Detta tar bort samtliga <strong>{activeCount}</strong> aktiva ordrar från tavlan och servern. Tavlan blir helt tom och redo för en ny Excel-import.
            </div>
          </div>

          <div className="text-xs text-neutral-600 space-y-1">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200">
              <span>Aktiva ordrar på tavlan:</span>
              <strong className="font-mono text-neutral-900 font-bold">{activeCount} st</strong>
            </div>
            {archivedCount > 0 && (
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg bg-white border border-neutral-300 hover:border-neutral-400 transition">
                  <input
                    type="checkbox"
                    checked={includeArchive}
                    onChange={(e) => setIncludeArchive(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-neutral-800">
                    Radera även <strong>{archivedCount}</strong> slutförda ordrar i arkivet
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="text-[11px] text-neutral-500 bg-neutral-100 p-2.5 rounded-lg border border-neutral-200">
            ℹ️ <strong>Tips:</strong> Inga gamla demo-artiklar kommer tillbaka. Du kan även ångra åtgärden direkt efteråt via återställningsknappen i bekräftelsemeddelandet.
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-neutral-100 border-t border-neutral-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg transition cursor-pointer"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(includeArchive);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Radera alla {activeCount} ordrar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

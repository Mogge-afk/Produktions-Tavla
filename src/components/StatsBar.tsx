import React from 'react';
import { Layers, AlertTriangle, CheckCircle, Clock, RotateCcw, Archive } from 'lucide-react';
import { ColumnConfig, ProductionOrder } from '../types';

interface StatsBarProps {
  orders: ProductionOrder[];
  columns: ColumnConfig[];
  archivedCount?: number;
  onOpenArchive?: () => void;
  onResetDemoData: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ 
  orders, 
  columns, 
  archivedCount = 0, 
  onOpenArchive, 
  onResetDemoData 
}) => {
  const urgentCount = orders.filter((o) => o.priority === 'urgent' || o.priority === 'high').length;
  const lastColId = columns[columns.length - 1]?.id;
  const completedCount = orders.filter((o) => o.columnId === lastColId).length;
  const activeCount = orders.length - completedCount;

  return (
    <div className="bg-neutral-50 border-b border-neutral-200 px-4 lg:px-6 py-2">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Quick metrics */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-1.5 text-neutral-700">
            <Layers className="w-3.5 h-3.5 text-neutral-500" />
            <span>Totalt på tavlan:</span>
            <strong className="font-mono text-neutral-900">{orders.length} ordrar</strong>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-700">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>I produktion:</span>
            <strong className="font-mono text-neutral-900">{activeCount} st</strong>
          </div>

          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Hög / Akut prio:</span>
              <strong className="font-mono">{urgentCount} st</strong>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{columns[columns.length - 1]?.title || 'Klar'}:</span>
            <strong className="font-mono text-neutral-900">{completedCount} st</strong>
          </div>

          {archivedCount > 0 && onOpenArchive && (
            <button
              type="button"
              onClick={onOpenArchive}
              className="flex items-center gap-1.5 text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 cursor-pointer transition font-medium"
            >
              <Archive className="w-3 h-3 text-purple-600" />
              <span>Slutförda i arkiv:</span>
              <strong className="font-mono">{archivedCount} st</strong>
            </button>
          )}
        </div>

        {/* Board utilities */}
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="hidden sm:inline">Dra kort eller använd QR-skannern för att uppdatera</span>
          <button
            onClick={onResetDemoData}
            type="button"
            className="text-[11px] text-neutral-600 hover:text-neutral-900 underline flex items-center gap-1 cursor-pointer"
            title="Återställ demodata till ursprungsläget"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Återställ demodata</span>
          </button>
        </div>
      </div>
    </div>
  );
};

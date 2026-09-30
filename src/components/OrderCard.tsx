import React from 'react';
import { 
  QrCode, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  AlertTriangle, 
  User, 
  CheckSquare,
  Calendar,
  Clock,
  Sparkles,
  Archive,
  Check
} from 'lucide-react';
import { ProductionOrder } from '../types';
import { getDueStatus } from '../utils/priority';

interface OrderCardProps {
  order: ProductionOrder;
  columnTitle: string;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onClick: () => void;
  onQuickQR: () => void;
  onArchive?: () => void;
  isRecentlyUpdated?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  columnTitle,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onClick,
  onQuickQR,
  onArchive,
  isRecentlyUpdated,
}) => {
  const hasDeviations = order.notes.some((n) => n.type === 'deviation');
  const totalNotes = order.notes.length;
  
  // Checklist progress for this specific column
  const currentChecklist = order.checklists?.[order.columnId] || [];
  const completedChecklistCount = currentChecklist.filter((c) => c.completed).length;

  // Station progress
  const stationCompletedQty = order.stationProgress?.[order.columnId] || 0;
  const orderTotal = order.batchSize || 1;
  const percentDone = Math.min(100, Math.round((stationCompletedQty / orderTotal) * 100));

  // Delivery date status
  const dueStatus = getDueStatus(order.targetDate);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', order.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`group relative bg-white rounded-xl border-2 border-neutral-900 p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer select-none active:scale-[0.99] ${
        isRecentlyUpdated ? 'ring-4 ring-emerald-500 ring-offset-2 animate-bounce-subtle' : ''
      }`}
    >
      {/* Top Header: Ordernr & Priority & Total Order Quantity */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-black tracking-tight text-neutral-950 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
            {order.id}
          </span>
          
          {order.priority === 'urgent' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse shadow-xs">
              AKUT
            </span>
          )}
          {order.priority === 'high' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 shadow-xs">
              HÖG
            </span>
          )}
        </div>

        {/* Antal: Order total */}
        <div className="font-mono text-xs font-black text-neutral-950 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300" title="Total orderkvantitet">
          {orderTotal} {order.unit}
        </div>
      </div>

      {/* Artikelnamn (Product Title) */}
      <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:text-sky-800 transition">
        {order.title}
      </h3>

      {/* Artikelnr & Kund */}
      <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-600 gap-2">
        {order.articleNumber ? (
          <span className="font-mono font-bold text-neutral-800 shrink-0 bg-neutral-100/80 px-1.5 py-0.2 rounded border border-neutral-200">
            {order.articleNumber}
          </span>
        ) : (
          <span className="text-neutral-400">Inget artnr</span>
        )}

        <span className="truncate text-neutral-500 font-medium text-right" title={order.customer}>
          {order.customer}
        </span>
      </div>

      {/* Planerat Leveransdatum Bar */}
      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-neutral-500">
          <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="font-mono font-bold text-neutral-800">{order.targetDate}</span>
        </div>

        <div className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${dueStatus.badgeColorClass}`}>
          <Clock className="w-3 h-3" />
          <span>{dueStatus.label}</span>
        </div>
      </div>

      {/* Station Progress Bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-neutral-500 font-medium">Framsteg vid denna station:</span>
          <span className="font-mono font-bold text-neutral-900">
            {stationCompletedQty > 0 ? (
              <span className="text-emerald-700 font-black">
                {stationCompletedQty} / {orderTotal} {order.unit} ({percentDone}%)
              </span>
            ) : (
              <span className="text-neutral-400">0 / {orderTotal} {order.unit}</span>
            )}
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            style={{ width: `${percentDone}%` }}
            className={`h-full transition-all duration-300 ${
              percentDone >= 100 ? 'bg-emerald-600' : percentDone > 0 ? 'bg-neutral-900' : 'bg-transparent'
            }`}
          />
        </div>
      </div>

      {/* Meta indicators: Deviations, Notes, Operator */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-600">
        <div className="flex items-center gap-2">
          {hasDeviations ? (
            <span className="flex items-center gap-0.5 text-rose-700 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Avvikelse
            </span>
          ) : totalNotes > 0 ? (
            <span className="flex items-center gap-0.5 text-neutral-600" title={`${totalNotes} loggade händelser`}>
              <MessageSquare className="w-3 h-3 text-neutral-500" />
              {totalNotes}
            </span>
          ) : null}

          {currentChecklist.length > 0 && (
            <span className="flex items-center gap-0.5 text-neutral-600">
              <CheckSquare className="w-3 h-3 text-neutral-500" />
              {completedChecklistCount}/{currentChecklist.length}
            </span>
          )}

          {order.operator && (
            <span className="flex items-center gap-1 font-semibold text-neutral-800 truncate max-w-[95px]" title={order.operator}>
              <User className="w-2.5 h-2.5 text-neutral-500" />
              {order.operator}
            </span>
          )}
        </div>

        {/* QR Code trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickQR();
          }}
          className="p-1 rounded text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition cursor-pointer"
          title="Visa stations-QR"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* Card Quick-Move Navigation Buttons */}
      <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-dashed border-neutral-200">
        <button
          type="button"
          disabled={!canMoveLeft}
          onClick={(e) => {
            e.stopPropagation();
            onMoveLeft();
          }}
          className={`flex items-center justify-center p-1 rounded text-xs transition cursor-pointer ${
            canMoveLeft
              ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200'
              : 'text-neutral-300 cursor-not-allowed'
          }`}
          title="Flytta bakåt"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
          {columnTitle}
        </span>

        {!canMoveRight ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchive?.();
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs active:scale-95 cursor-pointer"
            title="Slutför leverans och flytta till arkiv"
          >
            <Check className="w-3 h-3" />
            <span>Arkivera</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight();
            }}
            className="flex items-center justify-center p-1 rounded text-xs transition cursor-pointer text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200"
            title="Flytta framåt till nästa fas"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

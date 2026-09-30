import React, { useState } from 'react';
import { Edit2, Check, X, Plus, MoveLeft, MoveRight } from 'lucide-react';
import { ColumnConfig, ProductionOrder } from '../types';
import { OrderCard } from './OrderCard';

interface BoardColumnProps {
  column: ColumnConfig;
  orders: ProductionOrder[];
  allColumns: ColumnConfig[];
  columnIndex: number;
  onUpdateColumnTitle: (columnId: string, newTitle: string) => void;
  onMoveOrder: (orderId: string, targetColumnId: string) => void;
  onSelectOrder: (order: ProductionOrder) => void;
  onQuickQR: (order: ProductionOrder) => void;
  onNewOrderInColumn?: (columnId: string) => void;
  onArchiveOrder?: (orderId: string) => void;
  recentlyUpdatedOrderId: string | null;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  orders,
  allColumns,
  columnIndex,
  onUpdateColumnTitle,
  onMoveOrder,
  onSelectOrder,
  onQuickQR,
  onNewOrderInColumn,
  onArchiveOrder,
  recentlyUpdatedOrderId,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);
  const [isDragOver, setIsDragOver] = useState(false);

  const prevColumn = columnIndex > 0 ? allColumns[columnIndex - 1] : null;
  const nextColumn = columnIndex < allColumns.length - 1 ? allColumns[columnIndex + 1] : null;

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle.trim() !== column.title) {
      onUpdateColumnTitle(column.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditedTitle(column.title);
      setIsEditingTitle(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId) {
      onMoveOrder(orderId, column.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[280px] max-w-[340px] flex-1 rounded-xl transition-all duration-150 border-2 ${
        isDragOver ? 'border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-300' : 'border-neutral-800 bg-neutral-100/70'
      }`}
    >
      {/* Column Header styled precisely after the prompt screenshot */}
      <div
        style={{ backgroundColor: column.headerBg }}
        className="rounded-t-[10px] border-b-2 border-neutral-800 px-3.5 py-3 transition group relative"
      >
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full px-2 py-1 text-sm font-bold bg-white text-neutral-900 border border-neutral-400 rounded focus:outline-hidden focus:ring-2 focus:ring-neutral-800"
              />
              <button
                onClick={handleTitleSubmit}
                type="button"
                className="p-1 rounded bg-neutral-900 text-white hover:bg-neutral-700 cursor-pointer"
                title="Spara rubrik"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setEditedTitle(column.title);
                  setIsEditingTitle(false);
                }}
                type="button"
                className="p-1 rounded bg-neutral-200 text-neutral-700 hover:bg-neutral-300 cursor-pointer"
                title="Avbryt"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                onClick={() => setIsEditingTitle(true)}
                title="Klicka för att ändra denna kolumnrubrik"
              >
                <h2 className="text-base font-extrabold text-neutral-900 tracking-tight truncate font-sans">
                  {column.title}
                </h2>
                <Edit2 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
              </div>

              {/* Order Count Badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-900/10 text-neutral-900 border border-neutral-900/15">
                  {orders.length}
                </span>
                {onNewOrderInColumn && (
                  <button
                    type="button"
                    onClick={() => onNewOrderInColumn(column.id)}
                    className="p-1 rounded text-neutral-700 hover:bg-neutral-900/10 transition cursor-pointer"
                    title={`Lägg till ny order i ${column.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards Lane (Cards are stacked underneath with spacing) */}
      <div className="flex-1 p-2.5 flex flex-col gap-2.5 min-h-[480px] overflow-y-auto max-h-[calc(100vh-230px)]">
        {orders.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center text-xs text-neutral-400 select-none">
            <span>Inga ordrar här</span>
            <span className="text-[10px] mt-0.5 text-neutral-400">Dra eller skanna hit</span>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              columnTitle={column.title}
              canMoveLeft={!!prevColumn}
              canMoveRight={!!nextColumn}
              onMoveLeft={() => prevColumn && onMoveOrder(order.id, prevColumn.id)}
              onMoveRight={() => nextColumn && onMoveOrder(order.id, nextColumn.id)}
              onClick={() => onSelectOrder(order)}
              onQuickQR={() => onQuickQR(order)}
              onArchive={() => onArchiveOrder?.(order.id)}
              isRecentlyUpdated={recentlyUpdatedOrderId === order.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

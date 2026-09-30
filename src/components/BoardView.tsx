import React from 'react';
import { ColumnConfig, ProductionOrder } from '../types';
import { BoardColumn } from './BoardColumn';

interface BoardViewProps {
  columns: ColumnConfig[];
  orders: ProductionOrder[];
  onUpdateColumnTitle: (columnId: string, newTitle: string) => void;
  onMoveOrder: (orderId: string, targetColumnId: string) => void;
  onSelectOrder: (order: ProductionOrder) => void;
  onQuickQR: (order: ProductionOrder) => void;
  onNewOrderInColumn?: (columnId: string) => void;
  onArchiveOrder?: (orderId: string) => void;
  recentlyUpdatedOrderId: string | null;
}

export const BoardView: React.FC<BoardViewProps> = ({
  columns,
  orders,
  onUpdateColumnTitle,
  onMoveOrder,
  onSelectOrder,
  onQuickQR,
  onNewOrderInColumn,
  onArchiveOrder,
  recentlyUpdatedOrderId,
}) => {
  return (
    <div className="flex-1 overflow-x-auto p-4 lg:p-6 bg-neutral-200/50">
      <div className="flex gap-4 items-start min-w-max pb-6">
        {columns.map((column, idx) => {
          const columnOrders = orders.filter((o) => o.columnId === column.id);
          return (
            <BoardColumn
              key={column.id}
              column={column}
              orders={columnOrders}
              allColumns={columns}
              columnIndex={idx}
              onUpdateColumnTitle={onUpdateColumnTitle}
              onMoveOrder={onMoveOrder}
              onSelectOrder={onSelectOrder}
              onQuickQR={onQuickQR}
              onNewOrderInColumn={onNewOrderInColumn}
              onArchiveOrder={onArchiveOrder}
              recentlyUpdatedOrderId={recentlyUpdatedOrderId}
            />
          );
        })}
      </div>
    </div>
  );
};

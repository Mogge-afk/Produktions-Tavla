import React, { useState, useMemo } from 'react';
import { 
  X, 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  CheckCircle2, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle,
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ColumnConfig, ProductionOrder } from '../types';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedOrders: ProductionOrder[];
  columns: ColumnConfig[];
  onRestoreOrder: (orderId: string, targetColumnId: string) => void;
  onPermanentlyDeleteOrder: (orderId: string) => void;
  onClearAllArchived?: () => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  isOpen,
  onClose,
  archivedOrders,
  columns,
  onRestoreOrder,
  onPermanentlyDeleteOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  
  // Custom in-modal confirmation for safe deletion (never use window.confirm)
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return archivedOrders;
    return archivedOrders.filter((o) => 
      o.id.toLowerCase().includes(q) ||
      o.title.toLowerCase().includes(q) ||
      o.articleNumber.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      (o.operator && o.operator.toLowerCase().includes(q))
    );
  }, [archivedOrders, searchQuery]);

  if (!isOpen) return null;

  // Export all or filtered archived orders to Excel for ERP-system accounting
  const handleExportExcel = () => {
    if (archivedOrders.length === 0) return;

    const data = archivedOrders.map((ord) => ({
      'Ordernr': ord.id,
      'Artikelnamn': ord.title,
      'Artikelnummer': ord.articleNumber,
      'Kund': ord.customer,
      'Antal': ord.batchSize,
      'Enhet': ord.unit,
      'Ursprungligt leveransdatum': ord.targetDate,
      'Arkiverat datum': ord.archivedAt ? new Date(ord.archivedAt).toLocaleDateString('sv-SE') : '-',
      'Slutförd av': ord.archivedBy || ord.operator || 'Operatör',
      'Antal rapporter': ord.reports?.length || 0,
      'Ritningsnummer': ord.drawingNumber || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Slutförda_Ordrar');
    XLSX.writeFile(workbook, `Arkiv_Slutforda_Ordrar_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalArchivedUnits = archivedOrders.reduce((sum, o) => sum + (o.batchSize || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border-2 border-neutral-900 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b-2 border-neutral-900 bg-neutral-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight uppercase font-sans">
                  Orderarkiv · Slutförda Leveranser
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-700">
                  {archivedOrders.length} st slutförda
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Historik över klara tillverkningsordrar som har levererats och flyttats bort från tavlan
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

        {/* Toolbar: Search, Total Summary & Excel Export */}
        <div className="px-6 py-3 bg-neutral-100 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök bland arkiverade ordrar, produkter, artiklar..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-neutral-600 hidden sm:inline">
              Totalt tillverkat: <strong className="text-neutral-900">{totalArchivedUnits} st</strong> enheter
            </div>

            <button
              type="button"
              disabled={archivedOrders.length === 0}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 disabled:opacity-50 text-neutral-800 border border-neutral-300 rounded-lg font-bold transition cursor-pointer"
              title="Exportera hela arkivet till Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportera arkiv (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/50">
          {archivedOrders.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-neutral-200 text-neutral-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Archive className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-1">
                Arkivet är tomt
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                När ordrar når slutet av produktionskedjan (t.ex. <em>"Klar för leverans"</em>) klickar du på 
                <strong> "Slutför & Arkivera"</strong>. Då sparas all historik och rapportdata här, medan tavlan hålls ren och överskådlig för nästa skift.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              Inga arkiverade ordrar matchade sökningen "{searchQuery}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                const archivedDateStr = order.archivedAt 
                  ? new Date(order.archivedAt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : order.updatedAt 
                  ? new Date(order.updatedAt).toLocaleDateString('sv-SE')
                  : 'Nyligen';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border-2 border-neutral-200 hover:border-neutral-400 transition p-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 border border-neutral-300">
                            {order.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Slutförd & Levererad</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                            {order.batchSize} {order.unit}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-neutral-950 truncate">
                          {order.title}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                          {order.articleNumber && (
                            <span>Artikelnr: <strong className="font-mono text-neutral-700">{order.articleNumber}</strong></span>
                          )}
                          <span>Kund: <strong className="text-neutral-700">{order.customer}</strong></span>
                          <span>Planerad leverans: <strong className="font-mono text-neutral-700">{order.targetDate}</strong></span>
                          <span>Arkiverad: <strong className="font-mono text-neutral-700">{archivedDateStr}</strong></span>
                          {order.archivedBy && (
                            <span>Av: <strong className="text-neutral-700">{order.archivedBy}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                        {/* View Details / Report Log Toggle */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(isSelected ? null : order)}
                          className="px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg border border-neutral-300 transition cursor-pointer"
                        >
                          {isSelected ? 'Dölj detaljer' : `Rapporter (${order.reports?.length || 0})`}
                        </button>

                        {/* Restore back to board */}
                        <button
                          type="button"
                          onClick={() => onRestoreOrder(order.id, order.columnId || columns[columns.length - 1]?.id || 'col-leverans')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs active:scale-95"
                          title="Återställ denna order tillbaka till planeringstavlan"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Återställ till tavla</span>
                        </button>

                        {/* Delete permanently */}
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-neutral-200 hover:border-rose-300 transition cursor-pointer"
                          title="Permanent radera order ur arkivet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible detail / report history */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-neutral-200 space-y-3">
                        <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                          Produktionshistorik och stationsrapporter:
                        </span>

                        {order.reports && order.reports.length > 0 ? (
                          <div className="overflow-x-auto bg-neutral-50 rounded-lg border border-neutral-200 p-2.5">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-neutral-500 border-b border-neutral-200">
                                  <th className="py-1">Station</th>
                                  <th className="py-1">Operatör</th>
                                  <th className="py-1 font-mono">Antal</th>
                                  <th className="py-1 font-mono">Totalt</th>
                                  <th className="py-1">Tidpunkt</th>
                                  <th className="py-1">Notering</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-200 font-medium text-neutral-800">
                                {order.reports.map((r) => (
                                  <tr key={r.id}>
                                    <td className="py-1 font-bold">{r.stationName}</td>
                                    <td className="py-1">{r.operator}</td>
                                    <td className="py-1 font-mono text-emerald-700 font-bold">+{r.quantity} {order.unit}</td>
                                    <td className="py-1 font-mono">{r.totalSoFar} / {r.orderTotal}</td>
                                    <td className="py-1 font-mono text-neutral-500">
                                      {new Date(r.timestamp).toLocaleDateString('sv-SE')} {new Date(r.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-1 text-neutral-600">{r.note || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400 italic">Inga delrapporter loggade för denna order.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t-2 border-neutral-900 bg-neutral-100 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            Ordrar i arkivet påverkar inte tavlans kolumner eller aktiva räknare.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Stäng arkiv
          </button>
        </div>
      </div>

      {/* In-Modal Delete Confirmation Box (No window.confirm!) */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border-2 border-neutral-900 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-neutral-950 uppercase tracking-tight">
                  Permanent radera order?
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Order <strong className="font-mono text-neutral-900">{orderToDelete.id}</strong> kommer att tas bort helt från systemet. Detta går inte att ångra.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 rounded-lg cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentlyDeleteOrder(orderToDelete.id);
                  setOrderToDelete(null);
                  if (selectedOrder?.id === orderToDelete.id) {
                    setSelectedOrder(null);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                Ja, radera permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

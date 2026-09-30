import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ColumnConfig, ProductionOrder, Priority, ProductionNote, ProductionReport } from './types';
import { 
  loadStoredOrders, 
  saveStoredOrders, 
  loadStoredArchivedOrders,
  saveStoredArchivedOrders,
  loadStoredColumns, 
  saveStoredColumns, 
  subscribeToSync, 
  DEFAULT_COLUMNS, 
  INITIAL_ORDERS,
  getStoredOperatorName 
} from './utils/storage';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { BoardView } from './components/BoardView';
import { QRScannerModal } from './components/QRScannerModal';
import { QuickUpdateModal } from './components/QuickUpdateModal';
import { OrderDetailModal } from './components/OrderDetailModal';
import { NewOrderModal } from './components/NewOrderModal';
import { ColumnManagerModal } from './components/ColumnManagerModal';
import { PrintLabelsModal } from './components/PrintLabelsModal';
import { StationModeModal } from './components/StationModeModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { FloorGuideModal } from './components/FloorGuideModal';
import { ArchiveModal } from './components/ArchiveModal';
import { MobileScannerView } from './components/MobileScannerView';
import { HardwareGuideModal } from './components/HardwareGuideModal';
import { playScanSuccessSound } from './utils/audio';
import { refreshOrderPriorities, loadPrioritySettings } from './utils/priority';
import { extractScanPayload, determineNextColumn } from './utils/qr';
import { apiSync, SyncStatus } from './utils/apiSync';
import { CheckCircle2, AlertCircle, Zap, Undo2 } from 'lucide-react';

interface ToastState {
  text: string;
  type: 'success' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function App() {
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    const loaded = loadStoredOrders();
    // Auto refresh priorities on initial load if setting is on
    const settings = loadPrioritySettings();
    if (settings.autoPriorityEnabled) {
      const { updatedOrders } = refreshOrderPriorities(loaded, settings);
      return updatedOrders;
    }
    return loaded;
  });

  const [archivedOrders, setArchivedOrders] = useState<ProductionOrder[]>(() => loadStoredArchivedOrders());
  
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadStoredColumns());
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<ProductionOrder | null>(null);
  const [scannedTargetStationId, setScannedTargetStationId] = useState<string | undefined>(undefined);
  const [isQuickUpdateOpen, setIsQuickUpdateOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [targetColumnForNewOrder, setTargetColumnForNewOrder] = useState<string | undefined>(undefined);

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTargetOrderId, setPrintTargetOrderId] = useState<string | undefined>(undefined);

  const [isStationModeOpen, setIsStationModeOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isFloorGuideOpen, setIsFloorGuideOpen] = useState(false);
  const [isHardwareGuideOpen, setIsHardwareGuideOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Mobile dedicated scanner view on shop floor
  const [isMobileScannerMode, setIsMobileScannerMode] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'scanner';
    } catch {
      return false;
    }
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [recentlyUpdatedOrderId, setRecentlyUpdatedOrderId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((
    text: string, 
    type: 'success' | 'info' = 'success',
    action?: { label: string; onClick: () => void },
    secondaryAction?: { label: string; onClick: () => void }
  ) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage({ text, type, action, secondaryAction });
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  }, []);

  // Auto-advance mode: when true, scanning a station QR directly hops order to next station
  const [autoAdvanceOnScan, setAutoAdvanceOnScan] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('planering_auto_advance');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoAdvance = useCallback(() => {
    setAutoAdvanceOnScan((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('planering_auto_advance', JSON.stringify(next));
      } catch {}
      showToast(
        next
          ? '⚡ Autoflytt vid QR AKTIVERAD: När QR skannas flyttas ordern direkt till nästa station!'
          : 'Autoflytt vid QR AVSTÄNGD: Skanning öppnar rapportfönster för manuell inmatning.',
        'info'
      );
      return next;
    });
  }, [showToast]);

  // Connect to Backend API + Server-Sent Events (SSE) for Real-Time Synchronization across TV & Mobiles
  useEffect(() => {
    const unsubStatus = apiSync.onStatusChange(setSyncStatus);

    // Initial state hydration from backend server
    apiSync.fetchState().then((state) => {
      if (state) {
        if (state.orders && state.orders.length > 0) {
          setOrders(state.orders);
          saveStoredOrders(state.orders);
        }
        if (state.columns && state.columns.length > 0) {
          setColumns(state.columns);
          saveStoredColumns(state.columns);
        }
        if (state.archivedOrders) {
          setArchivedOrders(state.archivedOrders);
          saveStoredArchivedOrders(state.archivedOrders);
        }
      }
    });

    // Real-time updates pushed from backend (when someone scans on mobile or external API)
    const unsubState = apiSync.onStateUpdate((update) => {
      if (update.orders) {
        setOrders(update.orders);
        saveStoredOrders(update.orders);
      }
      if (update.columns) {
        setColumns(update.columns);
        saveStoredColumns(update.columns);
      }
      if (update.archivedOrders) {
        setArchivedOrders(update.archivedOrders);
        saveStoredArchivedOrders(update.archivedOrders);
      }
    });

    const unsubScan = apiSync.onScanEvent((event) => {
      if (event.type === 'ORDER_MOVED') {
        playScanSuccessSound();
        if (event.orderId) {
          flashUpdatedCard(event.orderId);
        }
        showToast(
          `✓ ${event.orderId}: Flyttad från "${event.fromStation}" till "${event.toStation}"!`,
          'success'
        );
      }
    });

    return () => {
      unsubStatus();
      unsubState();
      unsubScan();
    };
  }, [showToast]);

  // Subscribe to real-time sync across browser tabs/windows (local storage fallback)
  useEffect(() => {
    const unsubscribe = subscribeToSync(
      (newOrders) => {
        setOrders(newOrders);
      },
      (newColumns) => {
        setColumns(newColumns);
      },
      (newArchived) => {
        setArchivedOrders(newArchived);
      }
    );
    return () => unsubscribe();
  }, []);

  // Highlight helper for visual confirmation
  const flashUpdatedCard = useCallback((orderId: string) => {
    setRecentlyUpdatedOrderId(orderId);
    setTimeout(() => {
      setRecentlyUpdatedOrderId(null);
    }, 2500);
  }, []);

  // Move order between columns (drag & drop or arrow buttons)
  const handleMoveOrder = useCallback((orderId: string, targetColumnId: string) => {
    setOrders((prev) => {
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const next = prev.map((ord) => {
        if (ord.id === orderId && ord.columnId !== targetColumnId) {
          const fromCol = columns.find((c) => c.id === ord.columnId);
          const newNote: ProductionNote = {
            id: 'n_' + Date.now(),
            timestamp: new Date().toISOString(),
            operator: ord.operator || 'Operatör',
            text: `Flyttad från "${fromCol?.title || 'Okänd'}" till "${targetCol?.title || 'Okänd'}".`,
            type: 'stage_change',
            stageName: targetCol?.title,
          };
          return {
            ...ord,
            columnId: targetColumnId,
            updatedAt: new Date().toISOString(),
            notes: [newNote, ...ord.notes],
          };
        }
        return ord;
      });
      saveStoredOrders(next);
      return next;
    });
    flashUpdatedCard(orderId);
    playScanSuccessSound();
  }, [columns, flashUpdatedCard]);

  // Archive completed order (e.g. from last station or order detail)
  const handleArchiveOrder = useCallback((orderId: string, reason = 'Slutförd leverans') => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const op = getStoredOperatorName() || 'Operatör';
    const archivedItem: ProductionOrder = {
      ...target,
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: op,
      archivedReason: reason,
      notes: [
        {
          id: 'n_arch_' + Date.now(),
          timestamp: new Date().toISOString(),
          operator: op,
          text: `Ordern slutförd och flyttad till arkiv.`,
          type: 'approved',
          stageName: columns.find((c) => c.id === target.columnId)?.title || 'Arkiv',
        },
        ...target.notes,
      ],
    };

    // Remove from active orders
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      saveStoredOrders(next);
      return next;
    });

    // Add to archived orders
    setArchivedOrders((prev) => {
      const next = [archivedItem, ...prev.filter((o) => o.id !== orderId)];
      saveStoredArchivedOrders(next);
      return next;
    });

    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null);
      setIsOrderDetailOpen(false);
    }

    playScanSuccessSound();
    showToast(`Order ${orderId} har slutförts och flyttats till arkivet!`);
  }, [orders, columns, selectedOrder, showToast]);

  // Auto-advance order to next stage upon QR scan (e.g. Montering ➔ Test)
  const handleAutoAdvanceOrder = useCallback(
    (targetOrder: ProductionOrder, scannedStationId?: string) => {
      const { nextColumn, fromColumn } = determineNextColumn(
        columns,
        targetOrder.columnId,
        scannedStationId
      );

      const fromColTitle = fromColumn?.title || 'Tidigare station';
      const previousColumnId = targetOrder.columnId;

      if (!nextColumn) {
        // Order is already at the last station (e.g. Klar för leverans)
        playScanSuccessSound();
        flashUpdatedCard(targetOrder.id);
        showToast(
          `Order ${targetOrder.id} är vid sista stationen ("${fromColTitle}")! Vill du arkivera den?`,
          'info',
          {
            label: 'Arkivera nu',
            onClick: () => handleArchiveOrder(targetOrder.id, 'Slutförd vid sista stationen'),
          }
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const stationIdToMarkDone = scannedStationId || targetOrder.columnId;
      const currentDone = targetOrder.stationProgress?.[stationIdToMarkDone] || 0;
      const newQtyDone = currentDone > 0 ? currentDone : targetOrder.batchSize;
      const op = getStoredOperatorName() || 'Operatör (QR-skanning)';

      const autoNote: ProductionNote = {
        id: 'n_scan_' + Date.now(),
        timestamp: nowIso,
        operator: op,
        text: `QR-skannad vid "${fromColTitle}" ➔ automatiskt flyttad till "${nextColumn.title}".`,
        type: 'stage_change',
        stageName: nextColumn.title,
      };

      const newReport: ProductionReport = {
        id: 'rep_' + Date.now(),
        timestamp: nowIso,
        stationId: stationIdToMarkDone,
        stationName: fromColTitle,
        operator: op,
        quantity: newQtyDone,
        totalSoFar: newQtyDone,
        orderTotal: targetOrder.batchSize,
        note: `Automatisk stationsflytt vid QR-skanning`,
      };

      setOrders((prev) => {
        const next = prev.map((ord) => {
          if (ord.id === targetOrder.id) {
            return {
              ...ord,
              columnId: nextColumn.id,
              updatedAt: nowIso,
              stationProgress: {
                ...(ord.stationProgress || {}),
                [stationIdToMarkDone]: newQtyDone,
              },
              reports: [newReport, ...(ord.reports || [])],
              notes: [autoNote, ...ord.notes],
            };
          }
          return ord;
        });
        saveStoredOrders(next);
        apiSync.syncOrders(next);
        return next;
      });

      flashUpdatedCard(targetOrder.id);
      playScanSuccessSound();

      showToast(
        `✓ ${targetOrder.id}: Flyttad från "${fromColTitle}" till "${nextColumn.title}"!`,
        'success',
        {
          label: 'Ångra',
          onClick: () => {
            handleMoveOrder(targetOrder.id, previousColumnId);
            showToast(`Flytt av ${targetOrder.id} ångrades.`, 'info');
          },
        },
        {
          label: 'Ändra antal / avvikelse',
          onClick: () => {
            setScannedOrder(targetOrder);
            setScannedTargetStationId(nextColumn.id);
            setIsQuickUpdateOpen(true);
          },
        }
      );
    },
    [columns, flashUpdatedCard, handleArchiveOrder, handleMoveOrder, showToast]
  );

  // Check URL parameters for direct QR scan link (e.g. ?order=AO-2026-101&station=col-montering&auto=1)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const directOrderId = params.get('order') || params.get('scan') || params.get('id');
      const directStationId = params.get('station') || params.get('step');
      const autoParam = params.get('auto') === '1' || autoAdvanceOnScan;

      if (directOrderId) {
        const found = orders.find(
          (o) => o.id.toLowerCase() === directOrderId.toLowerCase()
        );
        if (found) {
          // Clean URL so browser refresh does not re-trigger
          window.history.replaceState({}, document.title, window.location.pathname);

          if (autoParam) {
            handleAutoAdvanceOrder(found, directStationId || undefined);
          } else {
            setScannedOrder(found);
            setScannedTargetStationId(directStationId || undefined);
            setIsQuickUpdateOpen(true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [orders, autoAdvanceOnScan, handleAutoAdvanceOrder]);

  // Global Handheld Barcode / QR Scanner Listener (Wedge mode)
  const scannerBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime.current > 300) {
        scannerBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const scannedText = scannerBuffer.current.trim();
        scannerBuffer.current = '';

        if (scannedText.length >= 2) {
          const decoded = extractScanPayload(scannedText);
          if (decoded.orderId) {
            const found = orders.find(
              (o) => o.id.toLowerCase() === decoded.orderId.toLowerCase()
            );
            if (found) {
              e.preventDefault();
              if (autoAdvanceOnScan || decoded.autoAdvance) {
                handleAutoAdvanceOrder(found, decoded.stationId);
              } else {
                setScannedOrder(found);
                setScannedTargetStationId(decoded.stationId);
                setIsQuickUpdateOpen(true);
                playScanSuccessSound();
                flashUpdatedCard(found.id);
              }
            } else {
              const inArchive = archivedOrders.find((o) => o.id.toLowerCase() === decoded.orderId.toLowerCase());
              if (inArchive) {
                showToast(`Order "${decoded.orderId}" är redan slutförd och finns i arkivet!`, 'info');
              } else {
                showToast(`Order "${decoded.orderId}" hittades inte på tavlan.`, 'info');
              }
            }
          }
        }
      } else if (e.key.length === 1) {
        scannerBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orders, archivedOrders, autoAdvanceOnScan, handleAutoAdvanceOrder, showToast]);

  // Restore archived order back to the board
  const handleRestoreOrder = useCallback((orderId: string, targetColumnId: string) => {
    const target = archivedOrders.find((o) => o.id === orderId);
    if (!target) return;

    const destCol = columns.find((c) => c.id === targetColumnId) || columns[columns.length - 1] || columns[0];
    const restoredItem: ProductionOrder = {
      ...target,
      isArchived: false,
      columnId: destCol.id,
      updatedAt: new Date().toISOString(),
      notes: [
        {
          id: 'n_rest_' + Date.now(),
          timestamp: new Date().toISOString(),
          operator: getStoredOperatorName() || 'Produktionsledare',
          text: `Återställd från arkivet till kolumn "${destCol.title}".`,
          type: 'info',
          stageName: destCol.title,
        },
        ...target.notes,
      ],
    };

    // Remove from archived
    setArchivedOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      saveStoredArchivedOrders(next);
      return next;
    });

    // Add to active orders
    setOrders((prev) => {
      const next = [restoredItem, ...prev.filter((o) => o.id !== orderId)];
      saveStoredOrders(next);
      return next;
    });

    playScanSuccessSound();
    flashUpdatedCard(orderId);
    showToast(`Order ${orderId} återställdes till tavlan i "${destCol.title}".`);
  }, [archivedOrders, columns]);

  // Permanently delete order from archive
  const handlePermanentlyDeleteArchivedOrder = useCallback((orderId: string) => {
    setArchivedOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      saveStoredArchivedOrders(next);
      return next;
    });
    showToast(`Order ${orderId} raderades permanent från arkivet.`);
  }, []);

  // Rename column title directly on the board
  const handleUpdateColumnTitle = useCallback((columnId: string, newTitle: string) => {
    setColumns((prev) => {
      const next = prev.map((col) => (col.id === columnId ? { ...col, title: newTitle } : col));
      saveStoredColumns(next);
      return next;
    });
  }, []);

  // Save new single order
  const handleCreateOrder = (newOrder: ProductionOrder) => {
    setOrders((prev) => {
      const next = [newOrder, ...prev];
      saveStoredOrders(next);
      return next;
    });
    flashUpdatedCard(newOrder.id);
    showToast(`Order ${newOrder.id} skapades och lades till på tavlan.`);
  };

  // Import batch of orders from Excel / IFS
  const handleImportOrders = (
    importedOrders: ProductionOrder[],
    targetColumnId: string,
    duplicateStrategy: 'update' | 'skip'
  ) => {
    const destCol = columns.find((c) => c.id === targetColumnId) || columns[0];

    setOrders((prev) => {
      const existingMap = new Map<string, ProductionOrder>();
      prev.forEach((o) => existingMap.set(o.id.toUpperCase(), o));

      let updatedCount = 0;
      let addedCount = 0;

      const newOrdersList: ProductionOrder[] = [];

      for (const imp of importedOrders) {
        const idUpper = imp.id.toUpperCase();
        if (existingMap.has(idUpper)) {
          if (duplicateStrategy === 'update') {
            const existing = existingMap.get(idUpper)!;
            const updatedExisting: ProductionOrder = {
              ...existing,
              title: imp.title || existing.title,
              articleNumber: imp.articleNumber || existing.articleNumber,
              batchSize: imp.batchSize || existing.batchSize,
              targetDate: imp.targetDate || existing.targetDate,
              priority: imp.priority || existing.priority,
              customer: imp.customer !== 'IFS Order' ? imp.customer : existing.customer,
              drawingNumber: imp.drawingNumber || existing.drawingNumber,
              updatedAt: new Date().toISOString(),
              notes: [
                {
                  id: 'n_upd_' + Date.now(),
                  timestamp: new Date().toISOString(),
                  operator: 'IFS Import',
                  text: `Uppdaterad från Excel. Nytt leveransdatum: ${imp.targetDate}, Antal: ${imp.batchSize} ${existing.unit}. Prioritet: ${imp.priority}.`,
                  type: 'info',
                  stageName: destCol?.title,
                },
                ...existing.notes,
              ],
            };
            existingMap.set(idUpper, updatedExisting);
            updatedCount++;
          }
        } else {
          existingMap.set(idUpper, imp);
          newOrdersList.push(imp);
          addedCount++;
        }
      }

      const next = Array.from(existingMap.values());
      saveStoredOrders(next);

      playScanSuccessSound();
      showToast(
        `${addedCount} nya ordrar lades till i "${destCol?.title}"${
          updatedCount > 0 ? ` (${updatedCount} befintliga uppdaterades)` : ''
        }!`
      );

      if (newOrdersList.length > 0) {
        flashUpdatedCard(newOrdersList[0].id);
      }

      return next;
    });
  };

  // Recalculate priority automatically for all orders based on delivery date
  const handleRefreshPriorities = () => {
    const settings = loadPrioritySettings();
    const { updatedOrders, changedCount } = refreshOrderPriorities(orders, settings);
    if (changedCount > 0) {
      setOrders(updatedOrders);
      saveStoredOrders(updatedOrders);
      playScanSuccessSound();
      showToast(`${changedCount} ordrar uppdaterades med ny prioritet baserat på leveransdatum!`);
    } else {
      showToast(`Alla ordrars prioriteringar är redan i fas med leveransdatumen.`, 'info');
    }
  };

  // Update existing order from detail modal
  const handleUpdateOrder = (updated: ProductionOrder) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === updated.id ? updated : o));
      saveStoredOrders(next);
      return next;
    });
    if (selectedOrder?.id === updated.id) {
      setSelectedOrder(updated);
    }
  };

  // Delete active order (called from in-modal delete dialog)
  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      saveStoredOrders(next);
      return next;
    });
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null);
      setIsOrderDetailOpen(false);
    }
    showToast(`Order ${orderId} togs bort.`);
  };

  // Handler when QR code is scanned (with station binding & auto-advance!)
  const handleOrderIdentified = (orderId: string, stationId?: string, forceAuto?: boolean) => {
    setIsScannerOpen(false);
    const found = orders.find(
      (o) => o.id.toLowerCase() === orderId.toLowerCase()
    );

    if (found) {
      const shouldAuto = forceAuto !== undefined ? forceAuto : autoAdvanceOnScan;
      if (shouldAuto) {
        handleAutoAdvanceOrder(found, stationId);
      } else {
        setScannedOrder(found);
        setScannedTargetStationId(stationId);
        setIsQuickUpdateOpen(true);
        playScanSuccessSound();
        flashUpdatedCard(found.id);
      }
    } else {
      // Check if it was archived
      const inArchive = archivedOrders.find((o) => o.id.toLowerCase() === orderId.toLowerCase());
      if (inArchive) {
        showToast(`Order "${orderId}" är redan slutförd och ligger i arkivet!`, 'info');
        setIsArchiveModalOpen(true);
      } else {
        showToast(`Order "${orderId}" hittades inte bland aktiva tillverkningsordrar.`, 'info');
      }
    }
  };

  // Save report from QuickUpdateModal (Namn, Antal, Totalt, Order)
  const handleSaveReport = (
    orderId: string,
    stationId: string,
    operator: string,
    quantity: number,
    totalSoFar: number,
    moveNextStage: boolean,
    targetNextColumnId?: string,
    noteText?: string,
    noteType?: ProductionNote['type']
  ) => {
    const stationObj = columns.find((c) => c.id === stationId);
    const targetNextObj = targetNextColumnId ? columns.find((c) => c.id === targetNextColumnId) : null;

    setOrders((prev) => {
      const next = prev.map((ord) => {
        if (ord.id === orderId) {
          const notesCopy = [...ord.notes];
          const reportsCopy = [...(ord.reports || [])];

          // 1. Add Production Report (Namn, Antal, Totalt, Order)
          const newReport: ProductionReport = {
            id: 'rep_' + Date.now(),
            timestamp: new Date().toISOString(),
            stationId,
            stationName: stationObj?.title || 'Station',
            operator,
            quantity,
            totalSoFar,
            orderTotal: ord.batchSize,
            note: noteText,
          };
          reportsCopy.unshift(newReport);

          // 2. Add Activity Note
          const activityText = `Rapporterat vid ${stationObj?.title}: Namn: ${operator}, Antal: ${quantity} ${ord.unit}. Totalt: ${totalSoFar} av Order: ${ord.batchSize} ${ord.unit}.${
            noteText ? ` (${noteText})` : ''
          }`;
          notesCopy.unshift({
            id: 'n_rep_' + Date.now(),
            timestamp: new Date().toISOString(),
            operator,
            text: activityText,
            type: noteType || 'approved',
            stageName: stationObj?.title,
          });

          // 3. Update columnId if stage is advancing
          let newColumnId = ord.columnId;
          if (moveNextStage && targetNextColumnId && targetNextColumnId !== ord.columnId) {
            newColumnId = targetNextColumnId;
            notesCopy.unshift({
              id: 'n_adv_' + Date.now(),
              timestamp: new Date().toISOString(),
              operator,
              text: `Ordern flyttad vidare till "${targetNextObj?.title}".`,
              type: 'stage_change',
              stageName: targetNextObj?.title,
            });
          } else if (stationId !== ord.columnId) {
            newColumnId = stationId;
          }

          // 4. Update station progress
          const updatedProgress = {
            ...(ord.stationProgress || {}),
            [stationId]: totalSoFar,
          };

          return {
            ...ord,
            columnId: newColumnId,
            operator,
            updatedAt: new Date().toISOString(),
            notes: notesCopy,
            reports: reportsCopy,
            stationProgress: updatedProgress,
          };
        }
        return ord;
      });

      saveStoredOrders(next);
      return next;
    });

    flashUpdatedCard(orderId);
    showToast(`Rapportering sparad för order ${orderId}!`);
  };

  // Station check-in handler from tablet kiosk mode
  const handleOrderStationReport = (
    orderId: string,
    stationId: string,
    operator: string,
    quantity: number,
    totalSoFar: number,
    moveNextStage: boolean,
    targetNextColumnId?: string,
    noteText?: string
  ) => {
    handleSaveReport(
      orderId,
      stationId,
      operator,
      quantity,
      totalSoFar,
      moveNextStage,
      targetNextColumnId,
      noteText,
      'approved'
    );
  };

  // Save new customized columns
  const handleSaveColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    saveStoredColumns(newColumns);
  };

  // Reset to initial demo data
  const handleResetDemoData = () => {
    if (confirm('Vill du återställa till demodata och standardkolumner från bilden?')) {
      setOrders(INITIAL_ORDERS);
      saveStoredOrders(INITIAL_ORDERS);
      setColumns(DEFAULT_COLUMNS);
      saveStoredColumns(DEFAULT_COLUMNS);
      showToast('Återställd till demodata.');
    }
  };

  // Filtered orders for the board
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.title.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.articleNumber.toLowerCase().includes(q) ||
        (order.drawingNumber && order.drawingNumber.toLowerCase().includes(q));

      const matchesPriority =
        selectedPriority === 'all' || order.priority === selectedPriority;

      return matchesSearch && matchesPriority;
    });
  }, [orders, searchQuery, selectedPriority]);

  if (isMobileScannerMode) {
    return (
      <MobileScannerView
        columns={columns}
        allOrders={orders}
        onExitMobileMode={() => {
          setIsMobileScannerMode(false);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            window.history.replaceState({}, document.title, url.pathname);
          } catch {}
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white relative">
      
      {/* Toast Notification with Undo & Quick actions */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-950 text-white px-5 py-3.5 rounded-xl shadow-2xl border-2 border-neutral-700 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom duration-200 max-w-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold">{toastMessage.text}</span>
          </div>
          {(toastMessage.action || toastMessage.secondaryAction) && (
            <div className="flex items-center gap-2 ml-auto">
              {toastMessage.action && (
                <button
                  type="button"
                  onClick={() => {
                    toastMessage.action?.onClick();
                    setToastMessage(null);
                  }}
                  className="px-2.5 py-1 text-xs font-black uppercase bg-amber-400 text-neutral-950 hover:bg-amber-300 rounded shadow-xs cursor-pointer transition active:scale-95 flex items-center gap-1"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{toastMessage.action.label}</span>
                </button>
              )}
              {toastMessage.secondaryAction && (
                <button
                  type="button"
                  onClick={() => {
                    toastMessage.secondaryAction?.onClick();
                    setToastMessage(null);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-neutral-300 hover:text-white underline cursor-pointer"
                >
                  {toastMessage.secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Application Header */}
      <Header
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNewOrder={() => {
          setTargetColumnForNewOrder(undefined);
          setIsNewOrderOpen(true);
        }}
        onOpenColumnManager={() => setIsColumnManagerOpen(true)}
        onOpenPrintModal={() => {
          setPrintTargetOrderId(undefined);
          setIsPrintModalOpen(true);
        }}
        onOpenStationMode={() => setIsStationModeOpen(true)}
        onOpenExcelImport={() => setIsExcelImportOpen(true)}
        onOpenFloorGuide={() => setIsFloorGuideOpen(true)}
        onOpenHardwareGuide={() => setIsHardwareGuideOpen(true)}
        onOpenArchive={() => setIsArchiveModalOpen(true)}
        onRefreshPriorities={handleRefreshPriorities}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        totalOrdersCount={orders.length}
        archivedOrdersCount={archivedOrders.length}
        autoAdvanceEnabled={autoAdvanceOnScan}
        onToggleAutoAdvance={handleToggleAutoAdvance}
        syncStatus={syncStatus}
      />

      {/* Production KPIs & Quick Actions Bar */}
      <StatsBar
        orders={orders}
        columns={columns}
        archivedCount={archivedOrders.length}
        onOpenArchive={() => setIsArchiveModalOpen(true)}
        onResetDemoData={handleResetDemoData}
      />

      {/* Main Production Board */}
      <BoardView
        columns={columns}
        orders={filteredOrders}
        onUpdateColumnTitle={handleUpdateColumnTitle}
        onMoveOrder={handleMoveOrder}
        onSelectOrder={(ord) => {
          setSelectedOrder(ord);
          setIsOrderDetailOpen(true);
        }}
        onQuickQR={(ord) => {
          setPrintTargetOrderId(ord.id);
          setIsPrintModalOpen(true);
        }}
        onArchiveOrder={handleArchiveOrder}
        onNewOrderInColumn={(colId) => {
          setTargetColumnForNewOrder(colId);
          setIsNewOrderOpen(true);
        }}
        recentlyUpdatedOrderId={recentlyUpdatedOrderId}
      />

      {/* MODAL 1: Archive / Completed Deliveries */}
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        archivedOrders={archivedOrders}
        columns={columns}
        onRestoreOrder={handleRestoreOrder}
        onPermanentlyDeleteOrder={handlePermanentlyDeleteArchivedOrder}
      />

      {/* MODAL 2: Excel / IFS Import */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        columns={columns}
        existingOrders={orders}
        onImportOrders={handleImportOrders}
      />

      {/* MODAL 3: Shop Floor & Scanner Integration Guide */}
      <FloorGuideModal
        isOpen={isFloorGuideOpen}
        onClose={() => setIsFloorGuideOpen(false)}
        onOpenExcelImport={() => setIsExcelImportOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
      />

      {/* MODAL 4: QR Code Scanner */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onOrderIdentified={handleOrderIdentified}
        allOrders={orders}
        columns={columns}
        autoAdvanceEnabled={autoAdvanceOnScan}
        onToggleAutoAdvance={handleToggleAutoAdvance}
      />

      {/* MODAL 5: Quick Status & Report */}
      <QuickUpdateModal
        isOpen={isQuickUpdateOpen}
        order={scannedOrder}
        columns={columns}
        targetStationId={scannedTargetStationId}
        onClose={() => setIsQuickUpdateOpen(false)}
        onSaveReport={handleSaveReport}
        onArchiveOrder={handleArchiveOrder}
      />

      {/* MODAL 6: Order Detail Inspection, Reports Log & History */}
      <OrderDetailModal
        isOpen={isOrderDetailOpen}
        order={selectedOrder}
        columns={columns}
        onClose={() => setIsOrderDetailOpen(false)}
        onUpdateOrder={handleUpdateOrder}
        onDeleteOrder={handleDeleteOrder}
        onArchiveOrder={handleArchiveOrder}
        onPrintLabel={(ord) => {
          setPrintTargetOrderId(ord.id);
          setIsPrintModalOpen(true);
        }}
      />

      {/* MODAL 7: New Work Order */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        columns={columns}
        defaultColumnId={targetColumnForNewOrder}
        onCreateOrder={handleCreateOrder}
        existingCount={orders.length}
      />

      {/* MODAL 8: Column & Title Manager */}
      <ColumnManagerModal
        isOpen={isColumnManagerOpen}
        onClose={() => setIsColumnManagerOpen(false)}
        columns={columns}
        onSaveColumns={handleSaveColumns}
      />

      {/* MODAL 9: Print Labels & Routing Sheets (With Station-bound QR Codes!) */}
      <PrintLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        orders={orders}
        columns={columns}
        initialSelectedOrderId={printTargetOrderId}
      />

      {/* MODAL 10: Station Kiosk Mode (For mounted tablets at stations) */}
      <StationModeModal
        isOpen={isStationModeOpen}
        onClose={() => setIsStationModeOpen(false)}
        columns={columns}
        allOrders={orders}
        onOrderStationReport={handleOrderStationReport}
      />

      {/* MODAL 11: Floor Hardware & Real-Time API Guide */}
      <HardwareGuideModal
        isOpen={isHardwareGuideOpen}
        onClose={() => setIsHardwareGuideOpen(false)}
        onOpenMobileMode={() => setIsMobileScannerMode(true)}
      />
    </div>
  );
}

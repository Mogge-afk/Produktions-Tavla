import { ProductionOrder, ColumnConfig } from '../types';

export type SyncStatus = 'connected' | 'connecting' | 'offline';

export interface ScanApiResponse {
  success: boolean;
  orderId?: string;
  from?: string;
  to?: string;
  isLastStation?: boolean;
  isArchived?: boolean;
  order?: ProductionOrder;
  message?: string;
  error?: string;
}

type StateListener = (data: {
  orders?: ProductionOrder[];
  columns?: ColumnConfig[];
  archivedOrders?: ProductionOrder[];
}) => void;

type ScanEventListener = (data: {
  type: string;
  orderId?: string;
  fromStation?: string;
  toStation?: string;
  toColumnId?: string;
  order?: ProductionOrder;
  orders?: ProductionOrder[];
}) => void;

type StatusListener = (status: SyncStatus) => void;

class ApiSyncManager {
  private eventSource: EventSource | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private scanListeners: Set<ScanEventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private currentStatus: SyncStatus = 'connecting';
  private reconnectTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSSE();
    }
  }

  private initSSE() {
    if (typeof window === 'undefined') return;

    try {
      this.setStatus('connecting');
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.setStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent(data);
        } catch {
          // heartbeat or unparseable
        }
      };

      this.eventSource.onerror = () => {
        this.setStatus('offline');
        this.eventSource?.close();
        this.eventSource = null;

        // Auto-reconnect after 3 seconds
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.initSSE();
        }, 3000);
      };
    } catch (err) {
      console.warn('SSE connection failed:', err);
      this.setStatus('offline');
    }
  }

  private setStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  public onScanEvent(listener: ScanEventListener): () => void {
    this.scanListeners.add(listener);
    return () => this.scanListeners.delete(listener);
  }

  public onStateUpdate(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private handleEvent(data: any) {
    if (!data || !data.type) return;

    // Trigger scan-specific reactions (sound, toast, flash)
    this.scanListeners.forEach((fn) => fn(data));

    // Handle full state changes
    if (data.type === 'ORDER_MOVED' && data.orders) {
      this.stateListeners.forEach((fn) => fn({ orders: data.orders }));
    } else if (data.type === 'ORDERS_UPDATED' && data.orders) {
      this.stateListeners.forEach((fn) => fn({ orders: data.orders }));
    } else if (data.type === 'COLUMNS_UPDATED' && data.columns) {
      this.stateListeners.forEach((fn) => fn({ columns: data.columns }));
    } else if (data.type === 'ARCHIVED_UPDATED' && data.archivedOrders) {
      this.stateListeners.forEach((fn) => fn({ archivedOrders: data.archivedOrders }));
    } else if (data.type === 'ORDERS_IMPORTED' && data.orders) {
      this.stateListeners.forEach((fn) => fn({ orders: data.orders }));
    }
  }

  // Fetch full state from backend
  public async fetchState(): Promise<{
    orders?: ProductionOrder[];
    columns?: ColumnConfig[];
    archivedOrders?: ProductionOrder[];
  } | null> {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Could not fetch server state:', err);
      return null;
    }
  }

  // Send scan payload to backend API
  public async postScan(payload: string | { scan?: string; orderId?: string; stationId?: string; operator?: string; quantity?: number }): Promise<ScanApiResponse> {
    try {
      const body = typeof payload === 'string' ? { scan: payload } : payload;
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Error posting scan to /api/scan:', err);
      return {
        success: false,
        error: err.message || 'Kunde inte nå server-API',
      };
    }
  }

  // Sync orders to backend
  public async syncOrders(orders: ProductionOrder[]): Promise<boolean> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Sync columns to backend
  public async syncColumns(columns: ColumnConfig[]): Promise<boolean> {
    try {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Sync archived to backend
  public async syncArchived(archivedOrders: ProductionOrder[]): Promise<boolean> {
    try {
      const res = await fetch('/api/archived', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedOrders }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiSync = new ApiSyncManager();

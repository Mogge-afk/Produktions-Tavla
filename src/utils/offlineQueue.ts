import { ProductionOrder } from '../types';
import { extractScanPayload } from './qr';

export interface QueuedScanItem {
  id: string;
  timestamp: string; // ISO string when scanned
  rawScan: string;
  orderId: string;
  stationId?: string;
  targetStationTitle?: string;
  operator: string;
  quantity?: number;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
}

const OFFLINE_QUEUE_KEY = 'planeringstavla_offline_scan_queue_v1';
const SIMULATE_OFFLINE_KEY = 'planeringstavla_simulate_offline';

type QueueListener = (queue: QueuedScanItem[]) => void;
type ConnectionListener = (isOnline: boolean) => void;

class OfflineQueueManager {
  private queue: QueuedScanItem[] = [];
  private queueListeners: Set<QueueListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private isProcessing = false;
  private syncInterval: any = null;
  private simulatedOffline = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueueFromStorage();
      this.simulatedOffline = localStorage.getItem(SIMULATE_OFFLINE_KEY) === 'true';

      // Listen for browser online / offline events
      window.addEventListener('online', () => {
        this.notifyConnectionChange();
        this.processQueue();
      });

      window.addEventListener('offline', () => {
        this.notifyConnectionChange();
      });

      // Background health check & queue drain every 5 seconds if items exist
      this.syncInterval = setInterval(() => {
        if (this.queue.length > 0 && this.isOnline()) {
          this.processQueue();
        }
      }, 5000);
    }
  }

  private loadQueueFromStorage() {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      } else {
        this.queue = [];
      }
    } catch (e) {
      console.error('Failed to load offline scan queue from localStorage:', e);
      this.queue = [];
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
      this.notifyQueueChange();
    } catch (e) {
      console.error('Failed to save offline scan queue:', e);
    }
  }

  private notifyQueueChange() {
    this.queueListeners.forEach((listener) => listener([...this.queue]));
  }

  private notifyConnectionChange() {
    const status = this.isOnline();
    this.connectionListeners.forEach((listener) => listener(status));
  }

  public isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    if (this.simulatedOffline) return false;
    return navigator.onLine;
  }

  public setSimulateOffline(simulate: boolean) {
    this.simulatedOffline = simulate;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIMULATE_OFFLINE_KEY, simulate ? 'true' : 'false');
    }
    this.notifyConnectionChange();
    if (!simulate && this.queue.length > 0) {
      this.processQueue();
    }
  }

  public isSimulatingOffline(): boolean {
    return this.simulatedOffline;
  }

  public getQueue(): QueuedScanItem[] {
    return [...this.queue];
  }

  public getQueueCount(): number {
    return this.queue.length;
  }

  public onQueueChange(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener([...this.queue]);
    return () => this.queueListeners.delete(listener);
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isOnline());
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Adds a scan to the offline queue when connection is unavailable
   */
  public enqueueScan(item: {
    rawScan: string;
    orderId?: string;
    stationId?: string;
    targetStationTitle?: string;
    operator?: string;
    quantity?: number;
  }): QueuedScanItem {
    // If orderId was not provided, try to extract from raw scan
    let orderId = item.orderId;
    let stationId = item.stationId;

    if (!orderId && item.rawScan) {
      const extracted = extractScanPayload(item.rawScan);
      orderId = extracted.orderId;
      if (!stationId && extracted.stationId) {
        stationId = extracted.stationId;
      }
    }

    const queuedItem: QueuedScanItem = {
      id: 'scan_queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      rawScan: item.rawScan,
      orderId: orderId || item.rawScan,
      stationId,
      targetStationTitle: item.targetStationTitle,
      operator: item.operator || 'Operatör (Offline-kö)',
      quantity: item.quantity,
      retryCount: 0,
    };

    // Avoid exact duplicate queued within 2 seconds
    const isRecentDuplicate = this.queue.some(
      (q) =>
        q.orderId.toLowerCase() === queuedItem.orderId.toLowerCase() &&
        q.stationId === queuedItem.stationId &&
        Date.now() - new Date(q.timestamp).getTime() < 2000
    );

    if (!isRecentDuplicate) {
      this.queue.push(queuedItem);
      this.saveQueueToStorage();
    }

    return queuedItem;
  }

  public removeQueueItem(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueueToStorage();
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueueToStorage();
  }

  /**
   * Tries to drain the queue by posting each item to /api/scan
   */
  public async processQueue(onSuccessCallback?: (res: any, item: QueuedScanItem) => void): Promise<{
    processed: number;
    failed: number;
    remaining: number;
  }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, remaining: this.queue.length };
    }

    if (!this.isOnline()) {
      return { processed: 0, failed: 0, remaining: this.queue.length };
    }

    if (this.queue.length === 0) {
      return { processed: 0, failed: 0, remaining: 0 };
    }

    this.isProcessing = true;
    let processedCount = 0;
    let failedCount = 0;

    try {
      // First, check if backend server is really reachable
      try {
        const ping = await fetch('/api/health', { method: 'GET', cache: 'no-cache' });
        if (!ping.ok) {
          throw new Error('Server not reachable');
        }
      } catch {
        // Still unreachable
        this.isProcessing = false;
        return { processed: 0, failed: 0, remaining: this.queue.length };
      }

      // Clone current queue to process in FIFO order
      const itemsToProcess = [...this.queue];

      for (const item of itemsToProcess) {
        try {
          const payload = {
            scan: item.rawScan,
            orderId: item.orderId,
            stationId: item.stationId,
            operator: item.operator,
            quantity: item.quantity,
          };

          const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            // Remove from queue
            this.removeQueueItem(item.id);
            processedCount++;
            if (onSuccessCallback) {
              onSuccessCallback(data, item);
            }
          } else {
            // Server error for this particular item (e.g. 404 order not found)
            item.retryCount += 1;
            item.lastAttemptAt = new Date().toISOString();
            item.lastError = `HTTP ${response.status}`;
            failedCount++;

            // If it failed 5 times or was not found (404), remove or keep based on error
            if (response.status === 404 || item.retryCount >= 5) {
              this.removeQueueItem(item.id);
            } else {
              this.saveQueueToStorage();
            }
          }
        } catch (err: any) {
          // Network dropped again mid-flight
          item.retryCount += 1;
          item.lastAttemptAt = new Date().toISOString();
          item.lastError = err.message || 'Nätverksfel';
          this.saveQueueToStorage();
          failedCount++;
          break; // Stop loop if network dropped
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return {
      processed: processedCount,
      failed: failedCount,
      remaining: this.queue.length,
    };
  }
}

export const offlineQueue = new OfflineQueueManager();

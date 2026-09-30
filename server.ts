import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Data storage path
const DATA_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'production-state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerState {
  orders: any[];
  columns: any[];
  archivedOrders: any[];
  lastUpdated: string;
}

// Default initial state if file doesn't exist
const DEFAULT_COLUMNS = [
  { id: 'col-planerat', title: 'Planerat', headerBg: '#dbeafe', borderColor: '#93c5fd', headerTextColor: '#1e3a8a', description: 'Ordinarie order inlagd och väntar på produktionsstart' },
  { id: 'col-material', title: 'Material uttaget', headerBg: '#dcfce7', borderColor: '#86efac', headerTextColor: '#14532d', description: 'Råmaterial och komponenter plockade från lagret' },
  { id: 'col-montering', title: 'Montering', headerBg: '#fef3c7', borderColor: '#fde047', headerTextColor: '#713f12', description: 'Aktiv montering och mekanisk/elektrisk sammanställning' },
  { id: 'col-test', title: 'Test', headerBg: '#f3e8ff', borderColor: '#d8b4fe', headerTextColor: '#581c87', description: 'Kvalitetstest, provtryckning, mätning och funktionsverifiering' },
  { id: 'col-packning', title: 'Packning', headerBg: '#fce7f3', borderColor: '#f9a8d4', headerTextColor: '#831843', description: 'Slutrengöring, märkning och emballering' },
  { id: 'col-leverans', title: 'Klar för leverans', headerBg: '#dcfce7', borderColor: '#86efac', headerTextColor: '#14532d', description: 'Färdigställt gods uppställt på leveranstorg' },
];

const INITIAL_ORDERS = [
  {
    id: 'AO-2026-101',
    title: 'Hydraulventilblock HVB-420',
    articleNumber: 'ART-99201',
    customer: 'Nordic Hydraulic AB',
    batchSize: 100,
    unit: 'st',
    priority: 'high',
    columnId: 'col-montering',
    targetDate: '2026-10-02',
    drawingNumber: 'RIT-4421-C',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    operator: 'Kalle.K',
    tags: ['CNC-fräst', 'Härdat stål'],
    reports: [],
    stationProgress: { 'col-material': 100, 'col-montering': 30 },
    notes: [
      {
        id: 'n1',
        timestamp: new Date().toISOString(),
        operator: 'System',
        text: 'Order skapad',
        type: 'info',
        stageName: 'Montering',
      },
    ],
    checklists: {},
  },
  {
    id: 'AO-2026-102',
    title: 'Styrskåp Automatiseringslina Alpha',
    articleNumber: 'EL-4011-B',
    customer: 'Scania Powertrain',
    batchSize: 20,
    unit: 'st',
    priority: 'urgent',
    columnId: 'col-test',
    targetDate: '2026-10-01',
    drawingNumber: 'EL-9081',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
    operator: 'Mikael.L',
    tags: ['PLC-styrning', '24V'],
    reports: [],
    stationProgress: { 'col-material': 20, 'col-montering': 20, 'col-test': 5 },
    notes: [],
    checklists: {},
  },
  {
    id: 'AO-2026-103',
    title: 'Axeltätning och Monteringsfläns',
    articleNumber: 'FL-0029',
    customer: 'Volvo GTO',
    batchSize: 250,
    unit: 'st',
    priority: 'normal',
    columnId: 'col-planerat',
    targetDate: '2026-10-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    operator: 'Kalle.K',
    tags: ['Standard'],
    reports: [],
    stationProgress: {},
    notes: [],
    checklists: {},
  },
];

function loadServerState(): ServerState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading state file:', err);
  }

  const initialState: ServerState = {
    orders: INITIAL_ORDERS,
    columns: DEFAULT_COLUMNS,
    archivedOrders: [],
    lastUpdated: new Date().toISOString(),
  };
  saveServerState(initialState);
  return initialState;
}

function saveServerState(state: ServerState) {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving state file:', err);
  }
}

let currentState: ServerState = loadServerState();

// Server-Sent Events (SSE) subscribers
const sseClients = new Set<Response>();

function broadcast(event: { type: string; [key: string]: any }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  });
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// 1. Health check & status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    connectedClients: sseClients.size,
    ordersCount: currentState.orders.length,
    archivedCount: currentState.archivedOrders.length,
    lastUpdated: currentState.lastUpdated,
  });
});

// 2. Get complete current production board state
app.get('/api/state', (_req: Request, res: Response) => {
  res.json(currentState);
});

// 3. Save / sync active orders
app.post('/api/orders', (req: Request, res: Response) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'orders must be an array' });
  }

  currentState.orders = orders;
  saveServerState(currentState);
  broadcast({ type: 'ORDERS_UPDATED', orders: currentState.orders });
  res.json({ success: true, count: orders.length });
});

// 4. Save / sync columns
app.post('/api/columns', (req: Request, res: Response) => {
  const { columns } = req.body;
  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'columns must be an array' });
  }

  currentState.columns = columns;
  saveServerState(currentState);
  broadcast({ type: 'COLUMNS_UPDATED', columns: currentState.columns });
  res.json({ success: true, count: columns.length });
});

// 5. Save / sync archived orders
app.post('/api/archived', (req: Request, res: Response) => {
  const { archivedOrders } = req.body;
  if (!Array.isArray(archivedOrders)) {
    return res.status(400).json({ error: 'archivedOrders must be an array' });
  }

  currentState.archivedOrders = archivedOrders;
  saveServerState(currentState);
  broadcast({ type: 'ARCHIVED_UPDATED', archivedOrders: currentState.archivedOrders });
  res.json({ success: true, count: archivedOrders.length });
});

// 6. Bulk import from IFS / Excel
app.post('/api/import-orders', (req: Request, res: Response) => {
  const { importedOrders, targetColumnId, duplicateStrategy } = req.body;
  if (!Array.isArray(importedOrders)) {
    return res.status(400).json({ error: 'importedOrders must be an array' });
  }

  const existingMap = new Map<string, any>();
  currentState.orders.forEach((o) => existingMap.set(o.id.toUpperCase(), o));

  let added = 0;
  let updated = 0;

  for (const imp of importedOrders) {
    const idUpper = String(imp.id).toUpperCase();
    if (existingMap.has(idUpper)) {
      if (duplicateStrategy === 'update') {
        const existing = existingMap.get(idUpper);
        const merged = {
          ...existing,
          title: imp.title || existing.title,
          articleNumber: imp.articleNumber || existing.articleNumber,
          batchSize: imp.batchSize || existing.batchSize,
          targetDate: imp.targetDate || existing.targetDate,
          priority: imp.priority || existing.priority,
          customer: imp.customer !== 'IFS Order' ? imp.customer : existing.customer,
          updatedAt: new Date().toISOString(),
        };
        existingMap.set(idUpper, merged);
        updated++;
      }
    } else {
      existingMap.set(idUpper, imp);
      added++;
    }
  }

  currentState.orders = Array.from(existingMap.values());
  saveServerState(currentState);
  broadcast({ type: 'ORDERS_IMPORTED', orders: currentState.orders, added, updated });
  res.json({ success: true, added, updated, total: currentState.orders.length });
});

function executeScanLogic(body: {
  scan?: string;
  orderId?: string;
  stationId?: string;
  operator?: string;
  quantity?: number;
}): { status: number; data: any } {
  let { scan, orderId, stationId, operator, quantity } = body;

  // Extract from raw scan string if provided
  if (scan && typeof scan === 'string') {
    let clean = scan.trim().replace(/^mailto:/i, '');
    if (clean.includes('%')) {
      try { clean = decodeURIComponent(clean); } catch {}
    }

    // Check ORD:... or POS:...
    const match = /^(ORD|PLANERING|POS)[:/](.+)$/i.exec(clean);
    if (match) {
      const rest = match[2];
      if (rest.includes(':')) {
        [orderId, stationId] = rest.split(':');
      } else if (rest.includes('/')) {
        [orderId, stationId] = rest.split('/');
      } else if (rest.includes('@')) {
        [orderId, stationId] = rest.split('@');
      } else {
        orderId = rest;
      }
    } else if (clean.includes('@')) {
      [orderId, stationId] = clean.split('@');
    } else if (clean.includes(':')) {
      [orderId, stationId] = clean.split(':');
    } else if (clean.includes('/')) {
      [orderId, stationId] = clean.split('/');
    } else {
      orderId = clean;
    }
  }

  if (!orderId) {
    return { status: 400, data: { success: false, error: 'Saknar orderId eller giltig scan-kod' } };
  }

  const cleanOrderId = String(orderId).trim();
  const cleanStationId = stationId ? String(stationId).trim() : undefined;

  const foundIndex = currentState.orders.findIndex(
    (o) => o.id.toLowerCase() === cleanOrderId.toLowerCase()
  );

  if (foundIndex === -1) {
    const isArchived = currentState.archivedOrders.some(
      (o) => o.id.toLowerCase() === cleanOrderId.toLowerCase()
    );
    if (isArchived) {
      return {
        status: 200,
        data: {
          success: false,
          isArchived: true,
          message: `Order ${cleanOrderId} är redan slutförd och finns i arkivet.`,
        },
      };
    }
    return {
      status: 404,
      data: {
        success: false,
        error: `Order ${cleanOrderId} hittades inte på tavlan.`,
      },
    };
  }

  const targetOrder = currentState.orders[foundIndex];
  const columns = currentState.columns;

  // Determine which station was finished and what next station is
  const refStationId = cleanStationId || targetOrder.columnId;
  const refIndex = columns.findIndex((c: any) => c.id === refStationId);
  const fromColumn = columns[refIndex] || columns.find((c: any) => c.id === targetOrder.columnId) || columns[0];

  const isLast = refIndex >= columns.length - 1;
  const nextColumn = !isLast ? columns[refIndex + 1] : null;

  const nowIso = new Date().toISOString();
  const op = operator || 'Operatör (Golvskanner)';
  const qty = Number(quantity) || targetOrder.batchSize || 1;

  if (!nextColumn) {
    // Already at last column!
    broadcast({
      type: 'ORDER_AT_LAST_STATION',
      orderId: targetOrder.id,
      stationTitle: fromColumn.title,
      order: targetOrder,
    });

    return {
      status: 200,
      data: {
        success: true,
        isLastStation: true,
        order: targetOrder,
        message: `Order ${targetOrder.id} har nått sista stationen ("${fromColumn.title}").`,
      },
    };
  }

  // Update order with new stage, progress, report and note
  const updatedOrder = {
    ...targetOrder,
    columnId: nextColumn.id,
    updatedAt: nowIso,
    stationProgress: {
      ...(targetOrder.stationProgress || {}),
      [refStationId]: qty,
    },
    reports: [
      {
        id: 'rep_' + Date.now(),
        timestamp: nowIso,
        stationId: refStationId,
        stationName: fromColumn.title,
        operator: op,
        quantity: qty,
        totalSoFar: qty,
        orderTotal: targetOrder.batchSize,
        note: 'Skannad och flyttad via realtids-API',
      },
      ...(targetOrder.reports || []),
    ],
    notes: [
      {
        id: 'n_scan_' + Date.now(),
        timestamp: nowIso,
        operator: op,
        text: `Skannad vid "${fromColumn.title}" ➔ automatiskt flyttad till "${nextColumn.title}".`,
        type: 'stage_change',
        stageName: nextColumn.title,
      },
      ...targetOrder.notes,
    ],
  };

  currentState.orders[foundIndex] = updatedOrder;
  saveServerState(currentState);

  // Broadcast to all open TV screens, tablets, and web browsers in real-time
  broadcast({
    type: 'ORDER_MOVED',
    orderId: targetOrder.id,
    fromStation: fromColumn.title,
    toStation: nextColumn.title,
    toColumnId: nextColumn.id,
    order: updatedOrder,
    orders: currentState.orders,
  });

  return {
    status: 200,
    data: {
      success: true,
      orderId: targetOrder.id,
      from: fromColumn.title,
      to: nextColumn.title,
      order: updatedOrder,
      message: `✓ Order ${targetOrder.id} flyttad från "${fromColumn.title}" till "${nextColumn.title}"!`,
    },
  };
}

// 7. Core Scanner API: Any handheld scanner, mobile phone, Zebra gun or curl can post here!
// Format: POST /api/scan with { "scan": "ORD:AO-2026-101:col-montering" } or { "orderId": "AO-2026-101", "stationId": "col-montering" }
app.post('/api/scan', (req: Request, res: Response) => {
  const result = executeScanLogic(req.body);
  return res.status(result.status).json(result.data);
});

// 7b. Batch Scanner API: Used when offline devices reconnect and send all queued scans
app.post('/api/scan/batch', (req: Request, res: Response) => {
  const { scans } = req.body;
  if (!Array.isArray(scans)) {
    return res.status(400).json({ error: 'scans must be an array' });
  }

  const results = [];
  for (const item of scans) {
    const resItem = executeScanLogic(item);
    results.push(resItem.data);
  }

  return res.json({
    success: true,
    total: scans.length,
    results,
  });
});

// 8. Server-Sent Events (SSE) endpoint for real-time live push to all screens
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  sseClients.add(res);

  // Heartbeat ping every 25 seconds to keep connection alive
  const keepAlive = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// -------------------------------------------------------------
// VITE INTEGRATION FOR FULL-STACK SPA
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Production: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    // Development: mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Planeringstavla Server] Körs på http://0.0.0.0:${PORT}`);
    console.log(`[Planeringstavla API] Scan endpoint: POST http://localhost:${PORT}/api/scan`);
    console.log(`[Planeringstavla SSE] Live events: GET http://localhost:${PORT}/api/events`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

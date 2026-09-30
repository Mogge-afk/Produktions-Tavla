import { ColumnConfig, ProductionOrder, ProductionReport } from '../types';

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'col-planerat',
    title: 'Planerat',
    headerBg: '#dbeafe', // soft blue matching screenshot
    borderColor: '#93c5fd',
    headerTextColor: '#1e3a8a',
    description: 'Ordinarie order inlagd och väntar på produktionsstart',
  },
  {
    id: 'col-material',
    title: 'Material uttaget',
    headerBg: '#dcfce7', // soft green matching screenshot
    borderColor: '#86efac',
    headerTextColor: '#14532d',
    description: 'Råmaterial och komponenter plockade från lagret',
  },
  {
    id: 'col-montering',
    title: 'Montering',
    headerBg: '#fef3c7', // soft warm yellow/amber matching screenshot
    borderColor: '#fde047',
    headerTextColor: '#713f12',
    description: 'Aktiv montering och mekanisk/elektrisk sammanställning',
  },
  {
    id: 'col-test',
    title: 'Test',
    headerBg: '#f3e8ff', // soft lavender/purple matching screenshot
    borderColor: '#d8b4fe',
    headerTextColor: '#581c87',
    description: 'Kvalitetstest, provtryckning, mätning och funktionsverifiering',
  },
  {
    id: 'col-packning',
    title: 'Packning',
    headerBg: '#fce7f3', // soft pink/rose matching screenshot
    borderColor: '#f9a8d4',
    headerTextColor: '#831843',
    description: 'Slutrengöring, märkning och emballering',
  },
  {
    id: 'col-leverans',
    title: 'Klar för leverans',
    headerBg: '#dcfce7', // light mint/sage matching screenshot
    borderColor: '#86efac',
    headerTextColor: '#14532d',
    description: 'Färdigställt gods uppställt på leveranstorg',
  },
];

export const TEMPLATES: Record<string, { name: string; columns: ColumnConfig[] }> = {
  original: {
    name: 'Verkstad standard (från bild)',
    columns: DEFAULT_COLUMNS,
  },
  mechanical: {
    name: 'Mekanisk bearbetning',
    columns: [
      { id: 'col-beredning', title: 'Beredning', headerBg: '#e0f2fe', borderColor: '#7dd3fc', headerTextColor: '#0369a1' },
      { id: 'col-laser', title: 'Laserskärning', headerBg: '#fee2e2', borderColor: '#fca5a5', headerTextColor: '#991b1b' },
      { id: 'col-bockning', title: 'Kantpress / Bock', headerBg: '#fef3c7', borderColor: '#fde047', headerTextColor: '#854d0e' },
      { id: 'col-svets', title: 'Svetsning & Slip', headerBg: '#ffedd5', borderColor: '#fdba74', headerTextColor: '#9a3412' },
      { id: 'col-ytbeh', title: 'Ytbehandling', headerBg: '#f3e8ff', borderColor: '#d8b4fe', headerTextColor: '#6b21a8' },
      { id: 'col-kontroll', title: 'Slutkontroll', headerBg: '#dcfce7', borderColor: '#86efac', headerTextColor: '#166534' },
      { id: 'col-utleverans', title: 'Klar för avgång', headerBg: '#ccfbf1', borderColor: '#5eead4', headerTextColor: '#115e59' },
    ],
  },
  electronics: {
    name: 'Elektronik & Kretskort',
    columns: [
      { id: 'col-el-plan', title: 'Planering', headerBg: '#e0f2fe', borderColor: '#7dd3fc', headerTextColor: '#0369a1' },
      { id: 'col-el-kitting', title: 'Kitting / Plock', headerBg: '#fef3c7', borderColor: '#fde047', headerTextColor: '#854d0e' },
      { id: 'col-el-smd', title: 'SMD-lina', headerBg: '#f3e8ff', borderColor: '#d8b4fe', headerTextColor: '#6b21a8' },
      { id: 'col-el-aoi', title: 'Optisk AOI / Syn', headerBg: '#ffedd5', borderColor: '#fdba74', headerTextColor: '#9a3412' },
      { id: 'col-el-box', title: 'Box-Build', headerBg: '#fce7f3', borderColor: '#f9a8d4', headerTextColor: '#831843' },
      { id: 'col-el-functest', title: 'Funktionstest & Bränning', headerBg: '#dcfce7', borderColor: '#86efac', headerTextColor: '#166534' },
      { id: 'col-el-klar', title: 'Packat & Klart', headerBg: '#ccfbf1', borderColor: '#5eead4', headerTextColor: '#115e59' },
    ],
  },
};

export const INITIAL_ORDERS: ProductionOrder[] = [
  {
    id: 'AO-2026-101',
    title: 'Hydraulventilblock HVB-420',
    articleNumber: 'ART-99201',
    customer: 'Nordic Hydraulic AB',
    batchSize: 100, // Order: 100st
    unit: 'st',
    priority: 'high',
    columnId: 'col-montering',
    targetDate: '2026-10-02',
    drawingNumber: 'RIT-4421-C',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    operator: 'Kalle.K',
    tags: ['CNC-fräst', 'Härdat stål'],
    qrPayload: 'AO-2026-101',
    stationProgress: {
      'col-material': 100,
      'col-montering': 30, // 30 st klara i montering
    },
    reports: [
      {
        id: 'rep_1',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        stationId: 'col-montering',
        stationName: 'Montering',
        operator: 'Kalle.K',
        quantity: 30,
        totalSoFar: 30,
        orderTotal: 100,
        note: 'Första delbatch monterad och verifierad mot mall.',
      },
    ],
    notes: [
      {
        id: 'n1',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        operator: 'Kalle.K',
        text: 'Rapporterat Antal: 30 st. Totalt: 30 st av Order: 100 st.',
        type: 'approved',
        stageName: 'Montering',
      },
    ],
    checklists: {
      'col-montering': [
        { id: 'c1', text: 'Spindellager injusterat', completed: true, completedBy: 'Kalle.K' },
        { id: 'c2', text: 'Momentdragning 140 Nm', completed: true, completedBy: 'Kalle.K' },
      ],
    },
  },
  {
    id: 'AO-2026-102',
    title: 'Stativram Robotcell R-28',
    articleNumber: 'ART-88140',
    customer: 'ABB Automation',
    batchSize: 50,
    unit: 'st',
    priority: 'normal',
    columnId: 'col-planerat',
    targetDate: '2026-10-05',
    drawingNumber: 'RIT-2800-A',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    operator: 'Sara L',
    tags: ['Svetskonstruktion', 'Målning RAL7016'],
    qrPayload: 'AO-2026-102',
    stationProgress: {},
    reports: [],
    notes: [
      {
        id: 'n2',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        operator: 'Sara L',
        text: 'Stålprofiler 80x80 beställda till kapstation.',
        type: 'info',
        stageName: 'Planerat',
      },
    ],
    checklists: {},
  },
  {
    id: 'AO-2026-098',
    title: 'Styrpanel Touch SP-700',
    articleNumber: 'ART-10499',
    customer: 'Scania CV',
    batchSize: 40,
    unit: 'st',
    priority: 'urgent',
    columnId: 'col-material',
    targetDate: '2026-09-28',
    drawingNumber: 'EL-700-REV3',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    operator: 'Anna.P',
    tags: ['Express', 'Känslig elektronik'],
    qrPayload: 'AO-2026-098',
    stationProgress: {
      'col-material': 40,
    },
    reports: [
      {
        id: 'rep_2',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        stationId: 'col-material',
        stationName: 'Material uttaget',
        operator: 'Anna.P',
        quantity: 40,
        totalSoFar: 40,
        orderTotal: 40,
        note: 'Komponentplock färdigt i kitting-vagn 4.',
      },
    ],
    notes: [
      {
        id: 'n3',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        operator: 'Anna.P',
        text: 'Komponentplock färdigt i kitting-vagn 4. Kapslingar och kablage kompletta.',
        type: 'approved',
        stageName: 'Material uttaget',
      },
    ],
    checklists: {
      'col-material': [
        { id: 'c3', text: 'Kretskort verifierade mot stycklista', completed: true, completedBy: 'Anna.P' },
        { id: 'c4', text: 'Kapsling och displayer utplockade', completed: true, completedBy: 'Anna.P' },
      ],
    },
  },
  {
    id: 'AO-2026-092',
    title: 'Provtrycksmodul PM-300 Bar',
    articleNumber: 'ART-77211',
    customer: 'Parker Hannifin',
    batchSize: 20,
    unit: 'st',
    priority: 'normal',
    columnId: 'col-test',
    targetDate: '2026-09-30',
    drawingNumber: 'HYD-300-TEST',
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    operator: 'Emma.S',
    tags: ['Klass 1 provtryck', 'Olja ISO VG 46'],
    qrPayload: 'AO-2026-092',
    stationProgress: {
      'col-material': 20,
      'col-montering': 20,
      'col-test': 10,
    },
    reports: [
      {
        id: 'rep_3',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        stationId: 'col-test',
        stationName: 'Test',
        operator: 'Emma.S',
        quantity: 10,
        totalSoFar: 10,
        orderTotal: 20,
        note: '10 st provtryckta till 350 bar utan tryckfall.',
      },
    ],
    notes: [
      {
        id: 'n6',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        operator: 'Emma.S',
        text: '10 av 20 st enheter provtryckta till 350 bar.',
        type: 'approved',
        stageName: 'Test',
      },
    ],
    checklists: {
      'col-test': [
        { id: 'ct1', text: 'Täthetsprovning 350 bar utförd', completed: true, completedBy: 'Emma.S' },
      ],
    },
  },
  {
    id: 'AO-2026-089',
    title: 'Kablagesats Cabin-Wiring C4',
    articleNumber: 'ART-33100',
    customer: 'Komatsu Forest',
    batchSize: 15,
    unit: 'satser',
    priority: 'normal',
    columnId: 'col-packning',
    targetDate: '2026-09-27',
    drawingNumber: 'KAB-C4-2026',
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    operator: 'David.N',
    tags: ['Märkt Deutsch-kontakt', 'Krympslang'],
    qrPayload: 'AO-2026-089',
    stationProgress: {
      'col-material': 15,
      'col-montering': 15,
      'col-test': 15,
      'col-packning': 15,
    },
    reports: [],
    notes: [
      {
        id: 'n7',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        operator: 'David.N',
        text: 'Testprotokoll och följesedel bifogade i kartong.',
        type: 'info',
        stageName: 'Packning',
      },
    ],
    checklists: {},
  },
  {
    id: 'AO-2026-084',
    title: 'Ventilblock VB-12 Aluminium',
    articleNumber: 'ART-99120',
    customer: 'Valmet Power',
    batchSize: 100,
    unit: 'st',
    priority: 'normal',
    columnId: 'col-leverans',
    targetDate: '2026-09-26',
    drawingNumber: 'AL-12-08',
    createdAt: new Date(Date.now() - 3600000 * 150).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    operator: 'Håkan.L',
    tags: ['EU-pall', 'Plastad'],
    qrPayload: 'AO-2026-084',
    stationProgress: {
      'col-material': 100,
      'col-montering': 100,
      'col-test': 100,
      'col-packning': 100,
      'col-leverans': 100,
    },
    reports: [],
    notes: [
      {
        id: 'n8',
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        operator: 'Håkan.L',
        text: 'Placerad på pallplats G-12. Klar för upphämtning.',
        type: 'approved',
        stageName: 'Klar för leverans',
      },
    ],
    checklists: {},
  },
];

const STORAGE_KEYS = {
  ORDERS: 'planeringstavla_orders_v2',
  ARCHIVED_ORDERS: 'planeringstavla_archived_orders_v2',
  COLUMNS: 'planeringstavla_columns_v2',
  OPERATOR_NAME: 'planeringstavla_operator_name',
  LAST_SYNC: 'planeringstavla_last_sync',
};

// Cross-tab real-time sync channel
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('planeringstavla_sync_channel');
  } catch {
    syncChannel = null;
  }
}

export function loadStoredOrders(): ProductionOrder[] {
  if (typeof window === 'undefined') return INITIAL_ORDERS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!data) {
      saveStoredOrders(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    const parsed: ProductionOrder[] = JSON.parse(data);
    // Ensure all fields exist
    return parsed.map((o) => ({
      ...o,
      reports: o.reports || [],
      stationProgress: o.stationProgress || {},
      checklists: o.checklists || {},
      notes: o.notes || [],
    }));
  } catch (e) {
    console.error('Failed to parse orders:', e);
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders: ProductionOrder[], notify = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    if (notify && syncChannel) {
      syncChannel.postMessage({ type: 'ORDERS_UPDATED', orders, timestamp: Date.now() });
    }
  } catch (e) {
    console.error('Failed to save orders:', e);
  }
}

export function loadStoredArchivedOrders(): ProductionOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ARCHIVED_ORDERS);
    if (!data) return [];
    const parsed: ProductionOrder[] = JSON.parse(data);
    return parsed.map((o) => ({
      ...o,
      isArchived: true,
      reports: o.reports || [],
      stationProgress: o.stationProgress || {},
      checklists: o.checklists || {},
      notes: o.notes || [],
    }));
  } catch (e) {
    console.error('Failed to parse archived orders:', e);
    return [];
  }
}

export function saveStoredArchivedOrders(archived: ProductionOrder[], notify = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ARCHIVED_ORDERS, JSON.stringify(archived));
    if (notify && syncChannel) {
      syncChannel.postMessage({ type: 'ARCHIVED_UPDATED', archived, timestamp: Date.now() });
    }
  } catch (e) {
    console.error('Failed to save archived orders:', e);
  }
}

export function loadStoredColumns(): ColumnConfig[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COLUMNS);
    if (!data) {
      saveStoredColumns(DEFAULT_COLUMNS);
      return DEFAULT_COLUMNS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse columns:', e);
    return DEFAULT_COLUMNS;
  }
}

export function saveStoredColumns(columns: ColumnConfig[], notify = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.COLUMNS, JSON.stringify(columns));
    if (notify && syncChannel) {
      syncChannel.postMessage({ type: 'COLUMNS_UPDATED', columns, timestamp: Date.now() });
    }
  } catch (e) {
    console.error('Failed to save columns:', e);
  }
}

export function getStoredOperatorName(): string {
  if (typeof window === 'undefined') return 'Kalle.K';
  return localStorage.getItem(STORAGE_KEYS.OPERATOR_NAME) || 'Kalle.K';
}

export function setStoredOperatorName(name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.OPERATOR_NAME, name);
}

export function subscribeToSync(
  onOrdersChange: (orders: ProductionOrder[]) => void,
  onColumnsChange: (columns: ColumnConfig[]) => void,
  onArchivedChange?: (archived: ProductionOrder[]) => void
): () => void {
  if (!syncChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'ORDERS_UPDATED' && event.data.orders) {
      onOrdersChange(event.data.orders);
    } else if (event.data?.type === 'COLUMNS_UPDATED' && event.data.columns) {
      onColumnsChange(event.data.columns);
    } else if (event.data?.type === 'ARCHIVED_UPDATED' && event.data.archived && onArchivedChange) {
      onArchivedChange(event.data.archived);
    }
  };

  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel?.removeEventListener('message', handler);
  };
}

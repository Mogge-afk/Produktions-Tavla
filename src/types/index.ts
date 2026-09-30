export type Priority = 'normal' | 'high' | 'urgent';

export interface ProductionNote {
  id: string;
  timestamp: string;
  operator: string;
  text: string;
  type: 'info' | 'deviation' | 'approved' | 'stage_change';
  stageName?: string;
}

export interface ProductionReport {
  id: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  operator: string; // t.ex. "Kalle.K"
  quantity: number; // t.ex. 30 st
  totalSoFar: number; // t.ex. 30 st
  orderTotal: number; // t.ex. 100 st
  note?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface ProductionOrder {
  id: string; // t.ex. "AO-2026-101"
  title: string; // Produktnamn t.ex. "Ventilblock VB-40 Hydraulik"
  articleNumber: string; // t.ex. "ART-8910"
  customer: string; // t.ex. "Hydraulik Nord AB"
  batchSize: number; // Order: t.ex. 100 st
  unit: string; // t.ex. "st", "satser", "enheter"
  priority: Priority;
  columnId: string; // Nuvarande aktiv station
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  operator?: string; // Senaste operatör t.ex. "Kalle.K"
  notes: ProductionNote[];
  reports: ProductionReport[]; // Logg över alla rapporter (Namn, Antal, Totalt, Order)
  stationProgress: Record<string, number>; // stationId -> ackumulerat antal klart vid den stationen
  checklists: Record<string, ChecklistItem[]>;
  tags: string[];
  qrPayload?: string;
  drawingNumber?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
}

export interface ColumnConfig {
  id: string;
  title: string;
  headerBg: string; // Pastel background hex
  borderColor: string; // Border hex
  headerTextColor: string; // Text color
  description?: string;
}

export type ViewMode = 'board' | 'station' | 'print_preview';

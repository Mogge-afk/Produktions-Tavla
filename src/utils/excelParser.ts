import * as XLSX from 'xlsx';
import { Priority, ProductionOrder } from '../types';
import { calculatePriorityFromDate, PrioritySettings, DEFAULT_PRIORITY_SETTINGS } from './priority';

export interface ColumnMapping {
  orderId: string;
  title: string;
  articleNumber: string;
  batchSize: string;
  targetDate: string;
  customer?: string;
  unit?: string;
  drawingNumber?: string;
}

export interface ParsedRow {
  rowIndex: number;
  raw: Record<string, any>;
  orderId: string;
  title: string;
  articleNumber: string;
  batchSize: number;
  unit: string;
  targetDate: string; // YYYY-MM-DD
  customer: string;
  drawingNumber?: string;
  priority: Priority;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  headers: string[];
  suggestedMapping: ColumnMapping;
  rows: ParsedRow[];
  sheetNames: string[];
}

/**
 * Intelligent heuristic to identify ERP-system and standard Swedish/English column headers
 */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    const lowerCandidates = candidates.map((c) => c.toLowerCase());
    for (const h of headers) {
      const cleanH = h.trim().toLowerCase().replace(/[_\-\s\.]/g, '');
      for (const cand of lowerCandidates) {
        const cleanCand = cand.replace(/[_\-\s\.]/g, '');
        if (cleanH === cleanCand || cleanH.includes(cleanCand)) {
          return h;
        }
      }
    }
    return '';
  };

  const orderId = findMatch([
    'ordernr',
    'ordernummer',
    'tillverkningsorder',
    'shoporder',
    'doporder',
    'orderno',
    'tillvorder',
    'order',
    'ao',
    'id',
  ]) || headers[0] || '';

  const title = findMatch([
    'artikelnamn',
    'benämning',
    'beskrivning',
    'produktnamn',
    'produkt',
    'partdescription',
    'description',
    'title',
    'benamning',
  ]) || headers[1] || '';

  const articleNumber = findMatch([
    'artikelnummer',
    'artikelnr',
    'artnr',
    'partno',
    'partnumber',
    'materialnr',
    'material',
    'art.nr',
    'itemno',
  ]) || headers[2] || '';

  const batchSize = findMatch([
    'antal',
    'kvantitet',
    'planeratantal',
    'orderantal',
    'revisedqtydue',
    'planqty',
    'quantity',
    'qty',
    'mängd',
    'batch',
    'totalt',
  ]) || headers[3] || '';

  const targetDate = findMatch([
    'planeratleveransdatum',
    'leveransdatum',
    'behovsdatum',
    'duedate',
    'needdate',
    'revisedduedate',
    'måldatum',
    'färdigdatum',
    'slutdatum',
    'deliverydate',
    'plannedduedate',
    'targetdate',
    'datum',
  ]) || headers[4] || '';

  const customer = findMatch([
    'kund',
    'kundnamn',
    'customer',
    'customername',
    'beställare',
    'projekt',
  ]);

  const unit = findMatch(['enhet', 'unit', 'uom']);
  const drawingNumber = findMatch(['ritning', 'ritningsnummer', 'drawing', 'drawingno', 'ritningsnr']);

  return {
    orderId,
    title,
    articleNumber,
    batchSize,
    targetDate,
    customer,
    unit,
    drawingNumber,
  };
}

/**
 * Standardize any date input into YYYY-MM-DD
 */
export function normalizeDate(val: any): string {
  if (!val) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    return fallback.toISOString().split('T')[0];
  }

  // Already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  // If number (Excel serial date)
  if (typeof val === 'number') {
    try {
      // Excel epoch starts at 1899-12-30 due to Lotus leap year bug
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateMs = excelEpoch.getTime() + val * 86400000;
      const parsed = new Date(dateMs);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
  }

  // If string
  const str = String(val).trim();
  if (!str) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    return fallback.toISOString().split('T')[0];
  }

  // Check ISO format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Check European/Swedish DD/MM/YYYY or DD-MM-YYYY
  const eurMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (eurMatch) {
    const d = eurMatch[1].padStart(2, '0');
    const m = eurMatch[2].padStart(2, '0');
    const y = eurMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Native Date fallback
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }

  // Fallback to +7 days
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  return fallback.toISOString().split('T')[0];
}

/**
 * Parses an Excel or CSV file buffer/array
 */
export async function parseExcelFile(
  file: File,
  settings: PrioritySettings = DEFAULT_PRIORITY_SETTINGS
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON array of row objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      headers: [],
      suggestedMapping: {
        orderId: '',
        title: '',
        articleNumber: '',
        batchSize: '',
        targetDate: '',
      },
      rows: [],
      sheetNames: workbook.SheetNames,
    };
  }

  // Extract all unique headers across rows
  const headerSet = new Set<string>();
  rawRows.forEach((r) => {
    Object.keys(r).forEach((k) => headerSet.add(k));
  });
  const headers = Array.from(headerSet);

  const suggestedMapping = guessColumnMapping(headers);
  const rows = processRowsWithMapping(rawRows, suggestedMapping, settings);

  return {
    headers,
    suggestedMapping,
    rows,
    sheetNames: workbook.SheetNames,
  };
}

/**
 * Re-process rows when user alters mapping in UI
 */
export function processRowsWithMapping(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  settings: PrioritySettings = DEFAULT_PRIORITY_SETTINGS
): ParsedRow[] {
  return rawRows.map((raw, index) => {
    const errors: string[] = [];

    // Extract Order ID
    let rawOrderId = mapping.orderId ? String(raw[mapping.orderId] || '').trim() : '';
    if (!rawOrderId) {
      errors.push('Ordernummer saknas');
      rawOrderId = `AO-${Date.now().toString().slice(-4)}-${index + 1}`;
    }

    // Extract Product Title
    let rawTitle = mapping.title ? String(raw[mapping.title] || '').trim() : '';
    if (!rawTitle) {
      // If title is missing, try articleNumber or fallback
      rawTitle = mapping.articleNumber && raw[mapping.articleNumber]
        ? `Artikel ${raw[mapping.articleNumber]}`
        : 'Namnlös tillverkningsorder';
    }

    // Extract Article Number
    const rawArticle = mapping.articleNumber ? String(raw[mapping.articleNumber] || '').trim() : '';

    // Extract Quantity / Batch Size
    let rawQty = 1;
    if (mapping.batchSize && raw[mapping.batchSize] !== undefined) {
      const parsed = parseFloat(String(raw[mapping.batchSize]).replace(/,/g, '.').replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        rawQty = Math.round(parsed);
      }
    }

    // Extract Target Date
    const rawDateVal = mapping.targetDate ? raw[mapping.targetDate] : null;
    const targetDate = normalizeDate(rawDateVal);

    // Extract Customer
    const customer = mapping.customer && raw[mapping.customer]
      ? String(raw[mapping.customer]).trim()
      : 'ERP Tillverkning';

    // Extract Unit
    const unit = mapping.unit && raw[mapping.unit]
      ? String(raw[mapping.unit]).trim()
      : 'st';

    // Extract Drawing Number
    const drawingNumber = mapping.drawingNumber && raw[mapping.drawingNumber]
      ? String(raw[mapping.drawingNumber]).trim()
      : undefined;

    // Automatic priority calculation based on the planned delivery date
    const priority = calculatePriorityFromDate(targetDate, settings);

    return {
      rowIndex: index + 1,
      raw,
      orderId: rawOrderId,
      title: rawTitle,
      articleNumber: rawArticle,
      batchSize: rawQty,
      unit,
      targetDate,
      customer,
      drawingNumber,
      priority,
      isValid: errors.length === 0,
      errors,
    };
  });
}

/**
 * Generate sample ERP-system / Excel file for immediate testing and download
 */
export function downloadSampleERPExcel() {
  const sampleData = [
    {
      'Ordernr': 'AO-2026-201',
      'Artikelnamn': 'Ventilblock VB-80 Rostfritt',
      'Artikelnummer': 'ART-99401',
      'Antal': 60,
      'Planerat leveransdatum': new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days -> Akut!
      'Kund': 'Volvo CE',
      'Ritningsnummer': 'RIT-80-B',
      'Enhet': 'st',
    },
    {
      'Ordernr': 'AO-2026-202',
      'Artikelnamn': 'Lagringshylsa LH-120 Härdad',
      'Artikelnummer': 'ART-77112',
      'Antal': 120,
      'Planerat leveransdatum': new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days -> Hög!
      'Kund': 'Sandvik Machining',
      'Ritningsnummer': 'RIT-120-C',
      'Enhet': 'st',
    },
    {
      'Ordernr': 'AO-2026-203',
      'Artikelnamn': 'Konsolplatta KP-15 Pulverlack',
      'Artikelnummer': 'ART-33209',
      'Antal': 25,
      'Planerat leveransdatum': new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], // 14 days -> Normal
      'Kund': 'ABB Robotics',
      'Ritningsnummer': 'RIT-KP-1',
      'Enhet': 'st',
    },
    {
      'Ordernr': 'AO-2026-204',
      'Artikelnamn': 'Ställdonshus SH-400',
      'Artikelnummer': 'ART-55104',
      'Antal': 15,
      'Planerat leveransdatum': new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0], // 1 day -> Akut!
      'Kund': 'Scania Södertälje',
      'Ritningsnummer': 'RIT-SH-REV2',
      'Enhet': 'st',
    },
    {
      'Ordernr': 'AO-2026-205',
      'Artikelnamn': 'Tätfläns TF-65 Mässing',
      'Artikelnummer': 'ART-11002',
      'Antal': 200,
      'Planerat leveransdatum': new Date(Date.now() + 86400000 * 21).toISOString().split('T')[0], // 21 days -> Normal
      'Kund': 'Alfa Laval',
      'Ritningsnummer': 'RIT-TF-65',
      'Enhet': 'st',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ERP_Tillverkningsordrar');

  XLSX.writeFile(workbook, 'ERP_Tillverkningsordrar_Exempel.xlsx');
}

// Aliases for compatibility
export const downloadSampleMonitorExcel = downloadSampleERPExcel;
export const downloadSampleIFSExcel = downloadSampleERPExcel;

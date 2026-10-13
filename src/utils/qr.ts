import QRCode from 'qrcode';
import { ColumnConfig, ProductionOrder } from '../types';

export async function generateQRCodeDataUrl(
  text: string,
  options?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: options?.width || 256,
      margin: options?.margin ?? 1,
      color: {
        dark: options?.darkColor || '#000000',
        light: options?.lightColor || '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Creates a clean QR payload that binds BOTH the Order/Product AND a specific Station.
 * CRITICAL RULE: NEVER use '@' or email-like formatting because smartphone camera apps
 * and barcode scanners misinterpret '@' as an email address (mailto).
 *
 * For Web Link mode: Generates a complete direct URL that smartphone cameras open in the browser.
 * For Industrial Scanner mode: Generates "ORD:AO-2026-101:col-montering" (no @ sign).
 */
export function formatStationQRPayload(orderId: string, stationId: string, asUrl = false): string {
  const cleanOrder = orderId.trim();
  const cleanStation = stationId.trim();

  if (asUrl && typeof window !== 'undefined' && window.location?.origin) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?order=${encodeURIComponent(cleanOrder)}&station=${encodeURIComponent(cleanStation)}&auto=1`;
  }

  // Clean industrial code without '@'
  return `ORD:${cleanOrder}:${cleanStation}`;
}

/**
 * Formats a Master QR code for an order (not tied to a specific station).
 */
export function formatMasterQRPayload(orderId: string, asUrl = false): string {
  const cleanOrder = orderId.trim();

  if (asUrl && typeof window !== 'undefined' && window.location?.origin) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?order=${encodeURIComponent(cleanOrder)}&auto=1`;
  }

  return `ORD:${cleanOrder}`;
}

export interface DecodedScan {
  orderId: string;
  stationId?: string;
  autoAdvance?: boolean;
}

/**
 * Parses scanned text from QR or barcode.
 * Handles:
 * - "ORD:AO-2026-101:col-montering"
 * - "ORD/AO-2026-101/col-montering"
 * - "AO-2026-101:col-montering"
 * - "AO-2026-101#col-montering"
 * - "AO-2026-101/col-montering"
 * - URLs: "https://.../?order=AO-2026-101&station=col-montering&auto=1"
 * - Email format stripping: "mailto:AO-2026-101@col-montering", "AO-2026-101@col-montering"
 * - JSON: { "orderId": "AO-2026-101", "stationId": "col-montering" }
 * - Raw Order ID: "AO-2026-101"
 */
export function extractScanPayload(scannedText: string): DecodedScan {
  let trimmed = scannedText.trim();
  if (!trimmed) return { orderId: '' };

  // Remove URL encoding if present
  try {
    if (trimmed.includes('%')) {
      trimmed = decodeURIComponent(trimmed);
    }
  } catch {
    // ignore decoding errors
  }

  // CRITICAL: Strip "mailto:" if an external scanner or phone app added it
  if (trimmed.toLowerCase().startsWith('mailto:')) {
    trimmed = trimmed.replace(/^mailto:/i, '').trim();
    // remove any trailing query parameters like ?subject=...
    if (trimmed.includes('?')) {
      trimmed = trimmed.split('?')[0].trim();
    }
  }

  // 1. Check JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const orderId = String(parsed.orderId || parsed.id || '');
      const stationId = parsed.stationId || parsed.station ? String(parsed.stationId || parsed.station) : undefined;
      const autoAdvance = Boolean(parsed.auto || parsed.autoAdvance);
      if (orderId) return { orderId: orderId.trim(), stationId: stationId?.trim(), autoAdvance };
    } catch {
      // not json
    }
  }

  // 2. Check URL with query params
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const orderParam = url.searchParams.get('order') || url.searchParams.get('scan') || url.searchParams.get('id');
      const stationParam = url.searchParams.get('station') || url.searchParams.get('step');
      const autoParam = url.searchParams.get('auto') === '1' || url.searchParams.get('advance') === '1';
      if (orderParam) {
        return {
          orderId: orderParam.trim(),
          stationId: stationParam ? stationParam.trim() : undefined,
          autoAdvance: autoParam,
        };
      }
    }
  } catch {
    // not url
  }

  // 3. Check "ORD:orderId:stationId" or "PLANERING:orderId:stationId" or "POS:orderId:stationId"
  const prefixMatch = /^(ORD|PLANERING|POS)[:/](.+)$/i.exec(trimmed);
  if (prefixMatch) {
    const rest = prefixMatch[2];
    if (rest.includes(':')) {
      const [orderPart, stationPart] = rest.split(':');
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    } else if (rest.includes('/')) {
      const [orderPart, stationPart] = rest.split('/');
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    } else if (rest.includes('@')) {
      const [orderPart, stationPart] = rest.split('@');
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    } else {
      return { orderId: rest.trim(), autoAdvance: true };
    }
  }

  // 4. Check "@" legacy or email-interpreted format: "AO-2026-101@col-montering"
  if (trimmed.includes('@')) {
    const [orderPart, stationPart] = trimmed.split('@');
    if (orderPart.trim()) {
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    }
  }

  // 5. Check "#" or "/" format: "AO-2026-101#col-montering" or "AO-2026-101/col-montering"
  if (trimmed.includes('#')) {
    const [orderPart, stationPart] = trimmed.split('#');
    if (orderPart.trim()) {
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    }
  }

  if (trimmed.includes('/')) {
    const [orderPart, stationPart] = trimmed.split('/');
    if (orderPart.trim() && stationPart?.trim()) {
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    }
  }

  // 6. Check ":" format: "AO-2026-101:col-montering"
  if (trimmed.includes(':')) {
    const [orderPart, stationPart] = trimmed.split(':');
    if (orderPart.trim() && stationPart?.trim()) {
      return {
        orderId: orderPart.trim(),
        stationId: stationPart?.trim() || undefined,
        autoAdvance: true,
      };
    }
  }

  // 7. Fallback: single Order ID (e.g. "AO-2026-101")
  return { orderId: trimmed, autoAdvance: true };
}

/**
 * Flexible order lookup supporting:
 * - Direct case-insensitive match
 * - Code 39 barcode asterisks (*12345*)
 * - Prefixes (ORD-, SO-, AO-, IFS-)
 * - Excel leading zeroes discrepancy (004521 vs 4521)
 * - ERP sub-orders / release numbers (100452-1 vs 100452)
 * - Article number fallback
 */
export function findOrderFlexible(orders: ProductionOrder[], queryId: string): ProductionOrder | undefined {
  if (!queryId) return undefined;
  const q = queryId.trim();
  if (!q) return undefined;

  // 1. Direct exact match (case-insensitive)
  const exact = orders.find((o) => o.id.toLowerCase() === q.toLowerCase());
  if (exact) return exact;

  // 2. Strip surrounding asterisks (standard in Code 39 / scanner artifacts)
  const noStars = q.replace(/^\*+|\*+$/g, '');
  if (noStars && noStars !== q) {
    const starMatch = orders.find((o) => o.id.toLowerCase() === noStars.toLowerCase());
    if (starMatch) return starMatch;
  }

  const cleanCandidate = noStars || q;

  // 3. Strip common order prefixes: ORD-, SO-, PO-, AO-, IFS-, etc.
  const noPrefix = cleanCandidate.replace(/^(ORD|SO|PO|AO|IFS|MO)[:-]?/i, '').trim();
  if (noPrefix) {
    const prefixMatch = orders.find((o) => {
      const oNoPrefix = o.id.replace(/^(ORD|SO|PO|AO|IFS|MO)[:-]?/i, '').trim();
      return oNoPrefix.toLowerCase() === noPrefix.toLowerCase();
    });
    if (prefixMatch) return prefixMatch;
  }

  // 4. Excel leading zero mismatch (Excel drops leading zeros e.g. "004521" -> "4521")
  const noZeros = noPrefix.replace(/^0+/, '');
  if (noZeros) {
    const zeroMatch = orders.find((o) => {
      const oNoZeros = o.id.replace(/^(ORD|SO|PO|AO|IFS|MO)[:-]?/i, '').replace(/^0+/, '');
      return oNoZeros.toLowerCase() === noZeros.toLowerCase();
    });
    if (zeroMatch) return zeroMatch;
  }

  // 5. IFS Order + Release No: "P100452-1", "P100452/1", "P100452*", "100452-01" -> matches "P100452"
  if (cleanCandidate.includes('-') || cleanCandidate.includes('/') || cleanCandidate.includes('.') || cleanCandidate.endsWith('*')) {
    const basePart = cleanCandidate.replace(/\*+$/, '').split(/[-/.]/)[0].trim();
    if (basePart) {
      const baseMatch = orders.find((o) => o.id.toLowerCase() === basePart.toLowerCase());
      if (baseMatch) return baseMatch;
      // Also check with P prefix added if basePart was digits
      if (/^\d+$/.test(basePart)) {
        const pBaseMatch = orders.find((o) => o.id.toLowerCase() === `p${basePart.toLowerCase()}`);
        if (pBaseMatch) return pBaseMatch;
      }
    }
  }

  // 5b. Reverse IFS sub-order: user scans base "P37275" and order on board is "P37275-1-1" (or "37275-1-1")
  const subMatch = orders.find((o) => o.id.toLowerCase().startsWith(cleanCandidate.toLowerCase() + '-'));
  if (subMatch) return subMatch;

  // 5c. P-prefix bidirectional handling: e.g. "P123456" vs "123456"
  // If query is "123456" (only digits), check if an order exists as "P123456" or "P123456-..."
  if (/^\d+$/.test(cleanCandidate)) {
    const pMatch = orders.find(
      (o) =>
        o.id.toLowerCase() === `p${cleanCandidate.toLowerCase()}` ||
        o.id.toLowerCase().startsWith(`p${cleanCandidate.toLowerCase()}-`)
    );
    if (pMatch) return pMatch;
  }
  // If query starts with "P", check if an order exists without "P"
  if (/^p/i.test(cleanCandidate)) {
    const withoutP = cleanCandidate.slice(1);
    const noPMatch = orders.find(
      (o) =>
        o.id.toLowerCase() === withoutP.toLowerCase() ||
        o.id.toLowerCase().startsWith(withoutP.toLowerCase() + '-')
    );
    if (noPMatch) return noPMatch;
  }

  // 6. Check if scanned code matches Article Number or Drawing Number
  const artMatch = orders.find(
    (o) =>
      (o.articleNumber && o.articleNumber.toLowerCase() === cleanCandidate.toLowerCase()) ||
      (o.drawingNumber && o.drawingNumber.toLowerCase() === cleanCandidate.toLowerCase())
  );
  if (artMatch) return artMatch;

  return undefined;
}

/**
 * Backward-compatible helper to get just the order ID
 */
export function extractOrderIdFromScan(scannedText: string): string {
  return extractScanPayload(scannedText).orderId;
}

export interface DetermineNextColumnResult {
  nextColumn: ColumnConfig | null;
  isLastColumn: boolean;
  fromColumn: ColumnConfig | null;
  blocked?: boolean;
  blockReason?: 'skip_ahead' | 'go_back' | 'invalid_station';
  currentColumn?: ColumnConfig | null;
  scannedColumn?: ColumnConfig | null;
  message?: string;
}

/**
 * Helper to calculate the next column in sequence with a SPÄRR (guardrail).
 * 
 * Rules:
 * 1. If scannedStationId is provided:
 *    - The scanned station MUST match the order's CURRENT station (order completes current station and moves to next).
 *    - If scanned station is ahead (e.g. order is at Produktion, but scanned Test): BLOCKED (cannot skip steps)!
 *    - If scanned station is behind (e.g. order is at Produktion, but scanned Material): BLOCKED (cannot go backwards)!
 * 2. If scannedStationId is not provided (master QR code / order barcode):
 *    - Moves exactly 1 step forward from current station (no skipping, no going back).
 */
export function determineNextColumn(
  columns: ColumnConfig[],
  currentColumnId: string,
  scannedStationId?: string
): DetermineNextColumnResult {
  const currentIdx = columns.findIndex((c) => c.id === currentColumnId);
  const effectiveCurrentIdx = currentIdx >= 0 ? currentIdx : 0;
  const currentCol = columns[effectiveCurrentIdx] || columns[0] || null;

  // Case 1: Station-specific scan (e.g. ORD:P37275:col-test or ORD:P37275:col-produktion)
  if (scannedStationId && scannedStationId.trim()) {
    const cleanScannedStation = scannedStationId.trim().toLowerCase();
    const scannedCol = columns.find(
      (c) =>
        c.id.toLowerCase() === cleanScannedStation ||
        c.title.toLowerCase() === cleanScannedStation
    );

    if (!scannedCol) {
      // Scanned station does not exist in column configuration
      return {
        nextColumn: null,
        isLastColumn: false,
        fromColumn: currentCol,
        currentColumn: currentCol,
        blocked: true,
        blockReason: 'invalid_station',
        message: `Stationen "${scannedStationId}" hittades inte i kolumninställningarna.`,
      };
    }

    const scannedIdx = columns.findIndex((c) => c.id === scannedCol.id);

    // Guardrail 1: Trying to skip steps ahead (e.g. order is at Produktion, scanned Test)
    if (scannedIdx > effectiveCurrentIdx) {
      const nextExpected = columns[effectiveCurrentIdx + 1];
      return {
        nextColumn: null,
        isLastColumn: false,
        fromColumn: currentCol,
        currentColumn: currentCol,
        scannedColumn: scannedCol,
        blocked: true,
        blockReason: 'skip_ahead',
        message: `⛔ SPÄRR: Ordern befinner sig på station "${currentCol?.title || 'Okänd'}". Du skannade koden för "${scannedCol.title}". Det går inte att hoppa över steg! Skanna koden för "${currentCol?.title || 'nuvarande station'}" för att slutföra steget och gå vidare till "${nextExpected?.title || 'nästa station'}".`,
      };
    }

    // Guardrail 2: Trying to go backwards (e.g. order is at Produktion, scanned Material)
    if (scannedIdx < effectiveCurrentIdx) {
      return {
        nextColumn: null,
        isLastColumn: false,
        fromColumn: currentCol,
        currentColumn: currentCol,
        scannedColumn: scannedCol,
        blocked: true,
        blockReason: 'go_back',
        message: `⛔ SPÄRR: Ordern har redan passerat station "${scannedCol.title}" och befinner sig på "${currentCol?.title || 'nuvarande station'}". Det går inte att gå bakåt i flödet! Skanna koden för "${currentCol?.title || 'nuvarande station'}" för att gå vidare.`,
      };
    }

    // Scanned station matches the order's current station: order is completed here and advances 1 step!
    const isLast = effectiveCurrentIdx >= columns.length - 1;
    const nextCol = !isLast ? columns[effectiveCurrentIdx + 1] : null;

    return {
      nextColumn: nextCol,
      isLastColumn: isLast,
      fromColumn: currentCol,
      currentColumn: currentCol,
      scannedColumn: scannedCol,
      blocked: false,
    };
  }

  // Case 2: Master QR code / general scan without station (order barcode)
  // Advances exactly 1 step forward from current station (sequential)
  const isLast = effectiveCurrentIdx >= columns.length - 1;
  const nextCol = !isLast ? columns[effectiveCurrentIdx + 1] : null;

  return {
    nextColumn: nextCol,
    isLastColumn: isLast,
    fromColumn: currentCol,
    currentColumn: currentCol,
    blocked: false,
  };
}

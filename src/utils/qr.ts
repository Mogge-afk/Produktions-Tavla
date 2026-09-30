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
 * Backward-compatible helper to get just the order ID
 */
export function extractOrderIdFromScan(scannedText: string): string {
  return extractScanPayload(scannedText).orderId;
}

/**
 * Helper to calculate the next column in sequence.
 * If scannedStationId is given, moves to the column AFTER that station.
 * If only currentColumnId is given, moves to the column AFTER the current column.
 */
export function determineNextColumn(
  columns: ColumnConfig[],
  currentColumnId: string,
  scannedStationId?: string
): { nextColumn: ColumnConfig | null; isLastColumn: boolean; fromColumn: ColumnConfig | null } {
  // Determine reference station: prioritize the scanned station if valid, otherwise current column
  const refStationId = scannedStationId || currentColumnId;
  const refIndex = columns.findIndex((c) => c.id === refStationId);
  const fromCol = columns.find((c) => c.id === refStationId) || columns.find((c) => c.id === currentColumnId) || null;

  if (refIndex === -1) {
    // If reference station not found, fallback to order's current column index
    const currentIdx = columns.findIndex((c) => c.id === currentColumnId);
    if (currentIdx >= 0 && currentIdx < columns.length - 1) {
      return {
        nextColumn: columns[currentIdx + 1],
        isLastColumn: currentIdx + 1 === columns.length - 1,
        fromColumn: columns[currentIdx],
      };
    }
    return { nextColumn: null, isLastColumn: true, fromColumn: fromCol };
  }

  const isLast = refIndex >= columns.length - 1;
  const nextCol = !isLast ? columns[refIndex + 1] : null;

  return {
    nextColumn: nextCol,
    isLastColumn: isLast,
    fromColumn: fromCol,
  };
}

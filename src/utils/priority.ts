import { Priority, ProductionOrder } from '../types';

export interface PrioritySettings {
  autoPriorityEnabled: boolean;
  urgentDaysThreshold: number; // e.g. <= 2 days
  highDaysThreshold: number;   // e.g. <= 7 days
}

export const DEFAULT_PRIORITY_SETTINGS: PrioritySettings = {
  autoPriorityEnabled: true,
  urgentDaysThreshold: 2,
  highDaysThreshold: 7,
};

const SETTINGS_KEY = 'planeringstavla_priority_settings';

export function loadPrioritySettings(): PrioritySettings {
  if (typeof window === 'undefined') return DEFAULT_PRIORITY_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PRIORITY_SETTINGS;
    return { ...DEFAULT_PRIORITY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRIORITY_SETTINGS;
  }
}

export function savePrioritySettings(settings: PrioritySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save priority settings:', e);
  }
}

/**
 * Calculates number of full calendar days until due date.
 * Returns negative if past due date.
 */
export function getDaysUntil(dateString: string): number {
  if (!dateString) return 999;
  try {
    // Standardize date string
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return 999;

    const today = new Date();
    // Normalize to midnight UTC/local to compare full calendar days
    const dTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffMs = dTarget.getTime() - dToday.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export interface DueStatusInfo {
  daysLeft: number;
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  badgeColorClass: string;
}

export function getDueStatus(targetDateStr: string): DueStatusInfo {
  const daysLeft = getDaysUntil(targetDateStr);

  if (daysLeft < 0) {
    const daysPast = Math.abs(daysLeft);
    return {
      daysLeft,
      label: daysPast === 1 ? '1 dag försenad' : `${daysPast} dagar försenad`,
      isOverdue: true,
      isToday: false,
      isTomorrow: false,
      badgeColorClass: 'bg-rose-600 text-white font-bold animate-pulse',
    };
  }

  if (daysLeft === 0) {
    return {
      daysLeft: 0,
      label: 'Leverans idag',
      isOverdue: false,
      isToday: true,
      isTomorrow: false,
      badgeColorClass: 'bg-rose-500 text-white font-bold',
    };
  }

  if (daysLeft === 1) {
    return {
      daysLeft: 1,
      label: 'Leverans imorgon',
      isOverdue: false,
      isToday: false,
      isTomorrow: true,
      badgeColorClass: 'bg-orange-500 text-white font-bold',
    };
  }

  if (daysLeft <= 7) {
    return {
      daysLeft,
      label: `om ${daysLeft} dagar`,
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      badgeColorClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold',
    };
  }

  return {
    daysLeft,
    label: `om ${daysLeft} dagar`,
    isOverdue: false,
    isToday: false,
    isTomorrow: false,
    badgeColorClass: 'bg-neutral-100 text-neutral-700 border border-neutral-300 font-medium',
  };
}

/**
 * Automatically determine priority based on delivery date:
 * - <= urgentDaysThreshold: 'urgent' (Akut / Brådskande)
 * - <= highDaysThreshold: 'high' (Hög prioritet)
 * - > highDaysThreshold: 'normal'
 */
export function calculatePriorityFromDate(
  targetDateStr: string,
  settings: PrioritySettings = DEFAULT_PRIORITY_SETTINGS
): Priority {
  if (!targetDateStr) return 'normal';
  const daysLeft = getDaysUntil(targetDateStr);

  if (daysLeft <= settings.urgentDaysThreshold) {
    return 'urgent';
  } else if (daysLeft <= settings.highDaysThreshold) {
    return 'high';
  } else {
    return 'normal';
  }
}

/**
 * Recalculate priority for a batch of orders based on current settings
 */
export function refreshOrderPriorities(
  orders: ProductionOrder[],
  settings: PrioritySettings = DEFAULT_PRIORITY_SETTINGS
): { updatedOrders: ProductionOrder[]; changedCount: number } {
  if (!settings.autoPriorityEnabled) {
    return { updatedOrders: orders, changedCount: 0 };
  }

  let changedCount = 0;
  const updatedOrders = orders.map((order) => {
    // If order is completed (e.g. at delivery column), we don't necessarily need to force urgent
    const autoPrio = calculatePriorityFromDate(order.targetDate, settings);
    if (autoPrio !== order.priority) {
      changedCount++;
      return {
        ...order,
        priority: autoPrio,
        updatedAt: new Date().toISOString(),
      };
    }
    return order;
  });

  return { updatedOrders, changedCount };
}

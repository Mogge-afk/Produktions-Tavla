import { ColumnConfig, ProductionOrder } from '../types';

export function generatePrintableHTML(
  orders: ProductionOrder[],
  columns: ColumnConfig[],
  format: 'traveler' | 'station_stickers',
  qrMap: Record<string, string>,
  stationQrMap: Record<string, Record<string, string>>
): string {
  const currentDate = new Date().toLocaleDateString('sv-SE');

  const ordersHTML = orders
    .map((order, orderIdx) => {
      const orderTotal = order.batchSize || 1;
      const isLast = orderIdx === orders.length - 1;
      const pageBreakStyle = isLast ? '' : 'page-break-after: always; break-after: page;';

      if (format === 'station_stickers') {
        const stickersHTML = columns
          .map((col) => {
            const qr = stationQrMap[order.id]?.[col.id] || qrMap[order.id] || '';
            return `
              <div style="border: 2px solid #000; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; background: #fff;">
                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #555; letter-spacing: 1px;">STATIONS-ETIKETT</div>
                <div style="font-size: 14px; font-weight: 900; margin: 4px 0 6px 0; color: #000;">${col.title}</div>
                ${qr ? `<img src="${qr}" style="width: 110px; height: 110px; margin: 0 auto; display: block; border: 1px solid #ccc; padding: 2px;" alt="QR" />` : ''}
                <div style="font-family: monospace; font-size: 13px; font-weight: 900; margin-top: 6px;">${order.id}</div>
                <div style="font-size: 11px; font-weight: bold; color: #222; margin-top: 2px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;">${order.title}</div>
                <div style="font-size: 10px; color: #555;">Antal: ${orderTotal} ${order.unit}</div>
              </div>
            `;
          })
          .join('');

        return `
          <div style="${pageBreakStyle} margin-bottom: 20px;">
            <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #555;">PRODUKTIONS-ETIKETTER</span>
              <h2 style="font-size: 18px; margin: 2px 0; font-weight: 900;">${order.id} — ${order.title}</h2>
              <div style="font-size: 11px; color: #444;">Artikel: ${order.articleNumber || '-'} | Kund: ${order.customer || '-'} | Order: ${orderTotal} ${order.unit}</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              ${stickersHTML}
            </div>
          </div>
        `;
      }

      // Format: A4 Traveler / Följesedel
      const routingRows = columns
        .map((col, idx) => {
          const qr = stationQrMap[order.id]?.[col.id] || '';
          const currentProgress = order.stationProgress?.[col.id] || 0;
          const report = order.reports?.find((r) => r.stationId === col.id);
          const operatorName = report?.operator || '';
          const reportQty = currentProgress > 0 ? `${currentProgress} / ${orderTotal} ${order.unit}` : '';

          return `
            <tr style="height: 60px;">
              <td style="border: 1px solid #000; text-align: center; font-weight: bold; font-family: monospace; font-size: 13px; width: 40px;">
                ${idx + 1}
              </td>
              <td style="border: 1px solid #000; padding: 8px;">
                <div style="font-weight: 900; font-size: 13px; color: #000;">${col.title}</div>
                <div style="font-size: 9px; color: #555; font-family: monospace;">${order.id} : ${col.title}</div>
              </td>
              <td style="border: 1px solid #000; text-align: center; padding: 4px; width: 85px; vertical-align: middle;">
                ${
                  qr
                    ? `<img src="${qr}" style="width: 48px; height: 48px; display: block; margin: 0 auto;" alt="QR" /><div style="font-size: 7px; font-family: monospace; font-weight: 800; color: #111; line-height: 1.1; margin-top: 2px;">➔ ${columns[idx + 1] ? columns[idx + 1].title : 'KLAR'}</div>`
                    : `<div style="width: 48px; height: 48px; border: 1px dashed #ccc; margin: 0 auto;"></div>`
                }
              </td>
              <td style="border: 1px solid #000; padding: 8px; font-size: 12px; width: 130px;">
                ${operatorName}
              </td>
              <td style="border: 1px solid #000; padding: 8px; font-size: 12px; font-family: monospace; font-weight: bold; width: 110px;">
                ${reportQty}
              </td>
              <td style="border: 1px solid #000; padding: 8px; width: 110px;"></td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="page-container" style="${pageBreakStyle} max-width: 800px; margin: 0 auto; padding: 24px; background: #fff; border: 2px solid #000; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 14px;">
            <div>
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #444; display: block;">
                TILLVERKNINGSORDER & FÖLJESEDEL
              </span>
              <h1 style="font-size: 22px; font-weight: 900; margin: 3px 0 6px 0; text-transform: uppercase; letter-spacing: -0.5px; color: #000;">
                ${order.title}
              </h1>
              <div style="font-size: 12px; color: #222; display: flex; flex-wrap: wrap; gap: 12px; font-weight: 500;">
                <span>Ordernr: <strong style="font-family: monospace; font-size: 13px;">${order.id}</strong></span>
                <span>Artikelnr: <strong style="font-family: monospace; font-size: 13px;">${order.articleNumber || '-'}</strong></span>
                <span>Kund: <strong>${order.customer || '-'}</strong></span>
                ${order.drawingNumber ? `<span>Ritning: <strong style="font-family: monospace;">${order.drawingNumber}</strong></span>` : ''}
              </div>
            </div>

            <div style="text-align: center; margin-left: 16px; shrink: 0;">
              ${
                qrMap[order.id]
                  ? `<img src="${qrMap[order.id]}" style="width: 75px; height: 75px; border: 1px solid #999; padding: 2px; display: block; margin: 0 auto;" alt="QR" />`
                  : ''
              }
              <div style="font-family: monospace; font-size: 11px; font-weight: 900; margin-top: 2px;">${order.id}</div>
            </div>
          </div>

          <!-- Specs Summary Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; font-size: 11px;">
            <div style="border: 1px solid #aaa; padding: 6px 8px; border-radius: 4px; background: #fafafa;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #666; display: block;">Orderantal</span>
              <span style="font-family: monospace; font-size: 14px; font-weight: 900; color: #000;">${orderTotal} ${order.unit}</span>
            </div>
            <div style="border: 1px solid #aaa; padding: 6px 8px; border-radius: 4px; background: #fafafa;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #666; display: block;">Prioritet</span>
              <span style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #000;">${order.priority}</span>
            </div>
            <div style="border: 1px solid #aaa; padding: 6px 8px; border-radius: 4px; background: #fafafa;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #666; display: block;">Leveransmål</span>
              <span style="font-family: monospace; font-size: 13px; font-weight: bold; color: #000;">${order.targetDate || '-'}</span>
            </div>
            <div style="border: 1px solid #aaa; padding: 6px 8px; border-radius: 4px; background: #fafafa;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: #666; display: block;">Utskriven</span>
              <span style="font-family: monospace; font-size: 12px; color: #444;">${currentDate}</span>
            </div>
          </div>

          <!-- Stationsflöde & QR Table -->
          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">STATIONSFLÖDE & INRAPPORTERINGS-QR</span>
              <span style="font-size: 9px; color: #666; font-style: italic;">Skanna stationens QR ➔ Flyttar automatiskt ordern till nästa position (Montering ➔ Test osv.)</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px;">
              <thead>
                <tr style="background: #e5e5e5;">
                  <th style="border: 1px solid #000; padding: 6px; font-weight: 900; text-align: center; width: 40px;">Fas</th>
                  <th style="border: 1px solid #000; padding: 6px; font-weight: 900; text-align: left;">Stationsnamn</th>
                  <th style="border: 1px solid #000; padding: 6px; font-weight: 900; text-align: center; width: 85px;">QR ➔ Flytt</th>
                  <th style="border: 1px solid #000; padding: 6px; font-weight: 900; text-align: left; width: 130px;">Operatör (Namn)</th>
                  <th style="border: 1px solid #000; padding: 6px; font-weight: 900; text-align: left; width: 110px;">Antal / Totalt</th>
                  <th style="border: 1px solid #000; padding: 6px; font-weight: 900; text-align: left; width: 110px;">Datum / Sign</th>
                </tr>
              </thead>
              <tbody>
                ${routingRows}
              </tbody>
            </table>
          </div>

          <!-- Bottom Operator Instructions -->
          <div style="border: 1px solid #000; border-radius: 4px; padding: 8px 10px; font-size: 10px; background: #fafafa; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #000; display: block;">Instruktion för operatör vid arbetsstation:</strong>
              <span style="color: #444;">Rikta skannern mot stationens QR-kod. Ordern flyttas automatiskt vidare till nästa fas på tavlan (t.ex. Montering ➔ Test). Koden tolkas direkt som stationsflytt utan e-post.</span>
            </div>
            <div style="font-family: monospace; font-size: 9px; color: #777; margin-left: 12px; white-space: nowrap;">
              PROD-QR v2
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>Följesedlar — Planeringstavla</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    body {
      margin: 0;
      padding: 15px;
      background-color: #f3f4f6;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .print-bar {
      position: sticky;
      top: 0;
      background: #111827;
      color: #fff;
      padding: 12px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: #10b981;
      color: #fff;
      border: none;
      padding: 10px 20px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover {
      background: #059669;
    }
    @media print {
      body {
        background: #fff !important;
        padding: 0 !important;
      }
      .print-bar {
        display: none !important;
      }
      .page-container {
        border: 2px solid #000 !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 15px !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong style="font-size: 15px;">Följesedlar & QR-etiketter redo för utskrift</strong>
      <div style="font-size: 12px; color: #9ca3af;">Klicka på knappen nedan eller tryck Ctrl+P / Cmd+P för att skriva ut eller spara som PDF.</div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Skriv ut nu / Spara som PDF</button>
  </div>
  ${ordersHTML}
</body>
</html>
  `.trim();
}

/**
 * Downloads a standalone, self-contained printable HTML document that can be opened in any browser
 * and printed instantly without sandbox restrictions.
 */
export function downloadPrintableFile(
  orders: ProductionOrder[],
  columns: ColumnConfig[],
  format: 'traveler' | 'station_stickers',
  qrMap: Record<string, string>,
  stationQrMap: Record<string, Record<string, string>>
) {
  const htmlContent = generatePrintableHTML(orders, columns, format, qrMap, stationQrMap);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  const fileName = orders.length === 1 
    ? `Foljesedel_${orders[0].id}.html` 
    : `Foljesedlar_${orders.length}_ordrar_${new Date().toISOString().split('T')[0]}.html`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Tries printing via a hidden iframe inside the current document.
 * Returns true if successful, or false if blocked by browser sandbox.
 */
export function triggerHiddenIframePrint(
  orders: ProductionOrder[],
  columns: ColumnConfig[],
  format: 'traveler' | 'station_stickers',
  qrMap: Record<string, string>,
  stationQrMap: Record<string, Record<string, string>>
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generatePrintableHTML(orders, columns, format, qrMap, stationQrMap);
      
      // Remove any previously created print iframes
      const oldFrame = document.getElementById('production-print-iframe');
      if (oldFrame) oldFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'production-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        resolve(false);
        return;
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.warn('Iframe print blocked:', e);
          resolve(false);
        }
      }, 400);
    } catch (e) {
      console.warn('Iframe setup error:', e);
      resolve(false);
    }
  });
}

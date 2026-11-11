// Comprehensive Export & Print Utilities for Pharmacy ERP

/**
 * Escapes values for standard CSV output
 */
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  if (str.search(/("|,|\n|\r)/g) >= 0 || str.includes("Rs.")) {
    return `"${str}"`;
  }
  return `"${str}"`;
};

/**
 * Exports tabular data as a clean, Excel-compatible UTF-8 CSV file
 * @param {Array<string>} headers - Column header names
 * @param {Array<Array<any>>} rows - 2D array of row values
 * @param {string} filename - Desired file name
 */
export const exportToCSV = (headers, rows, filename = "Export.csv") => {
  if (!headers || !rows) return;

  const headerLine = headers.map(escapeCSV).join(",");
  const rowLines = rows.map((row) => row.map(escapeCSV).join(","));
  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n"); // UTF-8 BOM for Excel support

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports tabular data as a rich formatted Excel XML/HTML Workbook (.xls)
 * @param {string} title - Report title
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<any>>} rows - 2D array of data
 * @param {string} filename - Output file name
 * @param {object} metadata - Extra meta info like Branch, Date, Total
 */
export const exportToExcel = (title, headers, rows, filename = "Report.xls", metadata = {}) => {
  if (!headers || !rows) return;

  const metaRows = Object.entries(metadata)
    .filter(([_, val]) => val !== undefined && val !== null && val !== "")
    .map(([key, val]) => `<tr><td style="font-weight:bold;color:#1e293b;padding:4px 8px;border:1px solid #cbd5e1;background-color:#f1f5f9;">${key}</td><td colspan="${Math.max(1, headers.length - 1)}" style="padding:4px 8px;border:1px solid #cbd5e1;">${val}</td></tr>`)
    .join("");

  const headerHtml = headers
    .map((h) => `<th style="background-color:#0f172a;color:#ffffff;font-weight:bold;padding:9px 12px;border:1px solid #000000;text-align:left;font-size:12px;">${h}</th>`)
    .join("");

  const bodyHtml = rows
    .map((r, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = r
        .map((c) => `<td style="padding:7px 10px;border:1px solid #cbd5e1;background-color:${bg};font-size:11px;color:#000000;">${c ?? ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const cleanFilename = filename.endsWith(".xls") || filename.endsWith(".xlsx") ? filename : `${filename}.xls`;

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; margin: 20px; }
          table { border-collapse: collapse; width: 100%; border: 1.5px solid #000000; }
          .title { font-size: 16px; font-weight: 900; color: #000000; padding: 12px 6px; text-transform: uppercase; }
          .timestamp { color: #475569; font-size: 11px; font-weight: 500; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${headers.length}" class="title">PHARMACARE ERP • ${title}</td></tr>
          <tr><td colspan="${headers.length}" class="timestamp">Exported on: ${new Date().toLocaleString()}</td></tr>
          ${metaRows ? `<tr><td colspan="${headers.length}"></td></tr>${metaRows}` : ""}
          <tr><td colspan="${headers.length}"></td></tr>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Direct Instant Print Handler for isolated reports, invoices, or thermal receipts
 * @param {string} contentHtml - HTML string to print
 * @param {string} mode - "thermal" (80mm) | "a4" | "report"
 * @param {string} docTitle - Document Title
 */
export const printDocumentContent = (contentHtml, mode = "a4", docTitle = "Print Document") => {
  const printWindow = window.open("", "_blank", "width=850,height=750");
  if (!printWindow) {
    window.print();
    return;
  }

  const isThermal = mode === "thermal";

  const styles = `
    @page {
      margin: ${isThermal ? "0" : "8mm 10mm"};
      size: ${isThermal ? "80mm auto" : "A4 portrait"};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${isThermal ? "'Courier New', Courier, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"};
      font-size: ${isThermal ? "11px" : "11px"};
      color: #000000;
      background: #ffffff;
      padding: ${isThermal ? "2mm 3mm" : "6mm 8mm"};
      width: ${isThermal ? "80mm" : "100%"};
      max-width: ${isThermal ? "80mm" : "100%"};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      margin: 8px 0;
    }
    th, td {
      padding: ${isThermal ? "3px 3px" : "6px 8px"};
      text-align: left;
      border: 1px solid #000000;
      font-size: ${isThermal ? "11px" : "10.5px"};
      color: #000000;
    }
    th {
      font-weight: 900;
      background-color: #f8fafc;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: monospace; }
    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    @media print {
      *, *::before, *::after {
        color: #000000 !important;
        background-color: #ffffff !important;
        border-color: #000000 !important;
        filter: grayscale(100%) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print { display: none !important; }
    }
  `;

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTitle}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Saves or renders any custom HTML element as a clean, ready-to-save PDF document
 * @param {string} contentHtml - HTML content
 * @param {string} docTitle - Document title (shown in browser/dialog)
 * @param {string} filename - Desired PDF file name
 */
export const saveDocumentAsPDF = (contentHtml, docTitle = "Document", filename = "Document.pdf") => {
  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const pdfWindow = window.open("", "_blank", "width=900,height=800");

  if (!pdfWindow) {
    window.print();
    return;
  }

  const styles = `
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      color: #000000;
      background: #ffffff;
      padding: 10mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      margin: 10px 0;
    }
    th, td {
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #000000;
      font-size: 10.5px;
      color: #000000;
    }
    th {
      font-weight: 900;
      background-color: #f1f5f9;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: monospace; }
    @media print {
      body { padding: 0 !important; }
      .no-print { display: none !important; }
      *, *::before, *::after {
        color: #000000 !important;
        background-color: #ffffff !important;
        border-color: #000000 !important;
        filter: grayscale(100%) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  pdfWindow.document.open();
  pdfWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${cleanFilename.replace(".pdf", "")}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="no-print" style="position:fixed;top:10px;right:15px;background:#0f172a;color:#ffffff;padding:8px 14px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;gap:10px;z-index:99999;font-family:sans-serif;font-size:12px;">
          <span style="font-weight:600;">PDF Mode: Select "Save as PDF"</span>
          <button onclick="window.print()" style="background:#2563eb;color:#ffffff;border:none;padding:5px 12px;border-radius:4px;font-weight:bold;cursor:pointer;">Save as PDF</button>
          <button onclick="window.close()" style="background:#475569;color:#ffffff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Close</button>
        </div>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.focus();
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  pdfWindow.document.close();
};

/**
 * Generates an official, clean tabular PDF document from headers and rows
 * @param {string} title - Document title
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<any>>} rows - 2D array of rows
 * @param {string} filename - Output filename
 * @param {object} metadata - Extra details like Date, Branch, Total
 * @param {object} branch - Branch info (name, address, phone)
 */
export const exportTableToPDF = (title, headers, rows, filename = "Report.pdf", metadata = {}, branch = {}) => {
  if (!headers || !rows) return;

  const branchName = branch?.name || "Downtown Branch";
  const branchCode = branch?.code ? `(${branch.code})` : "";
  const branchAddress = branch?.address || "102 Main Street, City Center";
  const branchPhone = branch?.phone || "+92 300 1234567";
  const printedAt = new Date().toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const metaHtml = Object.entries(metadata)
    .filter(([_, val]) => val !== undefined && val !== null && val !== "")
    .map(([k, v]) => `<div><span style="font-weight:bold;color:#475569;">${k}: </span><span>${v}</span></div>`)
    .join("");

  const theadHtml = headers
    .map((h) => `<th style="border:1px solid #000;padding:6px 8px;font-size:10px;text-align:left;background:#f8fafc;font-weight:900;">${h}</th>`)
    .join("");

  const tbodyHtml = rows
    .map((r, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#fbfcfd";
      const cells = r
        .map((c) => `<td style="border:1px solid #000;padding:5px 8px;font-size:10px;background:${bg};">${c ?? ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const contentHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#000;">
      <!-- Top Official Branch Header -->
      <div style="border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="font-size:15px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;margin:0;">PHARMACARE PHARMACY</h1>
          <div style="font-size:11px;font-weight:bold;margin-top:2px;">Branch: ${branchName} ${branchCode}</div>
          <div style="font-size:10px;margin-top:2px;">Address: ${branchAddress} | Contact: ${branchPhone}</div>
        </div>
        <div style="text-align:right;font-size:10.5px;font-weight:bold;font-family:monospace;">
          <div>Generated: ${printedAt}</div>
          <div>Total Rows: ${rows.length}</div>
        </div>
      </div>

      <!-- Document Title Strip -->
      <div style="border-bottom:1.5px solid #000;padding-bottom:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:12px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;">${title}</div>
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;">OFFICIAL RECORD • SYSTEM EXPORT</div>
      </div>

      <!-- Metadata Strip (if any) -->
      ${metaHtml ? `<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:10.5px;margin-bottom:8px;padding:4px 0;border-bottom:1px dashed #cbd5e1;">${metaHtml}</div>` : ""}

      <!-- Table -->
      <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;margin-top:4px;">
        <thead><tr>${theadHtml}</tr></thead>
        <tbody>${tbodyHtml}</tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top:16px;padding-top:6px;border-top:1px solid #000;display:flex;justify-content:space-between;font-size:9.5px;color:#334155;font-weight:600;">
        <span>PharmaCare ERP System • Confidential Document</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;

  saveDocumentAsPDF(contentHtml, title, filename);
};

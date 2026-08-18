const MAX_ROWS = 200;
const MAX_COLUMNS = 50;
const MAX_CELL_LENGTH = 4000;
const MAX_PASTE_CHARS = 500_000;
const MAX_UNORGANISED_ITEMS = 50;

/**
 * Parse Excel/Sheets clipboard TSV into headers + data rows.
 * First row is always treated as the header row.
 *
 * @param {string} raw
 * @returns {{ headers: string[], rows: string[][], error?: string }}
 */
function parseExcelPaste(raw) {
  if (typeof raw !== "string") {
    return { headers: [], rows: [], error: "Nothing to load." };
  }

  if (raw.length > MAX_PASTE_CHARS) {
    return {
      headers: [],
      rows: [],
      error: "Paste is too large. Copy fewer rows and try again.",
    };
  }

  const table = parseTsv(raw);
  const trimmed = trimTable(table);

  if (trimmed.length === 0) {
    return { headers: [], rows: [], error: "Nothing to load." };
  }

  if (trimmed.length > MAX_ROWS) {
    return {
      headers: [],
      rows: [],
      error: `Too many rows (max ${MAX_ROWS}). Copy a smaller range.`,
    };
  }

  const width = trimmed.reduce((max, row) => Math.max(max, row.length), 0);
  if (width > MAX_COLUMNS) {
    return {
      headers: [],
      rows: [],
      error: `Too many columns (max ${MAX_COLUMNS}). Copy a smaller range.`,
    };
  }

  const normalized = trimmed.map((row) => {
    const cells = row.slice(0, width).map(sanitizeCell);
    while (cells.length < width) {
      cells.push("");
    }
    return cells;
  });

  const headers = uniqueHeaders(normalized[0]);
  const rows = normalized.slice(1);

  if (rows.length === 0) {
    return {
      headers,
      rows: [],
      error: "Paste at least one data row under the header row.",
    };
  }

  return { headers, rows };
}

/**
 * Parse a header-only Excel/Sheets row. Uses tabs when present, otherwise commas.
 *
 * @param {string} raw
 * @returns {{ headers: string[], error?: string }}
 */
function parseHeaderRow(raw) {
  if (typeof raw !== "string") {
    return { headers: [], error: "Nothing to load." };
  }

  if (raw.length > MAX_PASTE_CHARS) {
    return { headers: [], error: "Paste is too large. Copy fewer columns and try again." };
  }

  const delimiter = raw.includes("\t") ? "\t" : ",";
  const table = parseDelimited(raw, delimiter);
  const trimmed = trimTable(table);

  if (trimmed.length === 0) {
    return { headers: [], error: "Nothing to load." };
  }

  const first = trimmed[0].map(sanitizeCell);
  if (first.length > MAX_COLUMNS) {
    return { headers: [], error: `Too many columns (max ${MAX_COLUMNS}). Copy a smaller range.` };
  }

  const headers = uniqueHeaders(first);
  if (headers.length === 0) {
    return { headers: [], error: "Paste a header row first." };
  }

  return { headers };
}

/**
 * Encode cells as a single Excel-pasteable TSV row.
 *
 * @param {string[]} cells
 * @returns {string}
 */
function toExcelRow(cells) {
  return (Array.isArray(cells) ? cells : []).map(escapeTsvCell).join("\t");
}

function escapeTsvCell(value) {
  const text = String(value ?? "");
  if (/[\t\n\r"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseTsv(raw) {
  return parseDelimited(raw, "\t");
}

function parseDelimited(raw, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function trimTable(table) {
  let rows = table.map((row) => row.map((cell) => String(cell ?? "")));

  while (rows.length > 0 && isEmptyRow(rows[0])) {
    rows.shift();
  }
  while (rows.length > 0 && isEmptyRow(rows[rows.length - 1])) {
    rows.pop();
  }

  if (rows.length === 0) {
    return [];
  }

  let startCol = 0;
  let endCol = rows.reduce((max, row) => Math.max(max, row.length), 0) - 1;

  while (startCol <= endCol && isEmptyColumn(rows, startCol)) {
    startCol += 1;
  }
  while (endCol >= startCol && isEmptyColumn(rows, endCol)) {
    endCol -= 1;
  }

  if (startCol > endCol) {
    return [];
  }

  return rows.map((row) => row.slice(startCol, endCol + 1));
}

function isEmptyRow(row) {
  return row.every((cell) => cell.trim() === "");
}

function isEmptyColumn(rows, index) {
  return rows.every((row) => String(row[index] ?? "").trim() === "");
}

function sanitizeCell(value) {
  const text = String(value ?? "")
    .replace(/\u0000/g, "")
    .slice(0, MAX_CELL_LENGTH);
  return text.trim();
}

function uniqueHeaders(headers) {
  const seen = new Map();
  return headers.map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

/**
 * Split selected page text into a label and value when a pattern is present.
 *
 * @param {string} raw
 * @returns {{ label: string, value: string }}
 */
function parseLabeledSelection(raw) {
  const text = sanitizeCell(raw);
  if (!text) {
    return { label: "", value: "" };
  }

  if (text.includes("\t")) {
    const parts = text.split("\t");
    const label = sanitizeCell(parts[0]);
    const value = sanitizeCell(parts.slice(1).join("\t"));
    if (isUsableLabel(label) && value) {
      return { label: cleanDetectedLabel(label), value };
    }
  }

  const lines = text.split(/\n+/).map(sanitizeCell).filter(Boolean);
  if (lines.length === 2 && isUsableLabel(lines[0])) {
    return { label: cleanDetectedLabel(lines[0]), value: lines[1] };
  }

  const colon = text.match(/^(.{1,80}?)\s*[:：]\s*([\s\S]+)$/);
  if (colon && isUsableLabel(colon[1]) && sanitizeCell(colon[2])) {
    return { label: cleanDetectedLabel(colon[1]), value: sanitizeCell(colon[2]) };
  }

  const dash = text.match(/^(.{1,80}?)\s+[–—-]\s+([\s\S]+)$/);
  if (dash && isUsableLabel(dash[1]) && sanitizeCell(dash[2])) {
    return { label: cleanDetectedLabel(dash[1]), value: sanitizeCell(dash[2]) };
  }

  return { label: "", value: text };
}

/**
 * Prefer a label parsed from the selection; otherwise use a nearby form label.
 * If both exist, strip the label text off the start of the value.
 *
 * @param {{ label: string, value: string }} parsed
 * @param {string} [domLabel]
 * @returns {{ label: string, value: string }}
 */
function mergeLabelAndValue(parsed, domLabel) {
  const original = sanitizeCell(parsed?.value);
  const fromText = String(parsed?.label ?? "");
  if (fromText) {
    const stripped = stripLeadingLabel(original, fromText);
    return { label: fromText, value: stripped || original };
  }

  const nearby = cleanDetectedLabel(domLabel);
  if (nearby && nearby.toLowerCase() !== original.toLowerCase()) {
    return { label: nearby, value: original };
  }

  return { label: "", value: original };
}

function cleanDetectedLabel(label) {
  return sanitizeCell(label)
    .replace(/\s*[:：*＊]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function stripLeadingLabel(value, label) {
  const cleanValue = sanitizeCell(value);
  const cleanLabel = cleanDetectedLabel(label);
  if (!cleanLabel || !cleanValue) {
    return cleanValue;
  }
  const escaped = cleanLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = cleanValue.replace(new RegExp(`^${escaped}\\s*[:：\\-–—*＊]*\\s*`, "i"), "");
  return sanitizeCell(stripped) || cleanValue;
}

function isUsableLabel(label) {
  const text = sanitizeCell(label);
  if (!text || text.includes("\n") || text.length > 80) {
    return false;
  }
  if (/:\/\//.test(text) || /^https?$/i.test(text)) {
    return false;
  }
  return true;
}

function nextUnfilledFields(headers, row, count = 3) {
  const names = Array.isArray(headers) ? headers : [];
  const cells = Array.isArray(row) ? row : [];
  const limit = Math.max(0, count);
  let lastFilled = -1;
  for (let index = 0; index < names.length; index += 1) {
    if (String(cells[index] ?? "").trim()) {
      lastFilled = index;
    }
  }
  const start = lastFilled + 1;
  const afterLast = names.slice(start, start + limit).map((header, offset) => ({
    index: start + offset,
    header: String(header ?? ""),
  }));
  if (afterLast.length) {
    return afterLast;
  }
  const empties = [];
  for (let index = 0; index < names.length && empties.length < limit; index += 1) {
    if (!String(cells[index] ?? "").trim()) {
      empties.push({ index, header: String(names[index] ?? "") });
    }
  }
  return empties;
}

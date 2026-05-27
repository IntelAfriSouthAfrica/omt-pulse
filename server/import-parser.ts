import * as XLSX from "xlsx";
import type { FormField, Category, Location, InsertIncident } from "@shared/schema";

export type ColumnMapEntry = {
  fieldKey: string | null;
  type: "system" | "custom" | "skip";
};

export type CategoryResolution = {
  action: "link" | "create" | "other";
  categoryId?: number;
};

export type LocationResolution = {
  action: "link" | "create" | "freetext";
  locationId?: number;
};

export type DateFormat = "dmy" | "mdy" | "ymd";

export type ImportMapping = {
  columnMap: Record<string, ColumnMapEntry>;
  categoryResolutions: Record<string, CategoryResolution>;
  locationResolutions: Record<string, LocationResolution>;
  dateFormat?: DateFormat;
};

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
};

export type RowError = { rowNumber: number; errors: string[] };

const SYSTEM_FIELD_KEYS = new Set([
  "incidentDate",
  "incidentTime",
  "categoryId",
  "location",
  "description",
]);

const SYSTEM_FIELD_LABELS: Record<string, string[]> = {
  incidentDate: ["incident date", "date", "occurrence date", "incidentdate", "datum"],
  incidentTime: ["incident time", "time", "occurrence time", "incidenttime", "tyd"],
  categoryId: ["type", "category", "incident type", "occurrence type", "categoryid", "tipe"],
  location: ["location", "place", "site", "ligging", "plek"],
  description: ["description", "details", "notes", "summary", "beskrywing"],
};

function normaliseHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseFile(buffer: Buffer, filename: string): ParsedFile {
  const isCSV = filename.toLowerCase().endsWith(".csv");
  // For CSV: keep cell values as the raw source strings — do NOT let SheetJS reinterpret
  // dates like "03/14/2026" as Date objects (which it then reformats to "3/14/26",
  // losing the 4-digit year and breaking explicit-format parsing).
  // For XLSX: read raw native cell types and let sheet_to_json format them as text strings.
  const wb = XLSX.read(buffer, { type: "buffer", raw: isCSV, cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File contains no sheets");
  const sheet = wb.Sheets[sheetName];
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: isCSV, blankrows: false });
  if (aoa.length === 0) throw new Error("File is empty");

  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? "").trim()).filter((h) => h.length > 0);
  if (headers.length === 0) throw new Error("File has no headers");

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const raw = aoa[i] as unknown[];
    const row: Record<string, string> = {};
    let hasAny = false;
    for (let j = 0; j < headers.length; j++) {
      const v = raw[j];
      const s = v == null ? "" : String(v).trim();
      row[headers[j]] = s;
      if (s.length > 0) hasAny = true;
    }
    if (hasAny) rows.push(row);
  }

  return { headers, rows, totalRows: rows.length };
}

export function suggestMapping(headers: string[], formFields: FormField[]): Record<string, ColumnMapEntry> {
  const result: Record<string, ColumnMapEntry> = {};
  const customFields = formFields.filter((f) => !f.isSystem);

  for (const header of headers) {
    const norm = normaliseHeader(header);
    let found: ColumnMapEntry = { fieldKey: null, type: "skip" };

    // Try system fields
    for (const [key, labels] of Object.entries(SYSTEM_FIELD_LABELS)) {
      if (labels.some((l) => normaliseHeader(l) === norm)) {
        found = { fieldKey: key, type: "system" };
        break;
      }
    }

    // Try custom fields by label match
    if (found.type === "skip") {
      const cf = customFields.find((f) => normaliseHeader(f.label) === norm);
      if (cf) found = { fieldKey: cf.fieldKey, type: "custom" };
    }

    result[header] = found;
  }
  return result;
}

function parseDate(input: string, format: DateFormat = "dmy"): string | null {
  if (!input) return null;
  const s = input.trim();
  // YYYY-MM-DD or YYYY/MM/DD (always unambiguous)
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const y = m[1], mo = m[2].padStart(2, "0"), d = m[3].padStart(2, "0");
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31) return `${y}-${mo}-${d}`;
    return null;
  }
  // Two-part-then-year date: interpret based on the chosen format hint.
  // - When one part is unambiguous (>12) we override the hint accordingly.
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const y = m[3];
    let day: number, mo: number;
    if (a > 12 && b <= 12) { day = a; mo = b; }
    else if (b > 12 && a <= 12) { mo = a; day = b; }
    else if (format === "mdy") { mo = a; day = b; }
    else if (format === "ymd") { return null; } // YMD with a 2-part-first input is invalid
    else { day = a; mo = b; } // dmy default
    if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 25000 && n < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + n * 86400000);
      const y = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${mo}-${day}`;
    }
  }
  // ISO datetime (only if it looks like an ISO timestamp, to avoid silent locale guessing)
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${y}-${mo}-${day}`;
    }
  }
  return null;
}

function parseTime(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // HH:mm or HH:mm:ss
  let m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const h = parseInt(m[1]), mi = parseInt(m[2]);
    if (h >= 0 && h < 24 && mi >= 0 && mi < 60) {
      return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    }
  }
  // H:mm AM/PM
  m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)$/);
  if (m) {
    let h = parseInt(m[1]); const mi = parseInt(m[2]);
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h >= 0 && h < 24 && mi >= 0 && mi < 60) {
      return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    }
  }
  // Excel time serial (fraction of day)
  if (/^0?\.\d+$/.test(s)) {
    const n = Number(s);
    const totalMin = Math.round(n * 24 * 60);
    const h = Math.floor(totalMin / 60), mi = totalMin % 60;
    if (h >= 0 && h < 24) return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  }
  return null;
}

export type ResolvedRow = {
  rowNumber: number;
  data: Omit<InsertIncident, "organizationId">;
  errors: string[];
  originalRow: Record<string, string>;
  unknownCategoryName?: string;
  unknownLocationName?: string;
};

export function resolveRows(
  parsed: ParsedFile,
  mapping: ImportMapping,
  formFields: FormField[],
  categories: Category[],
  locations: Location[],
  otherCategoryId: number | null,
): ResolvedRow[] {
  const customFieldKeys = new Set(formFields.filter((f) => !f.isSystem).map((f) => f.fieldKey));
  const requiredFields = formFields.filter((f) => f.isRequired);

  const catByLowerName = new Map<string, Category>();
  for (const c of categories) catByLowerName.set(c.name.toLowerCase().trim(), c);
  const locByLowerName = new Map<string, Location>();
  for (const l of locations) locByLowerName.set(l.name.toLowerCase().trim(), l);

  const result: ResolvedRow[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNumber = i + 2; // header is row 1
    const errors: string[] = [];
    const data: Omit<InsertIncident, "organizationId"> = {
      incidentDate: "",
      incidentTime: "",
      locationId: null,
      locationName: null,
      latitude: null,
      longitude: null,
      customMapId: null,
      customMapX: null,
      customMapY: null,
      categoryId: null,
      otherCategoryNote: null,
      description: null,
      customFields: {},
    };
    let unknownCategoryName: string | undefined;
    let unknownLocationName: string | undefined;
    const customData: Record<string, string | number | null> = {};

    for (const [header, value] of Object.entries(row)) {
      const map = mapping.columnMap[header];
      if (!map || map.type === "skip" || !map.fieldKey) continue;

      if (map.type === "system") {
        switch (map.fieldKey) {
          case "incidentDate": {
            const d = parseDate(value, mapping.dateFormat ?? "dmy");
            if (!d) {
              if (value) errors.push(`"${header}": "${value}" is not a recognised date`);
            } else data.incidentDate = d;
            break;
          }
          case "incidentTime": {
            const t = parseTime(value);
            if (!t) {
              if (value) errors.push(`"${header}": "${value}" is not a recognised time`);
            } else data.incidentTime = t;
            break;
          }
          case "categoryId": {
            if (!value) break;
            const cat = catByLowerName.get(value.toLowerCase().trim());
            if (cat) {
              data.categoryId = cat.id;
            } else {
              const res = mapping.categoryResolutions[value.toLowerCase().trim()];
              if (res?.action === "link" && res.categoryId) {
                // Defence-in-depth: only accept the link if the categoryId belongs to this org's known set
                const owned = categories.find((c) => c.id === res.categoryId);
                if (owned) data.categoryId = owned.id;
                else unknownCategoryName = value.trim();
              } else if (res?.action === "other") {
                if (otherCategoryId) {
                  data.categoryId = otherCategoryId;
                  data.otherCategoryNote = value;
                } else {
                  errors.push(`"${header}": "Other" category not configured for this organisation`);
                }
              } else if (res?.action === "create") {
                // Will be created in commit phase; mark for later assignment
                unknownCategoryName = value.trim();
              } else {
                unknownCategoryName = value.trim();
              }
            }
            break;
          }
          case "location": {
            if (!value) break;
            const loc = locByLowerName.get(value.toLowerCase().trim());
            if (loc) {
              data.locationId = loc.id;
              data.locationName = loc.name;
              data.latitude = loc.latitude;
              data.longitude = loc.longitude;
            } else {
              const res = mapping.locationResolutions[value.toLowerCase().trim()];
              if (res?.action === "link" && res.locationId) {
                // Defence-in-depth: only accept the link if the locationId is in this org's known set
                const linked = locations.find((l) => l.id === res.locationId);
                if (linked) {
                  data.locationId = linked.id;
                  data.locationName = linked.name;
                  data.latitude = linked.latitude;
                  data.longitude = linked.longitude;
                } else {
                  unknownLocationName = value.trim();
                }
              } else if (res?.action === "freetext") {
                data.locationName = value.trim();
              } else if (res?.action === "create") {
                unknownLocationName = value.trim();
              } else {
                unknownLocationName = value.trim();
              }
            }
            break;
          }
          case "description":
            data.description = value || null;
            break;
        }
      } else if (map.type === "custom" && customFieldKeys.has(map.fieldKey)) {
        customData[map.fieldKey] = value || null;
      }
    }

    data.customFields = customData;

    // Required-field checks
    for (const f of requiredFields) {
      if (f.fieldKey === "incidentDate" && !data.incidentDate) errors.push(`"Incident Date" is required`);
      else if (f.fieldKey === "incidentTime" && !data.incidentTime) errors.push(`"Incident Time" is required`);
      else if (f.fieldKey === "categoryId" && data.categoryId == null && !unknownCategoryName) errors.push(`"Type" is required`);
      else if (f.fieldKey === "location" && data.locationId == null && !data.locationName && !unknownLocationName) errors.push(`"Location" is required`);
      else if (f.fieldKey === "description" && !data.description) errors.push(`"Description" is required`);
      else if (!f.isSystem && !customData[f.fieldKey]) errors.push(`"${f.label}" is required`);
    }

    result.push({ rowNumber, data, errors, originalRow: row, unknownCategoryName, unknownLocationName });
  }

  return result;
}

export function collectUnknownReferences(rows: Record<string, string>[], mapping: Pick<ImportMapping, "columnMap">, categories: Category[], locations: Location[]): { categoryNames: string[]; locationNames: string[] } {
  const catByLowerName = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]));
  const locByLowerName = new Map(locations.map((l) => [l.name.toLowerCase().trim(), l]));

  const unknownCats = new Set<string>();
  const unknownLocs = new Set<string>();

  let catCol: string | null = null;
  let locCol: string | null = null;
  for (const [header, m] of Object.entries(mapping.columnMap)) {
    if (m.type === "system" && m.fieldKey === "categoryId") catCol = header;
    if (m.type === "system" && m.fieldKey === "location") locCol = header;
  }

  for (const row of rows) {
    if (catCol) {
      const v = (row[catCol] || "").trim();
      if (v && !catByLowerName.has(v.toLowerCase())) unknownCats.add(v);
    }
    if (locCol) {
      const v = (row[locCol] || "").trim();
      if (v && !locByLowerName.has(v.toLowerCase())) unknownLocs.add(v);
    }
  }

  return { categoryNames: Array.from(unknownCats).sort(), locationNames: Array.from(unknownLocs).sort() };
}

function escapeCSV(value: string): string {
  // CSV-formula-injection mitigation: prefix any cell that begins with a character Excel
  // treats as a formula trigger with a single quote so it is rendered as plain text.
  let v = value;
  if (v.length > 0 && /^[=+\-@\t\r]/.test(v)) {
    v = "'" + v;
  }
  if (v.includes('"') || v.includes(",") || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function buildErrorsCSV(
  headers: string[],
  errorRows: Array<{ rowNumber: number; errors: string[]; originalRow?: Record<string, string> }>,
): string {
  const csvHeaders = ["Row", ...headers, "Errors"];
  const lines: string[] = [csvHeaders.map(escapeCSV).join(",")];
  for (const r of errorRows) {
    const row = r.originalRow ?? {};
    const cells = [
      String(r.rowNumber),
      ...headers.map((h) => row[h] ?? ""),
      r.errors.join("; "),
    ];
    lines.push(cells.map(escapeCSV).join(","));
  }
  // Prepend UTF-8 BOM so Excel opens with correct encoding
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

export function buildTemplateXLSX(formFields: FormField[]): Buffer {
  const visibleFields = formFields.filter((f) => f.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  const headers: string[] = [];
  const example: string[] = [];
  for (const f of visibleFields) {
    if (f.fieldKey === "categoryId") {
      headers.push("Type");
      example.push("Theft");
      continue;
    }
    if (f.fieldKey === "location") {
      headers.push("Location");
      example.push("Main Office");
      continue;
    }
    headers.push(f.label);
    if (f.fieldType === "date") example.push("2026-01-15");
    else if (f.fieldType === "time") example.push("14:30");
    else if (f.fieldType === "textarea") example.push("Description of what happened");
    else example.push("Sample value");
  }

  const aoa = [headers, example];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Occurrences");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

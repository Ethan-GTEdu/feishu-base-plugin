/**
 * 数据导出服务
 * 将选中记录的指定字段值导出为 文本 / CSV / JSON 格式
 */

export type ExportFormat = "text" | "csv" | "json";

export interface ExportOptions {
  /** 字段名列表（有序） */
  fieldNames: string[];
  /** 每行数据：fieldName → cellString */
  rows: Record<string, string>[];
  /** 导出格式 */
  format: ExportFormat;
}

/**
 * 根据格式生成导出内容
 */
export function generateExportContent(options: ExportOptions): string {
  const { fieldNames, rows, format } = options;

  switch (format) {
    case "text":
      return generateText(fieldNames, rows);
    case "csv":
      return generateCsv(fieldNames, rows);
    case "json":
      return generateJson(fieldNames, rows);
    default:
      return "";
  }
}

/** 纯文本格式：每条记录用分隔线隔开 */
function generateText(
  fieldNames: string[],
  rows: Record<string, string>[],
): string {
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) lines.push("---");
    const row = rows[i];
    for (const name of fieldNames) {
      lines.push(`${name}: ${row[name] ?? ""}`);
    }
  }
  return lines.join("\n");
}

/** CSV 格式：RFC 4180 兼容 */
function generateCsv(
  fieldNames: string[],
  rows: Record<string, string>[],
): string {
  const escapeCsv = (val: string): string => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines: string[] = [];
  // 表头
  lines.push(fieldNames.map(escapeCsv).join(","));
  // 数据行
  for (const row of rows) {
    const cells = fieldNames.map((name) => escapeCsv(row[name] ?? ""));
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

/** JSON 格式：数组对象 */
function generateJson(
  fieldNames: string[],
  rows: Record<string, string>[],
): string {
  const data = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const name of fieldNames) {
      obj[name] = row[name] ?? "";
    }
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

/**
 * 打印流执行引擎
 * 对每条选中记录，按步骤收集打印链接 URL
 */
import { bitable, ITable } from "@lark-base-open/js-sdk";
import type { PrintFlow, PrintStep, CurrentTableStep, LinkedTableStep } from "./print-flow";

/** 执行整个打印流，返回收集到的所有 URL */
export async function executePrintFlow(
  flow: PrintFlow,
  recordIds: string[],
): Promise<string[]> {
  const table = await bitable.base.getActiveTable();
  const allUrls: string[] = [];

  for (const recordId of recordIds) {
    for (const step of flow.steps) {
      const urls = await executeStep(step, recordId, table);
      allUrls.push(...urls);
    }
  }

  return allUrls.filter(Boolean);
}

async function executeStep(
  step: PrintStep,
  recordId: string,
  table: ITable,
): Promise<string[]> {
  switch (step.type) {
    case "current":
      return executeCurrent(step, recordId, table);
    case "linked":
      return executeLinked(step, recordId, table);
    default:
      return [];
  }
}

/** 从当前表读取打印链接 */
async function executeCurrent(
  step: CurrentTableStep,
  recordId: string,
  table: ITable,
): Promise<string[]> {
  try {
    const field = await table.getFieldByName(step.printFieldName);
    const value = await table.getCellString(field.id, recordId);
    return value ? [value] : [];
  } catch (e) {
    console.warn(`[executor:current] 读取字段"${step.printFieldName}"失败:`, e);
    return [];
  }
}

/** 从关联表读取打印链接 */
async function executeLinked(
  step: LinkedTableStep,
  recordId: string,
  table: ITable,
): Promise<string[]> {
  try {
    // 1. 获取关联字段的值（包含关联记录 ID）
    const linkField = await table.getFieldByName(step.linkFieldName);
    const cellValue = await table.getCellValue(linkField.id, recordId);

    if (!cellValue) return [];

    // 关联字段值格式: { recordIds: string[], tableId: string } 或 IOpenLink[]
    let linkedRecordIds: string[] = [];
    if (Array.isArray(cellValue)) {
      // DuplexLink / SingleLink 返回数组格式
      linkedRecordIds = (cellValue as Array<{ record_id?: string; text?: string }>).map((item) =>
        item.record_id || ""
      ).filter(Boolean);
    } else if (typeof cellValue === "object" && "recordIds" in (cellValue as object)) {
      linkedRecordIds = (cellValue as { recordIds: string[] }).recordIds || [];
    }

    if (!linkedRecordIds.length) return [];

    // 2. 获取目标表
    const targetTable = await bitable.base.getTable(step.targetTableName);
    const printField = await targetTable.getFieldByName(step.printFieldName);

    // 3. 逐条读取打印链接
    const urls: string[] = [];
    for (const rid of linkedRecordIds) {
      try {
        const value = await targetTable.getCellString(printField.id, rid);
        if (value) urls.push(value);
      } catch {
        // 跳过无法读取的记录
      }
    }
    return urls;
  } catch (e) {
    console.warn(`[executor:linked] 执行失败:`, e);
    return [];
  }
}

/**
 * 打印流数据模型与存储（支持 localStorage 持久化）
 */

/** 从当前表选中记录取打印链接 */
export interface CurrentTableStep {
  type: "current";
  printFieldName: string; // 打印链接字段名
}

/** 从关联表取打印链接 */
export interface LinkedTableStep {
  type: "linked";
  linkFieldName: string;      // 当前表中的关联字段名
  targetTableName: string;    // 目标表名
  printFieldName: string;     // 目标表中的打印链接字段名
}

export type PrintStep = CurrentTableStep | LinkedTableStep;

/** 打印流方案 */
export interface PrintFlow {
  id: string;
  name: string;
  steps: PrintStep[];
}

const STORAGE_KEY = "feishu-print-flows";

/** 所有打印流方案 */
let flows: PrintFlow[] = [];

export function getFlows(): PrintFlow[] {
  return flows;
}

export function getFlowById(id: string): PrintFlow | undefined {
  return flows.find((f) => f.id === id);
}

export function setFlows(newFlows: PrintFlow[]) {
  flows = newFlows;
  saveFlows();
}

/** 从 localStorage 加载，如果没有则用默认值 */
export function loadFlows(defaults: PrintFlow[]): PrintFlow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PrintFlow[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        flows = parsed;
        return flows;
      }
    }
  } catch {
    // 解析失败，使用默认值
  }
  flows = defaults;
  return flows;
}

/** 持久化到 localStorage */
function saveFlows() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
  } catch {
    // 存储失败静默处理
  }
}

/** 生成简单唯一 ID */
export function generateFlowId(): string {
  return `flow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

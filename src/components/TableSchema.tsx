/**
 * 表结构摘要组件
 * 选择表格和视图后，一键生成 Markdown 格式的字段结构摘要
 */
import { useState, useEffect, useCallback } from "react";
import { Button, Select, Toast, Spin, TextArea } from "@douyinfe/semi-ui";
import {
  bitable,
  FieldType,
  type ITable,
  type IFieldMeta,
  type ISingleSelectField,
  type IMultiSelectField,
  type IRatingField,
  type ICurrencyField,
} from "@lark-base-open/js-sdk";

interface TableOption {
  label: string;
  value: string;
}

interface ViewOption {
  label: string;
  value: string;
}

// FieldType 枚举值 → 可读名称（完整对照 FieldType$1）
const FIELD_TYPE_NAMES: Record<number, string> = {
  [FieldType.NotSupport]: "不支持",
  [FieldType.Text]: "文本",
  [FieldType.Number]: "数字",
  [FieldType.SingleSelect]: "单选",
  [FieldType.MultiSelect]: "多选",
  [FieldType.DateTime]: "日期",
  [FieldType.Checkbox]: "复选框",
  [FieldType.User]: "人员",
  [FieldType.Phone]: "电话",
  [FieldType.Url]: "超链接",
  [FieldType.Attachment]: "附件",
  [FieldType.SingleLink]: "单向关联",
  [FieldType.Lookup]: "查找引用",
  [FieldType.Formula]: "公式",
  [FieldType.DuplexLink]: "双向关联",
  [FieldType.Location]: "地理位置",
  [FieldType.GroupChat]: "群组",
  [FieldType.Object]: "对象", 
  [FieldType.Denied]: "无权限",
  [FieldType.CreatedTime]: "创建时间",
  [FieldType.ModifiedTime]: "修改时间",
  [FieldType.CreatedUser]: "创建人",
  [FieldType.ModifiedUser]: "修改人",
  [FieldType.AutoNumber]: "自动编号",
  [FieldType.Barcode]: "条码",
  [FieldType.Progress]: "进度",
  [FieldType.Currency]: "货币",
  [FieldType.Rating]: "评分",
  [FieldType.Email]: "邮箱",
};

function getFieldTypeName(type: number): string {
  return FIELD_TYPE_NAMES[type] || `未知(${type})`;
}

export default function TableSchema() {
  const [tables, setTables] = useState<TableOption[]>([]);
  const [views, setViews] = useState<ViewOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedViewId, setSelectedViewId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [markdown, setMarkdown] = useState<string>("");

  // 初始化：获取所有表格列表，默认选中当前活跃表格和视图
  useEffect(() => {
    (async () => {
      try {
        const tableList = await bitable.base.getTableList();
        const tableOptions: TableOption[] = [];
        for (const t of tableList) {
          const name = await t.getName();
          tableOptions.push({ label: name, value: t.id });
        }
        setTables(tableOptions);

        // 默认选中当前活跃表格
        const selection = await bitable.base.getSelection();
        if (selection.tableId) {
          setSelectedTableId(selection.tableId);
        } else if (tableOptions.length > 0) {
          setSelectedTableId(tableOptions[0].value);
        }

        // 加载视图列表
        if (selection.tableId) {
          const activeTable = await bitable.base.getTable(selection.tableId);
          await loadViews(activeTable, selection.viewId || undefined);
        }
      } catch (e) {
        console.error("初始化失败:", e);
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  // 加载指定表格的视图列表
  const loadViews = async (table: ITable, defaultViewId?: string) => {
    const viewMetaList = await table.getViewMetaList();
    const viewOptions: ViewOption[] = viewMetaList.map((v) => ({
      label: v.name,
      value: v.id,
    }));
    setViews(viewOptions);

    if (defaultViewId && viewOptions.find((v) => v.value === defaultViewId)) {
      setSelectedViewId(defaultViewId);
    } else if (viewOptions.length > 0) {
      setSelectedViewId(viewOptions[0].value);
    }
  };

  // 切换表格时重新加载视图
  const handleTableChange = useCallback(async (tableId: string) => {
    setSelectedTableId(tableId);
    setSelectedViewId("");
    setViews([]);
    setMarkdown("");
    try {
      const table = await bitable.base.getTable(tableId);
      await loadViews(table);
    } catch (e) {
      console.error("加载视图失败:", e);
    }
  }, []);

  // 生成表结构 Markdown
  const handleGenerate = useCallback(async () => {
    if (!selectedTableId || !selectedViewId) {
      Toast.warning("请先选择表格和视图");
      return;
    }

    setLoading(true);
    setMarkdown("");

    try {
      const table = await bitable.base.getTable(selectedTableId);
      const view = await table.getViewById(selectedViewId);
      const fieldMetaList: IFieldMeta[] = await view.getFieldMetaList();

      const tableName =
        tables.find((t) => t.value === selectedTableId)?.label ||
        selectedTableId;
      const viewName =
        views.find((v) => v.value === selectedViewId)?.label || selectedViewId;

      let md = `# 表结构：${tableName}\n\n`;
      md += `> 视图：${viewName}  \n`;
      md += `> 字段数量：${fieldMetaList.length}\n\n`;
      md += `| # | 字段名 | 类型 | 描述 | 值范围/说明 |\n`;
      md += `|---|--------|------|------|-------------|\n`;

      for (let i = 0; i < fieldMetaList.length; i++) {
        const meta = fieldMetaList[i];
        const typeName = getFieldTypeName(meta.type);
        let valueRange = "-";

        try {
          valueRange = await getFieldValueRange(table, meta);
        } catch (e) {
          valueRange = "(获取失败)";
        }

        // 提取字段描述
        const description = getFieldDescription(meta);

        // 转义 Markdown 表格中的管道符和换行
        const escapedName = meta.name.replace(/\|/g, "\\|");
        const escapedDesc = description.replace(/\|/g, "\\|").replace(/\n/g, " ");
        const escapedRange = valueRange.replace(/\|/g, "\\|");

        md += `| ${i + 1} | ${escapedName} | ${typeName} | ${escapedDesc} | ${escapedRange} |\n`;
      }

      setMarkdown(md);
    } catch (e) {
      console.error("生成表结构失败:", e);
      Toast.error("生成表结构失败: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedTableId, selectedViewId, tables, views]);

  // 复制到剪贴板
  const handleCopy = useCallback(() => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown).then(
      () => Toast.success("已复制到剪贴板"),
      () => Toast.error("复制失败，请手动选择复制"),
    );
  }, [markdown]);

  if (initLoading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className="table-schema">
      {/* 表格选择 */}
      <div className="table-schema-row">
        <label>数据表</label>
        <Select
          style={{ width: "100%" }}
          value={selectedTableId}
          onChange={(v) => handleTableChange(v as string)}
          optionList={tables}
          placeholder="选择数据表"
        />
      </div>

      {/* 视图选择 */}
      <div className="table-schema-row">
        <label>视图</label>
        <Select
          style={{ width: "100%" }}
          value={selectedViewId}
          onChange={(v) => setSelectedViewId(v as string)}
          optionList={views}
          placeholder="选择视图"
        />
      </div>

      {/* 生成按钮 */}
      <div className="table-schema-row">
        <Button
          theme="solid"
          onClick={handleGenerate}
          loading={loading}
          style={{ width: "100%" }}
        >
          获取表格结构
        </Button>
      </div>

      {/* 输出区域 */}
      {markdown && (
        <div className="table-schema-output">
          <div className="table-schema-output-header">
            <span style={{ fontSize: 12, color: "#666" }}>Markdown 输出</span>
            <Button size="small" onClick={handleCopy}>
              📋 复制
            </Button>
          </div>
          <TextArea
            value={markdown}
            autosize={{ minRows: 6, maxRows: 20 }}
            readonly
            style={{ fontFamily: "monospace", fontSize: 12 }}
          />
          {/* Markdown 预览 */}
          <div className="table-schema-preview">
            <div className="table-schema-preview-header">
              <span style={{ fontSize: 12, color: "#666" }}>预览</span>
            </div>
            <div
              className="table-schema-preview-content"
              dangerouslySetInnerHTML={{
                __html: renderMarkdownTable(markdown),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 提取字段描述文本
 */
function getFieldDescription(meta: IFieldMeta): string {
  const content = meta.description?.content;
  if (!content || content.length === 0) return "-";
  return content.map((seg) => seg.text || "").join("");
}

/**
 * 获取字段的值范围描述
 */
async function getFieldValueRange(
  table: ITable,
  meta: IFieldMeta,
): Promise<string> {
  switch (meta.type) {
    case FieldType.SingleSelect: {
      const field = await table.getField<ISingleSelectField>(meta.id);
      const options = await field.getOptions();
      if (options.length === 0) return "（无选项）";
      return options.map((o) => `\`${o.name}\``).join(", ");
    }
    case FieldType.MultiSelect: {
      const field = await table.getField<IMultiSelectField>(meta.id);
      const options = await field.getOptions();
      if (options.length === 0) return "（无选项）";
      return options.map((o) => `\`${o.name}\``).join(", ");
    }
    case FieldType.Checkbox:
      return "`true` / `false`";
    case FieldType.Rating: {
      const field = await table.getField<IRatingField>(meta.id);
      const min = await field.getMin();
      const max = await field.getMax();
      return `${min} ~ ${max}`;
    }
    case FieldType.Currency: {
      const field = await table.getField<ICurrencyField>(meta.id);
      const code = await field.getCurrencyCode();
      return `货币: ${code}`;
    }
    case FieldType.CreatedTime:
    case FieldType.ModifiedTime:
      return "只读，时间戳";
    case FieldType.CreatedUser:
    case FieldType.ModifiedUser:
      return "只读，用户信息";
    case FieldType.AutoNumber:
      return "只读，自动编号";
    case FieldType.Formula:
      return "公式计算值";
    case FieldType.Lookup:
      return "查找引用值";
    case FieldType.Text:
      return "自由文本";
    case FieldType.Number:
      return "数值";
    case FieldType.DateTime:
      return "日期时间";
    case FieldType.Phone:
      return "电话号码";
    case FieldType.Url:
      return "URL 链接";
    case FieldType.Attachment:
      return "文件附件";
    case FieldType.User:
      return "人员列表";
    case FieldType.SingleLink:
    case FieldType.DuplexLink:
      return "关联记录";
    case FieldType.Location:
      return "地理位置";
    default:
      // Progress (99002)
      if (meta.type === 99002) return "0 ~ 1 (百分比)";
      // Email (99005)
      if (meta.type === 99005) return "邮箱地址";
      // Barcode (99001)
      if (meta.type === 99001) return "条码文本";
      return "-";
  }
}

/**
 * 简易 Markdown 表格渲染为 HTML（仅处理表格和标题）
 */
function renderMarkdownTable(md: string): string {
  const lines = md.split("\n");
  let html = "";

  for (const line of lines) {
    if (line.startsWith("# ")) {
      html += `<h3 style="margin:0 0 8px;font-size:14px;">${escapeHtml(line.slice(2))}</h3>`;
    } else if (line.startsWith("> ")) {
      html += `<p style="margin:2px 0;font-size:12px;color:#666;">${escapeHtml(line.slice(2))}</p>`;
    } else if (line.startsWith("|") && !line.startsWith("|---")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (!html.includes("<table")) {
        html += `<table class="schema-table"><thead><tr>${cells.map((c) => `<th>${renderInlineCode(escapeHtml(c))}</th>`).join("")}</tr></thead><tbody>`;
      } else {
        html += `<tr>${cells.map((c) => `<td>${renderInlineCode(escapeHtml(c))}</td>`).join("")}</tr>`;
      }
    }
  }

  if (html.includes("<table")) {
    html += "</tbody></table>";
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineCode(str: string): string {
  return str.replace(
    /`([^`]+)`/g,
    '<code style="background:#f5f5f5;padding:1px 4px;border-radius:3px;font-size:11px;">$1</code>',
  );
}

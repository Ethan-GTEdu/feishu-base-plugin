/**
 * 数据导出组件
 * 获取当前视图选中记录，选择字段，导出为 文本/CSV/JSON
 */
import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Checkbox,
  Select,
  Toast,
  Spin,
  TextArea,
  Empty,
  RadioGroup,
  Radio,
  Tag,
} from "@douyinfe/semi-ui";
import {
  bitable,
  type IFieldMeta,
  type IGridView,
  type IRecord,
} from "@lark-base-open/js-sdk";
import {
  generateExportContent,
  type ExportFormat,
} from "../lib/export-service";

interface FieldOption {
  meta: IFieldMeta;
  checked: boolean;
}

export default function DataExport() {
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("text");
  const [output, setOutput] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [initLoading, setInitLoading] = useState(true);

  // 初始化：加载当前视图的字段列表
  useEffect(() => {
    (async () => {
      try {
        const table = await bitable.base.getActiveTable();
        const view = (await table.getActiveView()) as IGridView;
        const metas = await view.getFieldMetaList();
        setFieldOptions(metas.map((m) => ({ meta: m, checked: true })));
      } catch (e) {
        console.error("加载字段列表失败:", e);
        Toast.error("加载字段列表失败");
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setFieldOptions((prev) => prev.map((f) => ({ ...f, checked })));
    },
    [],
  );

  // 切换单个字段
  const handleToggleField = useCallback((fieldId: string) => {
    setFieldOptions((prev) =>
      prev.map((f) =>
        f.meta.id === fieldId ? { ...f, checked: !f.checked } : f,
      ),
    );
  }, []);

  // 执行导出
  const handleExport = useCallback(async () => {
    const selectedFields = fieldOptions.filter((f) => f.checked);
    if (selectedFields.length === 0) {
      Toast.warning("请至少选择一个字段");
      return;
    }

    setExporting(true);
    setOutput("");

    try {
      const table = await bitable.base.getActiveTable();
      const view = (await table.getActiveView()) as IGridView;
      const recordIds = await view.getSelectedRecordIdList();

      if (!recordIds.length) {
        Toast.warning("未选中任何记录，请先在表格中选中行");
        return;
      }

      setSelectedCount(recordIds.length);

      // 用 getRecordsByPage + stringValue:true 批量拉取整个视图数据
      // 然后在内存中筛选选中的 recordId，避免逐 cell 查询
      const selectedSet = new Set(recordIds);
      const fieldNames = selectedFields.map((f) => f.meta.name);
      const fieldIdToName = new Map(
        selectedFields.map((f) => [f.meta.id, f.meta.name]),
      );

      const matchedRecords: IRecord[] = [];
      let hasMore = true;
      let pageToken: number | undefined;

      while (hasMore) {
        const res = await table.getRecordsByPage({
          pageSize: 200,
          pageToken,
          viewId: view.id,
          stringValue: true,
        });
        for (const record of res.records) {
          if (selectedSet.has(record.recordId)) {
            matchedRecords.push(record);
          }
        }
        // 如果已经找齐所有选中记录，提前退出
        if (matchedRecords.length >= recordIds.length) {
          hasMore = false;
        } else {
          hasMore = res.hasMore;
          pageToken = res.pageToken;
        }
      }

      // 按选中顺序排列，转换为行格式
      const recordMap = new Map(
        matchedRecords.map((r) => [r.recordId, r]),
      );
      const rows: Record<string, string>[] = recordIds
        .map((id) => recordMap.get(id))
        .filter(Boolean)
        .map((record) => {
          const row: Record<string, string> = {};
          for (const [fieldId, value] of Object.entries(record!.fields)) {
            const name = fieldIdToName.get(fieldId);
            if (name) {
              // stringValue:true 时值已经是字符串
              row[name] = (value as unknown as string) ?? "";
            }
          }
          // 确保所有选中字段都有值（即使为空）
          for (const name of fieldNames) {
            if (!(name in row)) row[name] = "";
          }
          return row;
        });

      // 生成导出内容
      const content = generateExportContent({
        fieldNames,
        rows,
        format,
      });

      setOutput(content);
      Toast.success(`已导出 ${recordIds.length} 条记录`);
    } catch (e) {
      console.error("导出失败:", e);
      Toast.error("导出失败: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }, [fieldOptions, format]);

  // 复制到剪贴板
  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => Toast.success("已复制到剪贴板"),
      () => Toast.error("复制失败，请手动选择复制"),
    );
  }, [output]);

  // 下载文件
  const handleDownload = useCallback(() => {
    if (!output) return;
    const ext = format === "json" ? "json" : format === "csv" ? "csv" : "txt";
    const mime =
      format === "json"
        ? "application/json"
        : format === "csv"
          ? "text/csv"
          : "text/plain";
    const blob = new Blob([output], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success("文件已下载");
  }, [output, format]);

  if (initLoading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  const checkedCount = fieldOptions.filter((f) => f.checked).length;
  const allChecked = checkedCount === fieldOptions.length;
  const indeterminate = checkedCount > 0 && checkedCount < fieldOptions.length;

  return (
    <div className="data-export">
      {/* 导出格式 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
          导出格式
        </div>
        <RadioGroup
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          direction="horizontal"
        >
          <Radio value="text">文本</Radio>
          <Radio value="csv">CSV</Radio>
          <Radio value="json">JSON</Radio>
        </RadioGroup>
      </div>

      {/* 字段选择 */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 12, color: "#666" }}>
            选择导出字段
            <Tag size="small" style={{ marginLeft: 6 }}>
              {checkedCount}/{fieldOptions.length}
            </Tag>
          </span>
          <Checkbox
            checked={allChecked}
            indeterminate={indeterminate}
            onChange={(e) => handleSelectAll(!!e.target.checked)}
          >
            全选
          </Checkbox>
        </div>
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "4px 8px",
          }}
        >
          {fieldOptions.map((f) => (
            <div
              key={f.meta.id}
              style={{
                padding: "4px 0",
                borderBottom: "1px solid #f5f5f5",
              }}
            >
              <Checkbox
                checked={f.checked}
                onChange={() => handleToggleField(f.meta.id)}
              >
                <span style={{ fontSize: 13 }}>{f.meta.name}</span>
              </Checkbox>
            </div>
          ))}
        </div>
      </div>

      {/* 导出按钮 */}
      <Button
        theme="solid"
        onClick={handleExport}
        loading={exporting}
        style={{ width: "100%", marginBottom: 12 }}
      >
        导出选中记录
      </Button>

      {/* 输出区域 */}
      {output ? (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, color: "#666" }}>
              导出结果（{selectedCount} 条记录）
            </span>
            <div>
              <Button
                size="small"
                onClick={handleCopy}
                style={{ marginRight: 6 }}
              >
                📋 复制
              </Button>
              <Button size="small" onClick={handleDownload}>
                💾 下载
              </Button>
            </div>
          </div>
          <TextArea
            value={output}
            autosize={{ minRows: 4, maxRows: 16 }}
            readonly
            style={{ fontFamily: "monospace", fontSize: 12 }}
          />
        </div>
      ) : (
        !exporting && (
          <Empty
            description="请先在表格中选中记录，然后点击「导出选中记录」"
            style={{ marginTop: 12 }}
          />
        )
      )}
    </div>
  );
}

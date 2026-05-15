import "./App.css";
import { bitable, IFieldMeta, IGridView, FieldType } from "@lark-base-open/js-sdk";
import { Button, Select, Empty, Spin, Toast } from "@douyinfe/semi-ui";
import { useState, useCallback, useEffect } from "react";
import { requestBatchPrint, BATCH_LIMIT } from "./lib/print-service";

interface SelectedRecord {
  recordId: string;
  primaryValue: string;
  printUrl: string;
}

export default function App() {
  const [fieldMetaList, setFieldMetaList] = useState<IFieldMeta[]>([]);
  const [linkFieldId, setLinkFieldId] = useState<string>();
  const [records, setRecords] = useState<SelectedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  // 初始化：获取字段列表
  useEffect(() => {
    (async () => {
      try {
        const table = await bitable.base.getActiveTable();
        const view = (await table.getActiveView()) as IGridView;
        const metas = await view.getFieldMetaList();
        setFieldMetaList(metas);
        // 默认选中名为"打印链接"的字段，否则选第一个公式或 URL 字段
        const defaultField =
          metas.find((f) => f.name === "打印链接") ||
          metas.find((f) => f.type === FieldType.Formula || f.type === FieldType.Url);
        if (defaultField) setLinkFieldId(defaultField.id);
      } catch (e) {
        console.error("初始化失败:", e);
      }
    })();
  }, []);

  // 获取选中记录
  const handleGetSelected = useCallback(async () => {
    if (!linkFieldId) {
      Toast.warning("请先选择打印链接字段");
      return;
    }
    setLoading(true);
    try {
      const table = await bitable.base.getActiveTable();
      const view = (await table.getActiveView()) as IGridView;
      const ids = await view.getSelectedRecordIdList();
      if (!ids.length) {
        setRecords([]);
        Toast.warning("未选中任何记录");
        return;
      }

      const metas = await view.getFieldMetaList();
      const primaryField = metas.find((f) => f.isPrimary);

      const selected: SelectedRecord[] = [];
      for (const id of ids) {
        const primaryValue = primaryField
          ? await table.getCellString(primaryField.id, id)
          : id;
        const printUrl = await table.getCellString(linkFieldId, id);
        if (printUrl) {
          selected.push({ recordId: id, primaryValue: primaryValue || "(空)", printUrl });
        }
      }

      if (!selected.length) {
        Toast.warning("选中的记录中没有有效的打印链接");
        setRecords([]);
        return;
      }
      if (selected.length > BATCH_LIMIT) {
        Toast.warning(`单次最多打印 ${BATCH_LIMIT} 条，当前 ${selected.length} 条`);
        setRecords([]);
        return;
      }
      setRecords(selected);
    } catch (e) {
      console.error("获取选中记录失败:", e);
      Toast.error("获取选中记录失败");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [linkFieldId]);

  // 前往打印：POST batch 接口，拿到短链后跳转
  const handleGoPrint = useCallback(async () => {
    setPrinting(true);
    try {
      const urls = records.map((r) => r.printUrl);
      const { url } = await requestBatchPrint(urls);
      window.open(url, "_blank");
    } catch (e) {
      console.error("打印请求失败:", e);
      Toast.error((e as Error).message);
    } finally {
      setPrinting(false);
    }
  }, [records]);

  return (
    <main className="main">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>打印链接字段</div>
        <Select
          placeholder="选择包含打印链接的字段"
          style={{ width: "100%" }}
          value={linkFieldId}
          onChange={(v) => setLinkFieldId(v as string)}
          optionList={fieldMetaList
            .filter((f) =>
              f.type === FieldType.Url ||
              f.type === FieldType.Text ||
              f.type === FieldType.Formula
            )
            .map((f) => ({ label: f.name, value: f.id }))}
          emptyContent="无可用字段"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#666" }}>
          {records.length > 0 ? `已获取 ${records.length} 条记录` : "请在表格中选中记录"}
        </span>
        <Button onClick={handleGetSelected} loading={loading} size="small">
          获取选中数据
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
      ) : records.length > 0 ? (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {records.map((r, i) => (
              <li key={r.recordId} style={{ padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                {i + 1}. {r.primaryValue}
              </li>
            ))}
          </ul>
          <Button
            theme="solid"
            onClick={handleGoPrint}
            loading={printing}
            style={{ width: "100%", marginTop: 16 }}
          >
            前往打印 ({records.length} 条)
          </Button>
        </>
      ) : (
        <Empty description="暂无数据" style={{ marginTop: 20 }} />
      )}
    </main>
  );
}

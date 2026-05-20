import "./App.css";
import { bitable, IGridView } from "@lark-base-open/js-sdk";
import { Button, Select, Empty, Spin, Toast, TabPane, Tabs } from "@douyinfe/semi-ui";
import { useState, useCallback } from "react";
import { requestBatchPrint, BATCH_LIMIT } from "./lib/print-service";
import { type PrintFlow, setFlows, getFlows, loadFlows } from "./lib/print-flow";
import { executePrintFlow } from "./lib/executors";
import FlowEditor from "./components/FlowEditor";
import TableSchema from "./components/TableSchema";
import flowsConfig from "./print-flows.json";

interface SelectedRecord {
  recordId: string;
  primaryValue: string;
}

export default function App() {
  const [flows, setFlowsState] = useState<PrintFlow[]>(() => {
    return loadFlows(flowsConfig as PrintFlow[]);
  });
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flows[0]?.id || "");
  const [records, setRecords] = useState<SelectedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 获取选中记录
  const handleGetSelected = useCallback(async () => {
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

      // 获取索引列用于展示
      const metas = await view.getFieldMetaList();
      const primaryField = metas.find((f) => f.isPrimary);

      const selected: SelectedRecord[] = [];
      for (const id of ids) {
        const primaryValue = primaryField
          ? await table.getCellString(primaryField.id, id)
          : id;
        selected.push({ recordId: id, primaryValue: primaryValue || "(空)" });
      }
      setRecords(selected);
    } catch (e) {
      console.error("获取选中记录失败:", e);
      Toast.error("获取选中记录失败");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 前往打印（支持自动分批）
  const handleGoPrint = useCallback(async () => {
    const flow = getFlows().find((f) => f.id === selectedFlowId);
    if (!flow) {
      Toast.warning("请选择打印方案");
      return;
    }

    setPrinting(true);
    try {
      const recordIds = records.map((r) => r.recordId);
      const urls = await executePrintFlow(flow, recordIds);

      if (!urls.length) {
        Toast.warning("未收集到任何打印链接");
        return;
      }

      // 自动分批处理
      const batches: string[][] = [];
      for (let i = 0; i < urls.length; i += BATCH_LIMIT) {
        batches.push(urls.slice(i, i + BATCH_LIMIT));
      }

      if (batches.length > 1) {
        Toast.info(`共 ${urls.length} 条链接，将分 ${batches.length} 批打印`);
      }

      console.log(`[print] 收集到 ${urls.length} 条打印链接，分 ${batches.length} 批`);

      for (let i = 0; i < batches.length; i++) {
        const { url } = await requestBatchPrint(batches[i]);
        window.open(url, "_blank");
        // 多批次间稍作延迟，避免浏览器拦截弹窗
        if (i < batches.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } catch (e) {
      console.error("打印失败:", e);
      Toast.error((e as Error).message);
    } finally {
      setPrinting(false);
    }
  }, [selectedFlowId, records]);

  // 保存编辑后的打印流
  const handleSaveFlows = useCallback((newFlows: PrintFlow[]) => {
    setFlows(newFlows);
    setFlowsState(newFlows);
    // 如果当前选中的方案被删除了，切换到第一个
    if (!newFlows.find((f) => f.id === selectedFlowId)) {
      setSelectedFlowId(newFlows[0]?.id || "");
    }
    setEditMode(false);
  }, [selectedFlowId]);

  // 编辑模式
  if (editMode) {
    return (
      <main className="main">
        <FlowEditor
          flows={flows}
          onSave={handleSaveFlows}
          onClose={() => setEditMode(false)}
        />
      </main>
    );
  }

  return (
    <main className="main">
      <Tabs type="line" size="small">
        <TabPane tab="批量打印" itemKey="print">
          {/* 打印方案选择 */}
          <div style={{ marginBottom: 12, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#666" }}>打印方案</span>
              <Button
                size="small"
                type="tertiary"
                onClick={() => setEditMode(true)}
                style={{ fontSize: 12, padding: "0 6px" }}
              >
                编辑方案
              </Button>
            </div>
            <Select
              style={{ width: "100%" }}
              value={selectedFlowId}
              onChange={(v) => setSelectedFlowId(v as string)}
              optionList={flows.map((f) => ({ label: f.name, value: f.id }))}
              emptyContent="暂无方案，请点击「编辑方案」创建"
            />
          </div>

          {/* 获取数据 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#666" }}>
              {records.length > 0 ? `已选中 ${records.length} 条记录` : "请在表格中选中记录"}
            </span>
            <Button onClick={handleGetSelected} loading={loading} size="small">
              获取选中数据
            </Button>
          </div>

          {/* 记录列表 */}
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
                前往打印{records.length > 0 ? ` (${records.length} 条)` : ""}
              </Button>
            </>
          ) : (
            <Empty description="暂无数据" style={{ marginTop: 20 }} />
          )}
        </TabPane>

        <TabPane tab="表结构" itemKey="schema">
          <div style={{ marginTop: 12 }}>
            <TableSchema />
          </div>
        </TabPane>
      </Tabs>
    </main>
  );
}

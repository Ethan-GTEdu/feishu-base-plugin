/**
 * 打印流编辑器组件
 * 支持新增/编辑/删除打印方案及其步骤
 */
import { useState, useCallback } from "react";
import { Button, Input, Select, Toast, Popconfirm } from "@douyinfe/semi-ui";
import {
  type PrintFlow,
  type PrintStep,
  type CurrentTableStep,
  type LinkedTableStep,
  generateFlowId,
} from "../lib/print-flow";

interface FlowEditorProps {
  flows: PrintFlow[];
  onSave: (flows: PrintFlow[]) => void;
  onClose: () => void;
}

export default function FlowEditor({ flows, onSave, onClose }: FlowEditorProps) {
  const [editingFlows, setEditingFlows] = useState<PrintFlow[]>(() =>
    JSON.parse(JSON.stringify(flows))
  );
  const [activeFlowId, setActiveFlowId] = useState<string | null>(
    editingFlows[0]?.id || null
  );

  const activeFlow = editingFlows.find((f) => f.id === activeFlowId) || null;

  // --- Flow CRUD ---

  const handleAddFlow = useCallback(() => {
    const newFlow: PrintFlow = {
      id: generateFlowId(),
      name: "新打印方案",
      steps: [],
    };
    const updated = [...editingFlows, newFlow];
    setEditingFlows(updated);
    setActiveFlowId(newFlow.id);
  }, [editingFlows]);

  const handleDeleteFlow = useCallback(
    (flowId: string) => {
      const updated = editingFlows.filter((f) => f.id !== flowId);
      setEditingFlows(updated);
      if (activeFlowId === flowId) {
        setActiveFlowId(updated[0]?.id || null);
      }
    },
    [editingFlows, activeFlowId]
  );

  const handleRenameFlow = useCallback(
    (flowId: string, name: string) => {
      setEditingFlows(
        editingFlows.map((f) => (f.id === flowId ? { ...f, name } : f))
      );
    },
    [editingFlows]
  );

  // --- Step CRUD ---

  const updateActiveFlowSteps = useCallback(
    (steps: PrintStep[]) => {
      if (!activeFlowId) return;
      setEditingFlows(
        editingFlows.map((f) =>
          f.id === activeFlowId ? { ...f, steps } : f
        )
      );
    },
    [editingFlows, activeFlowId]
  );

  const handleAddStep = useCallback(
    (type: "current" | "linked") => {
      if (!activeFlow) return;
      const newStep: PrintStep =
        type === "current"
          ? { type: "current", printFieldName: "打印链接" }
          : {
              type: "linked",
              linkFieldName: "",
              targetTableName: "",
              printFieldName: "打印链接",
            };
      updateActiveFlowSteps([...activeFlow.steps, newStep]);
    },
    [activeFlow, updateActiveFlowSteps]
  );

  const handleUpdateStep = useCallback(
    (index: number, step: PrintStep) => {
      if (!activeFlow) return;
      const steps = [...activeFlow.steps];
      steps[index] = step;
      updateActiveFlowSteps(steps);
    },
    [activeFlow, updateActiveFlowSteps]
  );

  const handleDeleteStep = useCallback(
    (index: number) => {
      if (!activeFlow) return;
      const steps = activeFlow.steps.filter((_, i) => i !== index);
      updateActiveFlowSteps(steps);
    },
    [activeFlow, updateActiveFlowSteps]
  );

  const handleMoveStep = useCallback(
    (index: number, direction: "up" | "down") => {
      if (!activeFlow) return;
      const steps = [...activeFlow.steps];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= steps.length) return;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      updateActiveFlowSteps(steps);
    },
    [activeFlow, updateActiveFlowSteps]
  );

  // --- Save ---

  const handleSave = useCallback(() => {
    // 校验
    for (const flow of editingFlows) {
      if (!flow.name.trim()) {
        Toast.warning("方案名称不能为空");
        return;
      }
      for (const step of flow.steps) {
        if (step.type === "current" && !step.printFieldName.trim()) {
          Toast.warning(`方案"${flow.name}"中有步骤缺少字段名`);
          return;
        }
        if (step.type === "linked") {
          if (!step.linkFieldName.trim() || !step.targetTableName.trim() || !step.printFieldName.trim()) {
            Toast.warning(`方案"${flow.name}"中有关联步骤配置不完整`);
            return;
          }
        }
      }
    }
    onSave(editingFlows);
    Toast.success("保存成功");
  }, [editingFlows, onSave]);

  return (
    <div className="flow-editor">
      {/* 顶部操作栏 */}
      <div className="flow-editor-header">
        <span style={{ fontWeight: 600, fontSize: 14 }}>编辑打印方案</span>
        <div>
          <Button size="small" onClick={onClose} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button size="small" theme="solid" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>

      {/* 方案列表 */}
      <div className="flow-editor-body">
        <div className="flow-list">
          <div className="flow-list-header">
            <span style={{ fontSize: 12, color: "#666" }}>方案列表</span>
            <Button size="small" onClick={handleAddFlow}>
              + 新增
            </Button>
          </div>
          {editingFlows.map((flow) => (
            <div
              key={flow.id}
              className={`flow-list-item ${flow.id === activeFlowId ? "active" : ""}`}
              onClick={() => setActiveFlowId(flow.id)}
            >
              <span className="flow-list-item-name">{flow.name}</span>
              <span className="flow-list-item-badge">{flow.steps.length} 步</span>
            </div>
          ))}
          {editingFlows.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: "#999", textAlign: "center" }}>
              暂无方案，点击"新增"创建
            </div>
          )}
        </div>

        {/* 方案详情编辑 */}
        <div className="flow-detail">
          {activeFlow ? (
            <>
              {/* 方案名称 */}
              <div className="flow-detail-row">
                <label>方案名称</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Input
                    size="small"
                    value={activeFlow.name}
                    onChange={(v) => handleRenameFlow(activeFlow.id, v)}
                    style={{ flex: 1 }}
                  />
                  <Popconfirm
                    title="确定删除此方案？"
                    onConfirm={() => handleDeleteFlow(activeFlow.id)}
                  >
                    <Button size="small" type="danger">
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </div>

              {/* 步骤列表 */}
              <div className="flow-detail-row">
                <label>步骤列表</label>
                <div className="step-list">
                  {activeFlow.steps.map((step, i) => (
                    <StepItem
                      key={i}
                      step={step}
                      index={i}
                      total={activeFlow.steps.length}
                      onChange={(s) => handleUpdateStep(i, s)}
                      onDelete={() => handleDeleteStep(i)}
                      onMove={(dir) => handleMoveStep(i, dir)}
                    />
                  ))}
                  {activeFlow.steps.length === 0 && (
                    <div style={{ padding: 8, fontSize: 12, color: "#999" }}>
                      暂无步骤，请添加
                    </div>
                  )}
                </div>
              </div>

              {/* 添加步骤 */}
              <div className="flow-detail-row" style={{ display: "flex", gap: 8 }}>
                <Button size="small" onClick={() => handleAddStep("current")}>
                  + 当前表步骤
                </Button>
                <Button size="small" onClick={() => handleAddStep("linked")}>
                  + 关联表步骤
                </Button>
              </div>
            </>
          ) : (
            <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>
              请选择或新增一个方案
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Step Editor Item ---

interface StepItemProps {
  step: PrintStep;
  index: number;
  total: number;
  onChange: (step: PrintStep) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}

function StepItem({ step, index, total, onChange, onDelete, onMove }: StepItemProps) {
  return (
    <div className="step-item">
      <div className="step-item-header">
        <span className="step-item-badge">
          {index + 1}. {step.type === "current" ? "当前表" : "关联表"}
        </span>
        <div className="step-item-actions">
          <Button
            size="small"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            ↑
          </Button>
          <Button
            size="small"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
          >
            ↓
          </Button>
          <Button size="small" type="danger" onClick={onDelete}>
            ×
          </Button>
        </div>
      </div>

      {step.type === "current" ? (
        <CurrentStepFields
          step={step}
          onChange={onChange as (s: CurrentTableStep) => void}
        />
      ) : (
        <LinkedStepFields
          step={step}
          onChange={onChange as (s: LinkedTableStep) => void}
        />
      )}
    </div>
  );
}

function CurrentStepFields({
  step,
  onChange,
}: {
  step: CurrentTableStep;
  onChange: (s: CurrentTableStep) => void;
}) {
  return (
    <div className="step-fields">
      <div className="step-field">
        <span className="step-field-label">打印链接字段名</span>
        <Input
          size="small"
          value={step.printFieldName}
          onChange={(v) => onChange({ ...step, printFieldName: v })}
          placeholder="如：打印链接"
        />
      </div>
    </div>
  );
}

function LinkedStepFields({
  step,
  onChange,
}: {
  step: LinkedTableStep;
  onChange: (s: LinkedTableStep) => void;
}) {
  return (
    <div className="step-fields">
      <div className="step-field">
        <span className="step-field-label">关联字段名</span>
        <Input
          size="small"
          value={step.linkFieldName}
          onChange={(v) => onChange({ ...step, linkFieldName: v })}
          placeholder="当前表中的关联字段"
        />
      </div>
      <div className="step-field">
        <span className="step-field-label">目标表名</span>
        <Input
          size="small"
          value={step.targetTableName}
          onChange={(v) => onChange({ ...step, targetTableName: v })}
          placeholder="关联的目标表名称"
        />
      </div>
      <div className="step-field">
        <span className="step-field-label">打印链接字段名</span>
        <Input
          size="small"
          value={step.printFieldName}
          onChange={(v) => onChange({ ...step, printFieldName: v })}
          placeholder="目标表中的打印链接字段"
        />
      </div>
    </div>
  );
}

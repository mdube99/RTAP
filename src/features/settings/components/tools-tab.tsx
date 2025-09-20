"use client";

import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label } from "@components/ui";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import EntityModal from "@components/ui/entity-modal";
import EntityListCard from "./entity-list-card";
import ConfirmModal from "@components/ui/confirm-modal";
import { ToolType } from "@prisma/client";

type Tool = {
  id: string;
  name: string;
  type: ToolType;
  categoryId: string;
  category: {
    id: string;
    name: string;
    type: ToolType;
  };
};

export default function ToolsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tool | null>(null);

  // Queries
  const { data: tools, isLoading } = api.taxonomy.tools.list.useQuery();
  const { data: defensiveCategories = [] } = api.taxonomy.toolCategories.listByType.useQuery({
    type: ToolType.DEFENSIVE,
  });
  const { data: offensiveCategories = [] } = api.taxonomy.toolCategories.listByType.useQuery({
    type: ToolType.OFFENSIVE,
  });

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.taxonomy.tools.create.useMutation({
    onSuccess: () => {
      void utils.taxonomy.tools.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.taxonomy.tools.update.useMutation({
    onSuccess: () => {
      void utils.taxonomy.tools.invalidate();
      setEditingTool(null);
    },
  });

  const deleteMutation = api.taxonomy.tools.delete.useMutation({
    onSuccess: () => {
      void utils.taxonomy.tools.invalidate();
      setConfirmDelete(null);
    },
  });

  const handleCreate = (data: { name: string; categoryId: string; type: ToolType }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: string, data: { name?: string; categoryId?: string; type?: ToolType }) => {
    updateMutation.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const categoriesByType = useMemo(() => ({
    [ToolType.DEFENSIVE]: defensiveCategories,
    [ToolType.OFFENSIVE]: offensiveCategories,
  }), [defensiveCategories, offensiveCategories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading tools...</div>
      </div>
    );
  }

  const toolsWithUsage = (tools ?? []) as Array<Tool & { usageCount: number }>;

  return (
    <div className="space-y-6">
      <SettingsHeader title="Tools" subtitle="Security tools used in defensive and offensive operations" onNew={() => setIsCreateModalOpen(true)} />

      {(defensiveCategories.length === 0 && offensiveCategories.length === 0) && (
        <div className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
          <p className="text-sm text-[var(--color-warning)]">
            ⚠️ No tool categories exist. Please create tool categories first before adding tools.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {toolsWithUsage.map((tool) => (
          <EntityListCard
            key={tool.id}
            title={tool.name}
            meta={(
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  {tool.type}
                </span>
                <span className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  {tool.category.name}
                </span>
              </div>
            )}
            actions={<InlineActions onEdit={() => setEditingTool(tool)} onDelete={() => setConfirmDelete(tool)} deleteDisabled={tool.usageCount > 0} deleteDisabledReason={tool.usageCount > 0 ? `In use by ${tool.usageCount} technique/outcome(s)` : undefined} />}
          />
        ))}

        {(!tools || tools.length === 0) && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No tools found. Use + New to create your first tool.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ToolEntityModal
          title="Create Tool"
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
          onSubmit={handleCreate}
          categoriesByType={categoriesByType}
        />
      )}

      {/* Edit Modal */}
      {editingTool && (
        <ToolEntityModal
          title="Edit Tool"
          onClose={() => setEditingTool(null)}
          isLoading={updateMutation.isPending}
          onSubmit={(data) => handleUpdate(editingTool.id, data)}
          categoriesByType={categoriesByType}
          initialData={editingTool}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete tool?"
          description={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
interface ToolEntityModalProps {
  title: string;
  initialData?: Tool;
  isLoading: boolean;
  onSubmit: (data: { name: string; categoryId: string; type: ToolType }) => void;
  onClose: () => void;
  categoriesByType: Record<ToolType, Array<{ id: string; name: string; type: ToolType }>>;
}

function ToolEntityModal({ title, initialData, isLoading, onSubmit, onClose, categoriesByType }: ToolEntityModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<ToolType>(initialData?.type ?? ToolType.DEFENSIVE);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");

  const availableCategories = categoriesByType[type] ?? [];

  const handleSubmit = () => {
    if (!categoryId) return;
    onSubmit({ name: name.trim(), type, categoryId });
  };

  return (
    <EntityModal
      open
      title={title}
      onClose={onClose}
      actions={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleSubmit} disabled={isLoading || !name.trim() || !categoryId || availableCategories.length === 0}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      )}
      maxWidthClass="max-w-md"
    >
      <div>
        <Label className="text-sm mb-1">Tool Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Splunk, Metasploit, CrowdStrike" variant="elevated" />
      </div>
      <div>
        <Label className="text-sm mb-1">Tool Type</Label>
        <select value={type} onChange={(e) => { const next = e.target.value as ToolType; setType(next); if (next !== initialData?.type) setCategoryId(""); }} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent">
          <option value={ToolType.DEFENSIVE}>Defensive</option>
          <option value={ToolType.OFFENSIVE}>Offensive</option>
        </select>
      </div>
      <div>
        <Label className="text-sm mb-1">Category</Label>
        {availableCategories.length === 0 ? (
          <div className="p-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded text-sm text-[var(--color-warning)]">
            No categories available for {type.toLowerCase()} tools. Please create categories first.
          </div>
        ) : (
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent">
            <option value="">Select a category...</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}
        <div className="text-xs text-[var(--color-text-muted)] mt-2">Categories are managed in the Tool Categories section</div>
      </div>
    </EntityModal>
  );
}

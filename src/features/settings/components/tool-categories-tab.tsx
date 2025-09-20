"use client";

import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label } from "@components/ui";
import SettingsHeader from "./settings-header";
import EntityModal from "@components/ui/entity-modal";
import EntityListCard from "./entity-list-card";
import InlineActions from "@components/ui/inline-actions";
import ConfirmModal from "@components/ui/confirm-modal";
import { ToolType } from "@prisma/client";

export default function ToolCategoriesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; type: ToolType } | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ToolType>(ToolType.DEFENSIVE);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const utils = api.useUtils();

  // Fetch categories (both types) and merge for a unified list
  const { data: defensive = [], isLoading: dLoading } = api.taxonomy.toolCategories.listByType.useQuery({ type: ToolType.DEFENSIVE });
  const { data: offensive = [], isLoading: oLoading } = api.taxonomy.toolCategories.listByType.useQuery({ type: ToolType.OFFENSIVE });
  const categories = useMemo(() => [...defensive, ...offensive] as Array<{ id: string; name: string; type: ToolType } & { usageCount: number }>, [defensive, offensive]);

  // Mutations
  const createCategory = api.taxonomy.toolCategories.create.useMutation({
    onSuccess: () => { void utils.taxonomy.toolCategories.invalidate(); setIsCreateOpen(false); setNewName(""); },
  });
  const updateCategory = api.taxonomy.toolCategories.update.useMutation({
    onSuccess: () => { void utils.taxonomy.toolCategories.invalidate(); setEditing(null); },
  });
  const deleteCategory = api.taxonomy.toolCategories.delete.useMutation({
    onSuccess: () => { void utils.taxonomy.toolCategories.invalidate(); setConfirmDelete(null); },
  });

  const loading = dLoading || oLoading;

  return (
    <div className="space-y-6">
      <SettingsHeader title="Tool Categories" subtitle="Manage categories for organizing defensive and offensive security tools." onNew={() => setIsCreateOpen(true)} />

      {loading && <div className="text-sm text-[var(--color-text-muted)]">Loading categories…</div>}

      <div className="grid gap-4">
        {categories.map(cat => (
          <EntityListCard
            key={cat.id}
            title={cat.name}
            meta={(
              <span className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {cat.type}
              </span>
            )}
            actions={<InlineActions onEdit={() => setEditing({ id: cat.id, name: cat.name, type: cat.type })} onDelete={() => setConfirmDelete({ id: cat.id, name: cat.name })} deleteDisabled={cat.usageCount > 0} deleteDisabledReason={cat.usageCount > 0 ? `Category has ${cat.usageCount} tool(s)` : undefined} />}
          />
        ))}
        {!loading && categories.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">No categories yet. Use + New to create one.</div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <EntityModal
          open
          title="Create Tool Category"
          onClose={() => setIsCreateOpen(false)}
          actions={(
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)} disabled={createCategory.isPending}>Cancel</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => { if (!newName.trim()) return; createCategory.mutate({ name: newName.trim(), type: newType }); }} disabled={createCategory.isPending || !newName.trim()}>Save</Button>
            </>
          )}
          maxWidthClass="max-w-md"
        >
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1">Category Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., EDR, SIEM, C2" variant="elevated" />
            </div>
            <div>
              <Label className="text-sm mb-1">Type</Label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as ToolType)} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent">
                <option value={ToolType.DEFENSIVE}>Defensive</option>
                <option value={ToolType.OFFENSIVE}>Offensive</option>
              </select>
            </div>
          </div>
        </EntityModal>
      )}

      {/* Edit Modal */}
      {editing && (
        <EntityModal
          open
          title="Edit Tool Category"
          onClose={() => setEditing(null)}
          actions={(
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)} disabled={updateCategory.isPending}>Cancel</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => { if (!editing.name.trim()) return; updateCategory.mutate({ id: editing.id, name: editing.name.trim() }); }} disabled={updateCategory.isPending || !editing.name.trim()}>Save</Button>
            </>
          )}
          maxWidthClass="max-w-md"
        >
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1">Category Name</Label>
              <Input value={editing.name} onChange={(e) => setEditing(prev => prev ? ({ ...prev, name: e.target.value }) : prev)} placeholder="e.g., EDR, SIEM, C2" variant="elevated" />
            </div>
            <div>
              <Label className="text-sm mb-1">Type</Label>
              <Input value={editing.type} disabled variant="elevated" />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Category type cannot be changed.</p>
            </div>
          </div>
        </EntityModal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete category?"
          description={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => deleteCategory.mutate({ id: confirmDelete.id })}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteCategory.isPending}
        />
      )}
    </div>
  );
}

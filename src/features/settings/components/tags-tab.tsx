"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label } from "@components/ui";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import { type Tag } from "@prisma/client";
import EntityListCard from "./entity-list-card";
import EntityModal from "@components/ui/entity-modal";
import ConfirmModal from "@components/ui/confirm-modal";

const PREDEFINED_COLORS = [
  "#FF4444", // Red
  "#FF8800", // Orange  
  "#FFB300", // Yellow
  "#00FF41", // Matrix Green
  "#0066CC", // Blue
  "#6600CC", // Purple
  "#CC00CC", // Magenta
  "#00CCCC", // Cyan
  "#666666", // Gray
];

export default function TagsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);

  // Queries
  const { data: tags, isLoading } = api.taxonomy.tags.list.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.taxonomy.tags.create.useMutation({
    onSuccess: () => {
      void utils.taxonomy.tags.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.taxonomy.tags.update.useMutation({
    onSuccess: () => {
      void utils.taxonomy.tags.invalidate();
      setEditingTag(null);
    },
  });

  const deleteMutation = api.taxonomy.tags.delete.useMutation({
    onSuccess: () => {
      void utils.taxonomy.tags.invalidate();
      setConfirmDelete(null);
    },
  });

  const handleCreate = (data: { name: string; description: string; color: string }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: string, data: { name?: string; description?: string; color?: string }) => {
    updateMutation.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading tags...</div>
      </div>
    );
  }

  const tagsWithUsage = (tags ?? []) as Array<Tag & { usageCount?: number } & { group?: { id: string; name: string } | null }>;

  return (
    <div className="space-y-6">
      <SettingsHeader title="Tags" subtitle="Categorization labels for operations and activities" onNew={() => setIsCreateModalOpen(true)} />

      <div className="grid gap-4">
        {tagsWithUsage.map((tag) => (
          <EntityListCard
            key={tag.id}
            title={(
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: tag.color }} />
                <span className="font-medium">{tag.name}</span>
              </div>
            )}
            description={tag.description}
            meta={(
              <span className="px-2 py-1 text-xs font-medium rounded-[var(--radius-sm)] border" style={{
                backgroundColor: `${tag.color}20`,
                borderColor: `${tag.color}30`,
                color: tag.color
              }}>
                {tag.color}
              </span>
            )}
            actions={<InlineActions onEdit={() => setEditingTag(tag)} onDelete={() => setConfirmDelete(tag)} deleteDisabled={(tag.usageCount ?? 0) > 0} deleteDisabledReason={(tag.usageCount ?? 0) > 0 ? `In use by ${tag.usageCount} operation(s)` : undefined} />}
          />
        ))}

        {(!tags || tags.length === 0) && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No tags configured. Use + New to create one.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <TagEntityModal
          title="Create Tag"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingTag && (
        <TagEntityModal
          title="Edit Tag"
          initialData={editingTag}
          onSubmit={(data) => handleUpdate(editingTag.id, data)}
          onClose={() => setEditingTag(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete tag?"
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

interface TagEntityModalProps {
  title: string;
  initialData?: Tag;
  onSubmit: (data: { name: string; description: string; color: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

function TagEntityModal({ title, initialData, onSubmit, onClose, isLoading }: TagEntityModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  
  // Check if initial color is custom (not in predefined list)
  const isInitialColorCustom = !!(initialData?.color && !PREDEFINED_COLORS.includes(initialData.color));
  
  const [color, setColor] = useState(
    isInitialColorCustom ? PREDEFINED_COLORS[0]! : (initialData?.color ?? PREDEFINED_COLORS[0]!)
  );
  const [customColor, setCustomColor] = useState(
    isInitialColorCustom ? initialData.color : ""
  );
  const [useCustomColor, setUseCustomColor] = useState(isInitialColorCustom);

  const handleSubmit = () => {
    const finalColor = useCustomColor ? customColor : color;
    onSubmit({ name, description, color: finalColor });
  };

  const isValidHexColor = (hex: string) => {
    return /^#[0-9A-F]{6}$/i.test(hex);
  };

  return (
    <EntityModal
      open
      title={title}
      onClose={onClose}
      actions={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !name.trim() ||
              !description.trim() ||
              (useCustomColor && !isValidHexColor(customColor))
            }
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      )}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Tag Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Priority, Internal, External"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" required>
                Description
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when this tag should be used..."
                required
                rows={3}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <Label>Tag Color</Label>
              
              <div className="mt-2 space-y-3">
                {/* Predefined Colors */}
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={!useCustomColor}
                      onChange={() => setUseCustomColor(false)}
                      className="text-[var(--color-accent)]"
                    />
                    Choose from preset colors
                  </label>
                  
                  {!useCustomColor && (
                    <div className="mt-2 grid grid-cols-9 gap-2">
                      {PREDEFINED_COLORS.map((presetColor) => (
                        <button
                          key={presetColor}
                          type="button"
                          onClick={() => setColor(presetColor)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            color === presetColor
                              ? "border-[var(--color-accent)] scale-110"
                              : "border-white/20 hover:border-white/40"
                          }`}
                          style={{ backgroundColor: presetColor }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Color */}
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={useCustomColor}
                      onChange={() => setUseCustomColor(true)}
                      className="text-[var(--color-accent)]"
                    />
                    Use custom hex color
                  </label>
                  
                  {useCustomColor && (
                    <div className="mt-2 flex items-center gap-3">
                      <Input
                        variant="elevated"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value.toUpperCase())}
                        placeholder="#FF0000"
                        className="flex-1"
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                        style={{
                          backgroundColor: isValidHexColor(customColor) ? customColor : "#666666"
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] mb-2">Preview:</div>
                  <span
                    className="px-2 py-1 text-xs font-medium rounded-[var(--radius-sm)] border"
                    style={{
                      backgroundColor: `${useCustomColor ? customColor : color}20`,
                      borderColor: `${useCustomColor ? customColor : color}30`,
                      color: useCustomColor ? customColor : color
                    }}
                  >
                    {name || "Tag Name"}
                  </span>
                </div>
              </div>
            </div>

      </div>
    </EntityModal>
  );
}

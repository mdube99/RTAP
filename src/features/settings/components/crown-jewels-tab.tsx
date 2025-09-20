"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label } from "@components/ui";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import { type CrownJewel } from "@prisma/client";
import EntityListCard from "./entity-list-card";
import EntityModal from "@components/ui/entity-modal";
import ConfirmModal from "@components/ui/confirm-modal";

export default function CrownJewelsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJewel, setEditingJewel] = useState<CrownJewel | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CrownJewel | null>(null);

  // Queries
  const { data: crownJewels, isLoading } = api.taxonomy.crownJewels.list.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.taxonomy.crownJewels.create.useMutation({
    onSuccess: () => {
      void utils.taxonomy.crownJewels.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.taxonomy.crownJewels.update.useMutation({
    onSuccess: () => {
      void utils.taxonomy.crownJewels.invalidate();
      setEditingJewel(null);
    },
  });

  const deleteMutation = api.taxonomy.crownJewels.delete.useMutation({
    onSuccess: () => {
      void utils.taxonomy.crownJewels.invalidate();
      setConfirmDelete(null);
    },
  });

  const handleCreate = (data: { name: string; description: string }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: string, data: { name?: string; description?: string }) => {
    updateMutation.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading crown jewels...</div>
      </div>
    );
  }

  const jewels = (crownJewels ?? []) as Array<CrownJewel & { usageCount: number }>;

  return (
    <div className="space-y-6">
      <SettingsHeader title="Crown Jewels" subtitle="Critical organizational assets that require protection" onNew={() => setIsCreateModalOpen(true)} />

      <div className="grid gap-4">
        {jewels.map((jewel) => (
          <EntityListCard
            key={jewel.id}
            title={<span className="font-medium">{jewel.name}</span>}
            description={jewel.description}
            actions={<InlineActions onEdit={() => setEditingJewel(jewel)} onDelete={() => setConfirmDelete(jewel)} deleteDisabled={jewel.usageCount > 0} deleteDisabledReason={jewel.usageCount > 0 ? `In use by ${jewel.usageCount} operation(s)` : undefined} />}
          />
        ))}

        {(!crownJewels || crownJewels.length === 0) && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No crown jewels configured. Use + New to create one.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CrownJewelEntityModal
          title="Create Crown Jewel"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingJewel && (
        <CrownJewelEntityModal
          title="Edit Crown Jewel"
          initialData={editingJewel}
          onSubmit={(data) => handleUpdate(editingJewel.id, data)}
          onClose={() => setEditingJewel(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete crown jewel?"
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

interface CrownJewelEntityModalProps {
  title: string;
  initialData?: CrownJewel;
  onSubmit: (data: { name: string; description: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

function CrownJewelEntityModal({ title, initialData, onSubmit, onClose, isLoading }: CrownJewelEntityModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  const handleSubmit = () => {
    onSubmit({ name, description });
  };

  return (
    <EntityModal
      open
      title={title}
      onClose={onClose}
      actions={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleSubmit} disabled={isLoading || !name.trim() || !description.trim()}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      )}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Asset Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer Database, Payment System"
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
                placeholder="Describe the asset's importance and business impact..."
                required
                rows={4}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
              />
            </div>


      </div>
    </EntityModal>
  );
}

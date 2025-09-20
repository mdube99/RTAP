"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label } from "@components/ui";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import { type LogSource } from "@prisma/client";
import EntityListCard from "./entity-list-card";
import EntityModal from "@components/ui/entity-modal";
import ConfirmModal from "@components/ui/confirm-modal";

export default function LogSourcesTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<LogSource | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LogSource | null>(null);

  // Queries
  const { data: logSources, isLoading } = api.taxonomy.logSources.list.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.taxonomy.logSources.create.useMutation({
    onSuccess: () => {
      void utils.taxonomy.logSources.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.taxonomy.logSources.update.useMutation({
    onSuccess: () => {
      void utils.taxonomy.logSources.invalidate();
      setEditingSource(null);
    },
  });

  const deleteMutation = api.taxonomy.logSources.delete.useMutation({
    onSuccess: () => {
      void utils.taxonomy.logSources.invalidate();
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
        <div className="text-[var(--color-text-secondary)]">Loading log sources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title="Log Sources" subtitle="Available logging and monitoring sources for detection analysis" onNew={() => setIsCreateModalOpen(true)} />

      <div className="grid gap-4">
        {logSources?.map((source) => (
          <EntityListCard
            key={source.id}
            title={<span className="font-medium">{source.name}</span>}
            description={source.description}
            actions={<InlineActions onEdit={() => setEditingSource(source)} onDelete={() => setConfirmDelete(source)} />}
          />
        ))}

        {(!logSources || logSources.length === 0) && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No log sources configured. Use + New to create one.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <LogSourceEntityModal
          title="Create Log Source"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingSource && (
        <LogSourceEntityModal
          title="Edit Log Source"
          initialData={editingSource}
          onSubmit={(data) => handleUpdate(editingSource.id, data)}
          onClose={() => setEditingSource(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete log source?"
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

interface LogSourceEntityModalProps {
  title: string;
  initialData?: LogSource;
  onSubmit: (data: { name: string; description: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

function LogSourceEntityModal({ title, initialData, onSubmit, onClose, isLoading }: LogSourceEntityModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  const handleSubmit = () => {
    onSubmit({ name, description });
  };

  const LOG_SOURCE_EXAMPLES = [
    "Windows Event Logs",
    "Syslog",
    "DNS Logs",
    "Web Proxy Logs", 
    "Firewall Logs",
    "Network Flow Data",
    "Endpoint Detection & Response",
    "Cloud Trail Logs",
    "Application Logs",
    "Database Audit Logs"
  ];

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
                Log Source Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Windows Event Logs, Syslog"
                required
              />
              
              {/* Quick suggestions */}
              <div className="mt-2">
                <div className="text-xs text-[var(--color-text-muted)] mb-2">Common examples:</div>
                <div className="flex flex-wrap gap-1">
                  {LOG_SOURCE_EXAMPLES.slice(0, 4).map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setName(example)}
                      className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/20 border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all duration-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description" required>
                Description
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what types of events and data this log source provides..."
                required
                rows={4}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
              />
              
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                Include information about data types, collection methods, and detection capabilities.
              </div>
            </div>

      </div>
    </EntityModal>
  );
}

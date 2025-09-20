"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Input, Label, Combobox } from "@components/ui";
import EntityModal from "@components/ui/entity-modal";
import EntityListCard from "./entity-list-card";
import ConfirmModal from "@components/ui/confirm-modal";
import { type ThreatActor } from "@prisma/client";
import { getCuratedShortDescription } from "@lib/mitreDescriptionUtils";
import SettingsHeader from "./settings-header";
import ImportDialog from "./import/import-dialog";
import InlineActions from "@components/ui/inline-actions";
import { SelectedTechniqueList } from "@features/shared/techniques/technique-lists";

export default function ThreatActorsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<ThreatActor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ThreatActor | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Removed: create operation from here; use operations page

  // Queries
  const { data: threatActors, isLoading } = api.taxonomy.threatActors.list.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.taxonomy.threatActors.create.useMutation({
    onSuccess: () => {
      void utils.taxonomy.threatActors.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.taxonomy.threatActors.update.useMutation({
    onSuccess: () => {
      void utils.taxonomy.threatActors.invalidate();
      setEditingActor(null);
    },
  });

  const deleteMutation = api.taxonomy.threatActors.delete.useMutation({
    onSuccess: () => {
      void utils.taxonomy.threatActors.invalidate();
      setConfirmDelete(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      const m = (err as { message?: unknown } | null | undefined)?.message;
      const message = typeof m === 'string' && m.trim().length > 0
        ? m
        : 'Delete failed. This threat actor may be in use by one or more operations.';
      setDeleteError(message);
    },
  });

  const handleCreate = (data: { name: string; description: string; topThreat: boolean; mitreTechniqueIds: string[] }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: string, data: { name?: string; description?: string; topThreat?: boolean; mitreTechniqueIds?: string[] }) => {
    updateMutation.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    setDeleteError(null);
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading threat actors...</div>
      </div>
    );
  }

  const actors = (threatActors ?? []) as Array<{
    id: string;
    name: string;
    description: string;
    topThreat: boolean;
    mitreTechniques?: unknown[];
    usageCount: number;
  }>;

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Threat Actors"
        subtitle="Manage APT groups and threat organizations"
        onNew={() => setIsCreateModalOpen(true)}
        onImport={() => setIsImportOpen(true)}
      />

      {/* Threat Actors List */}
      <div className="grid gap-4">
        {actors.map((actor) => (
          <EntityListCard
            key={actor.id}
            title={(
              <div className="flex items-center gap-2">
                <span className="font-medium">{actor.name}</span>
                {actor.topThreat && (
                  <span className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                    Top Threat
                  </span>
                )}
              </div>
            )}
            description={<span>{actor.description}</span>}
            meta={actor.mitreTechniques && actor.mitreTechniques.length > 0 ? (
              <span className="text-xs text-[var(--color-text-muted)]">TTPs: {actor.mitreTechniques.length}</span>
            ) : undefined}
            actions={
              <div className="flex items-center gap-2">
                {/* Removed per entry consolidation: creating operations now lives under /operations */}
                <InlineActions
                  onEdit={() => setEditingActor(actor as unknown as ThreatActor)}
                  onDelete={() => setConfirmDelete(actor as unknown as ThreatActor)}
                  deleteDisabled={actor.usageCount > 0}
                  deleteDisabledReason={actor.usageCount > 0 ? `In use by ${actor.usageCount} operation(s)` : undefined}
                />
              </div>
            }
          />
        ))}

        {(!threatActors || threatActors.length === 0) && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No threat actors configured. Use + New to create one.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ThreatActorEntityModal
          title="Create Threat Actor"
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Import Dialog */}
      {isImportOpen && (
        <ImportDialog kind="actor" open={true} onClose={() => setIsImportOpen(false)} onImported={() => void utils.taxonomy.threatActors.invalidate()} />
      )}

      {/* Edit Modal */}
      {editingActor && (
        <ThreatActorEntityModal
          title="Edit Threat Actor"
          initialData={editingActor}
          onSubmit={(data) => handleUpdate(editingActor.id, data)}
          onClose={() => setEditingActor(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete threat actor?"
          description={deleteError ?? `Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => { setDeleteError(null); setConfirmDelete(null); }}
          loading={deleteMutation.isPending}
        />
      )}

      {/* Operation creation is consolidated under /operations */}
    </div>
  );
}


type MitreTechnique = {
  id: string;
  name: string;
  description: string;
  tactic: {
    id: string;
    name: string;
  };
  url: string | null;
};

type ThreatActorData = {
  id?: string;
  name: string;
  description: string;
  topThreat: boolean;
  mitreTechniques?: MitreTechnique[];
};

interface ThreatActorEntityModalProps {
  title: string;
  initialData?: ThreatActorData;
  onSubmit: (data: { name: string; description: string; topThreat: boolean; mitreTechniqueIds: string[] }) => void;
  onClose: () => void;
  isLoading: boolean;
}

function ThreatActorEntityModal({ title, initialData, onSubmit, onClose, isLoading }: ThreatActorEntityModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [topThreat, setTopThreat] = useState(initialData?.topThreat ?? false);
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>(
    initialData?.mitreTechniques?.map(t => t.id) ?? []
  );
  
  // Currently selected techniques for display
  const [selectedTechniques, setSelectedTechniques] = useState<MitreTechnique[]>(
    initialData?.mitreTechniques ?? []
  );

  // Fetch available MITRE techniques
  const { data: mitreTechniques } = api.taxonomy.mitre.techniques.useQuery({});
  // const { data: tactics } = api.taxonomy.mitre.tactics.useQuery();

  // Prepare combobox options
  const techniqueOptions = mitreTechniques?.map(technique => ({
    value: technique.id,
    label: `${technique.id} - ${technique.name}`,
    description: getCuratedShortDescription(technique.id, technique.name, technique.description),
    tactic: technique.tactic.name,
  })) ?? [];

  const handleTechniqueAdd = (techniqueId: string) => {
    if (selectedTechniqueIds.includes(techniqueId)) return;
    
    const technique = mitreTechniques?.find(t => t.id === techniqueId);
    if (technique) {
      setSelectedTechniqueIds(prev => [...prev, techniqueId]);
      setSelectedTechniques(prev => [...prev, technique]);
    }
  };

  const handleTechniqueRemove = (techniqueId: string) => {
    setSelectedTechniqueIds(prev => prev.filter(id => id !== techniqueId));
    setSelectedTechniques(prev => prev.filter(t => t.id !== techniqueId));
  };

  const handleSubmit = () => {
    onSubmit({ name, description, topThreat, mitreTechniqueIds: selectedTechniqueIds });
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
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Threat Actor Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., APT29, Lazarus Group"
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
                placeholder="Describe the threat actor's capabilities, origin, and known activities..."
                required
                rows={4}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all duration-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="topThreat"
                checked={topThreat}
                onChange={(e) => setTopThreat(e.target.checked)}
                className="rounded-[var(--radius-sm)] border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--ring)] focus:ring-offset-0"
              />
              <Label htmlFor="topThreat" className="text-sm">
                Mark as Top Threat
              </Label>
            </div>

            <div>
              <Label className="text-sm font-medium text-[var(--color-text-primary)]">
                MITRE ATT&CK Techniques
              </Label>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Search and select the techniques this threat actor is known to use
              </p>
              
              {/* Technique Search */}
              <div className="space-y-2">
                <Combobox
                  value=""
                  onValueChange={handleTechniqueAdd}
                  options={techniqueOptions.filter(opt => !selectedTechniqueIds.includes(opt.value))}
                  placeholder="Search techniques to add..."
                  searchPlaceholder="Search by technique ID or name..."
                  emptyText="No techniques found"
                />
              </div>

              {/* Selected Techniques */}
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Selected Techniques ({selectedTechniques.length})
                </p>
                <SelectedTechniqueList
                  items={selectedTechniques}
                  onRemove={handleTechniqueRemove}
                />
              </div>
            </div>

      </div>
    </EntityModal>
  );
}

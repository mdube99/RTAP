"use client";

import { useState } from "react";
import EntityModal from "@components/ui/entity-modal";
import { Button, Input, Label } from "@components/ui";
import { api } from "@/trpc/react";
import { SelectableTechniqueList } from "@features/shared/techniques/technique-lists";

type MitreTechnique = {
  id: string;
  name: string;
  description: string;
  tactic?: {
    id: string;
    name: string;
  } | null;
  url?: string | null;
};

export interface CreateOperationFromActorModalProps {
  actor: {
    id: string;
    name: string;
    description: string;
    mitreTechniques?: MitreTechnique[];
  };
  onClose: () => void;
}

export default function CreateOperationFromActorModal({ actor, onClose }: CreateOperationFromActorModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>(actor.mitreTechniques?.map(t => t.id) ?? []);

  const utils = api.useUtils();
  const createOperation = api.operations.create.useMutation();
  const createTechnique = api.techniques.create.useMutation();

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return;
    const op = await createOperation.mutateAsync({ name, description, threatActorId: actor.id });
    const techs = actor.mitreTechniques?.filter(t => selected.includes(t.id)) ?? [];
    for (const t of techs) {
      await createTechnique.mutateAsync({ operationId: op.id, description: `Planned: ${t.id} - ${t.name}`, mitreTechniqueId: t.id });
    }
    await utils.operations.list.invalidate();
    onClose();
  };

  return (
    <EntityModal
      open
      title={`New Operation from ${actor.name}`}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      actions={(
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={createOperation.isPending || createTechnique.isPending}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={handleCreate} disabled={createOperation.isPending || createTechnique.isPending || !name.trim() || !description.trim()}>
            {createOperation.isPending || createTechnique.isPending ? "Creating..." : "Create Operation"}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="op-name" required>Operation Name</Label>
          <Input id="op-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Operation for ${actor.name}`} required />
        </div>
        <div>
          <Label htmlFor="op-desc" required>Description</Label>
          <textarea
            id="op-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the objective of this operation"
            required
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
          />
        </div>

        <div>
          <Label>Select Known TTPs</Label>
          {(!actor.mitreTechniques || actor.mitreTechniques.length === 0) ? (
            <div className="mt-2 text-xs text-[var(--color-text-muted)]">No known TTPs configured for this actor.</div>
          ) : (
            <div className="mt-2">
              <SelectableTechniqueList
                items={actor.mitreTechniques.map(t => ({
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  tactic: t.tactic ? { id: t.tactic.id, name: t.tactic.name } : null,
                  url: t.url,
                }))}
                selectedIds={selected}
                onToggle={toggle}
                onSelectAll={() => setSelected(actor.mitreTechniques!.map(t => t.id))}
                onClear={() => setSelected([])}
                heightClass="max-h-64"
              />
            </div>
          )}
        </div>
      </div>
    </EntityModal>
  );
}

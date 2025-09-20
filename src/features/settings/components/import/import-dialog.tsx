"use client";

import { useEffect, useState } from "react";
import EntityModal from "@components/ui/entity-modal";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Card, CardContent } from "@components/ui/card";
import { SelectableTechniqueList, type TechniqueItem } from "@features/shared/techniques/technique-lists";
import { api, type RouterOutputs } from "@/trpc/react";
import { processMitreDescription } from "@lib/mitreDescriptionUtils";
import { buildTechniqueMap } from "./buildTechniqueMap";

type Kind = "actor" | "operation";

interface ImportDialogProps {
  kind: Kind;
  open: boolean;
  onClose: () => void;
  onImported?: (summary: { created: number; skipped: number }) => void;
}

export default function ImportDialog({ kind, open, onClose, onImported }: ImportDialogProps) {
  const [query, setQuery] = useState("");
  // Two-step flow: list -> detail per candidate
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);

  // Fetch candidates (local only for Phase 1A)
  const { data, isLoading, refetch } = kind === "actor"
    ? api.import.listCandidates.actors.useQuery({ kind: "actor", source: "local", query })
    : api.import.listCandidates.operations.useQuery({ kind: "operation", source: "local", query });

  type ActorList = RouterOutputs["import"]["listCandidates"]["actors"];
  type OperationList = RouterOutputs["import"]["listCandidates"]["operations"];
  const items: (ActorList["items"][number] | OperationList["items"][number])[] = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    setActiveItemKey(null);
    setTechSelections({});
    void refetch();
  }, [open, refetch]);

  const [techSelections, setTechSelections] = useState<Record<string, string[]>>({});

  const runActors = api.import.run.actors.useMutation();
  const runOperations = api.import.run.operations.useMutation();

  // MITRE technique details for richer selection UI
  const { data: mitreTechniques } = api.taxonomy.mitre.techniques.useQuery({});
  const techniqueMap = buildTechniqueMap(
    (mitreTechniques ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      url: t.url ?? null,
      tactic: t.tactic ? { id: t.tactic.id, name: t.tactic.name } : null,
      subTechniques: t.subTechniques?.map((st) => ({ id: st.id, name: st.name, description: st.description, url: st.url ?? null })) ?? [],
    }))
  );

  const handleImport = async () => {
    if (!activeItemKey) return;
    const payload = { [activeItemKey]: techSelections[activeItemKey] ?? [] } as Record<string, string[]>;
    const res = await (kind === "actor"
      ? runActors.mutateAsync({ kind: "actor", source: "local", ids: [activeItemKey], selections: payload })
      : runOperations.mutateAsync({ kind: "operation", source: "local", ids: [activeItemKey], selections: payload })
    );
    onImported?.({ created: res.created, skipped: res.skipped });
    onClose();
  };

  return (
    <EntityModal
      open={open}
      title={`Import ${kind === "actor" ? "Threat Actors" : "Operations"}`}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      actions={(
        <>
          {activeItemKey && (
            <Button variant="ghost" size="sm" onClick={() => setActiveItemKey(null)} disabled={runActors.isPending || runOperations.isPending}>Back</Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose} disabled={runActors.isPending || runOperations.isPending}>Cancel</Button>
          <Button variant="secondary" size="sm" onClick={handleImport} disabled={(runActors.isPending || runOperations.isPending) || !activeItemKey}>
            {(runActors.isPending || runOperations.isPending) ? "Importing..." : "Import"}
          </Button>
        </>
      )}
    >
      {!activeItemKey ? (
        <>
          <div className="flex items-center gap-2">
            <Input placeholder={`Search ${kind === "actor" ? "actors" : "operations"}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="max-h-[420px] overflow-auto space-y-2 mt-2 p-3">
            {isLoading ? (
              <div className="p-4 text-[var(--color-text-secondary)]">Loading candidates...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-[var(--color-text-secondary)]">No candidates found in local MITRE data.</div>
            ) : (
              items.map((item) => {
                const techniqueCount = "techniqueIds" in item ? item.techniqueIds.length : ("techniques" in item ? item.techniques.length : 0);
                return (
                  <Card
                    key={item.key}
                    className="transition-colors cursor-pointer relative hover:z-10 hover:ring-2 hover:ring-[var(--ring)] hover:ring-offset-3 hover:ring-offset-[var(--color-surface)]"
                    onClick={() => {
                      const techniques = "techniqueIds" in item
                        ? item.techniqueIds
                        : ("techniques" in item ? item.techniques.map((t) => t.techniqueId) : []);
                      setTechSelections((prev) => ({ ...prev, [item.key]: techniques }));
                      setActiveItemKey(item.key);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="font-medium text-[var(--color-text-primary)]">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                          {processMitreDescription(item.description, undefined, 220).short}
                        </div>
                      )}
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
                        Techniques: {techniqueCount}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : (
        // Detail view for selected item
        (() => {
          const item = items.find((i) => i.key === activeItemKey);
          if (!item) return <div className="p-4 text-[var(--color-text-secondary)]">Item not found.</div>;
          const techniqueIds = ((): string[] => {
            if ("techniqueIds" in item) return item.techniqueIds;
            if ("techniques" in item) return item.techniques.map((t) => t.techniqueId);
            return [];
          })();

          const listItems: TechniqueItem[] = techniqueIds.map((id) => techniqueMap.get(id) ?? ({ id, name: id, description: "", tactic: null, url: null }));
          const currentSel = techSelections[item.key] ?? techniqueIds;
          const toggleTech = (techId: string) => {
            setTechSelections((prev) => {
              const existing = prev[item.key] ?? techniqueIds;
              const next = existing.includes(techId) ? existing.filter((id) => id !== techId) : [...existing, techId];
              return { ...prev, [item.key]: next };
            });
          };
          const selectAllTech = () => setTechSelections((prev) => ({ ...prev, [item.key]: techniqueIds }));
          const clearAllTech = () => setTechSelections((prev) => ({ ...prev, [item.key]: [] }));

          return (
            <div className="space-y-3">
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {processMitreDescription(item.description, undefined, 300).short}
                  </div>
                )}
              </div>
              <SelectableTechniqueList
                items={listItems}
                selectedIds={currentSel}
                onToggle={toggleTech}
                onSelectAll={selectAllTech}
                onClear={clearAllTech}
              />
            </div>
          );
        })()
      )}
    </EntityModal>
  );
}

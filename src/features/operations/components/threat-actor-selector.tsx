"use client";

import { useState } from "react";
import EntityModal from "@components/ui/entity-modal";
import { Card, CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { api } from "@/trpc/react";

export type ThreatActorForPick = {
  id: string;
  name: string;
  description: string;
  mitreTechniques?: {
    id: string;
    name: string;
    description: string;
    tactic?: { id: string; name: string } | null;
    url?: string | null;
  }[];
};

interface ThreatActorSelectorProps {
  open: boolean;
  onClose: () => void;
  onPick: (actor: ThreatActorForPick) => void;
}

export default function ThreatActorSelector({ open, onClose, onPick }: ThreatActorSelectorProps) {
  const { data } = api.taxonomy.threatActors.list.useQuery();
  const [query, setQuery] = useState("");
  const actors: ThreatActorForPick[] = (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    mitreTechniques: a.mitreTechniques?.map((t) => ({ id: t.id, name: t.name, description: t.description, tactic: t.tactic ? { id: t.tactic.id, name: t.tactic.name } : null, url: t.url })) ?? [],
  }));
  const filtered = actors.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <EntityModal open={open} title="Create from Threat Actor" onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="space-y-2">
        <Input placeholder="Search actors..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="max-h-[420px] overflow-auto space-y-2 p-2">
          {filtered.map((a) => (
            <Card key={a.id} className="transition-colors cursor-pointer relative hover:z-10 hover:ring-2 hover:ring-[var(--ring)] hover:ring-offset-2 hover:ring-offset-[var(--color-surface)]" onClick={() => onPick(a)}>
              <CardContent className="p-3">
                <div className="font-medium text-[var(--color-text-primary)]">{a.name}</div>
                <div className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{a.description}</div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="p-3 text-[var(--color-text-secondary)]">No actors match your search.</div>
          )}
        </div>
      </div>
    </EntityModal>
  );
}

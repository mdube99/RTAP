"use client";

/**
 * useTechniqueEditorData
 * Centralizes data fetching for the Technique Editor to reduce component size and improve readability.
 * Returns tactics, techniques (scoped by selected tactic), and taxonomy (tools, log sources).
 */

import { api } from "@/trpc/react";

export interface TechniqueEditorData {
  tactics: Array<{ id: string; name: string; description?: string; url?: string | null }>;
  techniques: Array<{
    id: string;
    name: string;
    description: string;
    url?: string | null;
    tacticId: string;
    subTechniques?: Array<{ id: string; name: string; description: string; url?: string | null }>;
  }>;
  offensiveTools: Array<{ id: string; name: string }>;
  defensiveTools: Array<{ id: string; name: string }>;
  logSources: Array<{ id: string; name: string }>;
  loading: boolean;
}

export function useTechniqueEditorData(params: { isOpen: boolean; selectedTacticId?: string }) {
  const { isOpen, selectedTacticId } = params;

  // MITRE data
  const { data: tacticsData, isLoading: tacticsLoading } = api.taxonomy.mitre.tactics.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const { data: techniquesData, isLoading: techniquesLoading } = api.taxonomy.mitre.techniques.useQuery(
    { tacticId: selectedTacticId ?? undefined },
    { enabled: isOpen }
  );

  // Tools & log sources
  const { data: offensiveToolsData, isLoading: offensiveLoading } = api.taxonomy.tools.listByType.useQuery(
    { type: "OFFENSIVE" },
    { enabled: isOpen }
  );

  const { data: defensiveToolsData, isLoading: defensiveLoading } = api.taxonomy.tools.listByType.useQuery(
    { type: "DEFENSIVE" },
    { enabled: isOpen }
  );

  const { data: logSourcesData, isLoading: logSourcesLoading } = api.taxonomy.logSources.list.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const data: TechniqueEditorData = {
    tactics: tacticsData ?? [],
    techniques: techniquesData ?? [],
    offensiveTools: (offensiveToolsData ?? []).map(t => ({ id: t.id, name: t.name })),
    defensiveTools: (defensiveToolsData ?? []).map(t => ({ id: t.id, name: t.name })),
    logSources: (logSourcesData ?? []).map(l => ({ id: l.id, name: l.name })),
    loading: Boolean(
      tacticsLoading ||
      techniquesLoading ||
      offensiveLoading ||
      defensiveLoading ||
      logSourcesLoading
    ),
  };

  return data;
}

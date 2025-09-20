export function buildTechnique(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "technique-1",
    description: overrides.description ?? "Test phishing campaign",
    operationId: overrides.operationId ?? (overrides.operation?.id ?? 1),
    operation: overrides.operation ?? { id: 1, name: "Test Operation", createdById: "user-1" },
    mitreTechnique: overrides.mitreTechnique ?? {
      id: "T1566",
      name: "Phishing",
      tactic: { id: "TA0001", name: "Initial Access" },
    },
    mitreSubTechnique: overrides.mitreSubTechnique ?? {
      id: "T1566.001",
      name: "Spearphishing Attachment",
    },
    tools: overrides.tools ?? [{ id: "tool-1", name: "Cobalt Strike" }],
    outcomes: overrides.outcomes ?? [],
  };
}

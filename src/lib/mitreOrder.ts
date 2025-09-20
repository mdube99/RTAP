// Canonical MITRE Enterprise tactic order (Recon/Resource first, Impact last)
export const TACTIC_ORDER: readonly string[] = [
  'TA0043', // Reconnaissance
  'TA0042', // Resource Development
  'TA0001','TA0002','TA0003','TA0004','TA0005','TA0006','TA0007','TA0008','TA0009','TA0010','TA0011',
  'TA0040', // Impact
] as const;

export function tacticOrderIndex(id: string): number {
  const idx = TACTIC_ORDER.indexOf(id);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}


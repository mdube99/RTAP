import { AttackMatrixCoverageTab } from "@features/analytics/components/attack-matrix/coverage-tab";

export default function AttackMatrixPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Attack Matrix</h1>
      </div>
      <AttackMatrixCoverageTab />
    </div>
  );
}
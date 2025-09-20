"use client";

import { useState } from "react";

import ConfirmModal from "@components/ui/confirm-modal";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@components/ui";
import { logger } from "@lib/logger";
import { api } from "@/trpc/react";

export default function DataSettingsPage() {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(true);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearOperations, setClearOperations] = useState(false);
  const [clearTaxonomy, setClearTaxonomy] = useState(false);
  const [pendingClearOptions, setPendingClearOptions] = useState<{ clearOperations: boolean; clearTaxonomy: boolean } | null>(
    null,
  );

  const utils = api.useUtils();
  const { data: stats, refetch: refetchStats } = api.data.getStats.useQuery();

  const backupMutation = api.data.backup.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttpx-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const restoreMutation = api.data.restore.useMutation({
    onSuccess: () => {
      void refetchStats();
      void utils.invalidate();
      setRestoreFile(null);
      setShowRestoreConfirm(false);
    },
  });

  const clearDataMutation = api.data.clearData.useMutation({
    onSuccess: () => {
      void refetchStats();
      void utils.invalidate();
      setShowClearConfirm(false);
      setClearOperations(false);
      setClearTaxonomy(false);
      setPendingClearOptions(null);
    },
  });

  const handleRestore = async () => {
    if (!restoreFile) return;

    try {
      const text = await restoreFile.text();
      restoreMutation.mutate({ backupData: text, clearBefore: clearBeforeImport });
    } catch (error) {
      logger.error("Failed to read backup file", error);
    }
  };

  const handleClearData = () => {
    if (!pendingClearOptions) return;
    clearDataMutation.mutate(pendingClearOptions);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Data Management</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Export, import, or clear operations and taxonomy data.
        </p>
      </div>

      {showRestoreConfirm && (
        <ConfirmModal
          open
          title="Import data from backup?"
          description={`This will ${clearBeforeImport ? "replace existing data and " : ""}import operations and taxonomy from the selected backup. This action cannot be undone.`}
          confirmLabel="Import"
          cancelLabel="Cancel"
          onConfirm={handleRestore}
          onCancel={() => setShowRestoreConfirm(false)}
          loading={restoreMutation.isPending}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Overview</CardTitle>
        </CardHeader>
        <CardContent>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Operations", value: stats.operations },
                  { label: "Techniques", value: stats.techniques },
                  { label: "Outcomes", value: stats.outcomes },
                  { label: "Threat Actors", value: stats.threatActors },
                  { label: "Crown Jewels", value: stats.crownJewels },
                  { label: "Tags", value: stats.tags },
                  { label: "Tools", value: stats.tools },
                  { label: "Log Sources", value: stats.logSources },
                ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-[var(--color-accent)]">{value}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--color-text-secondary)]">Loading statistics...</div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Download a JSON file containing operations and taxonomy.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
            >
              {backupMutation.isPending ? "Preparing Export..." : "Download Data"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Import operations and taxonomy from a previously exported file.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)}
              className="w-full text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2"
            />
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="clear-before-import"
                checked={clearBeforeImport}
                onChange={(event) => setClearBeforeImport(event.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <label htmlFor="clear-before-import" className="text-sm text-[var(--color-text-primary)]">
                Clear existing data before import
              </label>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRestoreConfirm(true)}
              disabled={!restoreFile}
            >
              {restoreMutation.isPending ? "Importing..." : "Import Data"}
            </Button>
            {restoreMutation.error && (
              <div className="text-sm text-[var(--color-error)]">{restoreMutation.error.message}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[var(--color-error)]">⚠️ Clear Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Permanently delete selected data sets.
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="clear-operations"
                checked={clearOperations}
                onChange={(event) => setClearOperations(event.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <label htmlFor="clear-operations" className="text-sm text-[var(--color-text-primary)]">
                Clear operations data
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="clear-taxonomy"
                checked={clearTaxonomy}
                onChange={(event) => setClearTaxonomy(event.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <label htmlFor="clear-taxonomy" className="text-sm text-[var(--color-text-primary)]">
                Clear taxonomy data
              </label>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setPendingClearOptions({ clearOperations, clearTaxonomy });
                setShowClearConfirm(true);
              }}
              disabled={!clearOperations && !clearTaxonomy}
            >
              Clear selected data
            </Button>
            {clearDataMutation.error && (
              <div className="text-sm text-[var(--color-error)]">{clearDataMutation.error.message}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {showClearConfirm && (
        <ConfirmModal
          open
          title="Delete selected data?"
          description={`This will permanently delete ${[
            pendingClearOptions?.clearOperations ? "operations" : null,
            pendingClearOptions?.clearTaxonomy ? "taxonomy" : null,
          ]
            .filter(Boolean)
            .join(" and ")}. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleClearData}
          onCancel={() => {
            setShowClearConfirm(false);
            setPendingClearOptions(null);
          }}
          loading={clearDataMutation.isPending}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@components/ui";
import { logger } from "@lib/logger";
import ConfirmModal from "@components/ui/confirm-modal";

export default function DatabaseSettingsPage() {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  // Backup options
  const [includeTaxonomyAndOperations, setIncludeTaxonomyAndOperations] = useState(true);
  const [includeUsersAndGroups, setIncludeUsersAndGroups] = useState(false);
  // Restore options
  const [restoreTaxonomyAndOperations, setRestoreTaxonomyAndOperations] = useState(true);
  const [restoreUsersAndGroups, setRestoreUsersAndGroups] = useState(false);
  const [clearBefore, setClearBefore] = useState(true);
  const [clearOperations, setClearOperations] = useState(false);
  const [clearTaxonomy, setClearTaxonomy] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // typed confirm state removed in favor of ConfirmModal
  
  // Store confirmation state for mutations
  const [pendingClearOptions, setPendingClearOptions] = useState<{clearOperations: boolean, clearTaxonomy: boolean} | null>(null);

  const utils = api.useUtils();

  // Queries
  const { data: stats, refetch: refetchStats } = api.database.getStats.useQuery();

  // Mutations
  const backupMutation = api.database.backup.useMutation({
    onSuccess: (data) => {
      // Create and download backup file
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttpx-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const restoreMutation = api.database.restore.useMutation({
    onSuccess: () => {
      void refetchStats();
      void utils.invalidate();
      setRestoreFile(null);
      setShowRestoreConfirm(false);
      // noop
    },
  });

  const clearDataMutation = api.database.clearData.useMutation({
    onSuccess: () => {
      void refetchStats();
      void utils.invalidate();
      setShowClearConfirm(false);
      setClearOperations(false);
      setClearTaxonomy(false);
      // noop
      setPendingClearOptions(null);
    },
  });

  const handleRestore = async () => {
    if (!restoreFile) return;

    try {
      const text = await restoreFile.text();
      restoreMutation.mutate({ 
        backupData: text,
        restoreTaxonomyAndOperations,
        restoreUsersAndGroups,
        clearBefore,
      });
    } catch (error) {
      logger.error("Failed to read file:", error);
    }
  };

  const handleClearData = () => {
    if (!pendingClearOptions) return;
    clearDataMutation.mutate(pendingClearOptions);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Database Management</h1>
      </div>
      {showRestoreConfirm && (
        <ConfirmModal
          open
          title="Restore selected data from backup?"
          description={`This will ${clearBefore ? 'clear and ' : ''}restore ${[
            restoreTaxonomyAndOperations ? 'Taxonomy + Operations' : null,
            restoreUsersAndGroups ? 'Users + Groups' : null,
          ].filter(Boolean).join(' and ')} from the selected backup. This action cannot be undone.`}
          confirmLabel="Restore"
          cancelLabel="Cancel"
          onConfirm={handleRestore}
          onCancel={() => setShowRestoreConfirm(false)}
          loading={restoreMutation.isPending}
        />
      )}

      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Database Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.users}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.operations}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">Operations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.techniques}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">Techniques</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.outcomes}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">Outcomes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.threatActors}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">Threat Actors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.tools}</div>
                <div className="text-sm text-[var(--color-text-secondary)]">Tools</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--color-text-secondary)]">
              Loading statistics...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Backup Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Export selected data to a JSON file.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="backup-tax-ops"
                  checked={includeTaxonomyAndOperations}
                  onChange={(e) => setIncludeTaxonomyAndOperations(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="backup-tax-ops" className="text-sm text-[var(--color-text-primary)]">
                  Include Taxonomy + Operations
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="backup-users-groups"
                  checked={includeUsersAndGroups}
                  onChange={(e) => setIncludeUsersAndGroups(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="backup-users-groups" className="text-sm text-[var(--color-text-primary)]">
                  Include Users + Groups
                </label>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => backupMutation.mutate({
                includeTaxonomyAndOperations,
                includeUsersAndGroups,
                includeMitre: true,
              })}
              disabled={backupMutation.isPending || (!includeTaxonomyAndOperations && !includeUsersAndGroups)}
            >
              {backupMutation.isPending ? "Creating Backup..." : "Download Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Restore selected data from a backup file.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="restore-tax-ops"
                  checked={restoreTaxonomyAndOperations}
                  onChange={(e) => setRestoreTaxonomyAndOperations(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="restore-tax-ops" className="text-sm text-[var(--color-text-primary)]">
                  Restore Taxonomy + Operations
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="restore-users-groups"
                  checked={restoreUsersAndGroups}
                  onChange={(e) => setRestoreUsersAndGroups(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="restore-users-groups" className="text-sm text-[var(--color-text-primary)]">
                  Restore Users + Groups
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="restore-clear"
                  checked={clearBefore}
                  onChange={(e) => setClearBefore(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="restore-clear" className="text-sm text-[var(--color-text-primary)]">
                  Clear selected before restoring
                </label>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
                className="w-full text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRestoreConfirm(true)}
                disabled={!restoreFile || (!restoreTaxonomyAndOperations && !restoreUsersAndGroups)}
              >
                Restore Backup
              </Button>
            </div>
            {restoreMutation.error && (
              <div className="text-sm text-[var(--color-error)]">
                {restoreMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Clear Data */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--color-error)]">⚠️ Clear Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Permanently delete data from your database.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="clear-operations"
                  checked={clearOperations}
                  onChange={(e) => setClearOperations(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="clear-operations" className="text-sm text-[var(--color-text-primary)]">
                  Clear Operations Data
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="clear-taxonomy"
                  checked={clearTaxonomy}
                  onChange={(e) => setClearTaxonomy(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                <label htmlFor="clear-taxonomy" className="text-sm text-[var(--color-text-primary)]">
                  Clear Taxonomy Data
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
                Clear Selected Data
              </Button>
            </div>
            {clearDataMutation.error && (
              <div className="text-sm text-[var(--color-error)]">
                {clearDataMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {showClearConfirm && (
        <ConfirmModal
          open
          title="Delete selected data?"
          description={`This will permanently delete ${[
            pendingClearOptions?.clearOperations ? 'Operations' : null,
            pendingClearOptions?.clearTaxonomy ? 'Taxonomy' : null,
          ].filter(Boolean).join(' and ')}. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleClearData}
          onCancel={() => { setShowClearConfirm(false); setPendingClearOptions(null); }}
          loading={clearDataMutation.isPending}
        />
      )}
    </div>
  );
}

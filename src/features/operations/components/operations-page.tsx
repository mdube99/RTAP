"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Target,
  Eye,
  Shield,
  UserCheck,
  Trash2,
  Globe2,
  Users,
} from "lucide-react";
import { OutcomeType, type OperationStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import CreateOperationModal from "./create-operation-modal";
// eslint-disable-next-line no-restricted-imports -- cross-feature import; consider moving ImportDialog to features/shared
import ImportDialog from "@features/settings/components/import/import-dialog";
import ConfirmModal from "@components/ui/confirm-modal";
import CreateOperationFromActorModal from "./create-operation-from-actor-modal";
import ThreatActorSelector, {
  type ThreatActorForPick,
} from "./threat-actor-selector";
// Render plain text only for safety
import { summarizeTechniqueOutcomeMetrics } from "@/lib/outcomeMetrics";
import {
  operationStatusBadgeVariant,
  operationStatusLabels,
} from "@features/shared/operations/operation-status";
import { formatUTCDate } from "@lib/utcDate";

export default function OperationsPage() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OperationStatus | "ALL">(
    "ALL",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showActorPicker, setShowActorPicker] = useState(false);
  const [selectResetKey, setSelectResetKey] = useState(0);
  const [selectedActor, setSelectedActor] = useState<null | {
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
  }>(null);
  const utils = api.useUtils();

  // Check if user can create/modify operations (Admins and Operators)
  const canModifyOperations =
    session?.user?.role === UserRole.ADMIN ||
    session?.user?.role === UserRole.OPERATOR;

  // Fetch operations with filters
  const { data: operationsData, isLoading } = api.operations.list.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: 50,
  });

  // Fetch tags that the user has access to
  const { data: allTags } = api.taxonomy.tags.list.useQuery();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const operations = operationsData?.operations ?? [];

  // Filter operations by search term and tags
  const filteredOperations = operations.filter((op) => {
    const matchesSearch =
      op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.threatActor?.name ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTagIds.length === 0 ||
      selectedTagIds.some((selectedTagId) =>
        op.tags.some((opTag) => opTag.id === selectedTagId),
      );

    return matchesSearch && matchesTags;
  });

  // Deletion is now handled inside the operation editor modal; remove inline trash can.

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Operations
          </h1>
        </div>
        {canModifyOperations && (
          <div className="flex gap-2">
            <Select
              key={selectResetKey}
              onValueChange={(value) => {
                if (value === "blank") setShowCreateModal(true);
                if (value === "import") setShowImportModal(true);
                if (value === "fromActor") setShowActorPicker(true);
                // Remount the Select to reset to placeholder
                setSelectResetKey((k) => k + 1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <Plus className="mr-2 h-4 w-4" />
                <SelectValue placeholder="New" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank Operation</SelectItem>
                <SelectItem value="fromActor">From Threat Actor…</SelectItem>
                <SelectItem value="import">Import from MITRE…</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-[var(--color-text-muted)]" />
          <Input
            placeholder="Search operations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as OperationStatus | "ALL")
          }
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Tag Filter */}
        {allTags && allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm whitespace-nowrap text-[var(--color-text-muted)]">
              Filter by tags:
            </span>
            {allTags.map((tag: { id: string; name: string; color: string }) => (
              <Badge
                key={tag.id}
                variant={
                  selectedTagIds.includes(tag.id) ? "default" : "secondary"
                }
                className="cursor-pointer transition-opacity hover:opacity-80"
                style={
                  selectedTagIds.includes(tag.id)
                    ? {
                        borderColor: tag.color,
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }
                    : {}
                }
                onClick={() => {
                  setSelectedTagIds((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((id) => id !== tag.id)
                      : [...prev, tag.id],
                  );
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {selectedTagIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTagIds([])}
                className="h-auto px-2 py-1 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Operations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="var(--ring) h-8 w-8 animate-spin rounded-full border-b-2"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOperations.map((operation) => {
            const engagementMap = new Map<
              string,
              { name: string; isCrownJewel: boolean; compromised: boolean }
            >();
            (operation.techniques ?? []).forEach((technique) => {
              (technique.targets ?? []).forEach((assignment) => {
                if (!assignment.target) return;
                const existing = engagementMap.get(assignment.targetId);
                if (existing) {
                  existing.compromised =
                    existing.compromised || assignment.wasCompromised;
                } else {
                  engagementMap.set(assignment.targetId, {
                    name: assignment.target.name,
                    isCrownJewel: assignment.target.isCrownJewel,
                    compromised: assignment.wasCompromised ?? false,
                  });
                }
              });
            });
            const engagedTargets = Array.from(engagementMap.entries()).map(
              ([id, data]) => ({ id, ...data }),
            );
            const compromisedCount = engagedTargets.filter(
              (target) => target.compromised,
            ).length;

            return (
              <Link key={operation.id} href={`/operations/${operation.id}`}>
                <Card className="relative cursor-pointer transition-colors hover:z-10 hover:ring-2 hover:ring-[var(--ring)] hover:ring-offset-1 hover:ring-offset-[var(--color-surface)]">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                            {operation.name}
                          </h3>
                          <Badge
                            variant={
                              operationStatusBadgeVariant[operation.status]
                            }
                          >
                            {operationStatusLabels[operation.status]}
                          </Badge>
                        </div>
                        <div className="mb-4 text-[var(--color-text-secondary)]">
                          {operation.description}
                        </div>
                      </div>

                      {/* Inline delete control (bottom-right), stops navigation */}
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {/* Left: Operation Details */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          {operation.visibility === "EVERYONE" ? (
                            <Globe2 className="h-4 w-4 text-[var(--color-text-muted)]" />
                          ) : (
                            <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
                          )}
                          <span className="text-[var(--color-text-secondary)]">
                            <strong>Visibility:</strong>{" "}
                            {operation.visibility === "EVERYONE"
                              ? "Everyone"
                              : operation.accessGroups.length > 0
                                ? operation.accessGroups
                                    .map(({ group }) => group.name)
                                    .join(", ")
                                : "Restricted"}
                          </span>
                        </div>

                        {operation.threatActor && (
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4 text-[var(--color-text-muted)]" />
                            <span className="text-[var(--color-text-secondary)]">
                              <strong>Emulating:</strong>{" "}
                              {operation.threatActor.name}
                            </span>
                          </div>
                        )}

                        {operation.targets.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <Target className="mt-0.5 h-4 w-4 text-[var(--color-text-muted)]" />
                            <span className="text-[var(--color-text-secondary)]">
                              <strong>Targets:</strong>{" "}
                              {operation.targets
                                .map((target) =>
                                  target.isCrownJewel
                                    ? `${target.name} (CJ)`
                                    : target.name,
                                )
                                .join(", ")}
                            </span>
                          </div>
                        )}

                        {engagedTargets.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <Target className="h-4 w-4 text-[var(--color-text-muted)]" />
                            <span>
                              <strong>Engaged:</strong>{" "}
                              {engagedTargets.length === 1
                                ? "1 target"
                                : `${engagedTargets.length} targets`}
                            </span>
                            {compromisedCount > 0 && (
                              <span className="text-[var(--color-error)]">
                                <strong>Compromised:</strong>{" "}
                                {compromisedCount === 1
                                  ? "1 target"
                                  : `${compromisedCount} targets`}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
                          <span className="text-[var(--color-text-secondary)]">
                            {operation.startDate
                              ? formatUTCDate(operation.startDate)
                              : "Not scheduled"}
                          </span>
                        </div>

                        <div className="text-sm text-[var(--color-text-muted)]">
                          {operation.techniqueCount ?? 0} techniques
                        </div>
                      </div>

                      {/* Center: Tags */}
                      <div className="space-y-2">
                        {operation.tags.length > 0 && (
                          <>
                            <h4 className="text-sm font-medium text-[var(--color-text-muted)]">
                              Tags
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {operation.tags.map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="secondary"
                                  className="text-xs"
                                  style={{
                                    borderColor: tag.color,
                                    color: tag.color,
                                  }}
                                >
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right: Metrics */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-[var(--color-text-muted)]">
                          Metrics
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const metrics = summarizeTechniqueOutcomeMetrics(
                              operation.techniques ?? [],
                            );
                            const detection = metrics[OutcomeType.DETECTION];
                            const prevention = metrics[OutcomeType.PREVENTION];
                            const attribution =
                              metrics[OutcomeType.ATTRIBUTION];

                            return (
                              <>
                                {detection.attempts > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                                    <Eye className="h-3 w-3" />
                                    <span className="font-bold">
                                      {detection.successRate}%
                                    </span>
                                  </div>
                                )}
                                {prevention.attempts > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                                    <Shield className="h-3 w-3" />
                                    <span className="font-bold">
                                      {prevention.successRate}%
                                    </span>
                                  </div>
                                )}
                                {attribution.attempts > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                                    <UserCheck className="h-3 w-3" />
                                    <span className="font-bold">
                                      {attribution.successRate}%
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    {canModifyOperations && (
                      <OperationCardDelete id={operation.id} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {filteredOperations.length === 0 && !isLoading && (
        <div className="py-12 text-center">
          <div className="mb-4 text-[var(--color-text-muted)]">
            {searchTerm || statusFilter !== "ALL"
              ? "No operations found matching your filters"
              : "No operations created yet"}
          </div>
          <Button onClick={() => setShowCreateModal(true)} variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Create First Operation
          </Button>
        </div>
      )}

      {/* Create Operation Modal */}
      <CreateOperationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          void utils.operations.list.invalidate();
        }}
      />

      {/* Import Operations Dialog */}
      {showImportModal && (
        <ImportDialog
          kind="operation"
          open={true}
          onClose={() => setShowImportModal(false)}
          onImported={() => void utils.operations.list.invalidate()}
        />
      )}

      {/* Pick Threat Actor dialog */}
      {showActorPicker && (
        <ThreatActorSelector
          open
          onClose={() => setShowActorPicker(false)}
          onPick={(actor: ThreatActorForPick) => {
            setSelectedActor(actor);
            setShowActorPicker(false);
          }}
        />
      )}

      {/* Create from picked Threat Actor */}
      {selectedActor && (
        <CreateOperationFromActorModal
          actor={selectedActor}
          onClose={() => setSelectedActor(null)}
        />
      )}
    </div>
  );
}

function OperationCardDelete({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const del = api.operations.delete.useMutation({
    onSuccess: () => {
      void utils.operations.list.invalidate();
      setOpen(false);
    },
  });

  return (
    <div
      className="absolute right-3 bottom-3"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Delete operation"
        className="text-[var(--color-text-muted)]"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {open && (
        <ConfirmModal
          open
          title="Delete operation?"
          description="Delete this operation and all related data? This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => del.mutate({ id })}
          onCancel={() => setOpen(false)}
          loading={del.isPending}
        />
      )}
    </div>
  );
}

// ActorPicker extracted to components/selectors/ThreatActorSelector

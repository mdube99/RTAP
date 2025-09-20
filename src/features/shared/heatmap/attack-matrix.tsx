"use client";

import { useMemo, useState } from "react";
import { tacticOrderIndex } from "@lib/mitreOrder";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@components/ui";
import { Activity, CheckCircle, Eye, Shield, UserCheck, X } from "lucide-react";

export interface SubTechRow {
  id: string;
  name: string;
  executed?: boolean;
  executedStatus?: 'completed' | 'inProgress' | 'not';
  executionSuccess?: boolean | null;
  // Operation view outcome booleans (null/undefined -> N/A)
  detectionSuccess?: boolean | null;
  preventionSuccess?: boolean | null;
  attributionSuccess?: boolean | null;
  detectionRate?: number;
  preventionRate?: number;
  attributionRate?: number;
  // Analytics availability flags (hide icons when N/A)
  detectionAvailable?: boolean;
  preventionAvailable?: boolean;
  attributionAvailable?: boolean;
}

export interface TechniqueRow {
  techniqueId: string;
  techniqueName: string;
  tacticId: string;
  tacticName: string;
  executed?: boolean;
  executedStatus?: 'completed' | 'inProgress' | 'not';
  executionSuccess?: boolean | null;
  executionCount?: number;
  detectionRate?: number;
  detectionAvailable?: boolean;
  preventionRate?: number;
  preventionAvailable?: boolean;
  attributionRate?: number;
  attributionAvailable?: boolean;
  // Operation view outcome booleans (null/undefined -> N/A)
  detectionSuccess?: boolean | null;
  preventionSuccess?: boolean | null;
  attributionSuccess?: boolean | null;
  subTechs?: SubTechRow[];
  sortOrder?: number; // optional for operation view ordering
}

interface Props {
  rows: TechniqueRow[];
  mode: "operation" | "analytics";
  title: string;
  splitSubTechniques?: boolean;
  onToggleSplit?: (value: boolean) => void;
}

export function AttackMatrix({ rows, mode, title, splitSubTechniques = false, onToggleSplit }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const tactics = useMemo(() => {
    const map = new Map<string, { tacticId: string; tacticName: string; rows: TechniqueRow[] }>();
    for (const r of rows) {
      if (!map.has(r.tacticId)) map.set(r.tacticId, { tacticId: r.tacticId, tacticName: r.tacticName, rows: [] });
      map.get(r.tacticId)!.rows.push(r);
    }
    // Sort by tactic id; within tactic either by sortOrder then name, else by id
    const list = Array.from(map.values())
      .filter(t => t.rows.length > 0)
      .sort((a, b) => {
        const orderDiff = tacticOrderIndex(a.tacticId) - tacticOrderIndex(b.tacticId);
        if (orderDiff !== 0) return orderDiff;
        return a.tacticId.localeCompare(b.tacticId);
      });
    list.forEach(t => t.rows.sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.techniqueId.localeCompare(b.techniqueId);
    }));
    return list;
  }, [rows]);

  const getCellColor = (executedOrCount: boolean | number | undefined, status?: 'completed' | 'inProgress' | 'not') => {
    if (status) {
      if (status === 'completed') return "bg-[var(--color-surface-elevated)] border border-[var(--ring)] text-[var(--color-text-primary)] font-semibold";
      if (status === 'inProgress') return "bg-[var(--color-surface-elevated)] border border-[var(--status-warn-fg)] text-[var(--color-text-primary)] font-semibold";
      return "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]";
    }
    const executed = typeof executedOrCount === "number" ? executedOrCount > 0 : !!executedOrCount;
    if (!executed) return "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]";
    return "bg-[var(--color-surface-elevated)] border border-[var(--ring)] text-[var(--color-text-primary)] font-semibold";
  };

  // Determine if any sub-technique will actually render analytics metrics.
  // We only hide parent analytics metrics when at least one sub-tech displays metrics.
  const hasSubAnalytics = (row: TechniqueRow): boolean => {
    if (!splitSubTechniques) return false;
    const subs = row.subTechs ?? [];
    return subs.some((st) => {
      const flags = [
        st.detectionAvailable && typeof st.detectionRate === 'number',
        st.preventionAvailable && typeof st.preventionRate === 'number',
        st.attributionAvailable && typeof st.attributionRate === 'number',
      ];
      return flags.some(Boolean);
    });
  };

  return (
    <div className={isExpanded ? 'fixed inset-0 z-50 bg-[var(--color-surface)] p-6' : ''}>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onToggleSplit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onToggleSplit(!splitSubTechniques)}
              >
                {splitSubTechniques ? "Hide Sub-techniques" : "Show Sub-techniques"}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Exit Fullscreen" : "Expand View"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`overflow-x-auto overflow-y-auto ${isExpanded ? 'max-h-[calc(100vh-12rem)]' : 'max-h-[700px]'}`}
          data-export-unbounded
        >
          <div className="min-w-max">
            <div className="flex mb-4 gap-2 sticky top-0 bg-[var(--color-surface)] z-10">
              {tactics.map(t => (
                <div key={t.tacticId} className="w-[220px] flex-shrink-0">
                  <div className="w-[220px] h-[72px] p-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-t text-center flex flex-col justify-center">
                    <div className="text-xs font-bold text-[var(--color-accent)] mb-1">{t.tacticId}</div>
                    <div className="text-xs text-[var(--color-text-primary)] font-medium line-clamp-2 break-words">{t.tacticName}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {tactics.map(t => (
                <div key={t.tacticId} className="w-[220px] flex-shrink-0">
                  <div className="space-y-1">
                    {t.rows.map(row => (
                      <div
                        key={`${row.techniqueId}-${row.executionSuccess ?? "na"}`}
                        className={`w-[220px] p-2 rounded text-xs transition-all duration-200 ${getCellColor(
                          row.executed ?? row.executionCount,
                          mode === "operation" ? row.executedStatus : undefined,
                        )}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-mono font-medium text-xs flex-shrink-0 opacity-90">{row.techniqueId}</div>
                          <div className="flex items-center gap-1">
                            {mode === "operation" && (
                              <>
                                {row.executionSuccess === true ? (
                                  <CheckCircle className="w-3 h-3 text-[var(--status-success-fg)]" />
                                ) : row.executionSuccess === false ? (
                                  <X className="w-3 h-3 text-[var(--status-error-fg)]" />
                                ) : null}
                                {row.executionCount && row.executionCount > 1 ? (
                                  <span className="text-xs font-bold">{row.executionCount}×</span>
                                ) : null}
                              </>
                            )}
                            {mode === "analytics" && row.executionCount ? (
                              <span className="text-xs font-bold">{row.executionCount}×</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-xs leading-tight mb-1 overflow-hidden">
                          <div className="line-clamp-2 break-words">{row.techniqueName}</div>
                        </div>
                        {/* Operation outcomes (success/fail) */}
                        {mode === 'operation' && (
                          <div className="flex items-center gap-2 text-[10px] opacity-90">
                            {row.detectionSuccess !== null && row.detectionSuccess !== undefined && (
                              <div className="flex items-center gap-1">
                                <Eye className={`w-3 h-3 ${row.detectionSuccess ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                              </div>
                            )}
                            {row.preventionSuccess !== null && row.preventionSuccess !== undefined && (
                              <div className="flex items-center gap-1">
                                <Shield className={`w-3 h-3 ${row.preventionSuccess ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                              </div>
                            )}
                            {row.attributionSuccess !== null && row.attributionSuccess !== undefined && (
                              <div className="flex items-center gap-1">
                                <UserCheck className={`w-3 h-3 ${row.attributionSuccess ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                              </div>
                            )}
                          </div>
                        )}
                        {/* Analytics percentages */}
                        {mode === 'analytics' && (row.executionCount ?? 0) > 0 && !hasSubAnalytics(row) && (
                          <div className="flex items-center gap-2 text-[10px] opacity-80 mt-1">
                            {row.detectionAvailable && typeof row.detectionRate === 'number' && (
                              <div className="flex items-center gap-1">
                                <Eye className={`w-3 h-3 ${row.detectionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                <span>{row.detectionRate}%</span>
                              </div>
                            )}
                            {row.preventionAvailable && typeof row.preventionRate === 'number' && (
                              <div className="flex items-center gap-1">
                                <Shield className={`w-3 h-3 ${row.preventionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                <span>{row.preventionRate}%</span>
                              </div>
                            )}
                            {row.attributionAvailable && typeof row.attributionRate === 'number' && (
                              <div className="flex items-center gap-1">
                                <UserCheck className={`w-3 h-3 ${row.attributionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                <span>{row.attributionRate}%</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Inline chips when not splitting */}
                        {!splitSubTechniques && (row.subTechs?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.subTechs!.slice(0, 2).map(st => (
                              <span key={st.id} className={`px-1 py-0.5 rounded border text-[10px] ${st.executed ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                .{st.id.split(".")[1] ?? st.id}
                              </span>
                            ))}
                            {(row.subTechs!.length > 2) && (
                              <span className="px-1 py-0.5 rounded border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">+{row.subTechs!.length - 2}</span>
                            )}
                          </div>
                        )}

                        {/* Expanded sub-tech rows as child cards */}
                        {splitSubTechniques && (row.subTechs?.length ?? 0) > 0 && (
                          <div className="mt-1 relative pl-2 overflow-visible">
                            <div className="pointer-events-none absolute left-0 top-0 bottom-0 border-l border-[var(--color-border)]" />
                            <div className="space-y-1">
                              {row.subTechs!.map(st => (
                                <div key={st.id} className={`relative ml-2 p-2 rounded text-xs ${getCellColor(st.executed ?? (typeof st.detectionRate === 'number' ? st.detectionRate : 0), mode === 'operation' ? st.executedStatus : undefined)}`}>
                                  <div className="pointer-events-none absolute left-0 top-3 w-2 h-px bg-[var(--color-border)]" />
                                  {/* Header: ID on left, executed check on right */}
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-mono font-bold text-[11px] flex-shrink-0">{st.id}</div>
                                    {mode === 'operation' && (
                                      st.executionSuccess === true ? (
                                        <CheckCircle className="w-3 h-3 text-[var(--status-success-fg)]" />
                                      ) : st.executionSuccess === false ? (
                                        <X className="w-3 h-3 text-[var(--status-error-fg)]" />
                                      ) : null
                                    )}
                                  </div>
                                  {/* Name */}
                                  <div className="text-[11px] leading-tight mb-1 overflow-hidden">
                                    <div className="line-clamp-2 break-words opacity-90">{st.name}</div>
                                  </div>
                                  {/* Bottom metrics row */}
                                  {mode === 'operation' ? (
                                    <div className="flex items-center gap-2 text-[10px] opacity-90">
                                      {st.detectionSuccess !== null && st.detectionSuccess !== undefined && (
                                        <div className="flex items-center gap-1">
                                          <Eye className={`w-3 h-3 ${st.detectionSuccess ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                        </div>
                                      )}
                                      {st.preventionSuccess !== null && st.preventionSuccess !== undefined && (
                                        <div className="flex items-center gap-1">
                                          <Shield className={`w-3 h-3 ${st.preventionSuccess ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                        </div>
                                      )}
                                      {st.attributionSuccess !== null && st.attributionSuccess !== undefined && (
                                        <div className="flex items-center gap-1">
                                          <UserCheck className={`w-3 h-3 ${st.attributionSuccess ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    (st.detectionAvailable || st.preventionAvailable || st.attributionAvailable) ? (
                                      <div className="flex items-center gap-2 text-[10px] opacity-80 mt-1">
                                        {st.detectionAvailable && typeof st.detectionRate === 'number' && (
                                          <div className="flex items-center gap-1">
                                            <Eye className={`w-3 h-3 ${st.detectionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                            <span>{st.detectionRate}%</span>
                                          </div>
                                        )}
                                        {st.preventionAvailable && typeof st.preventionRate === 'number' && (
                                          <div className="flex items-center gap-1">
                                            <Shield className={`w-3 h-3 ${st.preventionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                            <span>{st.preventionRate}%</span>
                                          </div>
                                        )}
                                        {st.attributionAvailable && typeof st.attributionRate === 'number' && (
                                          <div className="flex items-center gap-1">
                                            <UserCheck className={`w-3 h-3 ${st.attributionRate > 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`} />
                                            <span>{st.attributionRate}%</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          {mode === 'operation' ? (
            <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>Detection</span>
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>Prevention</span>
              </span>
              <span className="flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                <span>Attribution</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
              <span>Legend: Percentages per executed technique</span>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> Detection %</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Prevention %</span>
              <span className="flex items-center gap-1"><UserCheck className="w-4 h-4" /> Attribution %</span>
            </div>
          )}
        </div>
        {mode === 'operation' && (
          <div className="mt-4 text-xs text-[var(--color-text-muted)] flex items-center gap-6">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-[var(--status-success-fg)]" />
              <span>Success</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="w-3 h-3 text-[var(--status-error-fg)]" />
              <span>Failure</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

export default AttackMatrix;

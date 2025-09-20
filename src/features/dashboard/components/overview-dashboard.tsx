"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OutcomeType } from "@prisma/client";
import {
  ArrowRight,
  Clock,
  Target,
  Eye,
  Shield,
  UserCheck
} from "lucide-react";
// Theme toggle now lives in sidebar user section (compact variant)
import { formatDuration } from "@/lib/formatDuration";
import { summarizeTechniqueOutcomeMetrics } from "@/lib/outcomeMetrics";
import { operationStatusBadgeVariant, operationStatusLabels } from "@features/shared/operations/operation-status";

export default function OverviewDashboard() {
  // Fetch dashboard data using new analytics router
  const { data: dashboardData, isLoading: dashboardLoading } = api.analytics.summary.dashboard.useQuery();
  const { data: operations, isLoading: operationsLoading } = api.operations.list.useQuery({
    limit: 5
  });
  
  // Extract data from dashboard summary
  const operationStats = dashboardData?.operations;
  const defensiveMetrics = dashboardData?.outcomes;
  const timingMetrics = dashboardData?.timing;
  const statsLoading = dashboardLoading;
  const metricsLoading = dashboardLoading;
  const timingLoading = dashboardLoading;

  if (statsLoading || metricsLoading || timingLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  // Safely access operations data with fallback
  const recentOperations = operations?.operations ?? [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Dashboard Overview
          </h1>
        </div>
        {/* Right side actions intentionally minimal */}
      </div>

      {/* Operation Status KPIs - Neutral cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Total Operations</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {operationStats?.total ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Active</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {operationStats?.active ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Completed</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {operationStats?.completed ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Planning</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {operationStats?.planning ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Defensive Effectiveness KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Eye className="w-5 h-5 text-[var(--color-accent)]" />
              Detection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              {defensiveMetrics?.detectionRate !== null && defensiveMetrics?.detectionRate !== undefined 
                ? `${defensiveMetrics.detectionRate}%` 
                : 'N/A'}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {defensiveMetrics?.detectionAttempts ? 'Across all operations' : 'No detection outcomes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--color-accent)]" />
              Prevention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              {defensiveMetrics?.preventionRate !== null && defensiveMetrics?.preventionRate !== undefined 
                ? `${defensiveMetrics.preventionRate}%` 
                : 'N/A'}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {defensiveMetrics?.preventionAttempts ? 'Across all operations' : 'No prevention outcomes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[var(--color-accent)]" />
              Attribution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              {defensiveMetrics?.attributionRate !== null && defensiveMetrics?.attributionRate !== undefined 
                ? `${defensiveMetrics.attributionRate}%` 
                : 'N/A'}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {defensiveMetrics?.attributionAttempts ? 'Across all operations' : 'No attribution outcomes'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Response Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-accent)]" />
              Average Time to Detect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              {timingMetrics?.avgTimeToDetect ? formatDuration(timingMetrics.avgTimeToDetect, "short") : "N/A"}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {timingMetrics?.avgTimeToDetect ? "On average" : "No timing data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-accent)]" />
              Average Time to Attribute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              {timingMetrics?.avgTimeToAttribute ? formatDuration(timingMetrics.avgTimeToAttribute, "short") : "N/A"}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {timingMetrics?.avgTimeToAttribute ? "On average" : "No timing data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)]">
              Recent Operations
            </CardTitle>
            <Link href="/operations">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {operationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent)]"></div>
            </div>
          ) : recentOperations.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
              <p className="text-[var(--color-text-muted)]">
                No operations yet. Create your first operation to get started.
              </p>
              <Link href="/operations" className="mt-4 inline-block">
                <Button variant="secondary">Create Operation</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentOperations.map((operation) => (
                <Link key={operation.id} href={`/operations/${operation.id}`}>
                  <div className="flex flex-col p-3 rounded-lg border border-[var(--color-border)] hover:ring-2 hover:ring-[var(--ring)] hover:border-transparent transition-colors cursor-pointer h-full">
                    <h3 className="font-medium text-[var(--color-text-primary)] truncate mb-2">
                      {operation.name}
                    </h3>
                    <div className="space-y-2 flex-1">
                      <Badge variant={operationStatusBadgeVariant[operation.status]}>
                        {operationStatusLabels[operation.status]}
                      </Badge>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {operation.techniqueCount ?? 0} techniques
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Clock className="w-3 h-3" />
                        {operation.startDate ? new Date(operation.startDate).toLocaleDateString() : 'Not scheduled'}
                      </div>
                      {(() => {
                        const metrics = summarizeTechniqueOutcomeMetrics(operation.techniques ?? []);
                        const detection = metrics[OutcomeType.DETECTION];
                        const prevention = metrics[OutcomeType.PREVENTION];
                        const attribution = metrics[OutcomeType.ATTRIBUTION];

                        return (
                          <div className="flex gap-2 mt-1">
                            {detection.attempts > 0 && (
                              <div className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                                <Eye className="w-3 h-3" />
                                <span className="font-bold">{detection.successRate}%</span>
                              </div>
                            )}
                            {prevention.attempts > 0 && (
                              <div className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                                <Shield className="w-3 h-3" />
                                <span className="font-bold">{prevention.successRate}%</span>
                              </div>
                            )}
                            {attribution.attempts > 0 && (
                              <div className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                                <UserCheck className="w-3 h-3" />
                                <span className="font-bold">{attribution.successRate}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

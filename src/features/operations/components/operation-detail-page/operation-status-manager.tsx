"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, CheckCircle, X, Calendar, Clock } from "lucide-react";
import type { ComponentType } from "react";
import { OperationStatus } from "@prisma/client";
import { type RouterOutputs } from "@/trpc/react";

type Operation = RouterOutputs["operations"]["getById"];

interface Props {
  operation: Operation;
}

type StatusVariant = 'warning' | 'info' | 'success' | 'error';
const statusConfig: Record<OperationStatus, { label: string; color: StatusVariant; icon: ComponentType<{ className?: string }>; description: string; nextStates: OperationStatus[] }> = {
  [OperationStatus.PLANNING]: {
    label: "Planning",
    color: "warning",
    icon: Clock,
    description: "Operation is being planned and prepared",
    nextStates: [OperationStatus.ACTIVE, OperationStatus.CANCELLED],
  },
  [OperationStatus.ACTIVE]: {
    label: "Active",
    color: "info", 
    icon: Play,
    description: "Operation is currently being executed",
    nextStates: [OperationStatus.COMPLETED, OperationStatus.CANCELLED],
  },
  [OperationStatus.COMPLETED]: {
    label: "Completed",
    color: "success",
    icon: CheckCircle,
    description: "Operation has been successfully completed",
    nextStates: [], // Terminal state
  },
  [OperationStatus.CANCELLED]: {
    label: "Cancelled",
    color: "error",
    icon: X,
    description: "Operation was cancelled before completion",
    nextStates: [OperationStatus.PLANNING], // Can restart planning
  },
};

export default function OperationStatusManager({ operation }: Props) {
  const [isChanging, setIsChanging] = useState(false);
  const [newStatus, setNewStatus] = useState<OperationStatus | "">("");

  const utils = api.useUtils();
  const updateOperation = api.operations.update.useMutation({
    onSuccess: () => {
      void utils.operations.getById.invalidate({ id: operation.id });
      void utils.operations.list.invalidate();
      setIsChanging(false);
      setNewStatus("");
    },
  });

  const currentConfig = statusConfig[operation.status];
  const CurrentIcon = currentConfig.icon;

  const handleStatusChange = () => {
    if (!newStatus) return;
    
    const updates: {
      status: OperationStatus;
      startDate?: Date;
      endDate?: Date;
    } = {
      status: newStatus,
    };

    // Auto-set dates based on status transitions
    if (newStatus === OperationStatus.ACTIVE && !operation.startDate) {
      updates.startDate = new Date();
    }
    
    if (newStatus === OperationStatus.COMPLETED && !operation.endDate) {
      updates.endDate = new Date();
    }

    updateOperation.mutate({
      id: operation.id,
      ...updates,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CurrentIcon className="w-5 h-5" />
          Operation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant={currentConfig.color}>
              {currentConfig.label}
            </Badge>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {currentConfig.description}
            </span>
          </div>
          
          {/* Status Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {operation.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-secondary)]">
                  Created: {new Date(operation.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {operation.startDate && (
              <div className="flex items-center gap-2 text-sm">
                <Play className="w-4 h-4" style={{ color: "var(--status-info-fg)" }} />
                <span className="text-[var(--color-text-secondary)]">
                  Started: {new Date(operation.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {operation.endDate && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4" style={{ color: "var(--status-success-fg)" }} />
                <span className="text-[var(--color-text-secondary)]">
                  Ended: {new Date(operation.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Change Controls */}
        {currentConfig.nextStates.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
              Change Status
            </h4>
            
            {!isChanging ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChanging(true)}
                className="w-full"
              >
                Update Status
              </Button>
            ) : (
              <div className="space-y-3">
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OperationStatus | "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {currentConfig.nextStates.map((status) => {
                      const config = statusConfig[status];
                      const StatusIcon = config.icon;
                      return (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {newStatus && (
                  <div className="p-3 bg-[var(--color-surface-elevated)] rounded-lg">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {statusConfig[newStatus].description}
                    </p>
                    {newStatus === OperationStatus.ACTIVE && !operation.startDate && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        • Start date will be set to today
                      </p>
                    )}
                    {newStatus === OperationStatus.COMPLETED && !operation.endDate && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        • End date will be set to today
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsChanging(false);
                      setNewStatus("");
                    }}
                    disabled={updateOperation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStatusChange}
                    disabled={!newStatus || updateOperation.isPending}
                    variant="secondary" className="flex-1"
                  >
                    {updateOperation.isPending ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {currentConfig.nextStates.length === 0 && (
          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              This operation is in a final state and cannot be changed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

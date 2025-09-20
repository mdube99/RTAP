"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableTechniqueCard from "./sortable-technique-card";
import type { RouterOutputs } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { useTechniqueDnD } from "./useTechniqueDnD";

type Operation = RouterOutputs["operations"]["getById"];

interface TechniqueListProps {
  operation: Operation;
  operationId: number;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onAddTechnique: () => void;
}

export default function TechniqueList({ operation, operationId, canEdit, onEdit, onAddTechnique }: TechniqueListProps) {
  const { sensors, handleDragEnd } = useTechniqueDnD(operation, operationId);

  if (operation.techniques.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Target className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)] mb-4">
            No techniques added yet. Click &quot;Add Technique&quot; to select from MITRE ATT&amp;CK framework.
          </p>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={onAddTechnique}>
              Add First Technique
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (canEdit) {
    return (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={operation.techniques.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {operation.techniques.map((technique) => (
              <SortableTechniqueCard key={technique.id} technique={technique} onEdit={onEdit} canEdit={canEdit} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className="space-y-4">
      {operation.techniques.map((technique) => (
        <SortableTechniqueCard key={technique.id} technique={technique} canEdit={false} />
      ))}
    </div>
  );
}

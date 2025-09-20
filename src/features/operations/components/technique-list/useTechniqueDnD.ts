"use client";

import { useCallback } from "react";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { api, type RouterOutputs } from "@/trpc/react";

type Operation = RouterOutputs["operations"]["getById"];

export function useTechniqueDnD(operation: Operation | undefined, operationId: number) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const utils = api.useUtils();
  const reorderTechniques = api.techniques.reorder.useMutation({
    onSuccess: () => {
      void utils.operations.getById.invalidate({ id: operationId });
    },
  });

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!operation || !over) return;
    if (active.id === over.id) return;

    const oldIndex = operation.techniques.findIndex((t) => t.id === active.id);
    const newIndex = operation.techniques.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(operation.techniques, oldIndex, newIndex);
    const techniqueIds = reordered.map((t) => t.id);
    reorderTechniques.mutate({ operationId, techniqueIds });
  }, [operation, operationId, reorderTechniques]);

  return { sensors, handleDragEnd };
}


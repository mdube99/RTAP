"use client";

/**
 * Shared types for the Technique Editor components.
 * Keep this minimal and UI-focused; server types should live in routers.
 */

export interface SelectedTechnique {
  tactic: {
    id: string;
    name: string;
  };
  technique: {
    id: string;
    name: string;
    description: string;
    url?: string | null;
  };
  subTechnique?: {
    id: string;
    name: string;
    description: string;
    url?: string | null;
  };
}

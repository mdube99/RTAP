import type { TechniqueItem } from "@features/shared/techniques/technique-lists";

export type MitreTechniqueDTO = {
  id: string;
  name: string;
  description: string;
  url?: string | null;
  tactic?: { id: string; name: string } | null;
  subTechniques?: { id: string; name: string; description: string; url?: string | null }[];
};

export function buildTechniqueMap(list: MitreTechniqueDTO[] | undefined | null): Map<string, TechniqueItem> {
  const map = new Map<string, TechniqueItem>();
  (list ?? []).forEach((t) => {
    map.set(t.id, {
      id: t.id,
      name: t.name,
      description: t.description,
      tactic: t.tactic ?? null,
      url: t.url ?? null,
    });
    (t.subTechniques ?? []).forEach((st) => {
      map.set(st.id, {
        id: st.id,
        name: st.name,
        description: st.description,
        tactic: t.tactic ?? null,
        url: st.url ?? null,
      });
    });
  });
  return map;
}

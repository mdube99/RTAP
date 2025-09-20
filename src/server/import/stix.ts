import { readFileSync } from "fs";
import { join } from "path";

// Minimal STIX 2.1 types for our usage
export interface StixBundle {
  type: "bundle";
  id: string;
  spec_version?: string;
  objects: StixObject[];
}

export interface StixObject {
  type: string;
  id: string;
  name?: string;
  description?: string;
  external_references?: Array<{ source_name?: string; external_id?: string; url?: string }>;
  kill_chain_phases?: Array<{ kill_chain_name: string; phase_name: string }>;
  relationship_type?: string;
  source_ref?: string;
  target_ref?: string;
}

export type CandidateActor = {
  key: string; // stable per bundle session (use STIX id)
  name: string;
  description: string;
  techniqueIds: string[]; // ATT&CK technique or sub-technique IDs (e.g., T1566, T1059.001)
};

export type CandidateOperation = {
  key: string; // STIX id
  name: string;
  description: string;
  techniques: Array<{ techniqueId: string; tacticId?: string; description: string }>;
};

export function loadLocalEnterpriseBundle(): StixBundle {
  const path = join(process.cwd(), "data/mitre/enterprise-attack.json");
  const raw = readFileSync(path, "utf-8");
  const bundle = JSON.parse(raw) as StixBundle;
  if (bundle.type !== "bundle" || !Array.isArray(bundle.objects)) {
    throw new Error("Invalid STIX bundle format");
  }
  return bundle;
}

function getAttackExternalId(obj: StixObject): string | undefined {
  const ref = obj.external_references?.find((r) => r.source_name === "mitre-attack");
  return ref?.external_id;
}

export function extractActorCandidates(bundle: StixBundle): CandidateActor[] {
  const byId = new Map<string, StixObject>();
  for (const obj of bundle.objects) byId.set(obj.id, obj);

  const actors = bundle.objects.filter((o) => o.type === "intrusion-set" || o.type === "threat-actor");
  const relationships = bundle.objects.filter((o) => o.type === "relationship");

  const results: CandidateActor[] = [];
  for (const actor of actors) {
    const uses = relationships.filter(
      (rel) => rel.relationship_type === "uses" && rel.source_ref === actor.id && byId.get(rel.target_ref ?? "")?.type === "attack-pattern",
    );
    const tempIds: string[] = [];
    for (const rel of uses) {
      const ap = rel.target_ref ? byId.get(rel.target_ref) : undefined;
      if (!ap) continue;
      const id = getAttackExternalId(ap);
      if (id?.startsWith("T")) tempIds.push(id);
    }
    const techniqueIds = Array.from(new Set(tempIds));

    results.push({
      key: actor.id,
      name: actor.name ?? "",
      description: actor.description ?? "",
      techniqueIds,
    });
  }
  return results;
}

export function extractOperationCandidates(bundle: StixBundle): CandidateOperation[] {
  const byId = new Map<string, StixObject>();
  for (const obj of bundle.objects) byId.set(obj.id, obj);

  const campaigns = bundle.objects.filter((o) => o.type === "campaign");
  const relationships = bundle.objects.filter((o) => o.type === "relationship");

  const results: CandidateOperation[] = [];
  for (const camp of campaigns) {
    // Find uses relationships from campaign to attack-pattern
    const uses = relationships.filter(
      (rel) => rel.relationship_type === "uses" && rel.source_ref === camp.id && byId.get(rel.target_ref ?? "")?.type === "attack-pattern",
    );

    const techniques = uses
      .map((rel) => {
        const ap = byId.get(rel.target_ref ?? "");
        if (!ap) return null;
        const techniqueId = getAttackExternalId(ap);
        if (!techniqueId?.startsWith("T")) return null;
        const desc = (rel.description ?? ap.description) ?? "";
        return { techniqueId, description: desc };
      })
      .filter((x): x is { techniqueId: string; description: string } => Boolean(x));

    results.push({
      key: camp.id,
      name: camp.name ?? "",
      description: camp.description ?? "",
      techniques,
    });
  }
  return results;
}

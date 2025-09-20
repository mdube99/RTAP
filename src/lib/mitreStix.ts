import { readFileSync } from 'fs';
import { join } from 'path';

// STIX 2.1 minimal types
interface STIXBundle { type: 'bundle'; id: string; objects: STIXObject[] }
interface STIXObject {
  type: string;
  id: string;
  name?: string;
  description?: string;
  external_references?: Array<{ source_name?: string; external_id?: string; url?: string }>;
  kill_chain_phases?: Array<{ kill_chain_name: string; phase_name: string }>;
  x_mitre_is_subtechnique?: boolean;
  x_mitre_deprecated?: boolean;
  x_mitre_revoked?: boolean;
  x_mitre_version?: string;
  x_mitre_attack_spec_version?: string;
  modified?: string;
}

export interface MitreTacticData { id: string; name: string; description: string; url?: string }
export interface MitreTechniqueData { id: string; name: string; description: string; url?: string; tacticId: string }
export interface MitreSubTechniqueData { id: string; name: string; description: string; url?: string; techniqueId: string }

function loadBundle(): STIXBundle {
  const path = join(process.cwd(), 'data/mitre/enterprise-attack.json');
  const raw = readFileSync(path, 'utf-8');
  const bundle = JSON.parse(raw) as STIXBundle;
  if (bundle.type !== 'bundle' || !Array.isArray(bundle.objects)) {
    throw new Error('Invalid STIX bundle');
  }
  return bundle;
}

function mapPhaseNameToTacticId(phaseName: string): string | null {
  const phaseToTacticMap: Record<string, string> = {
    'initial-access': 'TA0001',
    'execution': 'TA0002',
    'persistence': 'TA0003',
    'privilege-escalation': 'TA0004',
    'defense-evasion': 'TA0005',
    'credential-access': 'TA0006',
    'discovery': 'TA0007',
    'lateral-movement': 'TA0008',
    'collection': 'TA0009',
    'exfiltration': 'TA0010',
    'command-and-control': 'TA0011',
    'impact': 'TA0040',
    'reconnaissance': 'TA0043',
    'resource-development': 'TA0042',
  };
  return phaseToTacticMap[phaseName] ?? null;
}

export function getMitreMetadata() {
  const b = loadBundle();
  const collection = b.objects.find((o) => o.type === 'x-mitre-collection');
  return {
    name: (collection as unknown as { name?: string })?.name ?? 'Enterprise ATT&CK',
    version: (collection as unknown as { x_mitre_version?: string })?.x_mitre_version ?? 'unknown',
  };
}

export function getMitreTactics(): MitreTacticData[] {
  const b = loadBundle();
  const tactics = b.objects
    .filter(o => o.type === 'x-mitre-tactic' && !o.x_mitre_deprecated && !o.x_mitre_revoked)
    .map(t => {
      const ref = t.external_references?.find(r => r.source_name === 'mitre-attack');
      return { id: ref?.external_id ?? '', name: t.name ?? '', description: t.description ?? '', url: ref?.url };
    })
    .filter(t => t.id.startsWith('TA'))
    .sort((a, b) => a.id.localeCompare(b.id));
  // Reorder with Recon/Resource first, Impact last
  const order = ['TA0043','TA0042'];
  tactics.sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999) || a.id.localeCompare(b.id));
  return tactics;
}

export function getMitreTechniques(): MitreTechniqueData[] {
  const b = loadBundle();
  const techniques = b.objects
    .filter(o => o.type === 'attack-pattern' && !o.x_mitre_deprecated && !o.x_mitre_revoked)
    .map(t => {
      const ref = t.external_references?.find(r => r.source_name === 'mitre-attack');
      const techniqueId = ref?.external_id ?? '';
      const tactics = t.kill_chain_phases?.filter(p => p.kill_chain_name === 'mitre-attack').map(p => mapPhaseNameToTacticId(p.phase_name)).filter((x): x is string => !!x) ?? [];
      return { id: techniqueId, name: t.name ?? '', description: t.description ?? '', url: ref?.url, tacticIds: tactics, isSub: !!t.x_mitre_is_subtechnique };
    })
    .filter(t => t.id.startsWith('T'));
  const base = techniques.filter(t => !t.isSub).map(t => ({ id: t.id, name: t.name, description: t.description, url: t.url, tacticId: t.tacticIds[0] ?? '' }));
  return base;
}

export function getMitreSubTechniques(): MitreSubTechniqueData[] {
  const b = loadBundle();
  const techniques = b.objects
    .filter(o => o.type === 'attack-pattern' && !o.x_mitre_deprecated && !o.x_mitre_revoked)
    .map(t => {
      const ref = t.external_references?.find(r => r.source_name === 'mitre-attack');
      const techniqueId = ref?.external_id ?? '';
      const isSub = !!t.x_mitre_is_subtechnique;
      const parentId = isSub ? (techniqueId.split('.')[0] ?? '') : undefined;
      return { id: techniqueId, name: t.name ?? '', description: t.description ?? '', url: ref?.url, parentId, isSub };
    })
    .filter(t => t.id.startsWith('T') && t.isSub);
  return techniques.map(st => ({ id: st.id, name: st.name, description: st.description, url: st.url, techniqueId: st.parentId ?? '' }));
}

/**
 * Backward-compatible API that now reads directly from the STIX bundle via mitreStix.
 * This keeps existing imports working without maintaining a separate processed artifact.
 */
import {
  getMitreMetadata as stixGetMitreMetadata,
  getMitreTactics as stixGetMitreTactics,
  getMitreTechniques as stixGetMitreTechniques,
  getMitreSubTechniques as stixGetMitreSubTechniques,
  type MitreTacticData,
  type MitreTechniqueData,
  type MitreSubTechniqueData,
} from "@/lib/mitreStix";

export type { MitreTacticData, MitreTechniqueData, MitreSubTechniqueData };

export function getMitreMetadata() {
  return stixGetMitreMetadata();
}
export function getMitreTactics(): MitreTacticData[] {
  return stixGetMitreTactics();
}
export function getMitreTechniques(): MitreTechniqueData[] {
  return stixGetMitreTechniques();
}
export function getMitreSubTechniques(): MitreSubTechniqueData[] {
  return stixGetMitreSubTechniques();
}

// Matrix type enumeration for future multi-matrix support
export enum MitreMatrix {
  ENTERPRISE = 'enterprise',
  MOBILE = 'mobile',
  ICS = 'ics',
}

/**
 * Future-ready interface for multi-matrix support
 */
export interface MitreMatrixInfo {
  id: MitreMatrix;
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  dataPath: string;
  stixSourcePath: string;
  isImplemented: boolean;
}

/**
 * Registry of available matrices (currently only Enterprise)
 */
export const AVAILABLE_MATRICES: Record<MitreMatrix, MitreMatrixInfo> = {
  [MitreMatrix.ENTERPRISE]: {
    id: MitreMatrix.ENTERPRISE,
    name: 'Enterprise ATT&CK',
    description: 'ATT&CK for Enterprise provides a knowledge base of real-world adversary behavior targeting traditional enterprise networks.',
    version: '17.1', // Will be loaded dynamically
    lastUpdated: '2025-05-06T14:00:00.188Z', // Will be loaded dynamically
    dataPath: 'data/mitre/processed/processed-enterprise-attack.json',
    stixSourcePath: 'data/mitre/enterprise-attack.json',
    isImplemented: true,
  },
  [MitreMatrix.MOBILE]: {
    id: MitreMatrix.MOBILE,
    name: 'Mobile ATT&CK',
    description: 'ATT&CK for Mobile provides a knowledge base of adversary behavior on mobile devices.',
    version: 'Not implemented',
    lastUpdated: 'Not implemented',
    dataPath: 'data/mitre/processed/processed-mobile-attack.json',
    stixSourcePath: 'data/mitre/mobile-attack.json',
    isImplemented: false,
  },
  [MitreMatrix.ICS]: {
    id: MitreMatrix.ICS,
    name: 'ICS ATT&CK',
    description: 'ATT&CK for Industrial Control Systems provides a knowledge base of adversary behavior targeting ICS.',
    version: 'Not implemented',
    lastUpdated: 'Not implemented',
    dataPath: 'data/mitre/processed/processed-ics-attack.json',
    stixSourcePath: 'data/mitre/ics-attack.json',
    isImplemented: false,
  },
};

/**
 * Gets the currently active matrix (default: Enterprise)
 */
export function getCurrentMatrix(): MitreMatrix {
  return MitreMatrix.ENTERPRISE;
}

/**
 * Gets information about all available matrices
 */
export function getAvailableMatrices(): MitreMatrixInfo[] {
  return Object.values(AVAILABLE_MATRICES);
}

/**
 * Gets information about implemented matrices only
 */
export function getImplementedMatrices(): MitreMatrixInfo[] {
  return Object.values(AVAILABLE_MATRICES).filter(matrix => matrix.isImplemented);
}

/**
 * Future function to switch between matrices
 */
export function setCurrentMatrix(matrix: MitreMatrix): void {
  if (!AVAILABLE_MATRICES[matrix].isImplemented) {
    throw new Error(`Matrix ${matrix} is not yet implemented. Only Enterprise is currently supported.`);
  }
  // In the future, this would switch the active data source
  // For now, we'll just validate the matrix exists
}

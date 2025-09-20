/**
 * MITRE Description Processing Utilities
 * 
 * Handles the complex formatting and length issues in MITRE ATT&CK descriptions
 * by extracting clean, concise summaries suitable for UI display.
 */

export interface ProcessedDescription {
  short: string;        // Clean, short description for UI (1-2 sentences)
  full: string;         // Full original description
  hasFormatting: boolean; // Whether original contains markdown/citations
  url?: string;         // Link to official MITRE page
}

/**
 * Extracts a clean, short description from MITRE's verbose descriptions
 */
export function processMitreDescription(
  description: string, 
  url?: string,
  maxLength = 200
): ProcessedDescription {
  
  // Check if description contains markdown or citations
  const hasFormatting = description.includes('[') || 
                       description.includes('(Citation:') ||
                       description.includes('**') ||
                       description.includes('##');

  // Extract the first sentence or two, which usually contain the core concept
  const sentences = description
    .split(/\.\s+/) // Split on period followed by space
    .filter(sentence => sentence.trim().length > 10); // Remove very short fragments

  let shortDescription = sentences[0]?.trim() ?? '';
  
  // If first sentence is too short, add the second one
  if (shortDescription.length < 100 && sentences[1]) {
    shortDescription += '. ' + sentences[1].trim();
  }

  // Clean up markdown formatting
  shortDescription = cleanMarkdownFormatting(shortDescription);
  
  // Ensure it ends with a period
  if (shortDescription && !shortDescription.endsWith('.')) {
    shortDescription += '.';
  }

  // Truncate if still too long
  if (shortDescription.length > maxLength) {
    const lastSpace = shortDescription.lastIndexOf(' ', maxLength - 3);
    shortDescription = shortDescription.substring(0, lastSpace) + '...';
  }

  return {
    short: shortDescription,
    full: description,
    hasFormatting,
    url,
  };
}

/**
 * Removes markdown formatting and citations from text
 */
function cleanMarkdownFormatting(text: string): string {
  return text
    // Remove markdown links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove citations: (Citation: name)
    .replace(/\(Citation:[^)]+\)/g, '')
    // Remove bold/italic: **text** or *text* -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Creates a standardized short description for technique UI components
 */
export function getTechniqueUIDescription(
  name: string,
  description: string,
  url?: string
): ProcessedDescription {
  const processed = processMitreDescription(description, url, 180);
  
  // If processing resulted in a very short description, create a fallback
  if (processed.short.length < 50) {
    processed.short = `Adversaries may use ${name.toLowerCase()} techniques to achieve their objectives.`;
  }

  return processed;
}

/**
 * Formats a technique for display in dropdowns or cards
 */
export interface TechniqueDisplayInfo {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  url?: string;
  tacticNames?: string[];
}

/**
 * Prepares technique data for UI display with clean descriptions
 */
export function prepareTechniqueForDisplay(technique: {
  id: string;
  name: string;
  description: string;
  url?: string;
  tacticIds?: string[];
}, tacticNames?: string[]): TechniqueDisplayInfo {
  
  const processed = getTechniqueUIDescription(
    technique.name, 
    technique.description, 
    technique.url
  );

  return {
    id: technique.id,
    name: technique.name,
    shortDescription: processed.short,
    fullDescription: processed.full,
    url: technique.url,
    tacticNames,
  };
}

/**
 * Common short descriptions for well-known techniques
 * These can override auto-generated descriptions for better UX
 */
export const TECHNIQUE_SHORT_DESCRIPTIONS: Record<string, string> = {
  'T1566': 'Adversaries send phishing messages to gain access to victim systems through malicious attachments or links.',
  'T1059': 'Adversaries abuse command and script interpreters to execute commands, scripts, or binaries on target systems.',
  'T1078': 'Adversaries obtain and abuse credentials of existing accounts as a means of gaining access to systems.',
  'T1190': 'Adversaries exploit weaknesses in Internet-facing applications to gain initial access to victim networks.',
  'T1053': 'Adversaries abuse task scheduling functionality to maintain persistence or execute malicious code.',
  'T1055': 'Adversaries inject malicious code into processes to evade detection and gain elevated privileges.',
  'T1003': 'Adversaries attempt to dump credentials from operating system credential stores to obtain passwords.',
  'T1110': 'Adversaries use brute force techniques to systematically guess passwords and gain unauthorized access.',
  'T1557': 'Adversaries position themselves between networked devices to intercept, monitor, or manipulate communications.',
  // Add more as needed based on common techniques used in operations
};

/**
 * Gets a curated short description, preferring manual overrides
 */
export function getCuratedShortDescription(
  techniqueId: string,
  name: string,
  description: string
): string {
  // Use manual override if available
  if (TECHNIQUE_SHORT_DESCRIPTIONS[techniqueId]) {
    return TECHNIQUE_SHORT_DESCRIPTIONS[techniqueId];
  }
  
  // Otherwise, generate from full description
  const processed = getTechniqueUIDescription(name, description);
  return processed.short;
}
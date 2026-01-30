/**
 * Predefined variant templates
 *
 * Templates define common configurations for different use cases:
 * - startup: Fast iteration, cost-effective, minimal tooling
 * - enterprise: Full compliance, audit trails, managed providers
 * - research: Advanced models, extended context, specialized tools
 */

export interface Template {
  key: string;
  name: string;
  description: string;
  provider: string;
  brand?: string;
  enableTeamMode: boolean;
  promptPack: boolean;
  skillInstall: boolean;
  /** Suggested model overrides */
  modelHints?: {
    sonnet?: string;
    opus?: string;
    haiku?: string;
  };
  /** Extra environment variables */
  extraEnv?: Record<string, string>;
  /** Tags for filtering/categorization */
  tags: string[];
}

export const TEMPLATES: Record<string, Template> = {
  startup: {
    key: 'startup',
    name: 'Startup',
    description: 'Fast iteration, cost-effective setup for small teams',
    provider: 'zai',
    brand: 'auto',
    enableTeamMode: false,
    promptPack: true,
    skillInstall: true,
    modelHints: {
      sonnet: 'glm-4.7',
      haiku: 'glm-4.5-air',
    },
    extraEnv: {
      CC_MIRROR_TEMPLATE: 'startup',
    },
    tags: ['cost-effective', 'fast', 'minimal'],
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Full compliance features, team mode, audit-ready configuration',
    provider: 'zai',
    brand: 'auto',
    enableTeamMode: true,
    promptPack: true,
    skillInstall: true,
    modelHints: {
      sonnet: 'glm-4.7',
      opus: 'glm-4.7',
      haiku: 'glm-4.5-air',
    },
    extraEnv: {
      CC_MIRROR_TEMPLATE: 'enterprise',
      CLAUDE_CODE_TEAM_MODE: '1',
    },
    tags: ['team', 'compliance', 'enterprise'],
  },
  research: {
    key: 'research',
    name: 'Research',
    description: 'Advanced models, extended context for research and experimentation',
    provider: 'zai',
    brand: 'auto',
    enableTeamMode: true,
    promptPack: true,
    skillInstall: true,
    modelHints: {
      sonnet: 'glm-4.7',
      opus: 'glm-4.7',
      haiku: 'glm-4.5-air',
    },
    extraEnv: {
      CC_MIRROR_TEMPLATE: 'research',
      API_TIMEOUT_MS: '5000000',
    },
    tags: ['research', 'advanced', 'extended-context'],
  },
};

/**
 * Get a template by name
 */
export function getTemplate(name: string): Template | undefined {
  return TEMPLATES[name.toLowerCase()];
}

/**
 * List all available templates
 */
export function listTemplates(): Template[] {
  return Object.values(TEMPLATES);
}

/**
 * Check if a template exists
 */
export function templateExists(name: string): boolean {
  return name.toLowerCase() in TEMPLATES;
}

/**
 * Get template names
 */
export function getTemplateNames(): string[] {
  return Object.keys(TEMPLATES);
}

/**
 * Registry command - Curated MCP server catalog
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { upsertMcpServer, type McpServerConfig } from '../../core/claude-config.js';
import { readJson } from '../../core/fs.js';
import type { VariantMeta } from '../../core/types.js';
import type { ParsedArgs } from '../args.js';

export interface RegistryCommandOptions {
  opts: ParsedArgs;
}

interface RegistryEntry {
  name: string;
  description: string;
  category: string;
  config: McpServerConfig;
  envHint?: string;
}

// Curated MCP server catalog
const REGISTRY: RegistryEntry[] = [
  {
    name: 'filesystem',
    description: 'Read and write files on the local filesystem',
    category: 'core',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-filesystem', '/'],
    },
  },
  {
    name: 'github',
    description: 'GitHub repository operations',
    category: 'development',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-github'],
    },
    envHint: 'GITHUB_TOKEN',
  },
  {
    name: 'gitlab',
    description: 'GitLab repository operations',
    category: 'development',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-gitlab'],
    },
    envHint: 'GITLAB_TOKEN',
  },
  {
    name: 'slack',
    description: 'Slack messaging and channels',
    category: 'communication',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-slack'],
    },
    envHint: 'SLACK_TOKEN',
  },
  {
    name: 'google-drive',
    description: 'Google Drive file operations',
    category: 'storage',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-google-drive'],
    },
  },
  {
    name: 'postgres',
    description: 'PostgreSQL database operations',
    category: 'database',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-postgres'],
    },
    envHint: 'POSTGRES_URL',
  },
  {
    name: 'sqlite',
    description: 'SQLite database operations',
    category: 'database',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-sqlite'],
    },
  },
  {
    name: 'puppeteer',
    description: 'Web browser automation',
    category: 'web',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-puppeteer'],
    },
  },
  {
    name: 'brave-search',
    description: 'Web search via Brave Search API',
    category: 'search',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-brave-search'],
    },
    envHint: 'BRAVE_API_KEY',
  },
  {
    name: 'memory',
    description: 'Persistent memory/knowledge graph',
    category: 'core',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-memory'],
    },
  },
  {
    name: 'fetch',
    description: 'HTTP fetch operations',
    category: 'web',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-fetch'],
    },
  },
  {
    name: 'sequential-thinking',
    description: 'Step-by-step reasoning assistance',
    category: 'reasoning',
    config: {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server-sequential-thinking'],
    },
  },
];

function showRegistryHelp(): void {
  console.log(`
npx cc-mirror registry - Curated MCP server catalog

USAGE:
  npx cc-mirror registry [operation] [args]

OPERATIONS:
  list                              List available servers
  search <term>                     Search by name/description
  info <name>                       Show server details
  install <name> <variant>          Install server to variant

OPTIONS:
  --category <cat>                  Filter by category
  --json                            Output as JSON

CATEGORIES:
  core, development, database, web, search, communication, storage, reasoning

EXAMPLES:
  npx cc-mirror registry list
  npx cc-mirror registry search github
  npx cc-mirror registry info filesystem
  npx cc-mirror registry install filesystem zai
`);
}

function getConfigDir(rootDir: string, variant: string): string {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variantDir = path.join(resolvedRoot, variant);

  if (!fs.existsSync(variantDir)) {
    throw new Error(`Variant not found: ${variant}`);
  }

  const metaPath = path.join(variantDir, 'variant.json');
  const meta = readJson<VariantMeta>(metaPath);
  return meta?.configDir || path.join(variantDir, 'config');
}

/**
 * Execute the registry command
 */
export function runRegistryCommand({ opts }: RegistryCommandOptions): void {
  const positional = opts._ || [];
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const json = Boolean(opts.json);
  const category = opts.category as string | undefined;

  if (opts.help || opts.h) {
    showRegistryHelp();
    return;
  }

  const operation = positional[0] ?? 'list';

  switch (operation) {
    case 'list': {
      let servers = REGISTRY;
      if (category) {
        servers = servers.filter((s) => s.category === category);
      }

      if (json) {
        console.log(JSON.stringify(servers, null, 2));
        return;
      }

      const categories = [...new Set(REGISTRY.map((s) => s.category))].sort();
      console.log('Available MCP servers:\n');

      for (const cat of categories) {
        if (category && cat !== category) continue;
        const catServers = servers.filter((s) => s.category === cat);
        if (catServers.length === 0) continue;

        console.log(`[${cat}]`);
        for (const s of catServers) {
          const env = s.envHint ? ` (requires ${s.envHint})` : '';
          console.log(`  ${s.name.padEnd(20)} ${s.description}${env}`);
        }
        console.log('');
      }
      return;
    }

    case 'search': {
      const term = (positional[1] || '').toLowerCase();
      if (!term) {
        console.error('Error: search term required.');
        process.exitCode = 1;
        return;
      }

      const matches = REGISTRY.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term)
      );

      if (json) {
        console.log(JSON.stringify(matches, null, 2));
        return;
      }

      if (matches.length === 0) {
        console.log(`No servers matching "${term}".`);
        return;
      }

      console.log(`Found ${matches.length} server(s):\n`);
      for (const s of matches) {
        console.log(`  ${s.name} [${s.category}]`);
        console.log(`    ${s.description}`);
      }
      return;
    }

    case 'info': {
      const name = positional[1];
      if (!name) {
        console.error('Error: server name required.');
        process.exitCode = 1;
        return;
      }

      const server = REGISTRY.find((s) => s.name === name);
      if (!server) {
        console.error(`Server not found: ${name}`);
        process.exitCode = 1;
        return;
      }

      if (json) {
        console.log(JSON.stringify(server, null, 2));
        return;
      }

      console.log(`Name: ${server.name}`);
      console.log(`Description: ${server.description}`);
      console.log(`Category: ${server.category}`);
      if (server.envHint) console.log(`Requires: ${server.envHint}`);
      console.log(`\nConfig:`);
      console.log(JSON.stringify(server.config, null, 2));
      return;
    }

    case 'install': {
      const name = positional[1];
      const variant = positional[2];

      if (!name || !variant) {
        console.error('Error: server name and variant required.');
        console.error('Usage: npx cc-mirror registry install <name> <variant>');
        process.exitCode = 1;
        return;
      }

      const server = REGISTRY.find((s) => s.name === name);
      if (!server) {
        console.error(`Server not found: ${name}`);
        process.exitCode = 1;
        return;
      }

      let configDir: string;
      try {
        configDir = getConfigDir(rootDir, variant);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
        return;
      }

      const changed = upsertMcpServer(configDir, server.name, server.config);
      if (changed) {
        console.log(`✓ Installed ${server.name} to ${variant}`);
        if (server.envHint) {
          console.log(`\nNote: You may need to configure ${server.envHint}`);
          console.log(`Use: npx cc-mirror config ${variant} set --env ${server.envHint}=<value>`);
        }
      } else {
        console.log(`Server ${server.name} already configured (unchanged).`);
      }
      return;
    }

    default:
      console.error(`Unknown operation: ${operation}`);
      showRegistryHelp();
      process.exitCode = 1;
  }
}

/**
 * MCP command - manage MCP servers for a variant
 *
 * Usage:
 *   cc-mirror mcp <variant> [operation] [name] [options]
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { detectVariantFromEnv } from '../../core/tasks/index.js';
import { listMcpServers, upsertMcpServer, removeMcpServer, type McpServerConfig } from '../../core/claude-config.js';
import type { McpServerStatus } from '../../core/types.js';
import type { ParsedArgs } from '../args.js';

export interface McpCommandOptions {
  opts: ParsedArgs;
}

type McpOperation = 'list' | 'show' | 'add' | 'add-json' | 'remove' | 'check';

function showMcpHelp(): void {
  console.log(`
npx cc-mirror mcp - Manage MCP servers for a variant

USAGE:
  npx cc-mirror mcp <variant> [operation] [name] [options]

OPERATIONS:
  list                  List MCP servers (default)
  show <name>           Show one MCP server config
  add <name>            Add/update server from flags
  add-json <name>       Add/update server from JSON
  remove <name>         Remove server by name
  check [name]          Verify server connectivity (or all if no name)

OPTIONS (add):
  --command <cmd>        Command to run (stdio)
  --args <list>          Comma-separated args
  --url <url>            Remote MCP server URL
  --headers <list>       Comma-separated header strings
  --transport <type>     Transport hint (e.g. stdio, sse)
  --env KEY=VALUE        Env vars (repeatable)

OPTIONS (add-json):
  --json <string>        JSON object string
  --file <path>          JSON object file

OPTIONS (list/show):
  --json                 Print raw JSON

EXAMPLES:
  npx cc-mirror mcp zai list
  npx cc-mirror mcp zai show airtable
  npx cc-mirror mcp zai add airtable --command npx --args @rashidazarang/airtable-mcp --env AIRTABLE_TOKEN=... --env AIRTABLE_BASE_ID=...
  npx cc-mirror mcp zai add-json airtable '{"command":"npx","args":["@rashidazarang/airtable-mcp"]}'
  npx cc-mirror mcp zai remove airtable
`);
}

function parseList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseEnv(entries: string[]): Record<string, string> | undefined {
  if (!entries || entries.length === 0) return undefined;
  const env: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry) continue;
    const idx = entry.indexOf('=');
    if (idx === -1) {
      env[entry] = '';
      continue;
    }
    const key = entry.slice(0, idx).trim();
    if (!key) continue;
    env[key] = entry.slice(idx + 1);
  }
  return Object.keys(env).length > 0 ? env : undefined;
}

function resolveConfigDir(rootDir: string, variant: string): string {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variantDir = path.join(resolvedRoot, variant);
  if (!fs.existsSync(variantDir)) {
    throw new Error(`Variant not found: ${variant}`);
  }
  const configDir = path.join(variantDir, 'config');
  if (!fs.existsSync(configDir)) {
    throw new Error(`Config directory missing: ${configDir}`);
  }
  return configDir;
}

function formatMcpSummary(name: string, config: McpServerConfig): string {
  const transport = config.transport ? `transport=${config.transport}` : 'transport=default';
  if (config.url) {
    return `${name} (url=${config.url}, ${transport})`;
  }
  const command = config.command ?? 'command=unknown';
  const args = Array.isArray(config.args) && config.args.length > 0 ? ` args=${config.args.join(' ')}` : '';
  return `${name} (${command}${args}, ${transport})`;
}

/**
 * Execute the MCP command
 */
export function runMcpCommand({ opts }: McpCommandOptions): void {
  const positional = opts._ || [];
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const variantFromFlag = opts.variant as string | undefined;
  const configDirFromEnv = process.env.CLAUDE_CONFIG_DIR;
  const variantFromEnv =
    detectVariantFromEnv() || (configDirFromEnv ? path.basename(path.dirname(configDirFromEnv)) : undefined);

  if (opts.help || opts.h) {
    showMcpHelp();
    return;
  }

  let index = 0;
  const variant = variantFromFlag || positional[index++] || variantFromEnv;
  if (!variant) {
    console.error('Error: variant name required.');
    showMcpHelp();
    process.exitCode = 1;
    return;
  }

  const operation = (positional[index++] ?? 'list') as McpOperation;
  const name = positional[index];
  const outputJson = opts.json === true;
  let configDir: string;
  try {
    configDir = resolveConfigDir(rootDir, variant);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  switch (operation) {
    case 'list': {
      const servers = listMcpServers(configDir);
      if (outputJson) {
        console.log(JSON.stringify(servers, null, 2));
        return;
      }
      const names = Object.keys(servers).sort();
      if (names.length === 0) {
        console.log(`No MCP servers configured for ${variant}.`);
        return;
      }
      for (const serverName of names) {
        console.log(`- ${formatMcpSummary(serverName, servers[serverName])}`);
      }
      return;
    }

    case 'show': {
      if (!name) {
        console.error('Error: MCP server name required.');
        process.exitCode = 1;
        return;
      }
      const servers = listMcpServers(configDir);
      const server = servers[name];
      if (!server) {
        console.error(`MCP server not found: ${name}`);
        process.exitCode = 1;
        return;
      }
      if (outputJson) {
        console.log(JSON.stringify(server, null, 2));
      } else {
        console.log(formatMcpSummary(name, server));
        console.log(JSON.stringify(server, null, 2));
      }
      return;
    }

    case 'add': {
      if (!name) {
        console.error('Error: MCP server name required.');
        process.exitCode = 1;
        return;
      }
      const command = opts.command as string | undefined;
      const url = opts.url as string | undefined;
      const args = parseList(opts.args as string | undefined);
      const headers = parseList(opts.headers as string | undefined);
      const env = parseEnv(opts.env);
      const transport = opts.transport as string | undefined;

      if (!command && !url) {
        console.error('Error: --command or --url is required for add.');
        process.exitCode = 1;
        return;
      }

      const server: McpServerConfig = {
        ...(command ? { command } : {}),
        ...(args ? { args } : {}),
        ...(url ? { url } : {}),
        ...(headers ? { headers } : {}),
        ...(env ? { env } : {}),
        ...(transport ? { transport } : {}),
      };

      const changed = upsertMcpServer(configDir, name, server);
      console.log(changed ? `Saved MCP server ${name}.` : `MCP server ${name} unchanged.`);
      return;
    }

    case 'add-json': {
      if (!name) {
        console.error('Error: MCP server name required.');
        process.exitCode = 1;
        return;
      }
      const jsonFlag = opts.json;
      const jsonArg = typeof jsonFlag === 'string' ? jsonFlag : (positional[index + 1] as string | undefined);
      const filePath = opts.file as string | undefined;
      let payload = jsonArg;
      if (filePath) {
        try {
          payload = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
          console.error(`Error: unable to read file (${error instanceof Error ? error.message : 'read error'})`);
          process.exitCode = 1;
          return;
        }
      }
      if (!payload) {
        console.error('Error: JSON payload required. Use --json or --file.');
        process.exitCode = 1;
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch (error) {
        console.error(`Error: invalid JSON (${error instanceof Error ? error.message : 'parse error'})`);
        process.exitCode = 1;
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.error('Error: JSON must be an object.');
        process.exitCode = 1;
        return;
      }
      const changed = upsertMcpServer(configDir, name, parsed as McpServerConfig);
      console.log(changed ? `Saved MCP server ${name}.` : `MCP server ${name} unchanged.`);
      return;
    }

    case 'remove': {
      if (!name) {
        console.error('Error: MCP server name required.');
        process.exitCode = 1;
        return;
      }
      const removed = removeMcpServer(configDir, name);
      if (!removed) {
        console.error(`MCP server not found: ${name}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Removed MCP server ${name}.`);
      return;
    }

    case 'check': {
      const servers = listMcpServers(configDir);
      const serverNames = name ? [name] : Object.keys(servers).sort();

      if (serverNames.length === 0) {
        console.log(`No MCP servers configured for ${variant}.`);
        return;
      }

      // Check if single server was specified but doesn't exist
      if (name && !servers[name]) {
        console.error(`MCP server not found: ${name}`);
        process.exitCode = 1;
        return;
      }

      const results: McpServerStatus[] = [];
      let hasErrors = false;

      console.log(`Checking ${serverNames.length} MCP server(s)...\n`);

      for (const serverName of serverNames) {
        const config = servers[serverName];
        const status = core.checkMcpServerHealth(serverName, config);
        results.push(status);

        const icon = status.status === 'ok' ? '✓' : status.status === 'error' ? '✗' : '?';
        const cmdInfo = status.command ? ` → ${status.command}` : '';

        console.log(`${icon} ${serverName}${cmdInfo}`);
        if (status.error) {
          console.log(`  Error: ${status.error}`);
          hasErrors = true;
        }
        if (status.status === 'unchecked') {
          console.log(`  (HTTP/SSE server - connectivity not checked)`);
        }
      }

      if (outputJson) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }

      // Summary
      const okCount = results.filter((r) => r.status === 'ok').length;
      const errorCount = results.filter((r) => r.status === 'error').length;
      const uncheckedCount = results.filter((r) => r.status === 'unchecked').length;

      console.log(`\nSummary: ${okCount} ok, ${errorCount} errors, ${uncheckedCount} unchecked`);

      if (hasErrors) {
        process.exitCode = 1;
      }
      return;
    }

    default: {
      console.error(`Unknown MCP operation: ${operation}`);
      showMcpHelp();
      process.exitCode = 1;
    }
  }
}

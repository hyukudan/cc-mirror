/**
 * Template command - save/load variant configurations as templates
 *
 * Usage:
 *   cc-mirror template list                  List available templates
 *   cc-mirror template save <name> <variant> Save variant config as template
 *   cc-mirror template show <name>           Show template details
 *   cc-mirror template apply <name> <variant> Apply template to new variant
 *   cc-mirror template remove <name>         Delete a template
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { listMcpServers, type McpServerConfig } from '../../core/claude-config.js';
import { readJson, writeJson } from '../../core/fs.js';
import type { VariantMeta, VariantConfig } from '../../core/types.js';
import type { ParsedArgs } from '../args.js';

export interface TemplateCommandOptions {
  opts: ParsedArgs;
}

type TemplateOperation = 'list' | 'save' | 'show' | 'apply' | 'remove';

interface VariantTemplate {
  name: string;
  description?: string;
  createdAt: string;
  sourceVariant: string;
  provider: string;
  brand?: string;
  // Config items
  mcpServers?: Record<string, McpServerConfig>;
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
  envKeys?: string[]; // Which env keys are defined (not values for security)
}

const TEMPLATES_DIR = '.cc-mirror-templates';

function getTemplatesDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(home, TEMPLATES_DIR);
}

function showTemplateHelp(): void {
  console.log(`
npx cc-mirror template - Save and load variant configurations

USAGE:
  npx cc-mirror template [operation] [args]

OPERATIONS:
  list                          List available templates
  save <name> <variant>         Save variant config as template
  show <name>                   Show template details
  apply <name> <new-variant>    Create variant from template
  remove <name>                 Delete a template

OPTIONS:
  --description <text>          Template description (save)
  --json                        Output as JSON (list, show)

EXAMPLES:
  npx cc-mirror template list
  npx cc-mirror template save my-setup zai --description "My custom setup"
  npx cc-mirror template show my-setup
  npx cc-mirror template apply my-setup new-variant
  npx cc-mirror template remove my-setup
`);
}

function ensureTemplatesDir(): string {
  const dir = getTemplatesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function loadTemplate(name: string): VariantTemplate | null {
  const templatesDir = getTemplatesDir();
  const templatePath = path.join(templatesDir, `${name}.json`);
  if (!fs.existsSync(templatePath)) return null;
  return readJson<VariantTemplate>(templatePath);
}

function saveTemplate(template: VariantTemplate): void {
  const templatesDir = ensureTemplatesDir();
  const templatePath = path.join(templatesDir, `${template.name}.json`);
  writeJson(templatePath, template);
}

function listTemplates(): VariantTemplate[] {
  const templatesDir = getTemplatesDir();
  if (!fs.existsSync(templatesDir)) return [];

  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  const templates: VariantTemplate[] = [];

  for (const file of files) {
    const template = readJson<VariantTemplate>(path.join(templatesDir, file));
    if (template) templates.push(template);
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Execute the template command
 */
export function runTemplateCommand({ opts }: TemplateCommandOptions): void {
  const positional = opts._ || [];
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const outputJson = opts.json === true;

  if (opts.help || opts.h) {
    showTemplateHelp();
    return;
  }

  const operation = (positional[0] ?? 'list') as TemplateOperation;

  switch (operation) {
    case 'list': {
      const templates = listTemplates();
      if (outputJson) {
        console.log(JSON.stringify(templates, null, 2));
        return;
      }
      if (templates.length === 0) {
        console.log('No templates found.');
        console.log(`Templates are stored in: ${getTemplatesDir()}`);
        return;
      }
      console.log('Available templates:\n');
      for (const t of templates) {
        const desc = t.description ? ` - ${t.description}` : '';
        const mcpCount = t.mcpServers ? Object.keys(t.mcpServers).length : 0;
        const details = [`provider: ${t.provider}`];
        if (mcpCount > 0) details.push(`${mcpCount} MCP server(s)`);
        console.log(`  ${t.name}${desc}`);
        console.log(`    ${details.join(', ')}`);
      }
      return;
    }

    case 'save': {
      const templateName = positional[1];
      const variantName = positional[2];

      if (!templateName || !variantName) {
        console.error('Error: template name and variant name required.');
        console.error('Usage: npx cc-mirror template save <template-name> <variant>');
        process.exitCode = 1;
        return;
      }

      // Check if template already exists
      if (loadTemplate(templateName) && !opts.force) {
        console.error(`Error: Template "${templateName}" already exists. Use --force to overwrite.`);
        process.exitCode = 1;
        return;
      }

      // Load variant
      const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
      const variantDir = path.join(resolvedRoot, variantName);

      if (!fs.existsSync(variantDir)) {
        console.error(`Error: Variant not found: ${variantName}`);
        process.exitCode = 1;
        return;
      }

      const metaPath = path.join(variantDir, 'variant.json');
      const meta = readJson<VariantMeta>(metaPath);
      if (!meta) {
        console.error(`Error: Could not read variant metadata`);
        process.exitCode = 1;
        return;
      }

      const configDir = meta.configDir || path.join(variantDir, 'config');

      // Read settings
      const settingsPath = path.join(configDir, 'settings.json');
      const settings = readJson<
        VariantConfig & { permissions?: { allow?: string[]; ask?: string[]; deny?: string[] } }
      >(settingsPath);

      // Read MCP servers
      const mcpServers = listMcpServers(configDir);

      // Create template
      const template: VariantTemplate = {
        name: templateName,
        description: opts.description as string | undefined,
        createdAt: new Date().toISOString(),
        sourceVariant: variantName,
        provider: meta.provider,
        brand: meta.brand,
        mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
        permissions: settings?.permissions,
        envKeys: settings?.env ? Object.keys(settings.env).filter((k) => !k.includes('KEY')) : undefined,
      };

      saveTemplate(template);
      console.log(`✓ Template "${templateName}" saved from variant "${variantName}"`);
      if (template.mcpServers) {
        console.log(`  MCP servers: ${Object.keys(template.mcpServers).join(', ')}`);
      }
      if (template.permissions?.allow?.length) {
        console.log(`  Permissions: ${template.permissions.allow.length} allowed`);
      }
      return;
    }

    case 'show': {
      const templateName = positional[1];
      if (!templateName) {
        console.error('Error: template name required.');
        process.exitCode = 1;
        return;
      }

      const template = loadTemplate(templateName);
      if (!template) {
        console.error(`Error: Template not found: ${templateName}`);
        process.exitCode = 1;
        return;
      }

      if (outputJson) {
        console.log(JSON.stringify(template, null, 2));
        return;
      }

      console.log(`Template: ${template.name}`);
      if (template.description) console.log(`Description: ${template.description}`);
      console.log(`Created: ${template.createdAt}`);
      console.log(`Source variant: ${template.sourceVariant}`);
      console.log(`Provider: ${template.provider}`);
      if (template.brand) console.log(`Brand: ${template.brand}`);

      if (template.mcpServers) {
        console.log(`\nMCP Servers:`);
        for (const [name, config] of Object.entries(template.mcpServers)) {
          const cmd = config.command || config.url || 'unknown';
          console.log(`  - ${name}: ${cmd}`);
        }
      }

      if (template.permissions?.allow?.length) {
        console.log(`\nAllowed permissions: ${template.permissions.allow.length}`);
      }
      return;
    }

    case 'apply': {
      const templateName = positional[1];
      const newVariantName = positional[2];

      if (!templateName || !newVariantName) {
        console.error('Error: template name and new variant name required.');
        console.error('Usage: npx cc-mirror template apply <template-name> <new-variant>');
        process.exitCode = 1;
        return;
      }

      const template = loadTemplate(templateName);
      if (!template) {
        console.error(`Error: Template not found: ${templateName}`);
        process.exitCode = 1;
        return;
      }

      // Check if variant already exists
      const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
      const variantDir = path.join(resolvedRoot, newVariantName);
      if (fs.existsSync(variantDir)) {
        console.error(`Error: Variant "${newVariantName}" already exists.`);
        process.exitCode = 1;
        return;
      }

      console.log(`To create a variant from template "${templateName}":`);
      console.log(`\n  npx cc-mirror create \\`);
      console.log(`    --name ${newVariantName} \\`);
      console.log(`    --provider ${template.provider} \\`);
      if (template.brand) console.log(`    --brand ${template.brand} \\`);
      console.log(`    --api-key <YOUR_API_KEY>`);

      if (template.mcpServers && Object.keys(template.mcpServers).length > 0) {
        console.log(`\nThen add MCP servers:`);
        for (const [name, config] of Object.entries(template.mcpServers)) {
          const jsonConfig = JSON.stringify(config);
          console.log(`  npx cc-mirror mcp ${newVariantName} add-json ${name} '${jsonConfig}'`);
        }
      }

      console.log(`\nOr use sync to copy from an existing variant:`);
      console.log(`  npx cc-mirror sync ${template.sourceVariant} ${newVariantName} --items mcp-servers,permissions`);
      return;
    }

    case 'remove': {
      const templateName = positional[1];
      if (!templateName) {
        console.error('Error: template name required.');
        process.exitCode = 1;
        return;
      }

      const templatesDir = getTemplatesDir();
      const templatePath = path.join(templatesDir, `${templateName}.json`);

      if (!fs.existsSync(templatePath)) {
        console.error(`Error: Template not found: ${templateName}`);
        process.exitCode = 1;
        return;
      }

      fs.unlinkSync(templatePath);
      console.log(`✓ Template "${templateName}" removed.`);
      return;
    }

    default: {
      console.error(`Unknown template operation: ${operation}`);
      showTemplateHelp();
      process.exitCode = 1;
    }
  }
}

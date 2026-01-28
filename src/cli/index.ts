/**
 * CLI entry point - routes commands to handlers
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './args.js';
import { printHelp, printHaiku } from './help.js';
import { runTui, shouldLaunchTui } from './tui.js';
import {
  runListCommand,
  runDoctorCommand,
  runRemoveCommand,
  runTweakCommand,
  runRunCommand,
  runMcpCommand,
  runExportCommand,
  runImportCommand,
  runConfigCommand,
  runUpdateCommand,
  runCreateCommand,
  runTasksCommand,
  runPathCommand,
  runSyncCommand,
  runRefreshCommand,
} from './commands/index.js';

const readPackageVersion = (): string => {
  const startDir = path.dirname(fileURLToPath(import.meta.url));
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      try {
        const data = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { version?: string };
        if (data?.version) return data.version;
      } catch {
        return 'unknown';
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'unknown';
};

const main = async () => {
  const argv = process.argv.slice(2);

  // Default to TUI when no arguments provided (and TTY available)
  if (argv.length === 0 && process.stdout.isTTY) {
    await runTui();
    return;
  }

  let cmd = argv.length > 0 && !argv[0].startsWith('-') ? (argv.shift() as string) : 'create';
  const opts = parseArgs(argv);
  const quickMode = cmd === 'quick' || Boolean(opts.quick || opts.simple);
  if (cmd === 'quick') cmd = 'create';

  if (cmd === 'version' || opts.version) {
    console.log(readPackageVersion());
    return;
  }

  // Help command (only for main help, not subcommand help)
  // Subcommands like 'tasks' handle their own --help
  const commandsWithOwnHelp = ['tasks', 'mcp', 'config'];
  if (cmd === 'help' || cmd === '--help' || (opts.help && !commandsWithOwnHelp.includes(cmd))) {
    printHelp();
    return;
  }

  // Easter egg: --haiku prints a random haiku
  if (opts.haiku) {
    printHaiku();
    return;
  }

  // TUI mode
  if (shouldLaunchTui(cmd, opts)) {
    await runTui();
    return;
  }

  // Route to command handlers
  switch (cmd) {
    case 'list':
      runListCommand({ opts });
      break;

    case 'doctor':
      runDoctorCommand({ opts });
      break;

    case 'update':
      runUpdateCommand({ opts });
      break;

    case 'remove':
      runRemoveCommand({ opts });
      break;

    case 'tweak':
      runTweakCommand({ opts });
      break;

    case 'run':
      runRunCommand({ opts });
      break;

    case 'mcp':
      runMcpCommand({ opts });
      break;

    case 'export':
      runExportCommand({ opts });
      break;

    case 'import':
      runImportCommand({ opts });
      break;

    case 'config':
      runConfigCommand({ opts });
      break;

    case 'path':
      runPathCommand({ opts });
      break;

    case 'sync':
      runSyncCommand({ opts });
      break;

    case 'refresh':
      runRefreshCommand({ opts });
      break;

    case 'create':
      await runCreateCommand({ opts, quickMode });
      break;

    case 'tasks':
      await runTasksCommand({ opts });
      break;

    default:
      printHelp();
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  // Use write callback to ensure buffer flushes before exit (critical for Windows CMD)
  process.stderr.write(`${message}\n`, () => {
    process.exit(1);
  });
  // Fallback timeout in case callback doesn't fire
  setTimeout(() => process.exit(1), 200);
});

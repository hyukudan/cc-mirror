import type { DoctorReportItem } from '../core/types.js';

export const printDoctor = (report: DoctorReportItem[], opts: { verbose?: boolean } = {}) => {
  if (report.length === 0) {
    console.log('No variants found.');
    return;
  }
  for (const item of report) {
    const versionInfo = item.claudeCodeVersion ? ` (v${item.claudeCodeVersion})` : '';
    console.log(`${item.ok ? '✓' : '✗'} ${item.name}${versionInfo}`);

    if (!item.ok) {
      console.log(`  binary: ${item.binaryPath ?? 'missing'}`);
      console.log(`  wrapper: ${item.wrapperPath}`);
    }

    if (item.issues?.length) {
      for (const issue of item.issues) {
        console.log(`  issue: ${issue}`);
      }
    }

    if (item.warnings?.length) {
      for (const warning of item.warnings) {
        console.log(`  warn: ${warning}`);
      }
    }

    // Show MCP server status in verbose mode
    if (opts.verbose && item.mcpServers?.length) {
      console.log('  MCP servers:');
      for (const mcp of item.mcpServers) {
        const statusIcon = mcp.status === 'ok' ? '✓' : mcp.status === 'error' ? '✗' : '?';
        const cmdInfo = mcp.command ? ` (${mcp.command})` : '';
        console.log(`    ${statusIcon} ${mcp.name}${cmdInfo}`);
        if (mcp.error) {
          console.log(`      error: ${mcp.error}`);
        }
      }
    }
  }

  // Summary
  const total = report.length;
  const healthy = report.filter((r) => r.ok).length;
  const outdated = report.filter(
    (r) => r.claudeCodeVersion && r.claudeCodeLatest && r.claudeCodeVersion !== r.claudeCodeLatest
  ).length;
  const mcpErrors = report.reduce((sum, r) => sum + (r.mcpServers?.filter((m) => m.status === 'error').length ?? 0), 0);

  console.log('');
  console.log(`Summary: ${healthy}/${total} healthy`);
  if (outdated > 0) {
    console.log(`  ${outdated} variant(s) have updates available`);
  }
  if (mcpErrors > 0) {
    console.log(`  ${mcpErrors} MCP server(s) have issues`);
  }
};

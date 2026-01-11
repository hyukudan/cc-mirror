import type { DoctorReportItem } from '../core/types.js';

export const printDoctor = (report: DoctorReportItem[]) => {
  if (report.length === 0) {
    console.log('No variants found.');
    return;
  }
  for (const item of report) {
    console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
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
  }
};

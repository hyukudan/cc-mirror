/**
 * Variant Actions Screen
 */

import React, { useState } from 'react';
import path from 'node:path';
import { Box } from 'ink';
import { ScreenLayout } from '../components/ui/ScreenLayout.js';
import { Section } from '../components/ui/Layout.js';
import { SummaryRow } from '../components/ui/Typography.js';
import { SelectMenu } from '../components/ui/Menu.js';
import type { MenuItem } from '../components/ui/types.js';

interface VariantMeta {
  name: string;
  provider?: string;
  binaryPath: string;
  configDir: string;
  wrapperPath: string;
  teamModeEnabled?: boolean;
}

interface VariantActionsScreenProps {
  meta: VariantMeta;
  onLaunch?: () => void;
  onUpdate: () => void;
  onTweak: () => void;
  onRemove: () => void;
  onConfigureModels?: () => void;
  onToggleTeamMode?: () => void;
  onApplyPath?: () => void;
  onBack: () => void;
}

// Providers that require model mapping
const MODEL_MAPPING_PROVIDERS = ['openrouter', 'gatewayz', 'nanogpt', 'ccrouter'];

export const VariantActionsScreen: React.FC<VariantActionsScreenProps> = ({
  meta,
  onLaunch,
  onUpdate,
  onTweak,
  onRemove,
  onConfigureModels,
  onToggleTeamMode,
  onApplyPath,
  onBack,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const requiresModelMapping = meta.provider && MODEL_MAPPING_PROVIDERS.includes(meta.provider);
  const showApplyPath = meta.wrapperPath && !isWrapperInPath(meta.wrapperPath);

  // Team mode toggle - shows enable or disable based on current state
  const teamModeAction: MenuItem | null = onToggleTeamMode
    ? meta.teamModeEnabled
      ? { value: 'team-mode', label: 'Disable Team Mode', description: 'Remove multi-agent task tools' }
      : {
          value: 'team-mode',
          label: 'Enable Team Mode',
          description: 'Add multi-agent task tools',
          icon: 'star' as const,
        }
    : null;

  const actions: MenuItem[] = [
    ...(onLaunch ? [{ value: 'launch', label: 'Launch', description: 'Run this variant' }] : []),
    { value: 'update', label: 'Update', description: 'Re-sync binary + patches' },
    ...(requiresModelMapping && onConfigureModels
      ? [{ value: 'models', label: 'Configure Models', description: 'Edit Opus/Sonnet/Haiku mapping' }]
      : []),
    ...(teamModeAction ? [teamModeAction] : []),
    ...(onApplyPath && showApplyPath
      ? [{ value: 'path', label: 'Apply PATH', description: 'Add wrapper directory to PATH' }]
      : []),
    { value: 'tweak', label: 'Customize', description: 'Open tweakcc' },
    { value: 'remove', label: 'Remove', description: 'Delete variant', icon: 'exit' as const },
    { value: 'back', label: 'Back', icon: 'back' as const },
  ];

  const handleSelect = (value: string) => {
    if (value === 'launch' && onLaunch) onLaunch();
    if (value === 'update') onUpdate();
    if (value === 'models' && onConfigureModels) onConfigureModels();
    if (value === 'team-mode' && onToggleTeamMode) onToggleTeamMode();
    if (value === 'path' && onApplyPath) onApplyPath();
    if (value === 'tweak') onTweak();
    if (value === 'remove') onRemove();
    if (value === 'back') onBack();
  };

  const subtitle = meta.provider ? `Provider: ${meta.provider}` : undefined;

  return (
    <ScreenLayout title={meta.name} subtitle={subtitle} icon={null}>
      <Section title="Details">
        <SummaryRow label="Install" value="NPM (cli.js)" />
        <SummaryRow label="Binary" value={meta.binaryPath} />
        <SummaryRow label="Config" value={meta.configDir} />
        <SummaryRow label="Wrapper" value={meta.wrapperPath} />
        <SummaryRow label="Team Mode" value={meta.teamModeEnabled ? 'Enabled' : 'Disabled'} />
      </Section>

      <Box marginY={1}>
        <SelectMenu
          items={actions}
          selectedIndex={selectedIndex}
          onIndexChange={setSelectedIndex}
          onSelect={handleSelect}
        />
      </Box>
    </ScreenLayout>
  );
};

function isWrapperInPath(wrapperPath: string): boolean {
  const wrapperDir = path.dirname(wrapperPath);
  const envPath = process.env.PATH || '';
  if (!envPath) return false;
  return envPath.split(path.delimiter).some((entry) => entry === wrapperDir || path.resolve(entry) === wrapperDir);
}

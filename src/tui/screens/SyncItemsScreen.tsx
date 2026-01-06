import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ScreenLayout } from '../components/ui/ScreenLayout.js';
import { colors, icons } from '../components/ui/theme.js';
import type { SyncItem } from '../../core/sync.js';

const ITEMS: { key: SyncItem; label: string; description: string }[] = [
  { key: 'skills', label: 'Skills', description: 'Copy installed skills' },
  { key: 'mcp-servers', label: 'MCP Servers', description: 'Merge .claude.json servers' },
  { key: 'permissions', label: 'Permissions', description: 'Sync allow/ask/deny rules' },
  { key: 'claude-md', label: 'CLAUDE.md', description: 'Copy project instructions' },
  { key: 'tasks', label: 'Tasks', description: 'Copy team task JSON files' },
  { key: 'provider-env', label: 'Provider Env', description: 'Copy provider env vars' },
];

interface SyncItemsScreenProps {
  selectedItems: SyncItem[];
  onConfirm: (items: SyncItem[]) => void;
  onBack: () => void;
}

export const SyncItemsScreen: React.FC<SyncItemsScreenProps> = ({ selectedItems, onConfirm, onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selected, setSelected] = useState<Set<SyncItem>>(new Set(selectedItems));

  const totalItems = ITEMS.length + 2;
  const confirmIndex = ITEMS.length;
  const backIndex = ITEMS.length + 1;

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    }
    if (input === ' ' && selectedIndex < ITEMS.length) {
      const itemKey = ITEMS[selectedIndex].key;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(itemKey)) {
          next.delete(itemKey);
        } else {
          next.add(itemKey);
        }
        return next;
      });
    }
    if (key.return) {
      if (selectedIndex === confirmIndex) {
        if (selected.size > 0) {
          onConfirm(Array.from(selected));
        }
      } else if (selectedIndex === backIndex) {
        onBack();
      } else if (selectedIndex < ITEMS.length) {
        const itemKey = ITEMS[selectedIndex].key;
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(itemKey)) {
            next.delete(itemKey);
          } else {
            next.add(itemKey);
          }
          return next;
        });
      }
    }
    if (key.escape) {
      onBack();
    }
  });

  const isConfirmSelected = selectedIndex === confirmIndex;
  const isBackSelected = selectedIndex === backIndex;

  return (
    <ScreenLayout title="Sync Items" subtitle="Space to toggle, Enter to confirm">
      <Box flexDirection="column" marginY={1}>
        {ITEMS.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const isChecked = selected.has(item.key);
          return (
            <Box key={item.key} marginBottom={0}>
              <Text color={isSelected ? colors.primary : colors.textMuted}>
                {isSelected ? icons.pointer : icons.pointerEmpty}{' '}
              </Text>
              <Text color={isChecked ? colors.success : colors.textMuted}>{isChecked ? '[x]' : '[ ]'} </Text>
              <Text color={isSelected ? colors.text : colors.textMuted} bold={isSelected}>
                {item.label}
              </Text>
              <Text color={colors.textMuted}> - {item.description}</Text>
            </Box>
          );
        })}

        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color={isConfirmSelected ? colors.primary : colors.textMuted}>
              {isConfirmSelected ? icons.pointer : icons.pointerEmpty}{' '}
            </Text>
            <Text
              color={selected.size > 0 ? (isConfirmSelected ? colors.success : colors.text) : colors.textMuted}
              bold={isConfirmSelected}
            >
              Continue with {selected.size} item{selected.size !== 1 ? 's' : ''} {icons.arrowRight}
            </Text>
          </Box>
          <Box>
            <Text color={isBackSelected ? colors.primary : colors.textMuted}>
              {isBackSelected ? icons.pointer : icons.pointerEmpty}{' '}
            </Text>
            <Text color={isBackSelected ? colors.text : colors.textMuted} bold={isBackSelected}>
              Back {icons.arrowLeft}
            </Text>
          </Box>
        </Box>
      </Box>
    </ScreenLayout>
  );
};

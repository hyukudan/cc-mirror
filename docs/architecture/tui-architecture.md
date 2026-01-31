# TUI Architecture

The Terminal User Interface (TUI) is built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI) and follows a modular architecture with clear separation of concerns.

## Overview

```
src/tui/
├── app.tsx              # Main application component (~1400 lines)
├── router/              # Navigation system (460 lines)
│   ├── routes.ts        # Route definitions (ROUTE_MAP)
│   ├── types.ts         # Screen type union
│   └── useEscapeNavigation.ts  # ESC key handler hook
├── state/               # Centralized state management (290 lines)
│   ├── types.ts         # AppState, AppActions interfaces
│   └── useAppState.ts   # State hook with all 32 state fields
├── hooks/               # Business logic hooks
│   ├── useVariantCreate.ts
│   ├── useVariantUpdate.ts
│   ├── useModelConfig.ts
│   ├── useTeamModeToggle.ts
│   ├── useUpdateAll.ts
│   └── useSync.ts
├── screens/             # Screen components
│   ├── HomeScreen.tsx
│   ├── ProviderSelectScreen.tsx
│   ├── CompletionScreen.tsx
│   └── ... (20+ screens)
├── components/ui/       # Reusable UI components
│   ├── Layout.tsx       # Frame, Divider, HintBar
│   ├── Typography.tsx   # Header, Title
│   ├── Input.tsx        # TextField
│   └── theme.ts         # Color definitions
└── themes/              # Theme system (future)
```

## Key Modules

### Router (`src/tui/router/`)

Declarative navigation with parent/child screen relationships.

```typescript
// routes.ts - 69 screens defined
export const ROUTE_MAP: RouteMap = {
  'home': { parent: null },
  'quick-provider': { parent: 'home' },
  'quick-api-key': { parent: 'quick-provider' },
  'quick-running': { parent: null, isProgress: true },
  // ...
};

// useEscapeNavigation.ts - replaces 93-line switch statement
useEscapeNavigation({ screen, provider, setScreen });
```

**Benefits:**
- Single source of truth for navigation
- Type-safe Screen union (catches typos at compile time)
- Progress screens automatically block ESC

### State Management (`src/tui/state/`)

Centralized state with `useCreateAppState` hook.

```typescript
// types.ts
interface AppState {
  screen: Screen;
  providerKey: string | null;
  name: string;
  apiKey: string;
  // ... 32 total fields
}

interface AppActions {
  setScreen: (screen: Screen) => void;
  setProviderKey: (key: string | null) => void;
  resetWizard: () => void;
  // ... corresponding setters
}

// useAppState.ts
const { state, actions } = useCreateAppState({
  initialRootDir: '~/.cc-mirror',
  initialBinDir: '~/.local/bin',
  defaultNpmPackage: '@anthropic-ai/claude-code',
});
```

**Benefits:**
- All state in one place
- `resetWizard()` defined once, not duplicated
- Testable in isolation

### Business Logic Hooks (`src/tui/hooks/`)

Each async operation is extracted to its own hook:

| Hook | Screen | Purpose |
|------|--------|---------|
| `useVariantCreate` | create-running | Creates new variant |
| `useVariantUpdate` | manage-update | Updates existing variant |
| `useModelConfig` | manage-models-saving | Saves model mappings |
| `useTeamModeToggle` | manage-team-mode | Toggles team mode |
| `useUpdateAll` | updateAll | Updates all variants |
| `useSync` | sync-running | Syncs config between variants |

**Pattern:**
```typescript
export function useVariantCreate(options: UseVariantCreateOptions): void {
  const { screen, params, core, setProgressLines, setScreen, onComplete } = options;

  const isRunningRef = useRef(false);  // Prevent concurrent execution

  useEffect(() => {
    if (screen !== 'create-running') return;
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const run = async () => {
      // ... async operation
      onComplete({ doneLines, summary, nextSteps, help });
      setScreen('create-done');
    };

    run();
    return () => { isRunningRef.current = false; };
  }, [screen, params, ...]);
}
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        app.tsx                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  useCreateAppState() → { state, actions }            │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│           ┌───────────────┼───────────────┐                  │
│           ▼               ▼               ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Router    │  │   Screens   │  │   Hooks     │          │
│  │  (ESC nav)  │  │  (render)   │  │  (async)    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│           │               │               │                  │
│           └───────────────┼───────────────┘                  │
│                           ▼                                  │
│                    setScreen()                               │
│                    setCompletion()                           │
│                    etc.                                      │
└─────────────────────────────────────────────────────────────┘
```

## Screen Types

The `Screen` type is a union of all valid screen names:

```typescript
type Screen =
  | 'home' | 'exit'
  | 'quick-provider' | 'quick-api-key' | 'quick-running' | 'quick-done'
  | 'create-provider' | 'create-name' | 'create-running' | 'create-done'
  | 'manage' | 'manage-actions' | 'manage-update' | 'manage-update-done'
  // ... 69 total screens
```

**Benefits:**
- TypeScript catches invalid screen names
- Autocomplete in IDE
- Refactoring-safe (rename propagates everywhere)

## Adding a New Screen

1. **Add to router** (`src/tui/router/routes.ts`):
   ```typescript
   'my-new-screen': { parent: 'home' },
   'my-new-screen-done': { parent: null },
   ```

2. **Add render logic** (`src/tui/app.tsx`):
   ```typescript
   if (screen === 'my-new-screen') {
     return <MyNewScreen onDone={() => setScreen('my-new-screen-done')} />;
   }
   ```

3. **If async operation, create hook** (`src/tui/hooks/useMyOperation.ts`):
   ```typescript
   export function useMyOperation(options: UseMyOperationOptions): void {
     // Follow pattern from useVariantCreate.ts
   }
   ```

## Testing

```bash
npm test -- --test-name-pattern="TUI"        # TUI integration tests
npm test -- --test-name-pattern="App ESC"    # Navigation tests
npm test -- --test-name-pattern="Screen"     # Screen component tests
```

Test helpers:
```typescript
import { tick, send, KEYS, waitForText } from '../helpers/index.js';

const app = render(<App />);
await waitForText(app, 'Quick Setup');
await send(app.stdin, KEYS.enter);
```

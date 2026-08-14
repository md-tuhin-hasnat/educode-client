import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IdeSettings {
  // Compiler paths
  gccPath: string;
  gppPath: string;
  pythonPath: string;
  javacPath: string;
  javaPath: string;

  // Typography & Layout
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  cursorStyle: 'line' | 'block' | 'underline';
  minimap: boolean;

  // Theme
  theme: string;
  customThemes: Record<string, { name: string; data: any }>;
  
  // Other
  keyboardHandler: 'default' | 'vim' | 'emacs';
  autocomplete: boolean;
}

export type IdeContext = 'global' | 'assignments' | 'exams' | 'posts' | 'comments';

export interface IdeStoreState {
  globalSettings: IdeSettings;
  overrides: Record<string, Partial<IdeSettings>>; // Key is context
  setGlobalSetting: <K extends keyof IdeSettings>(key: K, value: IdeSettings[K]) => void;
  setOverrideSetting: <K extends keyof IdeSettings>(context: string, key: K, value: IdeSettings[K]) => void;
  removeOverride: (context: string) => void;
  getSettingsForContext: (context?: string) => IdeSettings;
}

const defaultSettings: IdeSettings = {
  gccPath: 'gcc',
  gppPath: 'g++',
  pythonPath: 'python3',
  javacPath: 'javac',
  javaPath: 'java',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  fontSize: 14,
  lineHeight: 20,
  tabSize: 4,
  wordWrap: 'off',
  cursorStyle: 'line',
  minimap: true,
  theme: 'educode-dark',
  customThemes: {},
  keyboardHandler: 'default',
  autocomplete: true,
};

export const useIdeStore = create<IdeStoreState>()(
  persist(
    (set, get) => ({
      globalSettings: defaultSettings,
      overrides: {},
      setGlobalSetting: (key, value) => 
        set((state) => ({
          globalSettings: { ...state.globalSettings, [key]: value }
        })),
      setOverrideSetting: (context, key, value) => 
        set((state) => ({
          overrides: {
            ...state.overrides,
            [context]: {
              ...(state.overrides[context] || {}),
              [key]: value
            }
          }
        })),
      removeOverride: (context) => 
        set((state) => {
          const newOverrides = { ...state.overrides };
          delete newOverrides[context];
          return { overrides: newOverrides };
        }),
      getSettingsForContext: (context = 'global') => {
        const { globalSettings, overrides } = get();
        if (context === 'global' || !overrides[context]) {
          return globalSettings;
        }
        return { ...globalSettings, ...overrides[context] };
      }
    }),
    {
      name: 'educode_ide_settings',
    }
  )
);

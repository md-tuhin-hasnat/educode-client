import type { editor } from 'monaco-editor';

export interface MonacoThemeDefinition {
  id: string;
  name: string;
  type: 'dark' | 'light';
  data: editor.IStandaloneThemeData;
}

import MONACO_THEMES_JSON from '@/data/monacoThemes.json';

export const PRESET_THEMES: MonacoThemeDefinition[] = MONACO_THEMES_JSON as unknown as MonacoThemeDefinition[];

export function parseVSCodeThemeJSON(jsonString: string): { id: string; name: string; data: editor.IStandaloneThemeData } | null {
  try {
    const raw = JSON.parse(jsonString);
    const name = raw.name || 'Custom Imported Theme';
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    let base: 'vs' | 'vs-dark' | 'hc-black' = 'vs-dark';
    if (raw.type === 'light') base = 'vs';
    if (raw.type === 'hc' || raw.type === 'high-contrast') base = 'hc-black';

    const rules: editor.ITokenThemeRule[] = [];

    if (Array.isArray(raw.tokenColors)) {
      for (const item of raw.tokenColors) {
        if (!item.settings) continue;
        const scopes = Array.isArray(item.scope) ? item.scope : (item.scope ? [item.scope] : ['']);
        for (const scope of scopes) {
          rules.push({
            token: scope,
            foreground: item.settings.foreground,
            background: item.settings.background,
            fontStyle: item.settings.fontStyle,
          });
        }
      }
    }

    return {
      id,
      name,
      data: {
        base,
        inherit: true,
        rules,
        colors: raw.colors || {},
      },
    };
  } catch (err) {
    console.error('Error parsing VS Code theme JSON:', err);
    return null;
  }
}

export function registerMonacoThemes(monaco: { editor?: { defineTheme: (id: string, data: editor.IStandaloneThemeData) => void } }) {
  if (!monaco || !monaco.editor) return;

  PRESET_THEMES.forEach((t) => {
    try {
      monaco.editor?.defineTheme(t.id, t.data);
    } catch {
      // theme might already be defined
    }
  });

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.customThemes) {
          Object.entries(parsed.customThemes as Record<string, { data?: editor.IStandaloneThemeData }>).forEach(
            ([id, t]) => {
              if (t?.data) {
                try {
                  monaco.editor?.defineTheme(id, t.data);
                } catch {
                  // ignore error
                }
              }
            }
          );
        }
      }
    } catch (err) {
      console.error('Failed to load custom themes into Monaco:', err);
    }
  }
}

export function getActiveThemeId(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.theme) {
          return parsed.theme;
        }
      }
    } catch {
      // ignore
    }
  }
  return 'educode-dark';
}



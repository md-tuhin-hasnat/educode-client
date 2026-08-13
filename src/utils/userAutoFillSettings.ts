export type AutoFillSource = 'name' | 'id' | 'manual';

export interface RoleProvisioningConfig {
  autoFillSource: AutoFillSource;
  emailDomain: string;
  defaultPassword: string;
  idPrefixPattern: string;
  requirePasswordReset: boolean;
}

export interface UserProvisioningSettings {
  student: RoleProvisioningConfig;
  teacher: RoleProvisioningConfig;
  ta: RoleProvisioningConfig;
  admin: RoleProvisioningConfig;
}

export interface UserAutoFillSettings {
  student: AutoFillSource;
  teacher: AutoFillSource;
  ta: AutoFillSource;
  admin: AutoFillSource;
}

export const DEFAULT_PROVISIONING_SETTINGS: UserProvisioningSettings = {
  student: {
    autoFillSource: 'id',
    emailDomain: 'student.university.edu',
    defaultPassword: 'EduCodeStudent2026!',
    idPrefixPattern: 'STU-2026-',
    requirePasswordReset: true,
  },
  teacher: {
    autoFillSource: 'name',
    emailDomain: 'teacher.university.edu',
    defaultPassword: 'EduCodeFaculty2026!',
    idPrefixPattern: 'EMP-2026-',
    requirePasswordReset: true,
  },
  ta: {
    autoFillSource: 'name',
    emailDomain: 'ta.university.edu',
    defaultPassword: 'EduCodeTA2026!',
    idPrefixPattern: 'TA-2026-',
    requirePasswordReset: true,
  },
  admin: {
    autoFillSource: 'name',
    emailDomain: 'admin.university.edu',
    defaultPassword: 'EduCodeAdmin2026!',
    idPrefixPattern: 'ADM-2026-',
    requirePasswordReset: true,
  },
};

export const DEFAULT_AUTOFILL_SETTINGS: UserAutoFillSettings = {
  student: 'id',
  teacher: 'name',
  ta: 'name',
  admin: 'name',
};

const STORAGE_KEY = 'educode_user_provisioning_settings_v2';
const LEGACY_STORAGE_KEY = 'educode_user_autofill_settings';

export function getProvisioningSettings(): UserProvisioningSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_PROVISIONING_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        return {
          student: { ...DEFAULT_PROVISIONING_SETTINGS.student, autoFillSource: legacy.student || 'id' },
          teacher: { ...DEFAULT_PROVISIONING_SETTINGS.teacher, autoFillSource: legacy.teacher || 'name' },
          ta: { ...DEFAULT_PROVISIONING_SETTINGS.ta, autoFillSource: legacy.ta || 'name' },
          admin: { ...DEFAULT_PROVISIONING_SETTINGS.admin, autoFillSource: legacy.admin || 'name' },
        };
      }
      return DEFAULT_PROVISIONING_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      student: { ...DEFAULT_PROVISIONING_SETTINGS.student, ...(parsed.student || {}) },
      teacher: { ...DEFAULT_PROVISIONING_SETTINGS.teacher, ...(parsed.teacher || {}) },
      ta: { ...DEFAULT_PROVISIONING_SETTINGS.ta, ...(parsed.ta || {}) },
      admin: { ...DEFAULT_PROVISIONING_SETTINGS.admin, ...(parsed.admin || {}) },
    };
  } catch {
    return DEFAULT_PROVISIONING_SETTINGS;
  }
}

export function saveProvisioningSettings(settings: UserProvisioningSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        student: settings.student.autoFillSource,
        teacher: settings.teacher.autoFillSource,
        ta: settings.ta.autoFillSource,
        admin: settings.admin.autoFillSource,
      })
    );
  } catch (err) {
    console.error('Failed to save provisioning settings:', err);
  }
}

export function getAutoFillSettings(): UserAutoFillSettings {
  const full = getProvisioningSettings();
  return {
    student: full.student.autoFillSource,
    teacher: full.teacher.autoFillSource,
    ta: full.ta.autoFillSource,
    admin: full.admin.autoFillSource,
  };
}

export function saveAutoFillSettings(settings: UserAutoFillSettings): void {
  const current = getProvisioningSettings();
  saveProvisioningSettings({
    student: { ...current.student, autoFillSource: settings.student },
    teacher: { ...current.teacher, autoFillSource: settings.teacher },
    ta: { ...current.ta, autoFillSource: settings.ta },
    admin: { ...current.admin, autoFillSource: settings.admin },
  });
}

export function generateUsernameFromName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(dr\.|prof\.|mr\.|mrs\.|ms\.)\s+/i, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function generateUsernameFromId(id: string): string {
  if (!id) return '';
  return id
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '');
}

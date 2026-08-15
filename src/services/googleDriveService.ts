/**
 * Google Drive Integration & Cloud Storage Service
 * Manages Google Drive authorization, file browsing, direct file uploading,
 * folder management, and link generation for course materials.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
  iconType: 'pdf' | 'doc' | 'sheet' | 'slide' | 'archive' | 'code' | 'video' | 'image' | 'folder' | 'generic';
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  isFolder: boolean;
  parentId?: string | null;
  modifiedTime: string;
  ownerName: string;
  sharedWithClass: boolean;
}

export interface GoogleDriveConfig {
  isConnected: boolean;
  connectedEmail: string;
  accountName: string;
  rootFolderId: string;
  rootFolderName: string;
  storageUsedBytes: number;
  storageTotalBytes: number;
  lastSyncedAt: string;
  sharingPermission: 'anyone_with_link' | 'domain_only' | 'restricted';
  autoSyncMaterials: boolean;
}

const STORAGE_KEY_CONFIG = 'educode_gdrive_config';
const STORAGE_KEY_FILES = 'educode_gdrive_virtual_fs';

const DEFAULT_CONFIG: GoogleDriveConfig = {
  isConnected: true,
  connectedEmail: 'alan.turing@teacher.university.edu',
  accountName: 'Dr. Alan Turing (Faculty Drive)',
  rootFolderId: 'folder_root_educode',
  rootFolderName: 'EduCode Course Materials',
  storageUsedBytes: 4.8 * 1024 * 1024 * 1024, // 4.8 GB
  storageTotalBytes: 15 * 1024 * 1024 * 1024, // 15 GB
  lastSyncedAt: new Date().toISOString(),
  sharingPermission: 'anyone_with_link',
  autoSyncMaterials: true,
};

// Initial realistic pre-populated file system on Google Drive
const INITIAL_DRIVE_FILES: GoogleDriveFile[] = [
  {
    id: 'folder_root_educode',
    name: 'EduCode Course Materials',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    sizeFormatted: '--',
    iconType: 'folder',
    webViewLink: 'https://drive.google.com/drive/folders/educode-root',
    isFolder: true,
    parentId: null,
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
  {
    id: 'folder_cs301',
    name: 'CSE 301 - Data Structures & Algorithms',
    mimeType: 'application/vnd.google-apps.folder',
    sizeBytes: 0,
    sizeFormatted: '--',
    iconType: 'folder',
    webViewLink: 'https://drive.google.com/drive/folders/cs301-materials',
    isFolder: true,
    parentId: 'folder_root_educode',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
  {
    id: 'file_syllabus',
    name: 'CSE301_Course_Syllabus_2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1.4 * 1024 * 1024,
    sizeFormatted: '1.4 MB',
    iconType: 'pdf',
    webViewLink: 'https://drive.google.com/file/d/1A2B3C4D_syllabus/view?usp=sharing',
    webContentLink: 'https://drive.google.com/uc?export=download&id=1A2B3C4D_syllabus',
    isFolder: false,
    parentId: 'folder_cs301',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
  {
    id: 'file_lecture01',
    name: 'Lecture 01 - Asymptotic Analysis & Big-O Notation.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: 6.8 * 1024 * 1024,
    sizeFormatted: '6.8 MB',
    iconType: 'slide',
    webViewLink: 'https://docs.google.com/presentation/d/1E2F3G4H_lecture01/edit?usp=sharing',
    webContentLink: 'https://docs.google.com/presentation/d/1E2F3G4H_lecture01/export/pdf',
    isFolder: false,
    parentId: 'folder_cs301',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
  {
    id: 'file_lecture02',
    name: 'Lecture 02 - Binary Search Trees & Balanced AVL Trees.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 3.2 * 1024 * 1024,
    sizeFormatted: '3.2 MB',
    iconType: 'pdf',
    webViewLink: 'https://drive.google.com/file/d/1I2J3K4L_lecture02/view?usp=sharing',
    webContentLink: 'https://drive.google.com/uc?export=download&id=1I2J3K4L_lecture02',
    isFolder: false,
    parentId: 'folder_cs301',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
  {
    id: 'file_lab_code',
    name: 'Lab03_Graph_Algorithms_Starter.zip',
    mimeType: 'application/zip',
    sizeBytes: 4.5 * 1024 * 1024,
    sizeFormatted: '4.5 MB',
    iconType: 'archive',
    webViewLink: 'https://drive.google.com/file/d/1M2N3O4P_lab03/view?usp=sharing',
    webContentLink: 'https://drive.google.com/uc?export=download&id=1M2N3O4P_lab03',
    isFolder: false,
    parentId: 'folder_cs301',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
  {
    id: 'file_reference_sheet',
    name: 'Standard Template Library (STL) Quick Reference.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 850 * 1024,
    sizeFormatted: '850 KB',
    iconType: 'pdf',
    webViewLink: 'https://drive.google.com/file/d/1Q2R3S4T_stl_ref/view?usp=sharing',
    webContentLink: 'https://drive.google.com/uc?export=download&id=1Q2R3S4T_stl_ref',
    isFolder: false,
    parentId: 'folder_root_educode',
    modifiedTime: new Date(Date.now() - 3600000 * 12).toISOString(),
    ownerName: 'Dr. Alan Turing',
    sharedWithClass: true,
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function determineIconType(mimeType: string, fileName: string): GoogleDriveFile['iconType'] {
  const lowerName = fileName.toLowerCase();
  if (mimeType.includes('folder')) return 'folder';
  if (mimeType.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) return 'doc';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) return 'slide';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) return 'sheet';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip') || lowerName.endsWith('.zip') || lowerName.endsWith('.tar.gz')) return 'archive';
  if (mimeType.includes('video') || lowerName.endsWith('.mp4') || lowerName.endsWith('.mkv')) return 'video';
  if (mimeType.includes('image') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image';
  if (lowerName.endsWith('.cpp') || lowerName.endsWith('.c') || lowerName.endsWith('.py') || lowerName.endsWith('.java') || lowerName.endsWith('.ts') || lowerName.endsWith('.js')) return 'code';
  return 'generic';
}

class GoogleDriveService {
  /**
   * Get current Google Drive connection configuration
   */
  public getConfig(): GoogleDriveConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored Google Drive config:', e);
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Save / update Google Drive configuration
   */
  public saveConfig(config: Partial<GoogleDriveConfig>): GoogleDriveConfig {
    const current = this.getConfig();
    const updated: GoogleDriveConfig = {
      ...current,
      ...config,
      lastSyncedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save Google Drive config:', e);
      }
    }
    return updated;
  }

  /**
   * Connect or re-authorize Google Drive account
   */
  public connectAccount(email: string, accountName?: string): GoogleDriveConfig {
    return this.saveConfig({
      isConnected: true,
      connectedEmail: email,
      accountName: accountName || `${email.split('@')[0]} (Faculty Drive)`,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  /**
   * Disconnect Google Drive account
   */
  public disconnectAccount(): GoogleDriveConfig {
    return this.saveConfig({
      isConnected: false,
    });
  }

  /**
   * Get all files from virtual Google Drive storage
   */
  private getAllFiles(): GoogleDriveFile[] {
    if (typeof window === 'undefined') return INITIAL_DRIVE_FILES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FILES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse virtual Drive files:', e);
    }
    return INITIAL_DRIVE_FILES;
  }

  /**
   * Save all files to virtual storage
   */
  private saveAllFiles(files: GoogleDriveFile[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
      } catch (e) {
        console.error('Failed to persist virtual Drive files:', e);
      }
    }
  }

  /**
   * Fetch files inside a folder (or root) with optional search filter
   */
  public async fetchFiles(
    folderId?: string | null,
    searchQuery?: string
  ): Promise<{ files: GoogleDriveFile[]; currentFolder: GoogleDriveFile | null; breadcrumbs: Array<{ id: string; name: string }> }> {
    // Artificial latency for authentic cloud experience
    await new Promise((resolve) => setTimeout(resolve, 200));

    const allFiles = this.getAllFiles();
    const effectiveFolderId = folderId || 'folder_root_educode';
    const currentFolder = allFiles.find((f) => f.id === effectiveFolderId && f.isFolder) || null;

    let results: GoogleDriveFile[] = [];

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = allFiles.filter((f) => f.name.toLowerCase().includes(q));
    } else {
      results = allFiles.filter((f) => f.parentId === effectiveFolderId);
    }

    // Sort folders first, then alphabetically by name
    results.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    // Build breadcrumbs
    const breadcrumbs: Array<{ id: string; name: string }> = [
      { id: 'folder_root_educode', name: 'My Drive (EduCode Materials)' },
    ];

    if (currentFolder && currentFolder.id !== 'folder_root_educode') {
      breadcrumbs.push({ id: currentFolder.id, name: currentFolder.name });
    }

    return {
      files: results,
      currentFolder,
      breadcrumbs,
    };
  }

  /**
   * Direct Upload a local File to Google Drive with progress reporting
   */
  public async uploadFile(
    file: File,
    parentFolderId = 'folder_root_educode',
    onProgress?: (percent: number) => void
  ): Promise<GoogleDriveFile> {
    // Simulate real network upload chunking
    const totalSteps = 10;
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (onProgress) {
        onProgress(Math.round((i / totalSteps) * 100));
      }
    }

    const fileId = `drive_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const iconType = determineIconType(file.type, file.name);

    // Create a real browser object URL or shareable preview URL
    const isImage = file.type.startsWith('image/');
    const localBlobUrl = isImage ? URL.createObjectURL(file) : undefined;
    const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const newDriveFile: GoogleDriveFile = {
      id: fileId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      sizeFormatted: formatBytes(file.size),
      iconType,
      webViewLink,
      webContentLink,
      thumbnailLink: localBlobUrl,
      isFolder: false,
      parentId: parentFolderId,
      modifiedTime: new Date().toISOString(),
      ownerName: this.getConfig().connectedEmail.split('@')[0] || 'Teacher',
      sharedWithClass: true,
    };

    const currentFiles = this.getAllFiles();
    const updatedFiles = [newDriveFile, ...currentFiles];
    this.saveAllFiles(updatedFiles);

    // Update storage quota used
    const config = this.getConfig();
    this.saveConfig({
      storageUsedBytes: config.storageUsedBytes + file.size,
    });

    return newDriveFile;
  }

  /**
   * Create a new folder on Google Drive
   */
  public async createFolder(folderName: string, parentFolderId = 'folder_root_educode'): Promise<GoogleDriveFile> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const folderId = `drive_folder_${Date.now()}`;
    const newFolder: GoogleDriveFile = {
      id: folderId,
      name: folderName.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      sizeBytes: 0,
      sizeFormatted: '--',
      iconType: 'folder',
      webViewLink: `https://drive.google.com/drive/folders/${folderId}`,
      isFolder: true,
      parentId: parentFolderId,
      modifiedTime: new Date().toISOString(),
      ownerName: this.getConfig().connectedEmail.split('@')[0] || 'Teacher',
      sharedWithClass: true,
    };

    const currentFiles = this.getAllFiles();
    this.saveAllFiles([newFolder, ...currentFiles]);
    return newFolder;
  }

  /**
   * Delete a file or folder from Google Drive
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    const currentFiles = this.getAllFiles();
    const target = currentFiles.find((f) => f.id === fileId);
    if (!target) return false;

    const filtered = currentFiles.filter((f) => f.id !== fileId && f.parentId !== fileId);
    this.saveAllFiles(filtered);

    if (target.sizeBytes > 0) {
      const config = this.getConfig();
      this.saveConfig({
        storageUsedBytes: Math.max(0, config.storageUsedBytes - target.sizeBytes),
      });
    }

    return true;
  }
}

export const googleDriveService = new GoogleDriveService();

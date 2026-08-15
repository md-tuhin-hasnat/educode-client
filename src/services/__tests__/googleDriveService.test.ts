import { googleDriveService } from '../googleDriveService';

describe('googleDriveService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default config when unconfigured', () => {
    const config = googleDriveService.getConfig();
    expect(config.isConnected).toBe(true);
    expect(config.connectedEmail).toBe('alan.turing@teacher.university.edu');
    expect(config.rootFolderName).toBe('EduCode Course Materials');
    expect(config.storageTotalBytes).toBe(15 * 1024 * 1024 * 1024);
  });

  it('should update and persist configuration', () => {
    const updated = googleDriveService.saveConfig({
      rootFolderName: 'CSE 301 Materials',
      sharingPermission: 'domain_only',
      autoSyncMaterials: false,
    });

    expect(updated.rootFolderName).toBe('CSE 301 Materials');
    expect(updated.sharingPermission).toBe('domain_only');
    expect(updated.autoSyncMaterials).toBe(false);

    const reloaded = googleDriveService.getConfig();
    expect(reloaded.rootFolderName).toBe('CSE 301 Materials');
    expect(reloaded.sharingPermission).toBe('domain_only');
  });

  it('should handle connecting and disconnecting account', () => {
    const connected = googleDriveService.connectAccount('dr.turing@edu.org');
    expect(connected.isConnected).toBe(true);
    expect(connected.connectedEmail).toBe('dr.turing@edu.org');

    const disconnected = googleDriveService.disconnectAccount();
    expect(disconnected.isConnected).toBe(false);
  });

  it('should fetch files and breadcrumbs from virtual Google Drive storage', async () => {
    const result = await googleDriveService.fetchFiles('folder_root_educode');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.breadcrumbs.length).toBeGreaterThanOrEqual(1);
    expect(result.breadcrumbs[0].name).toContain('My Drive');
  });

  it('should support creating a folder on Google Drive', async () => {
    const newFolder = await googleDriveService.createFolder('Lab 05 Dynamic Programming');
    expect(newFolder.id).toBeDefined();
    expect(newFolder.name).toBe('Lab 05 Dynamic Programming');
    expect(newFolder.isFolder).toBe(true);

    const check = await googleDriveService.fetchFiles('folder_root_educode', 'Dynamic Programming');
    expect(check.files.some((f) => f.name === 'Lab 05 Dynamic Programming')).toBe(true);
  });

  it('should support direct uploading a file to Google Drive', async () => {
    const fakeFile = new File(['print("Hello World")'], 'Solution.py', { type: 'text/x-python' });
    let reportedProgress = 0;

    const uploaded = await googleDriveService.uploadFile(fakeFile, 'folder_root_educode', (pct) => {
      reportedProgress = pct;
    });

    expect(uploaded.id).toBeDefined();
    expect(uploaded.name).toBe('Solution.py');
    expect(uploaded.webViewLink).toContain('drive.google.com');
    expect(uploaded.isFolder).toBe(false);
    expect(reportedProgress).toBe(100);
  });
});

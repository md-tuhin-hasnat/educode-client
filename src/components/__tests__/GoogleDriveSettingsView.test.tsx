import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoogleDriveSettingsView } from '../GoogleDriveSettingsView';

describe('GoogleDriveSettingsView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render connection status, storage quota, and settings options', () => {
    render(<GoogleDriveSettingsView />);

    expect(screen.getByText('Google Drive Integration')).toBeInTheDocument();
    expect(screen.getByText('Connected & Synced')).toBeInTheDocument();
    expect(screen.getByText('Google Cloud Storage Quota')).toBeInTheDocument();
    expect(screen.getByText('Save Drive Configuration')).toBeInTheDocument();
  });

  it('should update folder name and save settings', async () => {
    render(<GoogleDriveSettingsView />);

    const folderInput = screen.getByDisplayValue('EduCode Course Materials');
    fireEvent.change(folderInput, { target: { value: 'University Lab Materials 2026' } });

    const submitBtn = screen.getByText('Save Drive Configuration');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Drive settings saved successfully!/i)).toBeInTheDocument();
    });
  });

  it('should run connection test and show success confirmation', async () => {
    render(<GoogleDriveSettingsView />);

    const testBtn = screen.getByText('Test Sync');
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/Google Drive API connection verified!/i)).toBeInTheDocument();
    });
  });
});

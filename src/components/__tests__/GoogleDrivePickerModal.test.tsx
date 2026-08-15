import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoogleDrivePickerModal } from '../GoogleDrivePickerModal';

describe('GoogleDrivePickerModal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render Google Drive modal with header and tabs', async () => {
    render(
      <GoogleDrivePickerModal
        isOpen={true}
        onClose={jest.fn()}
        onSelectMaterials={jest.fn()}
        courseTitle="CSE 301 Algorithms"
      />
    );

    expect(screen.getByText('Google Drive Resource Hub')).toBeInTheDocument();
    expect(screen.getByText('Browse Drive')).toBeInTheDocument();
    expect(screen.getByText('Direct Upload')).toBeInTheDocument();
  });

  it('should switch between Browse and Direct Upload tabs', () => {
    render(
      <GoogleDrivePickerModal
        isOpen={true}
        onClose={jest.fn()}
        onSelectMaterials={jest.fn()}
      />
    );

    const uploadTabBtn = screen.getByText('Direct Upload');
    fireEvent.click(uploadTabBtn);

    expect(screen.getByText(/Drag & drop course document here/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Lecture 04 - Graph Representations/i)).toBeInTheDocument();
  });

  it('should select files and invoke onSelectMaterials when attaching to course', async () => {
    const handleSelect = jest.fn();
    render(
      <GoogleDrivePickerModal
        isOpen={true}
        onClose={jest.fn()}
        onSelectMaterials={handleSelect}
      />
    );

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText(/CSE301_Course_Syllabus_2026.pdf|Standard Template Library/i)).toBeInTheDocument();
    });

    const fileItem = screen.getByText(/Standard Template Library/i);
    fireEvent.click(fileItem);

    const attachBtn = screen.getByText('Attach Selected to Course');
    expect(attachBtn).not.toBeDisabled();

    fireEvent.click(attachBtn);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          fileUrl: expect.stringContaining('drive.google.com'),
        }),
      ])
    );
  });
});

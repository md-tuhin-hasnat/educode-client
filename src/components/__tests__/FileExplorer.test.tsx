import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileExplorer, { WorkspaceFile } from '../FileExplorer';

describe('FileExplorer Component', () => {
  const sampleFiles: WorkspaceFile[] = [
    { id: '1', path: 'Main.java', content: 'public class Main {}' },
    { id: '2', path: 'com/educode/Student.java', content: 'package com.educode; public class Student {}' },
  ];

  const mockSelectFile = jest.fn();
  const mockCreateFile = jest.fn();
  const mockCreateFolder = jest.fn();
  const mockDeletePath = jest.fn();
  const mockOpenJavaPackageModal = jest.fn();

  it('renders workspace files and folder structure correctly', () => {
    render(
      <FileExplorer
        files={sampleFiles}
        activeFilePath="Main.java"
        language="java"
        onSelectFile={mockSelectFile}
        onCreateFile={mockCreateFile}
        onCreateFolder={mockCreateFolder}
        onDeletePath={mockDeletePath}
        onOpenJavaPackageModal={mockOpenJavaPackageModal}
      />
    );

    expect(screen.getByText('Main.java')).toBeInTheDocument();
    expect(screen.getByText('com')).toBeInTheDocument();
  });

  it('triggers onSelectFile when clicking a file', () => {
    render(
      <FileExplorer
        files={sampleFiles}
        activeFilePath="Main.java"
        language="java"
        onSelectFile={mockSelectFile}
        onCreateFile={mockCreateFile}
        onCreateFolder={mockCreateFolder}
        onDeletePath={mockDeletePath}
      />
    );

    fireEvent.click(screen.getByText('Main.java'));
    expect(mockSelectFile).toHaveBeenCalledWith('Main.java');
  });

  it('triggers onOpenJavaPackageModal when Java Package Wizard button is clicked', () => {
    render(
      <FileExplorer
        files={sampleFiles}
        activeFilePath="Main.java"
        language="java"
        onSelectFile={mockSelectFile}
        onCreateFile={mockCreateFile}
        onCreateFolder={mockCreateFolder}
        onDeletePath={mockDeletePath}
        onOpenJavaPackageModal={mockOpenJavaPackageModal}
      />
    );

    const packageWizardBtn = screen.getByTitle('NetBeans Java Package Helper');
    fireEvent.click(packageWizardBtn);
    expect(mockOpenJavaPackageModal).toHaveBeenCalled();
  });
});

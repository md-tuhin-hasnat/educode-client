/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: 'com.educode.desktop',
  productName: 'EduCode',
  copyright: 'Copyright © 2026 EduCode Team',
  directories: {
    output: 'dist',
    buildResources: 'build',
  },
  files: [
    'dist-electron/**/*',
    'out/**/*',
    'node_modules/**/*',
    'package.json',
  ],
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Education',
  },
  deb: {
    maintainer: 'EduCode Team <admin@educode.edu>',
  },
  win: {
    target: ['nsis', 'portable'],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};

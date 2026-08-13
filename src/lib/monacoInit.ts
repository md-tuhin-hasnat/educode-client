import { loader } from '@monaco-editor/react';

// Configure monaco-editor loader to use local static monaco assets in public/monaco/vs instead of CDN
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: '/monaco/vs',
    },
  });
}


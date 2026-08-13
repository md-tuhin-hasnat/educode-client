import path from 'path';

export interface WorkspaceFilePayload {
  path: string;
  content: string;
}

export interface EntryPointInfo {
  entryTarget: string;
  isPackage: boolean;
  packageName?: string;
  className?: string;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\//, '').trim();
}

export function resolveEntryPoint(
  language: string,
  files?: WorkspaceFilePayload[],
  activeFilePath?: string
): EntryPointInfo {
  if (!files || files.length === 0) {
    const defaultTarget = activeFilePath || (
      language === 'python' ? 'solution.py' :
      language === 'java' ? 'Solution.java' :
      language === 'c' ? 'solution.c' : 'solution.cpp'
    );
    const className = path.basename(defaultTarget, path.extname(defaultTarget));
    return {
      entryTarget: language === 'java' ? className : defaultTarget,
      isPackage: false,
      className,
    };
  }

  const normActive = activeFilePath ? normalizePath(activeFilePath) : '';

  if (language === 'java') {
    let focusedMainCandidate: { fullClassName: string; packageName: string; className: string } | null = null;
    let anyMainCandidate: { fullClassName: string; packageName: string; className: string } | null = null;
    let focusedCandidate: { fullClassName: string; packageName: string; className: string } | null = null;
    let fallbackCandidate: { fullClassName: string; packageName: string; className: string } | null = null;

    for (const file of files) {
      if (!file.path.endsWith('.java')) continue;

      const cleanContent = stripComments(file.content);
      const packageMatch = cleanContent.match(/^\s*package\s+([a-zA-Z0-9_.]+)\s*;/m);
      const packageName = packageMatch ? packageMatch[1].trim() : '';

      const normFile = normalizePath(file.path);
      const className = path.basename(normFile, '.java');
      const fullClassName = packageName ? `${packageName}.${className}` : className;

      const isFocused = normActive
        ? normFile === normActive || normFile.endsWith('/' + normActive) || normActive.endsWith('/' + normFile)
        : false;

      const hasMain = /\bvoid\s+main\s*\(/i.test(cleanContent);

      const candidate = { fullClassName, packageName, className };

      if (isFocused) {
        focusedCandidate = candidate;
        if (hasMain) {
          focusedMainCandidate = candidate;
        }
      }

      if (hasMain && !anyMainCandidate) {
        anyMainCandidate = candidate;
      }

      if (!fallbackCandidate) {
        fallbackCandidate = candidate;
      }
    }

    const chosen = focusedMainCandidate || anyMainCandidate || focusedCandidate || fallbackCandidate || {
      fullClassName: 'Solution',
      packageName: '',
      className: 'Solution'
    };

    return {
      entryTarget: chosen.fullClassName,
      isPackage: !!chosen.packageName,
      packageName: chosen.packageName,
      className: chosen.className,
    };
  }

  if (language === 'python') {
    let mainPy: string | null = null;
    for (const file of files) {
      if (!file.path.endsWith('.py')) continue;
      const cleanContent = file.content.replace(/#.*/g, '');
      if (/if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(cleanContent)) {
        mainPy = file.path;
        break;
      }
    }

    const chosenPath = mainPy || activeFilePath || files.find(f => f.path.endsWith('.py'))?.path || 'solution.py';
    return {
      entryTarget: chosenPath,
      isPackage: chosenPath.includes('/'),
    };
  }

  if (language === 'cpp' || language === 'c') {
    const ext = language === 'cpp' ? '.cpp' : '.c';
    let mainFile: string | null = null;
    for (const file of files) {
      if (!file.path.endsWith(ext) && !file.path.endsWith('.c') && !file.path.endsWith('.cpp')) continue;
      const cleanContent = stripComments(file.content);
      if (/\bint\s+main\s*\(/m.test(cleanContent)) {
        mainFile = file.path;
        break;
      }
    }

    const chosenPath = mainFile || activeFilePath || files.find(f => f.path.endsWith(ext))?.path || `solution${ext}`;
    return {
      entryTarget: chosenPath,
      isPackage: files.length > 1,
    };
  }

  return {
    entryTarget: activeFilePath || 'solution',
    isPackage: false,
  };
}

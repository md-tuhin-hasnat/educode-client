import katex from 'katex';

/**
 * Render LaTeX expression to HTML using KaTeX safely
 */
export function renderLatex(tex: string, displayMode = false): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch (err) {
    console.error('KaTeX rendering error:', err);
    return `<span class="katex-error text-rose-400 font-mono text-xs" title="KaTeX Parse Error">${tex}</span>`;
  }
}

/**
 * Creates HTML for an interactive KaTeX pill node to be inserted in contenteditable
 */
export function createInteractiveEquationHtml(latex: string, mode: 'inline' | 'block' = 'inline'): string {
  const clean = latex.trim();
  const encoded = encodeURIComponent(clean);
  const rendered = renderLatex(clean, mode === 'block');

  if (mode === 'block') {
    return `<div class="katex-eq-block my-3 p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 text-center text-emerald-200 select-none cursor-pointer hover:border-emerald-400 hover:shadow-lg transition-all" contenteditable="false" data-latex="${encoded}" data-mode="block" title="Click to edit formula: ${clean.replace(/"/g, '&quot;')}"><!--kq-->${rendered}<!--/kq--></div>`;
  }

  return `<span class="katex-eq-pill inline-flex items-center align-middle mx-1 px-1.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-serif select-none cursor-pointer hover:bg-emerald-900/90 hover:border-emerald-400 transition-all shadow-sm" contenteditable="false" data-latex="${encoded}" data-mode="inline" title="Click to edit formula: ${clean.replace(/"/g, '&quot;')}"><!--kq-->${rendered}<!--/kq--></span>`;
}

/**
 * Transforms raw LaTeX tokens ($...$ and $$...$$) into interactive KaTeX pills for the editor
 */
export function latexToInteractivePills(input: string): string {
  if (!input) return '';

  // 1. Convert display math $$...$$ or \[...\]
  let output = input.replace(/\$\$([\s\S]+?)\$\$/g, (_match, equation) => {
    return createInteractiveEquationHtml(equation, 'block');
  });

  output = output.replace(/\\\[([\s\S]+?)\\\]/g, (_match, equation) => {
    return createInteractiveEquationHtml(equation, 'block');
  });

  // 2. Convert inline math $...$ or \(...\)
  output = output.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_match, equation) => {
    return createInteractiveEquationHtml(equation, 'inline');
  });

  output = output.replace(/\\\(([\s\S]+?)\\\)/g, (_match, equation) => {
    return createInteractiveEquationHtml(equation, 'inline');
  });

  return output;
}

/**
 * Converts interactive KaTeX pills in HTML back into standard LaTeX ($...$ and $$...$$) for serialization
 */
export function interactivePillsToLatex(html: string): string {
  if (!html) return '';

  // In browser or environments with DOMParser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Replace block equations first
      const blockPills = doc.querySelectorAll('.katex-eq-block, [data-mode="block"]');
      blockPills.forEach((el) => {
        const raw = el.getAttribute('data-latex') || '';
        try {
          const latex = decodeURIComponent(raw);
          const textNode = doc.createTextNode(`\n\n$$${latex}$$\n\n`);
          el.replaceWith(textNode);
        } catch {
          // ignore
        }
      });

      // 2. Replace inline equations
      const inlinePills = doc.querySelectorAll('.katex-eq-pill, [data-latex]');
      inlinePills.forEach((el) => {
        const raw = el.getAttribute('data-latex') || '';
        try {
          const latex = decodeURIComponent(raw);
          const textNode = doc.createTextNode(`$${latex}$`);
          el.replaceWith(textNode);
        } catch {
          // ignore
        }
      });

      return doc.body.innerHTML;
    } catch (err) {
      console.warn('DOMParser pill serialization error:', err);
    }
  }

  // Fallback regex parser for server-side environments
  let output = html;
  // Match block equations with <!--kq-->
  output = output.replace(/<div[^>]*data-latex="([^"]+)"[^>]*data-mode="block"[^>]*><!--kq-->[\s\S]*?<!--\/kq--><\/div>/gi, (_match, encoded) => {
    try {
      return `\n\n$$${decodeURIComponent(encoded)}$$\n\n`;
    } catch {
      return _match;
    }
  });

  // Match inline equations with <!--kq-->
  output = output.replace(/<span[^>]*data-latex="([^"]+)"[^>]*data-mode="inline"[^>]*><!--kq-->[\s\S]*?<!--\/kq--><\/span>/gi, (_match, encoded) => {
    try {
      return `$${decodeURIComponent(encoded)}$`;
    } catch {
      return _match;
    }
  });

  // Fallback without mode
  output = output.replace(/<span[^>]*data-latex="([^"]+)"[^>]*><!--kq-->[\s\S]*?<!--\/kq--><\/span>/gi, (_match, encoded) => {
    try {
      return `$${decodeURIComponent(encoded)}$`;
    } catch {
      return _match;
    }
  });

  return output;
}

/**
 * Processes HTML or markdown string and replaces inline ($...$ or \(...\)) 
 * and display ($$...$$ or \[...\]) LaTeX expressions with rendered KaTeX markup for display views.
 */
export function renderMathInHtml(input: string): string {
  if (!input) return '';

  // 1. Process display equations: $$ ... $$ or \[ ... \]
  let output = input.replace(/\$\$([\s\S]+?)\$\$/g, (_match, equation) => {
    return `<div class="katex-display my-3 py-1 flex justify-center overflow-x-auto text-white">${renderLatex(equation, true)}</div>`;
  });

  output = output.replace(/\\\[([\s\S]+?)\\\]/g, (_match, equation) => {
    return `<div class="katex-display my-3 py-1 flex justify-center overflow-x-auto text-white">${renderLatex(equation, true)}</div>`;
  });

  // 2. Process inline equations: $ ... $ (excluding escaped \$ or empty $$)
  output = output.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_match, equation) => {
    return `<span class="katex-inline px-1 text-emerald-300 font-serif inline-flex items-center align-baseline">${renderLatex(equation, false)}</span>`;
  });

  output = output.replace(/\\\(([\s\S]+?)\\\)/g, (_match, equation) => {
    return `<span class="katex-inline px-1 text-emerald-300 font-serif inline-flex items-center align-baseline">${renderLatex(equation, false)}</span>`;
  });

  return output;
}


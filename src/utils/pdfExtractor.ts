import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using CDN matched to version or local fallback
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('[PDF] Worker configuration notice:', e);
  }
}

/**
 * Fallback parser that decodes raw text streams from PDF ArrayBuffer
 * if worker fails or is blocked by sandbox
 */
function extractRawPdfStrings(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let raw = '';
  // Convert bytes in chunks to avoid stack overflow
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    raw += String.fromCharCode(...chunk);
  }

  const textBlocks: string[] = [];
  
  // Extract BT ... ET (Begin Text ... End Text) blocks
  const btRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;

  while ((match = btRegex.exec(raw)) !== null) {
    const block = match[0];
    
    // Match strings in parentheses: (text)
    const parenRegex = /\(([^)]+)\)/g;
    let parenMatch: RegExpExecArray | null;
    let blockText = '';
    
    while ((parenMatch = parenRegex.exec(block)) !== null) {
      blockText += parenMatch[1] + ' ';
    }
    
    // Match hex strings in angle brackets: <hex>
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const hex = hexMatch[1];
      let str = '';
      for (let k = 0; k < hex.length; k += 2) {
        const code = parseInt(hex.substring(k, k + 2), 16);
        if (code >= 32 && code <= 126) {
          str += String.fromCharCode(code);
        }
      }
      if (str) blockText += str + ' ';
    }

    if (blockText.trim().length > 0) {
      textBlocks.push(blockText.trim());
    }
  }

  if (textBlocks.length > 0) {
    return textBlocks.join('\n\n');
  }

  // If no BT/ET blocks matched, collect readable ASCII sequences
  const asciiMatches = raw.match(/[a-zA-Z0-9.,'"!?;:()\-—\s]{15,}/g);
  if (asciiMatches && asciiMatches.length > 0) {
    return asciiMatches
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && !s.includes('/Type') && !s.includes('/Font'))
      .join('\n');
  }

  return '';
}

/**
 * Extracts plain text from a PDF file using pdfjs-dist with resilient fallback
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageTextPromises: Promise<string>[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      pageTextPromises.push(
        pdf.getPage(pageNum).then(async (page) => {
          const content = await page.getTextContent();
          return content.items
            .map((item: any) => ('str' in item ? item.str : ''))
            .filter(Boolean)
            .join(' ');
        })
      );
    }

    const pages = await Promise.all(pageTextPromises);
    const fullText = pages.filter((p) => p.trim().length > 0).join('\n\n--- PAGE BREAK ---\n\n');

    if (fullText && fullText.trim().length > 50) {
      return fullText.trim();
    }
  } catch (err) {
    console.warn('[PDF] pdfjs extraction encountered issue, falling back to raw binary stream decoder:', err);
  }

  // Resilient fallback
  const fallbackText = extractRawPdfStrings(arrayBuffer);
  if (fallbackText && fallbackText.trim().length > 30) {
    return fallbackText.trim();
  }

  throw new Error('Could not extract text from this PDF. The document might be image-based/scanned. Try pasting the text directly.');
}

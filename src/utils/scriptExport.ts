import { GeneratedPage, RadioScriptBlueprint } from '../types';

/**
 * Generates standard BBC Radio Drama Production format
 * - SCENE HEADINGS in bold/ALL CAPS
 * - Cues enumerated: [CUE #. SFX: ...] and [CUE #. MUSIC: ...]
 * - Spoken dialogue indented 20 characters with character names left-aligned in ALL CAPS
 * - Parenthetical acoustic instructions on separate lines before dialogue
 */
export function formatBbcRadioPlay(
  blueprint: RadioScriptBlueprint | null,
  pages: Record<number, GeneratedPage>,
  totalPages: number
): string {
  const parts: string[] = [];

  parts.push('BBC RADIO DRAMA PRODUCTION SCRIPT');
  parts.push('========================================================================');
  parts.push(`PLAY: ${blueprint?.title?.toUpperCase() || 'UNTITLED RADIO PLAY'}`);
  if (blueprint?.originalAuthor) {
    parts.push(`BASED ON: ${blueprint.originalAuthor}`);
  }
  parts.push(`SETTING: ${blueprint?.settingEra || 'Mid-Century Acoustic Theater'}`);
  parts.push(`ESTIMATED RUNNING TIME: ${Math.ceil((totalPages * 75) / 60)} MINUTES`);
  parts.push('========================================================================\n');

  if (blueprint?.characters && blueprint.characters.length > 0) {
    parts.push('CAST OF CHARACTERS:');
    blueprint.characters.forEach((char) => {
      parts.push(`  ${char.name.padEnd(20)} ${char.description} [${char.vocalProfile}]`);
    });
    parts.push('\n------------------------------------------------------------------------\n');
  }

  let cueCounter = 1;

  for (let p = 1; p <= totalPages; p++) {
    const pageData = pages[p];
    parts.push(`PAGE ${p}\n`);

    if (pageData && pageData.lines && pageData.lines.length > 0) {
      for (const line of pageData.lines) {
        if (line.type === 'heading') {
          parts.push(`\n${(line.text || '').toUpperCase()}\n`);
        } else if (line.type === 'sfx') {
          const raw = (line.text || line.line || '').replace(/^\[SFX:\s*/i, '').replace(/\]$/, '').trim();
          parts.push(`\n[CUE ${cueCounter++}. SFX: ${raw.toUpperCase()}]\n`);
        } else if (line.type === 'music') {
          const raw = (line.text || line.line || '').replace(/^\[MUSIC:\s*/i, '').replace(/\]$/, '').trim();
          parts.push(`\n[CUE ${cueCounter++}. MUSIC: ${raw.toUpperCase()}]\n`);
        } else if (line.type === 'bumper') {
          parts.push(`\n[CUE ${cueCounter++}. STATION BUMPER / SPONSOR: ${line.text || line.line}]\n`);
        } else if (line.type === 'dialogue') {
          const speaker = (line.speaker || 'SPEAKER').toUpperCase();
          parts.push(speaker);
          if (line.direction) {
            parts.push(`                    ${line.direction.toUpperCase()}`);
          }
          if (line.line || line.text) {
            const dialogueText = line.line || line.text || '';
            // Indent 20 spaces
            const wrapped = dialogueText.replace(/(?![^\n]{1,60}$)([^\n]{1,60})\s/g, '$1\n                    ');
            parts.push(`                    ${wrapped}\n`);
          }
        } else if (line.type === 'direction') {
          parts.push(`                    ${(line.text || line.line || '').toUpperCase()}\n`);
        }
      }
    } else if (pageData?.rawScript) {
      parts.push(pageData.rawScript.trim());
    } else {
      parts.push(`[Page ${p} has not yet been generated]`);
    }

    parts.push('\n------------------------------------------------------------------------\n');
  }

  return parts.join('\n');
}

/**
 * Generates plain text standard radio drama format
 */
export function formatFullScriptText(
  blueprint: RadioScriptBlueprint | null,
  pages: Record<number, GeneratedPage>,
  totalPages: number
): string {
  const parts: string[] = [];

  // Title Header
  parts.push('================================================================');
  parts.push(`TITLE: ${blueprint?.title?.toUpperCase() || 'UNTITLED RADIO DRAMA'}`);
  if (blueprint?.originalAuthor) {
    parts.push(`BASED ON THE WORK BY: ${blueprint.originalAuthor}`);
  }
  parts.push(`ADAPTED FOR RADIO BROADCAST`);
  parts.push(`TOTAL ESTIMATED AIRTIME: ~${Math.ceil((totalPages * 75) / 60)} MINUTES`);
  parts.push('================================================================\n');

  if (blueprint?.logline) {
    parts.push(`SYNOPSIS:\n${blueprint.logline}\n`);
  }

  // Cast
  if (blueprint?.characters && blueprint.characters.length > 0) {
    parts.push('CAST OF CHARACTERS:');
    blueprint.characters.forEach((char) => {
      parts.push(`  * ${char.name} - ${char.description} (${char.vocalProfile})`);
    });
    parts.push('\n----------------------------------------------------------------\n');
  }

  // Pages
  for (let p = 1; p <= totalPages; p++) {
    const pageData = pages[p];
    parts.push(`[PAGE ${p} OF ${totalPages}]`);
    if (pageData && pageData.rawScript) {
      parts.push(pageData.rawScript.trim());
    } else {
      parts.push(`[Page ${p} has not yet been generated]`);
    }
    parts.push('\n----------------------------------------------------------------\n');
  }

  return parts.join('\n');
}

/**
 * Generates Fountain screenplay / audio play format
 */
export function formatFountainScript(
  blueprint: RadioScriptBlueprint | null,
  pages: Record<number, GeneratedPage>,
  totalPages: number
): string {
  const lines: string[] = [];

  lines.push(`Title: ${blueprint?.title || 'Radio Drama'}`);
  lines.push(`Credit: Adapted for Radio`);
  if (blueprint?.originalAuthor) {
    lines.push(`Author: Based on ${blueprint.originalAuthor}`);
  }
  lines.push(`Format: Radio Drama Script`);
  lines.push('');

  for (let p = 1; p <= totalPages; p++) {
    const pageData = pages[p];
    lines.push(`=== Page ${p} ===`);
    lines.push('');
    if (pageData?.rawScript) {
      lines.push(pageData.rawScript);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Trigger download of a text, bbc or fountain file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Print standard broadcast script with print styles
 */
export function printBroadcastScript(
  blueprint: RadioScriptBlueprint | null,
  pages: Record<number, GeneratedPage>,
  totalPages: number
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const scriptContent = formatBbcRadioPlay(blueprint, pages, totalPages)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${blueprint?.title || 'Radio Script'} - BBC Broadcast Copy</title>
        <style>
          @page {
            size: letter;
            margin: 1in;
          }
          body {
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 11pt;
            line-height: 1.5;
            color: #111;
            background: #fff;
            padding: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
          }
        </style>
      </head>
      <body>
        <pre>${scriptContent}</pre>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

import React, { useState } from 'react';
import { X, Download, Printer, Copy, Check, FileText, Clock, Volume2 } from 'lucide-react';
import { RadioScriptBlueprint, GeneratedPage } from '../types';
import {
  formatFullScriptText,
  formatFountainScript,
  downloadFile,
  printBroadcastScript,
} from '../utils/scriptExport';

interface FullScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: RadioScriptBlueprint | null;
  pages: Record<number, GeneratedPage>;
  totalPages: number;
}

export const FullScriptModal: React.FC<FullScriptModalProps> = ({
  isOpen,
  onClose,
  blueprint,
  pages,
  totalPages,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullText = formatFullScriptText(blueprint, pages, totalPages);
  const generatedCount = Object.keys(pages).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const filename = `${(blueprint?.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}-full-script.txt`;
    downloadFile(fullText, filename);
  };

  const handleDownloadFountain = () => {
    const fountainText = formatFountainScript(blueprint, pages, totalPages);
    const filename = `${(blueprint?.title || 'radio-drama').toLowerCase().replace(/\s+/g, '-')}.fountain`;
    downloadFile(fountainText, filename);
  };

  const handlePrint = () => {
    printBroadcastScript(blueprint, pages, totalPages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-white">
                {blueprint?.title || 'Full Radio Drama Script'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                {generatedCount} of {totalPages} Pages
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Broadcast Master Script • Standard Radio Drama Presentation
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy All'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
              title="Download standard plain text script"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.txt</span>
            </button>

            <button
              onClick={handleDownloadFountain}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
              title="Download screenplay format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.fountain</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Print formatted broadcast copy"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Copy</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Script Content Viewer (Paper Courier style) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-950">
          <div className="script-paper rounded-xl p-6 sm:p-12 text-zinc-900 border border-zinc-300 shadow-lg max-w-4xl mx-auto">
            <pre className="font-script text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
              {fullText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

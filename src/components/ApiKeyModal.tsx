import React, { useState, useEffect } from 'react';
import { Key, Check, ShieldCheck, AlertCircle, X, ExternalLink, RotateCcw } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: (key: string | null) => void;
  onShowToast: (msg: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
  onShowToast,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [serverHasKey, setServerHasKey] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('marrok_custom_gemini_key');
    if (saved) {
      setKeyInput(saved);
      setHasCustomKey(true);
    }

    // Check server key status
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasApiKey === 'boolean') {
          setServerHasKey(data.hasApiKey);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem('marrok_custom_gemini_key', trimmed);
      setHasCustomKey(true);
      onKeyUpdated(trimmed);
      onShowToast('Custom Gemini API key saved successfully!');
    } else {
      handleClear();
    }
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem('marrok_custom_gemini_key');
    setKeyInput('');
    setHasCustomKey(false);
    onKeyUpdated(null);
    onShowToast('Cleared custom key. Using default AI Studio runtime.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0b1015] border border-[#1E2833] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2833] bg-[#0e161c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#37E2C0]/15 text-[#37E2C0] border border-[#37E2C0]/30 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Gemini API Configuration
              </h2>
              <p className="text-[11px] text-[#8E989E]">
                Configure dedicated quota or personal model tier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E989E] hover:text-white hover:bg-[#1a232c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status Banner */}
          <div className="p-3 bg-[#0e171f] border border-[#1b2b38] rounded-xl flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#37E2C0] shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-white">
                {hasCustomKey
                  ? 'Custom API Key Active'
                  : serverHasKey
                  ? 'Default Environment Key Active'
                  : 'Synthesizer Mode Active (No Key Required)'}
              </p>
              <p className="text-[11px] text-[#8E989E]">
                {hasCustomKey
                  ? 'Requests are billed to your personal Google Cloud project quota.'
                  : 'Using built-in zero-latency pipeline and system secrets.'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white block mb-1.5">
              Custom Gemini API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-black/60 border border-[#1E2833] rounded-xl text-white font-mono placeholder-[#4f5963] focus:outline-none focus:border-[#37E2C0]"
            />
            <p className="text-[11px] text-[#8E989E] mt-1.5 flex items-center justify-between">
              <span>Keys remain client-side and in your browser storage only.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[#37E2C0] hover:underline flex items-center gap-1"
              >
                <span>Get Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E2833] bg-[#0c1318]">
          {hasCustomKey ? (
            <button
              onClick={handleClear}
              className="text-xs text-[#F43F5E] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear & Use Default
            </button>
          ) : (
            <span className="text-[11px] text-[#8E989E]">Optional setting</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#CDD5D9] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-[#37E2C0] text-black rounded-xl hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

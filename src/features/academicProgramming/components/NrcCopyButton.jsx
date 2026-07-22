import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * @param {{ nrc: string, compact?: boolean }} props
 */
export default function NrcCopyButton({ nrc, compact = false }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  if (!nrc) {
    return <span className="text-xs text-textSecondary">Sin NRC</span>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(nrc);
      setCopied(true);
    } catch {
      // fallback
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copiado" : "Copiar NRC"}
      aria-label={copied ? `NRC ${nrc} copiado` : `Copiar NRC ${nrc}`}
      className={`
        inline-flex items-center gap-1.5 rounded-md
        text-xs text-textSecondary hover:text-textPrimary
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        ${compact ? "px-1 py-0.5" : "px-1.5 py-1"}
      `}
    >
      <span className="tabular-nums font-medium">
        {compact ? nrc : `NRC ${nrc}`}
      </span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 opacity-60" aria-hidden />
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copiado" : ""}
      </span>
    </button>
  );
}

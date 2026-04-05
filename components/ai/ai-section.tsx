"use client";

import { Sparkles, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AISectionProps {
  loading: boolean;
  error: string | null;
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export function AISection({ loading, error, visible, onDismiss, children }: AISectionProps) {
  if (!visible && !loading) return null;

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-200 bg-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">AI Assistant</span>
        </div>
        {!loading && (
          <button
            onClick={onDismiss}
            className="text-purple-400 hover:text-purple-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
            <span className="text-sm text-purple-700">Analyzing your plan...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {!loading && !error && children}
      </div>
    </div>
  );
}

interface AITriggerButtonProps {
  onClick: () => void;
  loading: boolean;
  label: string;
  disabled?: boolean;
}

export function AITriggerButton({ onClick, loading, label, disabled }: AITriggerButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={loading || disabled}
      className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

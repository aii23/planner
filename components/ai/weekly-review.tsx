"use client";

import { useState } from "react";
import { AISection, AITriggerButton } from "./ai-section";
import { generateWeeklyReview } from "@/app/actions/ai";

interface WeeklyReviewProps {
  weekStartISO: string;
  hasSummaryData: boolean;
}

export function WeeklyReview({ weekStartISO, hasSummaryData }: WeeklyReviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setVisible(true);

    const result = await generateWeeklyReview(weekStartISO);

    if (result.ok) {
      setReviewText(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function handleDismiss() {
    setVisible(false);
    setReviewText(null);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <AITriggerButton
        onClick={handleGenerate}
        loading={loading}
        label="Generate review"
        disabled={!hasSummaryData}
      />

      <AISection
        loading={loading}
        error={error}
        visible={visible}
        onDismiss={handleDismiss}
      >
        {reviewText && (
          <div className="prose prose-sm max-w-none prose-headings:text-purple-900 prose-headings:text-base prose-headings:mt-4 prose-headings:mb-2 prose-p:text-gray-700 prose-p:my-1.5">
            <MarkdownRenderer text={reviewText} />
          </div>
        )}
      </AISection>
    </div>
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join(" ").trim();
      if (content) {
        elements.push(
          <p key={`p-${elements.length}`}>{content}</p>
        );
      }
      currentParagraph = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h3 key={`h-${elements.length}`}>{line.replace("## ", "")}</h3>
      );
    } else if (line.startsWith("- ")) {
      flushParagraph();
      elements.push(
        <li key={`li-${elements.length}`} className="text-sm text-gray-700 ml-4 list-disc">
          {renderInline(line.replace("- ", ""))}
        </li>
      );
    } else if (line.trim() === "") {
      flushParagraph();
    } else {
      currentParagraph.push(line);
    }
  }
  flushParagraph();

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

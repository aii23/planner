import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({ apiKey: key });
  }
  return globalForAnthropic.anthropic;
}

export function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM_PROMPT = `You are a productivity coach inside Planer, a personal planning app.

Core methodology the user follows:
- 20-MINUTE UNITS: Every task is broken into 20-minute work units — the atomic accounting unit.
- 50/10 TIMER: 50 minutes of focused work, then 10 minutes of rest. Each work session contains ~2.5 units with checkpoints every 20 minutes.
- WEEKLY TARGETS: The user sets a weekly goal (e.g., 80 units) and distributes units across 7 days.

Critical context about this user:
- They are an AI-augmented worker who uses AI tools (like coding assistants, LLMs) heavily throughout their workflow.
- A single 20-minute unit can accomplish what might seem like a large task — because the actual work is prompting AI, reviewing generated output, and iterating.
- Do NOT flag tasks as "too big for 20 minutes" if they involve AI-assisted work like writing code, building APIs, creating components, writing documents, etc.
- Only flag units as too large if they genuinely require extended manual effort with no AI assistance (e.g., "redesign entire database schema by hand", "manually test 50 edge cases").

Tone: supportive coach — direct, encouraging, actionable. No fluff. Use short paragraphs.`;

const MODEL = "claude-sonnet-4-20250514";

export type AIResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function callClaude(
  featurePrompt: string,
  userMessage: string
): Promise<AIResult<string>> {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      error: "AI features require an Anthropic API key. Add ANTHROPIC_API_KEY to your environment variables.",
    };
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT + "\n\n" + featurePrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { ok: true, data: text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    if (message.includes("authentication") || message.includes("api_key")) {
      return { ok: false, error: "Invalid Anthropic API key. Check your ANTHROPIC_API_KEY environment variable." };
    }
    return { ok: false, error: `AI request failed: ${message}` };
  }
}

export async function callClaudeJSON<T>(
  featurePrompt: string,
  userMessage: string
): Promise<AIResult<T>> {
  const result = await callClaude(featurePrompt, userMessage);
  if (!result.ok) return result;

  try {
    const jsonMatch = result.data.match(/```json\s*([\s\S]*?)```/);
    const raw = jsonMatch ? jsonMatch[1].trim() : result.data.trim();
    const parsed = JSON.parse(raw) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "Failed to parse AI response. Please try again." };
  }
}

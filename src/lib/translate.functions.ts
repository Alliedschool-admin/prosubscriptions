import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LANG_NAMES: Record<string, string> = {
  ar: "Arabic",
  ur: "Urdu",
  en: "English",
};

const inputSchema = z.object({
  lang: z.enum(["ar", "ur", "en"]),
  strings: z.array(z.string().min(1).max(2000)).min(1).max(80),
});

export const translateStrings = createServerFn({ method: "POST" })
  .inputValidator((raw) => inputSchema.parse(raw))
  .handler(async ({ data }) => {
    const { lang, strings } = data;
    if (lang === "en") return { translations: strings };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const targetName = LANG_NAMES[lang];
    const numbered = strings.map((s, i) => `${i + 1}. ${s.replace(/\s+/g, " ").trim()}`).join("\n");

    const systemPrompt =
      `You are a professional UI translator. Translate every item from English to ${targetName}. ` +
      `Preserve punctuation, numbers, emoji, URLs, brand names, and code identifiers. ` +
      `Return a JSON object of the form {"t":[string, ...]} where t has exactly the same length ` +
      `and order as the input. Do not add commentary.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate to ${targetName}:\n${numbered}` },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Translate failed ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { t?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Translate response was not JSON");
    }
    const t = Array.isArray(parsed.t) ? parsed.t.map((v) => String(v)) : [];
    // Pad / trim to input length to keep client mapping safe.
    const translations = strings.map((s, i) => (typeof t[i] === "string" && t[i].length > 0 ? t[i] : s));
    return { translations };
  });
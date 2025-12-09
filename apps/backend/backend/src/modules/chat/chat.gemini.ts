// backend/src/modules/chat/chat.gemini.ts
import axios from "axios";
import { env } from "../../config/env.ts";

// Combine GEMINI_ENDPOINT (Base URL) and GEMINI_MODEL for dynamic endpoint construction
const GEMINI_BASE_URL = env.GEMINI_ENDPOINT.substring(0, env.GEMINI_ENDPOINT.lastIndexOf('/models/')) || "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GEMINI_MODEL = env.GEMINI_MODEL || "gemini-2.5-flash"; // Fallback to a valid model

if (!GEMINI_BASE_URL || !GEMINI_API_KEY) {
  console.warn("GeminiClient not fully configured (GEMINI_BASE_URL or GEMINI_API_KEY missing).");
}

export const GeminiClient = {
  async generate({ systemPrompt, history, userMessage }: { systemPrompt: string; history: Array<{role:string, content:string}>; userMessage: string; }) {
    // Build a combined prompt instructing Gemini to return structured JSON
    // We'll ask Gemini to output JSON like: {"reply":"...", "intent":"...", "entities":{...}}
    const instruct = `
System: ${systemPrompt}

Conversation history:
${history.map(h => `${h.role}: ${h.content}`).join("\n")}

User: ${userMessage}

Return a JSON object ONLY with keys:
- reply (string, short answer)
- intent (one of: SEARCH_EVENTS, SEARCH_PLACES, RECOMMEND_PERSONAL, GLOBAL_POPULAR, FAQ, SMALL_TALK)
- entities (object with extracted entities like { date, category, location, keywords })
Make sure the JSON is valid and nothing else is printed.
`;

    try {
      const body = {
        contents: [
          {
            parts: [{ text: instruct }],
          },
        ],
        generationConfig: { 
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      };

      // Construct endpoint dynamically: GEMINI_BASE_URL/models/{model}:generateContent
      const fullEndpoint = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`;
      const endpointWithKey = `${fullEndpoint}?key=${GEMINI_API_KEY}`;
      
      const resp = await axios.post(
        endpointWithKey, 
        body, 
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      // Response Parsing: Use the 'generateContent' structure
      const rawResponseText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(resp.data);
      
      let rawText = rawResponseText;
      // FIX: Clean Markdown code fences from the raw text
      if (rawText.startsWith("```")) {
          // Remove the starting triple backticks and optional language identifier (e.g., ```json or ```)
          const firstNewlineIndex = rawText.indexOf('\n');
          if (firstNewlineIndex !== -1) {
              rawText = rawText.substring(firstNewlineIndex + 1);
          }
          // Remove the trailing triple backticks
          if (rawText.endsWith("```")) {
              rawText = rawText.substring(0, rawText.lastIndexOf("```"));
          }
      }
      
      let parsed = null;
      try {
        // try to parse any JSON included in output
        const jsonStart = rawText.indexOf("{");
        if (jsonStart >= 0) {
          const jsonString = rawText.slice(jsonStart);
          parsed = JSON.parse(jsonString);
        }
      } catch (err) {
        parsed = null;
      }

      if (parsed && typeof parsed === "object" && parsed.reply) {
        return {
          reply: parsed.reply,
          intent: parsed.intent || null,
          entities: parsed.entities || null,
          raw: rawResponseText, 
        };
      }

      // fallback: treat whole rawText as reply
      return {
        reply: String(rawText),
        intent: null,
        entities: null,
        raw: rawText,
      };
    } catch (err: any) {
      console.error("GeminiClient.generate error:", err?.response?.data ?? err.message);
      // fallback reply
      return {
        reply: "Sorry — I couldn't contact the assistant right now.",
        intent: null,
        entities: null,
        raw: err?.response?.data ?? err?.message,
      };
    }
  }
};
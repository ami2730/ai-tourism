// backend/src/modules/chat/chat.service.ts
import axios from "axios";
import { prisma } from "../../config/db.ts";
import { env } from "../../config/env.ts";
import { GeminiClient } from "./chat.gemini.ts";

const MEM_LIMIT = Number(env.CHAT_MEMORY_MESSAGES || 20);
const ML_SERVICE_URL = env.ML_SERVICE_URL || "http://127.00.0.1:5000";
const ML_SECRET = env.ML_SECRET || "";

type HandleMessageParams = {
  sessionId?: string | null;
  userId?: string | null;
  message: string;
  meta?: any;
};

export class ChatService {
  // create session (userId optional)
  static async createSession({ userId, title }: { userId?: string | null; title?: string | null }) {
    const session = await prisma.chatSession.create({
      data: {
        userId: userId || "anonymous",
        title: title || null,
      },
    });
    return session;
  }

  // fetch session + last messages
  static async getSession(sessionId: string) {
    return prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  static async listSessions(userId: string) {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }

  // main handler
  static async handleMessage(params: HandleMessageParams) {
    const { sessionId, userId, message, meta } = params;
    // 1) ensure session exists
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    }
    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: userId || "anonymous",
          title: meta?.title || null,
        },
      });
    }

    const sid = session.id;

    // 2) save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: sid,
        role: "USER",
        content: message,
        metadata: meta ? meta : undefined,
      },
    });

    // 3) load last MEM_LIMIT messages for context (asc order)
    const recent = await prisma.chatMessage.findMany({
      where: { sessionId: sid },
      orderBy: { createdAt: "asc" },
      take: MEM_LIMIT,
    });

    // build message history to send to Gemini
    const history = recent.map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

    // 4) call Gemini (system prompt + history + user message)
    const systemPrompt = ChatService._buildSystemPrompt();
    const geminiResp = await GeminiClient.generate({
      systemPrompt,
      history,
      userMessage: message,
    });

    // geminiResp expected: { reply: string, intent?: string, entities?: any, raw?: any }
    const { reply, intent, entities } = geminiResp;

    // 5) intent handling: if intent calls for DB or ML, call them and append results
    let data = null;
    let finalReply = reply;

    try {
      if (intent === "SEARCH_EVENTS") {
        data = await ChatService._searchEvents(entities);
        finalReply = ChatService._joinReplyWithData(reply, data);
      } else if (intent === "SEARCH_PLACES") {
        data = await ChatService._searchPlaces(entities);
        finalReply = ChatService._joinReplyWithData(reply, data);
      } else if (intent === "RECOMMEND_PERSONAL") {
        // call ML service
        if (userId) {
          const recs = await ChatService._getPersonalizedRecommendations(userId, entities);
          data = recs;
          finalReply = ChatService._joinReplyWithData(reply, data);
        } else {
          // no user -> fallback to global
          data = await ChatService._globalRecommendations();
          finalReply = ChatService._joinReplyWithData("I made some popular picks for you:", data);
        }
      } else if (intent === "GLOBAL_POPULAR") {
        data = await ChatService._globalRecommendations();
        finalReply = ChatService._joinReplyWithData(reply, data);
      } else {
        // fallback: small talk or unknown - reply only
      }
    } catch (err) {
      console.error("ChatService intent handler error:", err);
      // keep finalReply as gemini reply but notify user
      finalReply += "\n\n(Warning: failed to fetch live data.)";
    }

    // 6) save assistant message (with metadata storing intent and any returned data summary)
    await prisma.chatMessage.create({
      data: {
        sessionId: sid,
        role: "ASSISTANT",
        content: finalReply,
        metadata: { intent, entities, servedDataCount: Array.isArray(data) ? data.length : null },
      },
    });

    // 7) update session timestamp
    await prisma.chatSession.update({
      where: { id: sid },
      data: { updatedAt: new Date() },
    });

    // 8) return response to client
    return {
      sessionId: sid,
      reply: finalReply,
      intent,
      entities,
      data,
    };
  }

  // small helpers

  static _buildSystemPrompt() {
    return `You are a helpful travel assistant called "Navigator".
You MUST NOT speak as the system; produce user-friendly replies.
When appropriate, extract intent and entities from user messages and return intent names like:
  SEARCH_EVENTS, SEARCH_PLACES, RECOMMEND_PERSONAL, GLOBAL_POPULAR, FAQ, SMALL_TALK.
When you output JSON it must be valid. Provide a short natural language reply for the user.
Do not fabricate guaranteed facts about availability; always indicate if you are unsure and say you'll fetch live data.`;
  }

  static async _searchEvents(entities: any) {
    // Very simple entity-based search - refine as needed
    const where: any = {};
    if (entities?.date) {
      try {
        // expects YYYY-MM-DD or similar
        const d = new Date(entities.date);
        // Check if the date is valid after parsing
        if (!isNaN(d.getTime())) {
          const start = new Date(d.setHours(0, 0, 0, 0));
          const end = new Date(d.setHours(23, 59, 59, 999));
          where.date = { gte: start, lte: end };
        } else {
             // Log if date entity was extracted but invalid
             console.warn("ChatService._searchEvents: Invalid date extracted:", entities.date);
        }
      } catch (e) {
         console.error("ChatService._searchEvents: Error parsing date:", e);
      }
    }
    if (entities?.category) where.categoryId = entities.category;
    if (entities?.placeId) where.placeId = entities.placeId;
    // NOTE: 'location' entity is currently ignored as there is no field for it.

    const events = await prisma.event.findMany({
      where,
      orderBy: [{ bookingCount: "desc" }, { viewCount: "desc" }],
      take: 10,
    });
    return events;
  }

  static async _searchPlaces(entities: any) {
    const where: any = {};
    if (entities?.category) where.categoryId = entities.category;
    if (entities?.name) where.name = { contains: entities.name, mode: "insensitive" };
    const places = await prisma.place.findMany({
      where,
      orderBy: [{ bookingCount: "desc" }, { viewCount: "desc" }],
      take: 10,
    });
    return places;
  }

  static async _getPersonalizedRecommendations(userId: string, entities: any) {
    try {
      const url = `${ML_SERVICE_URL}/recommend/user/${encodeURIComponent(userId)}?n=10`;
      const resp = await axios.get(url, {
        headers: { Authorization: `Bearer ${ML_SECRET}` },
        timeout: 15000,
      });
      // expect { userId, recommendations: [{itemId, score}, ...] }
      const rec = resp.data;
      // map itemIds to actual DB objects (events/places). Our ML returns itemId, and itemType may be included.
      const items = [];
      if (Array.isArray(rec.recommendations)) {
        for (const r of rec.recommendations) {
          const id = r.itemId;
          // Try event
          const ev = await prisma.event.findUnique({ where: { id } });
          if (ev) { items.push({ ...ev, _score: r.score, _type: "EVENT" }); continue; }
          const pl = await prisma.place.findUnique({ where: { id } });
          if (pl) { items.push({ ...pl, _score: r.score, _type: "PLACE" }); continue; }
        }
      }
      return items;
    } catch (err) {
      console.error("ChatService _getPersonalizedRecommendations error:", err?.response?.data ?? err.message);
      // Change: Do not re-throw error, but return empty array if ML service fails, 
      // allowing the flow to continue without the Warning in the final reply.
      return []; 
    }
  }

  static async _globalRecommendations() {
    // reuse your global recommendation logic: top places & events
    const popularEvents = await prisma.event.findMany({
      orderBy: [{ bookingCount: "desc" }, { viewCount: "desc" }],
      take: 6,
    });
    const popularPlaces = await prisma.place.findMany({
      orderBy: [{ bookingCount: "desc" }, { viewCount: "desc" }],
      take: 6,
    });
    return { popularEvents, popularPlaces };
  }

  static _joinReplyWithData(reply: string, data: any) {
    // If data is array or object produce a short appended line
    if (!data) return reply;
    if (Array.isArray(data)) {
      if (data.length === 0) return reply + "\n\n(Note: I couldn't find any items matching your request.)";
      return `${reply}\n\nI found ${data.length} items — showing top ${Math.min(data.length, 6)}.`;
    }
    if (data.popularEvents || data.popularPlaces) {
      const eventCount = data.popularEvents?.length || 0;
      const placeCount = data.popularPlaces?.length || 0;
      if (eventCount === 0 && placeCount === 0) return reply + "\n\n(Note: I couldn't find any popular items right now.)";
      return `${reply}\n\nI found ${eventCount} popular events and ${placeCount} popular places.`;
    }
    return reply;
  }
}
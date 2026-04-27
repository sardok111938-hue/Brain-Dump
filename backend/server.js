const express = require("express");
const cors = require("cors");
require("dotenv").config();

const OpenAI = require("openai");
const multer = require("multer");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ORGANIZE_TIME_VALUES = new Set([
  "dawn",
  "morning",
  "work",
  "communication",
  "appointment",
  "lunch",
  "afternoon",
  "evening",
  "night",
  "sleep",
]);

const extractMessageContentText = (content) => {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }

      if (!block || typeof block !== "object") {
        return "";
      }

      if (typeof block.text === "string") {
        return block.text;
      }

      if (block.type === "text" && typeof block.text === "string") {
        return block.text;
      }

      if (
        block.type === "output_text" &&
        block.text &&
        typeof block.text === "object" &&
        typeof block.text.value === "string"
      ) {
        return block.text.value;
      }

      return "";
    })
    .join("")
    .trim();
};

const stripMarkdownCodeFences = (value) =>
  value.replace(/```json/gi, "").replace(/```/g, "").trim();

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTasks = (value) => {
  if (!Array.isArray(value)) {
    return null;
  }

  const tasks = value
    .map((task) => {
      if (!isRecord(task)) {
        return null;
      }

      const text = typeof task.text === "string" ? task.text.trim() : "";
      const time =
        typeof task.time === "string" ? task.time.trim().toLowerCase() : "";
        
      const reason = typeof task.reason === "string" ? task.reason.trim() : "";

      if (!text || !ORGANIZE_TIME_VALUES.has(time)) {
        return null;
      }

      return {
        text,
        time,
        ...(reason ? { reason } : {}),
      };
    })
    .filter(Boolean);

  return tasks.length > 0 ? tasks : null;
};

const buildPlanFromTasks = (tasks) =>
  tasks.reduce(
    (plan, task) => {
      if (task.time === "work") {
        plan.Work.push(task.text);
      } else {
        plan.Personal.push(task.text);
      }

      return plan;
    },
    {
      Work: [],
      Personal: [],
    }
  );

const normalizeOrganizePayload = (value) => {
  if (!isRecord(value)) {
    return null;
  }

  const tasks = normalizeTasks(value.tasks);
  if (!tasks) {
    return null;
  }

  return {
    tasks,
    plan: buildPlanFromTasks(tasks),
  };
};

const parseOrganizePayloadFromMessage = (message) => {
  const rawParsed = message?.parsed;
  if (rawParsed !== undefined && rawParsed !== null) {
    const normalizedParsed = normalizeOrganizePayload(rawParsed);
    if (normalizedParsed) {
      return {
        source: "message.parsed",
        payload: normalizedParsed,
      };
    }

    console.warn("⚠️ message.parsed exists but failed validation");
  } else {
    console.warn("⚠️ message.parsed missing or null");
  }

  const rawContent = extractMessageContentText(message?.content);
  if (!rawContent) {
    console.warn("⚠️ No usable message.content found for fallback parsing");
    return null;
  }

  const cleanedContent = stripMarkdownCodeFences(rawContent);
  try {
    const parsedFromContent = JSON.parse(cleanedContent);
    const normalizedFromContent = normalizeOrganizePayload(parsedFromContent);

    if (normalizedFromContent) {
      return {
        source: Array.isArray(message?.content)
          ? "message.content[array]"
          : "message.content[string]",
        payload: normalizedFromContent,
      };
    }

    console.warn("⚠️ Parsed JSON from message.content but validation failed");
    return null;
  } catch (error) {
    console.error("❌ Failed to JSON.parse message.content fallback", {
      error: error instanceof Error ? error.message : String(error),
      rawContent: cleanedContent,
    });
    return null;
  }
};

// ================== ORGANIZE ROUTE ==================
app.post("/organize", async (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const response = await client.chat.completions.parse({
      model: "gpt-4o",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    time: {
                      type: "string",
                      enum: [
                        "dawn",
                        "morning",
                        "work",
                        "communication",
                        "appointment",
                        "lunch",
                        "afternoon",
                        "evening",
                        "night",
                        "sleep",
                      ],
                    },
                    reason: {
                      type: ["string", "null"],
                    },
                  },
                  required: ["text", "time", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `
You are an advanced productivity assistant.

Convert user input into a structured task list for two app experiences:
1. Focus Mode
2. Full View

========================
FOCUS MODE — PRIMARY
========================
CRITICAL TEXT PRESERVATION RULE:

You MUST preserve the original meaning and urgency of each task.

- DO NOT remove urgency words
- DO NOT rewrite away urgency
- DO NOT simplify tasks in a way that removes urgency

If the user includes:
asap, urgent, urgently, now, immediately, deadline, due, overdue, today, tonight, tomorrow

You MUST keep that exact word in the final task text.

Examples:
"reply to boss email asap" → "reply to boss email asap"
"send overdue invoice" → "send overdue invoice"
Focus Mode is for ASD/ADHD users.
Tasks must be ordered so the first task is the best next action.

FINAL ORDERING PRIORITY:

1. Urgency
2. Startability
3. Logical grouping
4. Time realism

========================
URGENCY RULE — HIGHEST PRIORITY
========================

Urgency overrides everything.

If a task contains or implies:
asap, urgent, urgently, now, immediately, deadline, due, overdue, today, tonight, tomorrow

Then:
- It must be placed before non-urgent tasks
- It must come before comfort/leisure tasks
- Preserve the urgency word in the task text

Comfort/leisure tasks include:
breakfast, TV, games, scrolling, relaxing

Examples:
Input: "watch TV, enjoy breakfast, reply to boss email asap"
Correct first task: "reply to boss email asap"

Input: "enjoy breakfast, send overdue invoice"
Correct first task: "send overdue invoice"

========================
STARTABILITY RULE
========================

Only apply startability when no urgent task exists.

Prefer small, easy actions first.

Good starter tasks include:
check, open, review, reply, send, read, list

Heavy tasks should not be first if an easier non-urgent task exists.

Heavy tasks include:
finish, complete, write, build, prepare, report, presentation, organize, clean house

Socially demanding tasks should not be first if an easier non-urgent task exists.

Socially demanding tasks include:
call, meet, discuss, boss, client

========================
GROUP ORDERING — SECONDARY
========================

Only apply group ordering when no urgent task exists.

Group 1 — Passive / zero-pressure:
check, open, review, read, calendar

Group 2 — Light actions:
reply, send, email, message, quick admin

Group 3 — Medium effort:
plan, organize part, draft, outline

Group 4 — Heavy work:
report, presentation, write, build, create, prepare

Group 5 — Social / emotional:
call, meeting, discuss, boss, client

Order:
Group 1 before Group 2
Group 2 before Group 3
Group 3 before Group 4
Group 4 before Group 5

========================
FLOW RULE
========================

Keep related tasks together when possible.
Order grouped tasks from small to big.
Do not jump randomly between unrelated contexts unless urgency requires it.

========================
TIME REALISM RULE
========================

Time is a constraint, not the main priority system.

Rules:
- Do not create impossible sequences
- Sleep must be last
- Morning tasks usually come before later tasks unless urgency overrides them

========================
FULL VIEW — SECONDARY
========================

Full View shows the complete list.
Users can reorder tasks themselves.
Time labels are hints, not priority drivers.

========================
OUTPUT RULES
========================

- Extract all actionable tasks
- Keep tasks concise, but NEVER remove urgency or meaning.
- Do not merge unrelated tasks
- Split large tasks if needed
- Each task must include a "text" field
- Each task must include a "time" field
- Each task must include a "reason" field
- The "reason" field may be either a short string or null
- Return tasks in Focus Mode order
- Do not sort purely by time
- Do not sort purely by importance
- Do not return priorities
- Do not return plan
- The reason must be one short sentence explaining why this task is useful to do next
- Use only the user's words and context
- Do not invent facts
- If the only clear reason is urgency, use: "It was marked urgent."
- Return JSON only

Time values only:
dawn, morning, work, communication, appointment, lunch, afternoon, evening, night, sleep

Output format:
{
  "tasks": [
    { "text": "...", "time": "...", "reason": "..." }
  ]
}

Return structured JSON only.
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const choice = response?.choices?.[0];
    const message = choice?.message;
    const rawContentText = extractMessageContentText(message?.content);

    console.log("ORGANIZE OPENAI RESPONSE SUMMARY:", {
      id: response?.id ?? null,
      model: response?.model ?? null,
      choiceCount: Array.isArray(response?.choices) ? response.choices.length : 0,
      finishReason: choice?.finish_reason ?? null,
      hasMessage: Boolean(message),
      hasParsed: message?.parsed !== undefined && message?.parsed !== null,
      contentType: Array.isArray(message?.content) ? "array" : typeof message?.content,
      hasRefusal: Boolean(message?.refusal),
      rawContentPreview: rawContentText ? rawContentText.slice(0, 500) : null,
    });

    if (!message) {
      console.error("❌ Missing message on first choice");
      return res.status(502).json({ error: "Could not build a valid plan." });
    }

    if (message.refusal) {
      console.warn("⚠️ Model refusal on /organize", {
        refusal: message.refusal,
      });
    }

    const parsedResult = parseOrganizePayloadFromMessage(message);

    if (!parsedResult?.payload || !Array.isArray(parsedResult.payload.tasks)) {
      console.error("❌ No valid organize payload after all parse attempts");
      return res.status(502).json({ error: "Could not build a valid plan." });
    }

    const parsed = parsedResult.payload;

    console.log("AI STRUCTURED OUTPUT SOURCE:", parsedResult.source);
    console.log("AI STRUCTURED OUTPUT:", JSON.stringify(parsed, null, 2));

    return res.json(parsed);
  } catch (error) {
    console.error("ORGANIZE ERROR:", {
      message: error instanceof Error ? error.message : String(error),
      type: error?.type ?? null,
      param: error?.param ?? null,
      status: error?.status ?? null,
    });

    return res.status(500).json({ error: "Organize failed" });
  }
});

// ================== TRANSCRIBE ROUTE ==================
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const oldPath = req.file.path;
    const newPath = oldPath + ".m4a";

    fs.renameSync(oldPath, newPath);

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: "gpt-4o-mini-transcribe"
    });

    fs.unlinkSync(newPath);

    res.json({ text: transcription.text });

  } catch (error) {
    console.error("TRANSCRIPTION ERROR:", error);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// ================== START SERVER ==================
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});

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

const buildFallbackOrganizeResponse = (text) => ({
  tasks: [{ text, time: "afternoon" }],
  plan: {
    Work: [],
    Personal: [text],
  },
  priorities: {
    High: [text],
    Medium: [],
    Low: [],
  },
});

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

const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : null;

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
      const time = typeof task.time === "string" ? task.time.trim() : "";

      if (!text || !ORGANIZE_TIME_VALUES.has(time)) {
        return null;
      }

      return { text, time };
    })
    .filter(Boolean);

  return tasks.length > 0 ? tasks : null;
};

const normalizeOrganizePayload = (value) => {
  if (!isRecord(value)) {
    return null;
  }

  const tasks = normalizeTasks(value.tasks);
  if (!tasks) {
    return null;
  }

  const planSource = isRecord(value.plan) ? value.plan : {};
  const prioritiesSource = isRecord(value.priorities) ? value.priorities : {};

  const plan = {
    Work: normalizeStringArray(planSource.Work) ?? [],
    Personal: normalizeStringArray(planSource.Personal) ?? [],
  };

  const priorities = {
    High: normalizeStringArray(prioritiesSource.High) ?? [],
    Medium: normalizeStringArray(prioritiesSource.Medium) ?? [],
    Low: normalizeStringArray(prioritiesSource.Low) ?? [],
  };

  return {
    tasks,
    plan,
    priorities,
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
                  },
                  required: ["text", "time"],
                  additionalProperties: false,
                },
              },
              plan: {
                type: "object",
                properties: {
                  Work: {
                    type: "array",
                    items: { type: "string" },
                  },
                  Personal: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["Work", "Personal"],
                additionalProperties: false,
              },
              priorities: {
                type: "object",
                properties: {
                  High: {
                    type: "array",
                    items: { type: "string" },
                  },
                  Medium: {
                    type: "array",
                    items: { type: "string" },
                  },
                  Low: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["High", "Medium", "Low"],
                additionalProperties: false,
              },
            },
            required: ["tasks", "plan", "priorities"],
            additionalProperties: false,
          },
        },
      },

      messages: [
        {
          role: "system",
          content: `
You are an advanced productivity assistant.

Convert user input into a structured daily plan.

Rules:
- Extract ALL actionable tasks
- Keep tasks short and clear
- Do NOT merge unrelated tasks
- Every task must appear in tasks, plan, and priorities
- Each task must include a "time" field

Time values ONLY:
dawn, morning, work, communication, appointment, lunch, afternoon, evening, night, sleep

Sort tasks in this exact order:
dawn → morning → work → communication → appointment → lunch → afternoon → evening → night → sleep

Return structured JSON only.
`
        },
        {
          role: "user",
          content: text
        }
      ]
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
      return res.json(buildFallbackOrganizeResponse(text.trim()));
    }

    if (message.refusal) {
      console.warn("⚠️ Model refusal on /organize", {
        refusal: message.refusal,
      });
    }

    const parsedResult = parseOrganizePayloadFromMessage(message);

if (!parsedResult?.payload || !Array.isArray(parsedResult.payload.tasks)) {
  console.error("❌ No valid organize payload after all parse attempts");
  return res.json(buildFallbackOrganizeResponse(text.trim()));
}

const parsed = parsedResult.payload;

// SAFETY DEFAULTS
parsed.plan = parsed.plan || { Work: [], Personal: [] };
parsed.priorities = parsed.priorities || { High: [], Medium: [], Low: [] };

// PRECOMPUTE
const taskTexts = parsed.tasks.map(t => t.text);
const taskSet = new Set(taskTexts);

// HARDEN ARRAYS
parsed.plan.Work = Array.isArray(parsed.plan.Work) ? parsed.plan.Work : [];
parsed.plan.Personal = Array.isArray(parsed.plan.Personal) ? parsed.plan.Personal : [];

parsed.priorities.High = Array.isArray(parsed.priorities.High) ? parsed.priorities.High : [];
parsed.priorities.Medium = Array.isArray(parsed.priorities.Medium) ? parsed.priorities.Medium : [];
parsed.priorities.Low = Array.isArray(parsed.priorities.Low) ? parsed.priorities.Low : [];

// SANITIZE
for (const key of ["Work", "Personal"]) {
  parsed.plan[key] = parsed.plan[key].filter(t => taskSet.has(t));
}

for (const key of ["High", "Medium", "Low"]) {
  parsed.priorities[key] = parsed.priorities[key].filter(t => taskSet.has(t));
}

// ENSURE COMPLETENESS
const workSet = new Set(parsed.plan.Work);
const personalSet = new Set(parsed.plan.Personal);
const highSet = new Set(parsed.priorities.High);
const mediumSet = new Set(parsed.priorities.Medium);
const lowSet = new Set(parsed.priorities.Low);

for (const task of taskTexts) {
  if (!workSet.has(task) && !personalSet.has(task)) {
    parsed.plan.Personal.push(task);
    personalSet.add(task);
  }

  if (!highSet.has(task) && !mediumSet.has(task) && !lowSet.has(task)) {
    parsed.priorities.Medium.push(task);
    mediumSet.add(task);
  }
}

// DEDUPE
const dedupe = (arr) => Array.from(new Set(arr));

parsed.plan.Work = dedupe(parsed.plan.Work);
parsed.plan.Personal = dedupe(parsed.plan.Personal);

parsed.priorities.High = dedupe(parsed.priorities.High);
parsed.priorities.Medium = dedupe(parsed.priorities.Medium);
parsed.priorities.Low = dedupe(parsed.priorities.Low);

// FINAL LOG
console.log("AI STRUCTURED OUTPUT SOURCE:", parsedResult.source);
console.log("AI STRUCTURED OUTPUT:", JSON.stringify(parsed, null, 2));

return res.json(parsed);
  } catch (error) {
    console.error("ERROR:", error);

    return res.json(buildFallbackOrganizeResponse(text.trim()));
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

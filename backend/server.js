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
      const lowerText = task.text.toLowerCase();

if (
  task.time === "work" ||
  lowerText.includes("boss") ||
  lowerText.includes("client") ||
  lowerText.includes("report") ||
  lowerText.includes("presentation") ||
  lowerText.includes("email")
) {
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
  const { text, mode } = req.body;
  const organizeMode = mode === "focus" ? "focus" : "full";

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

Convert user input into a structured task list.

Extract all actionable tasks.
Keep wording close to the user.
Preserve urgency words exactly.
Do not remove meaning.
Do not merge unrelated tasks.
Split large tasks if needed.

Each task must include:
- text
- time
- reason

Allowed time values:
dawn, morning, work, communication, appointment, lunch, afternoon, evening, night, sleep

Mode: ${organizeMode}

If mode is "full":
- use a natural, readable order
- do not over-optimize reordering

If mode is "focus":

1. Urgent tasks first
(tasks containing: asap, urgent, today, tomorrow, tonight, now, immediately, deadline, due, overdue)

2. Starter / low-friction tasks next
Examples: shower, brush teeth, breakfast

3. Work flow:
- context (check, review, read, messages)
- clarification (call, client, boss)
- planning (plan, outline, draft)
- execution (report, write, build, finish)

4. Do not create impossible flows

5. Sleep must be last
6. For routine tasks, prefer: shower → brush teeth → breakfast.
7. If there is any work task, include a work-start transition task.

Use exactly:
{ "text": "go work", "time": "work", "reason": "Starts your work block." }

Place it:
- after starter/routine tasks
- before the first work task

reason:
- short practical sentence or null
- do not invent context
- use "It was marked urgent." only when the task text itself contains an urgent word

Return JSON only in this shape:
{
  "tasks": [{ "text": "...", "time": "...", "reason": "..." }]
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
      mode: organizeMode,
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

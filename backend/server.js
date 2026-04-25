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
                  },
                  required: ["text", "time"],
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

Convert user input into a structured daily plan.

Rules:
- Extract ALL actionable tasks
- Keep tasks short and clear
- Do NOT merge unrelated tasks
- Each task must include a "time" field
- Return ONLY the tasks array
- Do not return priorities
- Do not return plan

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

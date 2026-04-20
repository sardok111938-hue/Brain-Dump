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


// ================== ORGANIZE ROUTE ==================
app.post("/organize", async (req, res) => {
  const { text } = req.body;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an advanced productivity assistant.

Turn the user's input into a structured action plan.

Rules:
- Extract ALL actionable tasks
- Add a short deadline if possible (e.g. "today", "this week")
- Break complex tasks into smaller steps
- Keep tasks clear and practical
- Every task must appear in plan AND priorities

Return ONLY valid JSON. No explanation.

FORMAT:
{
  "tasks": ["task (deadline)"],
  "plan": {
    "Work": [],
    "Personal": []
  },
  "priorities": {
    "High": [],
    "Medium": [],
    "Low": []
  }
}
          `,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    let output = response.choices[0].message.content;

    console.log("AI RAW OUTPUT:", output);

    // Clean markdown if AI adds it
    output = output.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);

      return res.json({
        tasks: [text],
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
    }

    res.json(parsed);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: "AI failed" });
  }
});


// ================== TRANSCRIBE ROUTE (FIXED) ==================
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const oldPath = req.file.path;

    // 🔥 FIX: Add correct extension so OpenAI accepts file
    const newPath = oldPath + ".m4a";
    fs.renameSync(oldPath, newPath);

    console.log("FILE PATH:", newPath);

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: "gpt-4o-mini-transcribe",
    });

    fs.unlinkSync(newPath); // cleanup

    console.log("TRANSCRIPTION:", transcription.text);

    res.json({ text: transcription.text });
  } catch (error) {
    console.error("TRANSCRIPTION ERROR:", error);
    res.status(500).json({ error: "Transcription failed" });
  }
});


// ================== START SERVER ==================
app.listen(3000, '0.0.0.0', () => {
  console.log("Server running on http://0.0.0.0:3000");
});
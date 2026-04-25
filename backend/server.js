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
- Do not drop routine items like breakfast, lunch, dinner, shower, brushing teeth, prayer, walking dog, gym, or sleep. Treat them as valid tasks.
- If the user mentions breakfast, lunch, or dinner, you MUST include it exactly as its own task.
- Add a short deadline if possible, only when useful
- NEVER remove any user-mentioned routine item.
- If the user mentions breakfast, lunch, dinner, shower, brush teeth, prayer, gym, dog walk, reading, or sleep, it MUST appear as its own item in "tasks".
- Do not merge lunch into another task.
- Break complex tasks into smaller steps
- Keep tasks clear and practical
- Every task must appear in plan AND priorities
- Preserve the same task wording across "tasks", "plan", and "priorities"

CRITICAL ORDERING RULE:
The "tasks" array itself must be sorted in a realistic chronological daily timeline.
Do NOT keep the user's original order.
Do NOT rely on the priorities object to express order.

Sort the "tasks" array using this exact daily timeline:
1. dawn / prayer tasks
2. hygiene tasks like brush teeth or shower
3. breakfast / morning food
4. work tasks like work, email, reports
5. communication tasks like calls or messages
6. appointments like dentist or meetings
7. lunch
8. errands like shopping or buying
9. outdoor tasks like walking the dog
10. exercise tasks like gym or running
11. evening wind-down tasks like reading or relaxing
12. bedtime or sleep tasks last

Strict examples:
Input: go to bed, have lunch, read a story, go to work, finish report, go shopping, brush teeth, have breakfast
Output tasks: ["brush teeth", "have breakfast", "go to work", "finish report", "have lunch", "go shopping", "read a story", "go to bed"]

Input: read story, go gym, walk dog, call wife, go shop, go work, finish report, go dentist, brush teeth, go bed
Output tasks: ["brush teeth", "go work", "finish report", "call wife", "go dentist", "go shop", "walk dog", "go gym", "read story", "go bed"]

Return ONLY valid JSON. No explanation.

FORMAT:
{
  "tasks": ["task"],
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

    output = output.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(output);
      console.log("AI PARSED OUTPUT:", JSON.stringify(parsed, null, 2));
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

// ================== TRANSCRIBE ROUTE ==================
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const oldPath = req.file.path;
    const newPath = oldPath + ".m4a";

    fs.renameSync(oldPath, newPath);

    console.log("FILE PATH:", newPath);

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: "gpt-4o-mini-transcribe",
    });

    fs.unlinkSync(newPath);

    console.log("TRANSCRIPTION:", transcription.text);

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
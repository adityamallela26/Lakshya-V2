import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json());

  // API Health Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint for AI habit analytics
  app.post("/api/gemini/analyze-habits", async (req, res) => {
    try {
      const { habits, todayDate } = req.body;
      if (!habits || !Array.isArray(habits)) {
        res.status(400).json({ error: "Missing habits array" });
        return;
      }

      if (habits.length === 0) {
        res.json({
          metricsSummary: "No habits tracked yet. Create your first habit row to activate AI suggested insights!",
          insights: [
            {
              title: "Establish a baseline",
              description: "Begin tracking daily and custom behaviors to allow our analysis model to track streaks and consistency metrics.",
              impact: "High"
            }
          ],
          aiConsistencyRating: 0
        });
        return;
      }

      const habitsSummary = habits.map((h: any) => {
        // Summarize completion states over the past 30 days of history
        const historyEntries = Object.entries(h.history || {});
        const totalHistory = historyEntries.length;
        const totalCompleted = historyEntries.filter(([_, stat]) => stat === 'Done').length;
        const totalMissed = historyEntries.filter(([_, stat]) => stat === 'Missed').length;
        
        return {
          name: h.name,
          frequency: h.frequency,
          currentStreak: h.currentStreak || 0,
          longestStreak: h.longestStreak || 0,
          completionPercent: h.completionPercent || 0,
          createdDate: h.createdDate,
          totalTrackedDays: totalHistory,
          totalDaysCompleted: totalCompleted,
          totalDaysMissed: totalMissed
        };
      });

      const prompt = `Analyze the student's current habit matrix as of ${todayDate}.
Habits data:
${JSON.stringify(habitsSummary, null, 2)}

Provide structured, positive, highly action-oriented analytics, observations, and recommendations. Help them optimize their schedule and discipline. Focus on consistency gaps, habit pacing, and celebrate existing streaks.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite, encouraging behavior-design psychologist and student coach. Give high-impact, analytical suggestions based strictly on the provided habit data. Format all outputs so they represent professional, direct advice with a friendly modern tone.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              metricsSummary: {
                type: Type.STRING,
                description: "Overall synthesis of their custom and daily routines consistency."
              },
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Short descriptive title of the insight." },
                    description: { type: Type.STRING, description: "Detailed contextual feedback and action step." },
                    impact: { type: Type.STRING, description: "High, Medium, or Low" }
                  },
                  required: ["title", "description", "impact"]
                },
                description: "Array of exactly 3 granular recommendations."
              },
              aiConsistencyRating: {
                type: Type.INTEGER,
                description: "Overall calculated habit strength out of 100 based on streaks and frequency schedules."
              }
            },
            required: ["metricsSummary", "insights", "aiConsistencyRating"]
          }
        }
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Gemini habits analysis endpoint failed:", err);
      res.status(500).json({ error: err.message || "Failed to analyze habits" });
    }
  });

  // API endpoint for AI flowchart generation
  app.post("/api/gemini/generate-flowchart", async (req, res) => {
    try {
      const { topic, subject } = req.body;
      if (!topic || typeof topic !== "string") {
        res.status(400).json({ error: "Missing required string parameter: topic" });
        return;
      }

      const prompt = `Topic: ${topic}
Subject area: ${subject || "General Education"}

Generate a detailed study flowchart for this topic.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are a flowchart generator for a student productivity app called Lakshya.
Convert the given topic into a logical, educational flowchart to reduce the student's mental load of tracking sequence and decision logic.
Output ONLY valid JSON matching the specified schema. Do not write any markdown blocks, prose, or extra text.

Rules:
1. Every node must have a type which is one of: 'start', 'step', 'decision', 'end'.
2. Every flowchart must have exactly one 'start' node and at least one 'end' node.
3. Decision nodes should represent questions/conditions and have multiple outgoing branches (edges) with 'label' values describing the conditions (e.g., 'Yes', 'No', 'Turnover > 10cr').
4. Keep each node label under 12 words for excellent readability on small screens.
5. If a topic has many conditions (e.g., tax slabs, audit steps, GST rules), represent each path as a separate branch so the logic is crystal clear.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique string ID (e.g., '1', '2', '3')" },
                    label: { type: Type.STRING, description: "Short descriptive label of the step or decision (under 12 words)" },
                    type: { type: Type.STRING, description: "Must be start, step, decision, or end" }
                  },
                  required: ["id", "label", "type"]
                },
                description: "List of nodes in the flowchart."
              },
              edges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Optional edge ID" },
                    source: { type: Type.STRING, description: "Source node ID" },
                    target: { type: Type.STRING, description: "Target node ID" },
                    label: { type: Type.STRING, description: "Optional edge label (e.g., 'Yes', 'No' or conditional criteria), especially for edges starting from 'decision' nodes" }
                  },
                  required: ["source", "target"]
                },
                description: "List of directional edges connecting the nodes."
              }
            },
            required: ["nodes", "edges"]
          }
        }
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error("Gemini flowchart generation endpoint failed:", err);
      res.status(500).json({ error: err.message || "Failed to generate flowchart" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

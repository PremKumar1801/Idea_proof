const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Groq = require("groq-sdk");

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================
   TEST ROUTE
========================================= */

app.get("/", (req, res) => {
    res.send("Backend Running");
});
/* =========================================
   ANALYZE ROUTE
========================================= */

app.post(["/analyze", "/api/analyze"], async (req, res) => {

    try {

        const data = req.body;

        const prompt = `
You are a startup business analyst. Analyze this startup idea deeply.

DATA:
${JSON.stringify(data)}

Return ONLY valid JSON, no markdown fences, no extra text. Use this exact schema:

{
  "score": <number 0-100>,
  "profitPotential": "<High/Medium/Low — short explanation>",
  "risks": "<main risks in 1-2 sentences>",
  "targetAudience": "<who is this for>",
  "competitors": "<main competitors>",
  "strengths": "<key strengths>",
  "weaknesses": "<key weaknesses>",
  "opportunities": "<market opportunities>",
  "threats": "<external threats>",
  "roadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "verdict": "<final verdict in 1-2 sentences>"
}
`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "qwen/qwen3.8-27b",
            temperature: 0.3
        });

        const response = chatCompletion.choices[0]?.message?.content || "No response generated";

        res.json({
            success: true,
            result: response
        });

    } catch (error) {

        console.log("Analyze Error:", error.message || error);

        res.status(500).json({
            success: false,
            message: error.message || "Server Error"
        });

    }

});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Server Started On Port ${PORT}`);
    });
}

module.exports = app;

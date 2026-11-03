const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Groq = require("groq-sdk");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const ideaRoutes = require("./routes/ideas");
const interestRoutes = require("./routes/interests");

const app = express();

// CORS configuration – allow specific origin via env or fallback to *
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// JSON body size limit (1 MB)
app.use(express.json({ limit: "1mb" }));

// Simple in‑memory rate limiter (max 100 requests per minute per IP)
const rateLimits = new Map();
app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100;
    let record = rateLimits.get(ip);
    if (!record) {
        record = { count: 1, start: now };
        rateLimits.set(ip, record);
        return next();
    }
    if (now - record.start > windowMs) {
        // reset window
        record.count = 1;
        record.start = now;
        return next();
    }
    if (record.count >= maxRequests) {
        res.setHeader("Retry-After", Math.ceil((windowMs - (now - record.start)) / 1000));
        return res.status(429).json({ success: false, message: "Too many requests, please try again later." });
    }
    record.count++;
    next();
});

// Basic security headers without extra dependencies
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
});

// Ensure database connection for requests
connectDB().catch((err) => console.error("Database connection failed on startup:", err.message));

// Mount authentication routes on both /auth and /api/auth
app.use(["/auth", "/api/auth"], authRoutes);

// Mount community idea routes on both /ideas and /api/ideas
app.use(["/ideas", "/api/ideas"], ideaRoutes);

// Mount collaboration interest routes on both /interests and /api/interests
app.use(["/interests", "/api/interests"], interestRoutes);

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
        const prompt = `\nYou are a startup business analyst. Analyze this startup idea deeply.\n\nDATA:\n${JSON.stringify(data)}\n\nReturn ONLY valid JSON, no markdown fences, no extra text. Use this exact schema:\n\n{\n  "score": <number 0-100>,\n  "profitPotential": "<High/Medium/Low — short explanation>",\n  "risks": "<main risks in 1-2 sentences>",\n  "targetAudience": "<who is this for>",\n  "competitors": "<main competitors>",\n  "strengths": "<key strengths>",\n  "weaknesses": "<key weaknesses>",\n  "opportunities": "<market opportunities>",\n  "threats": "<external threats>",\n  "roadmap": ["<step 1>", "<step 2>", "<step 3>"],\n  "verdict": "<final verdict in 1-2 sentences>"\n}\n`;
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "qwen/qwen3.8-27b",
            temperature: 0.3
        });
        const response = chatCompletion.choices[0]?.message?.content || "No response generated";
        res.json({ success: true, result: response });
    } catch (error) {
        console.log("Analyze Error:", error.message || error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server Started On Port ${PORT}`);
    });
}

module.exports = app;

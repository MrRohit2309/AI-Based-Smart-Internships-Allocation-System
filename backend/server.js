const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const pool = require("./config/db");

const profileRoutes = require("./routes/profileRoutes");
const AdminRoutes = require("./routes/AdminRoutes");
const InternshipRoutes = require("./routes/InternshipRoutes");
const ApplicationRoutes = require("./routes/ApplicationRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = 3000;

// ✅ Allow Safari requests from 127.0.0.1 AND localhost
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",  // Safari local frontend
    "http://localhost:5500"   // optional alternative
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

// --- Middleware setup ---
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// --- Route setup ---
app.use('/api/profile', profileRoutes);
app.use('/admin', AdminRoutes);
app.use("/internships", InternshipRoutes);
app.use("/applications", ApplicationRoutes);
app.use('/auth', authRoutes);

// --- 🧠 AI MATCH ROUTE (FINAL & FIXED) ---
app.post("/api/match", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email required" });
  }

  try {
    // 1️⃣ Fetch user
    const [userRows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userData = userRows[0];

    // 2️⃣ Fetch internships
    const [internships] = await pool.query("SELECT * FROM internships");

    // 3️⃣ Send data to Python AI
    const python = spawn("python3", [
      path.join(__dirname, "AI_Matcher", "Ai-model.py")
    ]);

    let output = "";
    let error = "";

    python.stdin.write(JSON.stringify({ user: userData, internships }));
    python.stdin.end();

    python.stdout.on("data", (data) => (output += data.toString()));
    python.stderr.on("data", (data) => (error += data.toString()));

    python.on("close", async () => {
      if (error) {
        console.error("❌ Python Error:", error);
        return res.status(500).json({ success: false, message: "AI failed" });
      }

      console.log("🔍 Raw Python Output:", output);

      const aiResult = JSON.parse(output.trim());
      const aiMatches = aiResult.matches || [];

      const enrichedMatches = [];

      // 4️⃣ SAFELY attach internship_id from DB
      for (const match of aiMatches) {
        const [rows] = await pool.query(
          `SELECT internship_id 
           FROM internships 
           WHERE LOWER(company) = LOWER(?) 
           AND LOWER(title) LIKE CONCAT('%', LOWER(?), '%')
           LIMIT 1`,
          [match.company, match.title]
        );

        if (rows.length === 0) {
          console.error("❌ No DB match for:", match.title, match.company);
          continue;
        }

        enrichedMatches.push({
          ...match,
          internship_id: rows[0].internship_id
        });
      }

      res.json({ matches: enrichedMatches });
    });
  } catch (err) {
    console.error("❌ Match Error:", err);
    res.status(500).json({ success: false, message: "Match failed" });
  }
});


// --- Root Test Route ---
app.get('/', (req, res) => {
  res.send('✅ InternMatchAI Backend is running...');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}`);
});

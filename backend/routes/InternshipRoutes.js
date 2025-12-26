const express = require("express");
const db = require("../config/db");
const { exec } = require("child_process");   // ✅ ADD THIS
const router = express.Router();

// ============================
// AI PYTHON MATCHER HELPER
// ============================
function runPythonMatcher(email) {
  return new Promise((resolve, reject) => {
    exec(`python ai_match.py "${email}"`, (err, stdout) => {
      if (err) return reject(err);

      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject("Invalid AI response");
      }
    });
  });
}

/* ============================
   1. ADD NEW INTERNSHIP
============================ */
router.post("/add", async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      duration,
      stipend,
      field,
      description,
      responsibilities,
      requirements,
      skills,
      badges,
      type
    } = req.body;

    if (!title || !company || !location) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Convert arrays to comma-separated strings if necessary
    const skillsStr = Array.isArray(skills) ? skills.join(", ") : skills || "";
    const badgesStr = Array.isArray(badges) ? badges.join(", ") : badges || "";

    const matchScore = Math.floor(Math.random() * 20) + 80;

    const [result] = await db.query(
      `INSERT INTO internships 
      (title, company, location, duration, stipend, field, description, responsibilities, requirements, skills, badges, type, match_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        company,
        location,
        duration,
        stipend,
        field,
        description,
        responsibilities,
        requirements,
        skillsStr,
        badgesStr,
        type,
        matchScore
      ]
    );

    res.json({ success: true, message: "Internship added successfully", internshipId: result.insertId });
  } catch (error) {
    console.error("❌ Error adding internship:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ============================
   2. GET ALL INTERNSHIPS
============================ */
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM internships ORDER BY created_at DESC`);
    res.json({ success: true, internships: rows });
  } catch (error) {
    console.error("❌ Error fetching internships:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ============================
   3. DELETE INTERNSHIP BY ID
============================ */
router.delete("/:id", async (req, res) => {
  try {
    const internshipId = req.params.id;
    const [result] = await db.query("DELETE FROM internships WHERE internship_id = ?", [internshipId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    res.json({ success: true, message: "Internship deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting internship:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ============================
   4. UPDATE INTERNSHIP
============================ */
router.put("/:id", async (req, res) => {
  try {
    const internshipId = req.params.id;
    const {
      title,
      company,
      location,
      duration,
      stipend,
      field,
      description,
      responsibilities,
      requirements,
      skills,
      badges,
      type
    } = req.body;

    console.log("🧾 Received update data:", req.body); // Debugging

    const skillsStr = Array.isArray(skills) ? skills.join(", ") : skills || "";
    const badgesStr = Array.isArray(badges) ? badges.join(", ") : badges || "";

    // 🧠 Normalize ENUM value (case-insensitive + safe fallback)
    let fixedType = "Full-time"; // default
    if (type) {
      const normalized = type.toString().trim().toLowerCase();
      if (normalized === "full-time" || normalized === "full time") fixedType = "Full-time";
      else if (normalized === "part-time" || normalized === "part time") fixedType = "Part-time";
      else if (normalized === "remote") fixedType = "Remote";
    }

    console.log("🧠 Normalized type:", fixedType); // Debugging

    const [result] = await db.query(
      `UPDATE internships SET 
        title = ?, company = ?, location = ?, duration = ?, stipend = ?, 
        field = ?, description = ?, responsibilities = ?, requirements = ?, 
        skills = ?, badges = ?, type = ?
       WHERE internship_id = ?`,
      [
        title,
        company,
        location,
        duration,
        stipend,
        field,
        description,
        responsibilities,
        requirements,
        skillsStr,
        badgesStr,
        fixedType,
        internshipId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    res.json({ success: true, message: "Internship updated successfully" });

  } catch (error) {
    console.error("❌ Error updating internship:", error.sqlMessage || error.message);
    res.status(500).json({ success: false, message: error.sqlMessage || "Internal Server Error" });
  }
});

/* ============================
   5. GET INTERNSHIP DETAILS BY ID
============================ */
router.get("/:id", async (req, res) => {
  try {
    const internshipId = req.params.id;

    // Fetch internship by ID with safe null-handling
    const [rows] = await db.query(
      `SELECT 
          internship_id, 
          title, 
          company, 
          location, 
          duration, 
          stipend, 
          field,
          IFNULL(description, '') AS description,
          IFNULL(responsibilities, '') AS responsibilities,
          IFNULL(requirements, '') AS requirements,
          IFNULL(skills, '') AS skills,
          IFNULL(badges, '') AS badges,
          IFNULL(type, 'Full-time') AS type,
          match_score, 
          created_at
       FROM internships 
       WHERE internship_id = ?`,
      [internshipId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    res.json({ success: true, internship: rows[0] });
  } catch (error) {
    console.error("❌ Error fetching internship details:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ============================
   6. AI MATCH INTERNSHIPS
============================ */
router.post("/match", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    // 🧠 Call Python AI script (you already have this part)
    const pythonOutput = await runPythonMatcher(email);
    // pythonOutput.matches → AI results

    const aiMatches = pythonOutput.matches || [];

    // 🔑 Fetch internships from DB
    const [internships] = await db.query(
      "SELECT internship_id, title, company FROM internships"
    );

    // 🔗 Attach internship_id to AI results
   const enrichedMatches = aiMatches
  .map(match => {
    const dbPost = internships.find(
      i =>
        i.title.trim().toLowerCase() === match.title.trim().toLowerCase() &&
        i.company.trim().toLowerCase() === match.company.trim().toLowerCase()
    );

    if (!dbPost) return null;

    return {
      ...match,
      internship_id: dbPost.internship_id
    };
  })
  .filter(Boolean);

    res.json({ matches: enrichedMatches });

  } catch (error) {
    console.error("❌ AI Match Error:", error.message);
    res.status(500).json({ success: false, message: "AI matching failed" });
  }
});

module.exports = router;





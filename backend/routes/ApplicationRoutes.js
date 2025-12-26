const express = require("express");
const db = require("../config/db");
const router = express.Router();

/* ============================
   1️⃣ APPLY TO INTERNSHIP
============================ */
router.post("/apply", async (req, res) => {
  try {
    const { user_id, internship_id } = req.body;

    if (!user_id || !internship_id) {
      return res.status(400).json({ success: false, message: "User ID and Internship ID are required." });
    }

    // 🔍 Prevent duplicate applications
    const [existing] = await db.query(
      "SELECT * FROM user_applications WHERE user_id = ? AND internship_id = ?",
      [user_id, internship_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "You have already applied for this internship." });
    }

    // 🔹 Get user info
    const [userRows] = await db.query("SELECT full_name, email FROM users WHERE user_id = ?", [user_id]);
    const user = userRows[0];

    // 🔹 Get internship info
    const [internshipRows] = await db.query("SELECT title, company FROM internships WHERE internship_id = ?", [internship_id]);
    const internship = internshipRows[0];

    if (!user || !internship) {
      return res.status(404).json({ success: false, message: "User or internship not found." });
    }

    // ✅ Insert into user_applications
    const [result] = await db.query(
      `INSERT INTO user_applications (user_id, internship_id, user_name, user_email, internship_title, company_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        internship_id,
        user.full_name,
        user.email,
        internship.title,
        internship.company
      ]
    );

    res.json({ success: true, message: "Application submitted successfully!", application_id: result.insertId });
  } catch (error) {
    console.error("❌ Error applying for internship:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


/* ============================
   2️⃣ GET APPLICATIONS BY USER
============================ */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [applications] = await db.query(
      "SELECT * FROM user_applications WHERE user_id = ? ORDER BY applied_at DESC",
      [userId]
    );

    res.json({ success: true, applications });
  } catch (error) {
    console.error("❌ Error fetching user applications:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* ============================================
   3️⃣ GET APPLICATIONS SUMMARY FOR ADMIN DASHBOARD
============================================ */
router.get("/summary", async (req, res) => {
  try {
    // Get total applications count
    const [countRows] = await db.query("SELECT COUNT(*) AS total_applications FROM user_applications");

    // Fetch all applicant details
    const [applications] = await db.query(
      `SELECT 
          application_id,
          user_name,
          user_email,
          internship_title,
          company_name,
          application_status,
          applied_at
       FROM user_applications
       ORDER BY applied_at DESC`
    );

    res.json({
      success: true,
      total_applications: countRows[0].total_applications,
      applications,
    });
  } catch (error) {
    console.error("❌ Error fetching applications summary:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* =========================================
   4️⃣ UPDATE APPLICATION STATUS (Admin)
========================================= */
router.put("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Accepted", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [result] = await db.query(
      "UPDATE user_applications SET application_status = ? WHERE application_id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, message: `Application ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error("❌ Error updating application status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

  // ✅ GET applications by user ID
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const [rows] = await db.query(`
        SELECT 
          ua.application_id,
          ua.application_status,
          ua.applied_at,
          i.title AS internship_title,
          i.company AS company_name
        FROM user_applications ua
        JOIN internships i ON ua.internship_id = i.internship_id
        WHERE ua.user_id = ?
        ORDER BY ua.applied_at DESC
      `, [userId]);

      res.json({ success: true, applications: rows });
    } catch (err) {
      console.error('Error fetching user applications:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

  /* ===============================
   5️⃣ GET SINGLE APPLICATION DETAILS
================================ */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        ua.application_id,
        ua.user_id,
        ua.internship_id,
        ua.user_name,
        ua.user_email,
        ua.internship_title,
        ua.company_name,
        ua.application_status,
        ua.applied_at,
        i.description
      FROM user_applications ua
      LEFT JOIN internships i ON ua.internship_id = i.internship_id
      WHERE ua.application_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Application not found.' });
    }

    res.json({ success: true, application: rows[0] });
  } catch (error) {
    console.error('❌ Error fetching application details:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




module.exports = router;

// backend/routes/AdminRoutes.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

/* ============================
   1. GET TOTAL USER COUNT
============================ */
router.get('/total-users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
    res.json({ success: true, totalUsers: rows[0].totalUsers });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

/* ============================
   2. GET ALL USERS
============================ */
router.get('/all-users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id, full_name, email, professional_title, location, completion_score
      FROM users
      ORDER BY full_name ASC
    `);
    res.json({ success: true, users: rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

/* ============================
   3. GET ALL USER PROFILES (Improved Error Log)
============================ */
router.get('/user-profiles', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        user_id,
        full_name,
        professional_title,
        email,
        phone,
        location,
        about_me,
        profile_picture_url,
        completion_score,
        preferred_role,
        internship_type,
        preferred_location,
        expected_stipend
      FROM users
      ORDER BY full_name ASC
    `);

    res.json({ success: true, users: rows });
  } catch (error) {
    console.error('❌ MySQL Query Failed:', error.sqlMessage || error.message);
    res.status(500).json({ 
      success: false, 
      message: error.sqlMessage || error.message 
    });
  }
});


module.exports = router;

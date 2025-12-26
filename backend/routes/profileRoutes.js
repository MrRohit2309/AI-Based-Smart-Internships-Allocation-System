/* backend/routes/profileRoutes.js */
const express = require('express');
const db = require('../config/db'); // database connection pool
const router = express.Router();


/* ===========================
   USER REGISTRATION (use email as user_id)
=========================== */
router.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    // Check if email already exists
    const [existingUser] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // ✅ Use email as user_id
    const user_id = email;

    // Insert new user record
    const [result] = await db.execute(
      `INSERT INTO users (
        user_id, full_name, email, password, professional_title, phone, location, about_me,
        profile_picture_url, completion_score, preferred_role, internship_type,
        preferred_location, expected_stipend
      ) VALUES (?, ?, ?, ?, '', '', '', '', 'https://placehold.co/150x150/CCCCCC/6C757D?text=USER', 20, '', '', '', '')`,
      [user_id, full_name, email, password]
    );

    res.json({
      success: true,
      message: 'User registered successfully!',
      user_id: user_id,
    });
  } catch (err) {
    console.error('❌ Error during registration:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
  }
});

/* ===========================
   SET OR CHANGE PASSWORD
=========================== */
router.post('/set-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email and new password are required.' });
  }

  try {
    // ✅ Check if user exists
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with that email.' });
    }

    // ✅ Update password & mark account as manual
    await db.execute(
      'UPDATE users SET password = ?, auth_provider = "manual" WHERE email = ?',
      [newPassword, email]
    );

    console.log(`✅ Password set or updated for ${email}`);
    res.json({ success: true, message: 'Password updated successfully! You can now log in manually.' });
  } catch (err) {
    console.error('❌ Error setting password:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});


/* ===========================
   0. USER LOGIN
=========================== */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required.' });

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email or password.' });
    }

    const user = rows[0];

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.full_name
      }
    });
  } catch (err) {
    console.error('❌ Error during login:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
  }
});
/* ===========================
   1. GET USER PROFILE
=========================== */
router.post('/get-profile', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
  // Fetch main user info
  const [userRows] = await db.execute(
    `SELECT * FROM users WHERE user_id = ? OR email = ?`,
    [userId, userId]
  );

  if (userRows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const profile = userRows[0];
  const hasPassword = !!profile.password;

  // Fetch related data
  const [skillRows] = await db.execute(`SELECT skill_name FROM user_skills WHERE user_id = ?`, [profile.user_id]);
  const [eduRows] = await db.execute(`SELECT degree, institution, period, details FROM user_education WHERE user_id = ?`, [profile.user_id]);
  const [certRows] = await db.execute(`SELECT cert_name, issuing_org, year FROM user_certifications WHERE user_id = ?`, [profile.user_id]);
  const [achieveRows] = await db.execute(`SELECT title, event_org, year FROM user_achievements WHERE user_id = ?`, [profile.user_id]);
  const [projectRows] = await db.execute(`SELECT title, year, description FROM user_projects WHERE user_id = ?`, [profile.user_id]);

  // ✅ NEW: Fetch number of applications
  const [appCountRows] = await db.execute(
    `SELECT COUNT(*) AS total_applications FROM user_applications WHERE user_id = ?`,
    [profile.user_id]
  );
  const totalApplications = appCountRows[0]?.total_applications || 0;

  // Build final profile JSON
  const finalProfile = {
    name: profile.full_name,
    title: profile.professional_title,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    picture: profile.profile_picture_url,
    about: profile.about_me,
    completionScore: profile.completion_score || 0,
    totalApplications, // ✅ added here
    career: {
      role: profile.preferred_role,
      type: profile.internship_type,
      location: profile.preferred_location,
      stipend: profile.expected_stipend || ''
    },
    skills: skillRows.map(r => r.skill_name),
    education: eduRows || [],
    certifications: certRows || [],
    achievements: achieveRows || [],
    projects: projectRows || []
  };

  // ✅ Include hasPassword flag
  res.json({ success: true, profile: finalProfile, hasPassword });
  } catch (err) {
    console.error('❌ Error fetching profile:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
  }
});

// ===========================
// SET PASSWORD ROUTE
// ===========================
router.post('/set-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    // ✅ Check if user exists
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with that email.' });
    }

    const user = rows[0];

    // 🧩 Update password and switch auth_provider to manual
    await db.execute('UPDATE users SET password = ?, auth_provider = ? WHERE email = ?', [newPassword, 'manual', email]);

    console.log(`✅ Password updated for ${email}`);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('❌ Error setting password:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});


/* ===========================
   2. SAVE OR UPDATE PROFILE
=========================== */
router.post('/save', async (req, res) => {
  const { userId, profile } = req.body;

  if (!userId || !profile) {
    return res.status(400).json({ success: false, message: 'User ID and profile data are required.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const {
      name, title, email, phone, location, about, picture, completionScore,
      career, skills, education, certifications, achievements, projects
    } = profile;

    // ✅ STEP 1: Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT user_id FROM users WHERE user_id = ? OR email = ?',
      [userId, email]
    );

    if (existingUser.length === 0) {
      // Insert new user (with default password if needed)
      const insertQuery = `
        INSERT INTO users 
        (user_id, full_name, professional_title, email, phone, location, about_me,
         profile_picture_url, completion_score, preferred_role, internship_type, 
         preferred_location, expected_stipend, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.execute(insertQuery, [
        userId, name, title, email, phone, location, about,
        picture, completionScore, career.role, career.type,
        career.location, career.stipend, '12345' // default password
      ]);
    } else {
      // Update existing user
      const updateQuery = `
        UPDATE users SET
          full_name = ?, professional_title = ?, email = ?, phone = ?, location = ?, 
          about_me = ?, profile_picture_url = ?, completion_score = ?, preferred_role = ?, 
          internship_type = ?, preferred_location = ?, expected_stipend = ?
        WHERE user_id = ? OR email = ?
      `;
      await connection.execute(updateQuery, [
        name, title, email, phone, location, about, picture, completionScore,
        career.role, career.type, career.location, career.stipend,
        userId, email
      ]);
    }

    // ✅ STEP 2: Update user_skills
    await connection.execute('DELETE FROM user_skills WHERE user_id = ?', [userId]);
    if (skills && skills.length > 0) {
      const skillValues = skills.map(skill => [userId, skill]);
      await connection.query('INSERT INTO user_skills (user_id, skill_name) VALUES ?', [skillValues]);
    }

    // ✅ STEP 3: Update user_education
    await connection.execute('DELETE FROM user_education WHERE user_id = ?', [userId]);
    if (education && education.length > 0) {
      const eduValues = education.map(e => [userId, e.degree, e.institution, e.period, e.details]);
      await connection.query('INSERT INTO user_education (user_id, degree, institution, period, details) VALUES ?', [eduValues]);
    }

    // ✅ STEP 4: Update user_certifications
    await connection.execute('DELETE FROM user_certifications WHERE user_id = ?', [userId]);
    if (certifications && certifications.length > 0) {
      const certValues = certifications.map(c => [userId, c.cert_name, c.issuing_org, c.year]);
      await connection.query('INSERT INTO user_certifications (user_id, cert_name, issuing_org, year) VALUES ?', [certValues]);
    }

    // ✅ STEP 5: Update user_achievements
    await connection.execute('DELETE FROM user_achievements WHERE user_id = ?', [userId]);
    if (achievements && achievements.length > 0) {
      const achValues = achievements.map(a => [userId, a.title, a.event_org, a.year]);
      await connection.query('INSERT INTO user_achievements (user_id, title, event_org, year) VALUES ?', [achValues]);
    }

    // ✅ STEP 6: Update user_projects
    await connection.execute('DELETE FROM user_projects WHERE user_id = ?', [userId]);
    if (projects && projects.length > 0) {
      const projValues = projects.map(p => [userId, p.title, p.year, p.description]);
      await connection.query('INSERT INTO user_projects (user_id, title, year, description) VALUES ?', [projValues]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Profile saved successfully!' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Error saving profile:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;

/* ===========================
   3. GET USER DATA BY EMAIL (For AI Match)
=========================== */
router.get('/:email', async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    // ✅ Fetch user from main table
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = rows[0];

    // ✅ Fetch user skills
    const [skills] = await db.execute('SELECT skill_name FROM user_skills WHERE user_id = ?', [user.user_id]);

    // ✅ Build AI-friendly data format
    const formattedUser = {
      user_id: user.user_id,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      about_me: user.about_me,
      skills: skills.map(s => s.skill_name),
      expertise: user.professional_title ? [user.professional_title] : [],
      cgpa: parseFloat(user.completion_score || 8.0),
      internship_type: user.internship_type || "Remote",
      preferred_location: user.preferred_location || user.location,
      preferred_role: user.preferred_role || "Intern",
      expected_stipend: parseInt(user.expected_stipend || 0),
      profile_picture_url: user.profile_picture_url || "",
    };

    res.json(formattedUser);
  } catch (err) {
    console.error("❌ Error fetching user by email:", err);
    res.status(500).json({ success: false, message: 'Database query failed', error: err.message });
  }
});


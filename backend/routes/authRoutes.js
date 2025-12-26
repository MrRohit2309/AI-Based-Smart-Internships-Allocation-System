const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db'); // ✅ your database connection
const router = express.Router();

const client = new OAuth2Client('1046574091870-vfgmjhmgmgunkuqiumi05c2rgbj3ovgp.apps.googleusercontent.com');

/* ===========================
   GOOGLE AUTHENTICATION
=========================== */
router.post('/google', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing Google token.' });
  }

  try {
    // ✅ Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '1046574091870-vfgmjhmgmgunkuqiumi05c2rgbj3ovgp.apps.googleusercontent.com'
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const full_name = payload.name;
    const picture = payload.picture;

    console.log('🟢 Google login success for:', email);

    // ✅ Check if user already exists
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    let user;
    if (rows.length > 0) {
      user = rows[0];
      console.log('✅ Existing Google user found.');
    } else {
      // ✅ Create a new user (no password)
      const user_id = email;
      await db.execute(
        `INSERT INTO users (user_id, full_name, email, password, profile_picture_url, completion_score, auth_provider)
        VALUES (?, ?, ?, ?, ?, 20, 'google')`,
        [user_id, full_name, email, '', picture]
        );

      user = { user_id, full_name, email, profile_picture_url: picture };
      console.log('✨ New Google user created.');
    }

    res.json({
      success: true,
      message: 'Google authentication successful',
      user
    });

  } catch (err) {
    console.error('❌ Google Auth error:', err.message);
    res.status(401).json({ success: false, message: 'Invalid Google token', error: err.message });
  }
});

module.exports = router;

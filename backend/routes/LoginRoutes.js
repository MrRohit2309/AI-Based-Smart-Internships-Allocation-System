// ===========================
// LOGIN ROUTE
// ===========================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 🧩 Basic validation
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  try {
    console.log('🟢 Login attempt for email:', email);

    // 🧩 Check if the user exists
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      console.warn('⚠️ No account found for:', email);
      return res.status(401).json({ success: false, message: 'No account found with that email.' });
    }

    const user = rows[0];

    // 🚫 If account was created with Google, disallow manual login
    if (user.auth_provider === 'google') {
      console.warn('⚠️ Attempted manual login for Google account:', email);
      return res.status(403).json({
        success: false,
        message: 'This account was created with Google. Please sign in using Google.'
      });
    }

    // 🧩 Manual password check
    if (user.password !== password) {
      console.warn('⚠️ Invalid password for:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // ✅ Successful login
    console.log('✅ Login successful for user_id:', user.user_id);
    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

console.log("🔥 match.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  fetchMatches();
});

async function fetchMatches() {
  console.log("🚀 fetchMatches() called");

  const email = localStorage.getItem("userEmail");
  console.log("📧 Email from localStorage:", email);

  if (!email) {
    alert("⚠️ Please log in first!");
    window.location.href = "Login_Page.html";
    return;
  }

  try {
    // 1️⃣ Fetch user profile
    const userRes = await fetch(`http://127.0.0.1:3000/api/profile/${email}`);
    if (!userRes.ok) throw new Error("Profile fetch failed");

    const user = await userRes.json();
    const userData = user.profile || user;

    console.log("👤 User Data:", userData);

    if (!userData?.email) {
      document.getElementById("internships").innerHTML =
        "<p>User not found.</p>";
      return;
    }

    // 2️⃣ Fetch AI matches
    const res = await fetch("http://127.0.0.1:3000/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userData.email })
    });

    console.log("📡 Match API status:", res.status);
    if (!res.ok) throw new Error("Match API failed");

    const data = await res.json();
    console.log("🧠 AI Response:", data);

    if (!data.matches || data.matches.length === 0) {
      document.getElementById("internships").innerHTML =
        "<p>No AI recommendations found.</p>";
      return;
    }

    displayInternships(data.matches);

  } catch (err) {
    console.error("❌ Fetch error:", err);
    document.getElementById("internships").innerHTML =
      "<p>Server error. Please retry.</p>";
  }
}

function displayInternships(matches) {
  const container = document.getElementById("internships");
  container.innerHTML = "";

  let rendered = 0;

  matches.forEach((m) => {
    console.log("✅ MATCH:", m);

    if (!m.internship_id) {
      console.warn("⚠️ Skipping match (no internship_id):", m);
      return;
    }

    rendered++;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="title">
        ${m.title} – ${m.company}
        <span class="match">${Math.round(m.score || 0)}% Match</span>
      </div>
      <div class="info">📍 ${m.location}</div>
      <div class="info">💰 ₹${m.stipend}/month</div>
      <div class="info">🎓 ${m.field}</div>
      <div class="info">⏳ ${m.duration}</div>
      <div class="info">🧠 ${m.skills}</div>

      <button class="apply-btn" data-internship-id="${m.internship_id}">
        Apply Now
      </button>
    `;

    container.appendChild(card);
  });

  if (rendered === 0) {
    container.innerHTML =
      "<p>No valid internships could be mapped.</p>";
    return;
  }

  attachApplyHandlers();
}

function attachApplyHandlers() {
  const buttons = document.querySelectorAll(".apply-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const internshipId = btn.dataset.internshipId;
      const userId = localStorage.getItem("userId");

      console.log("📝 Applying:", { internshipId, userId });

      if (!userId || !internshipId) {
        alert("Missing user or internship ID");
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:3000/applications/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            internship_id: internshipId
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          alert("✅ Application submitted successfully!");
          btn.innerText = "Applied";
          btn.disabled = true;
          btn.style.background = "#aaa";
        } else {
          alert(data.message || "Application failed");
        }

      } catch (err) {
        console.error("❌ Apply error:", err);
        alert("❌ Failed to apply");
      }
    });
  });
}
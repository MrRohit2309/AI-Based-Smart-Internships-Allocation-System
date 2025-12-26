import sys
import json
import re

def read_input():
    """Read JSON input from Node.js"""
    try:
        data = json.load(sys.stdin)
        return data
    except json.JSONDecodeError:
        sys.stdout.write(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)

def normalize_skills(skill_text):
    """Convert comma-separated string to lowercase list"""
    if not skill_text:
        return []
    return [s.strip().lower() for s in re.split(r"[,\s]+", skill_text) if s.strip()]

def calculate_match(user, internship):
    """Compute AI-based matching score"""
    score = 0
    reasons = []

    user_skills = normalize_skills(user.get("skills", ""))
    required_skills = normalize_skills(internship.get("skills", ""))

    # 🧠 Skill overlap
    if user_skills and required_skills:
        overlap = len(set(user_skills) & set(required_skills))
        skill_match = (overlap / len(required_skills)) * 60
        score += skill_match
        reasons.append(f"Skill overlap ({overlap}/{len(required_skills)}) → +{round(skill_match,1)}")

    # 🧩 Field/domain match
    if user.get("preferred_role", "").lower() in internship.get("field", "").lower():
        score += 15
        reasons.append("Field matches user preference (+15)")

    # 📍 Location preference
    user_loc = (user.get("preferred_location") or "").lower()
    intern_loc = (internship.get("location") or "").lower()
    if user_loc and user_loc in intern_loc:
        score += 10
        reasons.append("Preferred location match (+10)")

    # 💰 Stipend expectation
    try:
        user_stipend = int(user.get("expected_stipend") or 0)
        intern_stipend = int(internship.get("stipend") or 0)
        if user_stipend and intern_stipend:
            diff = abs(user_stipend - intern_stipend) / max(user_stipend, intern_stipend)
            if diff < 0.3:
                score += 10
                reasons.append("Stipend close to expectation (+10)")
            elif user_stipend < intern_stipend:
                score += 5
                reasons.append("Offered stipend exceeds expectation (+5)")
            else:
                score -= 5
                reasons.append("Expected stipend higher than offer (-5)")
    except Exception:
        pass

    # 🧭 Internship type (remote/on-site)
    if user.get("internship_type", "").lower() in internship.get("type", "").lower():
        score += 5
        reasons.append("Preferred internship type matched (+5)")

    # Limit to 0–100
    score = max(0, min(100, round(score, 2)))
    return score, reasons


def main():
    data = read_input()
    user = data.get("user", {})
    internships = data.get("internships", [])

    # 🛠 Add defaults if not provided
    user.setdefault("skills", "javascript html css react node express mysql")
    user.setdefault("preferred_location", "pune")
    user.setdefault("expected_stipend", 100000)
    user.setdefault("internship_type", "full-time")
    user.setdefault("preferred_role", "web development")

    if not internships:
        sys.stdout.write(json.dumps({"matches": [], "error": "No internships found"}))
        sys.exit(0)

    results = []
    for post in internships:
        score, reasons = calculate_match(user, post)
        results.append({
            "title": post.get("title"),
            "company": post.get("company"),
            "location": post.get("location"),
            "stipend": post.get("stipend"),
            "field": post.get("field"),
            "skills": post.get("skills"),
            "type": post.get("type"),
            "duration": post.get("duration"),
            "score": score,
            "reasons": reasons
        })

    # Sort and take top results
    results.sort(key=lambda x: x["score"], reverse=True)
    top_matches = [r for r in results if r["score"] >= 60][:5]

    # ✅ Output only one clean JSON object (for Node.js)
    sys.stdout.write(json.dumps({"matches": top_matches}))
    sys.stdout.flush()

if __name__ == "__main__":
    main()

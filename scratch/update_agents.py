import re

with open("AGENTS.md", "r", encoding="utf-8") as f:
    agents = f.read()

# Update Fáze 6 checkbox
agents = agents.replace("- [ ] **Fáze 6** — Samostatná galerie jako vlastní view", "- [x] **Fáze 6** — Samostatná galerie jako vlastní view ✅ (Agent 1 / Antigravity IDE)")

# Update current task
agents = re.sub(
    r"\*\*Current task:\*\* Implementing Film Video Injection Feature",
    "**Current task:** ✅ Fáze 6 - Galerie dokončena",
    agents
)

# Unlock files
agents = agents.replace("Agent 1 (Antigravity IDE) | 2026-06-22 22:50", "— | —")

with open("AGENTS.md", "w", encoding="utf-8") as f:
    f.write(agents)

print("AGENTS.md updated.")

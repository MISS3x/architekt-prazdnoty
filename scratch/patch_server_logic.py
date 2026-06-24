import re

with open("editor_server.js", "r", encoding="utf-8") as f:
    content = f.read()

# We need to add a helper function getLocalParaFromGlobalI
helper = """function getLocalParaFromGlobalI(globalI) {
  const g = parseInt(globalI);
  if (g < 20) return g + 1; // Part 1: 0-19 -> 1-20
  if (g < 32) return g - 20 + 1; // Part 2: 20-31 -> 1-12
  return g - 32 + 1; // Part 3: 32+ -> 1+
}
"""

if "getLocalParaFromGlobalI" not in content:
    content = content.replace("function getPartFromGlobalI", helper + "\nfunction getPartFromGlobalI")

# Now update the logic inside /api/panels and anywhere else that constructs the video path
# original: const paraStr = String(parseInt(globalI) + 1).padStart(2, '0');
content = re.sub(
    r"const paraStr = String\(parseInt\(globalI\) \+ 1\)\.padStart\(2, '0'\);",
    r"const paraStr = String(getLocalParaFromGlobalI(globalI)).padStart(2, '0');",
    content
)

with open("editor_server.js", "w", encoding="utf-8") as f:
    f.write(content)

print("editor_server.js updated with correct local paragraph index logic")

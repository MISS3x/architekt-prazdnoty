import re

with open("design.css", "r", encoding="utf-8") as f:
    css_content = f.read()

# Replace .gallery-grid
old_grid = ".gallery-grid { max-width: 1180px; margin: 0 auto !important; }"
new_grid = """.gallery-grid {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 20px;
  max-width: 1180px;
  margin: 0 auto !important;
}
@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}"""

css_content = css_content.replace(old_grid, new_grid)

with open("design.css", "w", encoding="utf-8") as f:
    f.write(css_content)

print("design.css updated for 4 columns / 2 columns mobile.")

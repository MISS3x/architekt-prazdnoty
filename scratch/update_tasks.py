import re

with open("task.md", "r", encoding="utf-8") as f:
    content = f.read()

# Add new section
new_section = """
## Visual Gallery (Fáze 6)
- [ ] **#76** — Add 'Galerie' button to the mode menu in `index.html`
- [ ] **#77** — Create the `#gallery-view` HTML structure with filters in `index.html`
- [ ] **#78** — Add CSS grid styles for `.gallery-view` to `design.css` (4 cols desktop, 2 cols mobile)
- [ ] **#79** — Implement JS logic in `app.js` to populate the gallery with all comic images
- [ ] **#80** — Add filtering logic (Vše, Díl I, Díl II, Díl III) to the gallery
"""

if "## Visual Gallery" not in content:
    content += new_section

# Recalculate tasks
sections_data = []
total_done = 0
total_tasks = 0

sections = re.split(r'\n## ', content.split('---', 2)[2])
for section in sections:
    if not section.strip(): continue
    lines = section.strip().split('\n')
    title = lines[0].strip()
    
    done_count = len(re.findall(r'- \[[xX]\]', section))
    task_count = len(re.findall(r'- \[[xX /]\]', section))
    
    total_done += done_count
    total_tasks += task_count
    
    pct = round((done_count / task_count * 100)) if task_count > 0 else 0
    sections_data.append(f"| {title} | {done_count} | {task_count} | {pct}% |")

total_pct = round((total_done / total_tasks * 100)) if total_tasks > 0 else 0
progress_bar = ("#" * total_pct) + ("-" * (100 - total_pct))

# Replace top part
new_top = f"""# Architekt Prázdnoty — Master Task Plan

> Živý dokument. Cokoliv dokončíme → odškrtneme `[x]`.

## 🚨 Blokující akce (manuální)

> Věci které musíš udělat ručně (API klíče, autentizace, nastavení služeb). Až budou hotové, smažu je.

*Žádné aktuální blokery* ✅

## 📊 Progress: **{total_done} / {total_tasks} done ({total_pct}%)**

```
{progress_bar} {total_pct}%
```

| Section | Done | Total | % |
|---|---|---|---|
""" + "\n".join(sections_data) + "\n\n---\n"

# Replace content up to first section
content = re.sub(r'^.*?---', new_top, content, flags=re.DOTALL | re.MULTILINE)

with open("task.md", "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated tasks. Total: {total_done}/{total_tasks}")

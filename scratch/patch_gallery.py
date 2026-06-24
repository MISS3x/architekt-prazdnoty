import re

# 1. Update app.js
with open("app.js", "r", encoding="utf-8") as f:
    app_content = f.read()

# Replace the static gallery initialization with dynamic generation
new_gallery_logic = """
    // Generate visual gallery dynamically from all comic panels
    const galleryGrid = document.querySelector(".gallery-grid");
    if (galleryGrid) {
      galleryGrid.innerHTML = ""; // Clear existing static cards
      
      const allPanels = document.querySelectorAll(".comic-panel");
      allPanels.forEach(panel => {
        const img = panel.querySelector(".comic-panel-img");
        if (!img) return;
        
        const src = img.getAttribute("src");
        if (!src) return;
        
        // Extract part number from src (e.g. img/comic/dil_1/...)
        let part = "1";
        if (src.includes("dil_2")) part = "2";
        else if (src.includes("dil_3")) part = "3";
        
        // Extract filename for label (e.g. 01_01_01.jpg)
        const filename = src.split('/').pop();
        const baseName = filename.split('.')[0]; // e.g. 01_01_01
        
        // Format label
        const parts = baseName.split('_');
        let label = baseName;
        if (parts.length >= 3) {
          label = `Díl ${parseInt(parts[0], 10)} · Odst. ${parseInt(parts[1], 10)} · Snímek ${parseInt(parts[2], 10)}`;
        }

        const card = document.createElement("div");
        card.className = "gallery-card";
        card.dataset.part = part;
        card.dataset.src = src;
        
        card.innerHTML = `
          <div class="gallery-img-wrapper">
            <img src="${src}" alt="${label}" loading="lazy">
            <div class="gallery-card-glow"></div>
          </div>
          <div class="gallery-card-info">
            <div class="gallery-card-id">[${baseName}]</div>
            <div class="gallery-card-label">${label}</div>
          </div>
        `;
        
        galleryGrid.appendChild(card);
      });
    }

    // Setup visual gallery filter buttons
    const filterBtns = document.querySelectorAll(".gallery-filter-btn");
    const galleryCards = document.querySelectorAll(".gallery-card");
"""

app_content = re.sub(
    r'// Setup visual gallery filter buttons\s*const filterBtns = document\.querySelectorAll\("\.gallery-filter-btn"\);\s*const galleryCards = document\.querySelectorAll\("\.gallery-card"\);',
    new_gallery_logic,
    app_content
)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(app_content)

print("app.js updated.")

# 2. Update index.html - clean up the hardcoded gallery cards
with open("index.html", "r", encoding="utf-8") as f:
    index_content = f.read()

# We will just empty the contents of <div class="gallery-grid">
index_content = re.sub(
    r'(<div class="gallery-grid">).*?(</div>\s*<!-- End gallery-view -->)',
    r'\1\n      \2',
    index_content,
    flags=re.DOTALL
)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(index_content)

print("index.html updated.")

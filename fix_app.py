import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Remove all rogue insertions
content = content.replace("    startMusicMatrix();\n", "")
content = content.replace("    startMusicMatrix(); // update dynamic dots in top-bar BGM slider!", " // update dynamic dots in top-bar BGM slider!")

# Add it just after the definition of startMusicMatrix
# The definition ends around line 1189 with:
#     musicMatrixRaf = requestAnimationFrame(draw);
#   };
# 
#   const showAudioStage = (show) => {

new_call = "  };\n  startMusicMatrix();\n\n  const showAudioStage"
content = content.replace("  };\n\n  const showAudioStage", new_call)
# Just in case there is no double newline
content = content.replace("  };\n  const showAudioStage", new_call)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

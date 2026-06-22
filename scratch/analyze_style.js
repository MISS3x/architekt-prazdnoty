const fs = require('fs');
const path = require('path');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const imgPath = path.join(__dirname, '..', 'img', 'comic', 'dil_1', '01_01_02_custom.png');
if (!fs.existsSync(imgPath)) {
  console.error("Image not found at:", imgPath);
  process.exit(1);
}

async function analyze() {
  const base64Data = fs.readFileSync(imgPath).toString('base64');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const promptText = `Analyze the visual art style of this image. Describe the style in detail. Then, formulate a concise style prompt (in English) that can be used in an image generator (like Imagen 3) to generate other images in exactly this style. Focus on the style details: lighting, lines, colors, medium, textures, mood, shading, camera, etc. Present the style prompt clearly.`;

  const payload = {
    contents: [{
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Data
          }
        }
      ]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await response.json();
  if (json.error) {
    console.error("Error from Gemini:", json.error);
    return;
  }

  console.log("Analysis Result:\n", json.candidates[0].content.parts[0].text);
}

analyze();

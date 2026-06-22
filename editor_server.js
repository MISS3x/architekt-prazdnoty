/**
 * Comic Editor backend server
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Ensure directories exist
const BACKUP_DIR = path.join(__dirname, 'img', 'screenshots', 'backup');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
const TEMP_DIR = path.join(__dirname, 'img', 'screenshots', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 1. Helper to get Mime Type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

// 2. Helper to analyze image & generate prompt via Gemini Flash (Remake)
async function generateGeminiPrompt(imagePath, customPrompt, stylePreset, filename) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Original image not found at ${imagePath}`);
  }
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');
  const mimeType = getMimeType(imagePath);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const baseName = path.basename(filename);
  let neonColor = "neon toxic yellow-green (#ccff00)";
  if (baseName.startsWith('01_')) {
    neonColor = "neon orange / amber";
  } else if (baseName.startsWith('02_')) {
    neonColor = "neon purple and golden amber";
  }

  const userMods = customPrompt ? `Apply the following modifications/actions requested by the user: "${customPrompt}".` : "Create an exact visual copy of this image without any modifications.";
  
  let targetStyleInstructions = "";
  if (stylePreset === 'filmic') {
    targetStyleInstructions = `Ensure the generated prompt strictly specifies the NEW filmic style (convert the original 2D comic/sketch style to this 3D style):
- Style: Dystopian sci-fi high-detail 3D render, photorealistic, dramatic high-contrast lighting.
- Atmosphere: Ominous rainy atmosphere, wet glossy surfaces, streaking rain.
- Colors: Predominantly desaturated cool tones (greys, charcoals, slate blues) with intense selective ${neonColor} glowing lights.
- Composition: Sharp geometric architecture, craggy volcanic terrain, wide-angle shot, deep depth of field.
DO NOT use the original 2D comic or hand-drawn style. Convert the scene and characters into this 3D photorealistic filmic style.`;
  } else if (stylePreset === 'cartoon') {
    targetStyleInstructions = `Ensure the generated prompt strictly specifies the NEW cartoon style (convert the original style to this cartoon style):
- Style: A playful cartoon illustration style, vibrant colors, clean line art, stylized character features, animated series aesthetic.
- Shading & Lines: Bold outlines, cel shading, expressive visual style, selective ${neonColor} accents.
DO NOT use the original high contrast 3D or hand-drawn style. Convert the scene into this cartoon animation style.`;
  } else if (stylePreset === 'comic') {
    targetStyleInstructions = `Ensure the prompt specifies the original comic style:
- Art style: 2D graphic novel, bold black ink outlines, hatching, comic book aesthetic.
- Color scheme: Black and white (grayscale) with selective ${neonColor} accents matching the original.`;
  } else {
    targetStyleInstructions = `Describe the visual style and composition of the original, applying any requested modifications.`;
  }

  const promptText = `Analyze the attached original comic book panel image. Generate a highly detailed, descriptive prompt for an image generator (like Imagen 3) to create a new, visually and thematically similar, almost identical image (preserving the composition, characters, object placement, and cyberpunk mood of the original).
${userMods}

${targetStyleInstructions}

Ensure the prompt describes:
- Composition, placement, camera angle, and subject.
- Style, lighting, and colors as specified above.
Output ONLY the final prompt text itself, with no introductory/concluding text, no markdown formatting (like triple backticks), just the plain text prompt.`;

  const payload = {
    contents: [{
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: mimeType,
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

  const resJson = await response.json();
  if (resJson.error) {
    throw new Error(`Gemini Flash Error: ${resJson.error.message}`);
  }

  const candidates = resJson.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates returned from Gemini Flash");
  }
  const text = candidates[0].content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text content returned from Gemini Flash");
  }

  return text.trim();
}

// 3. Helper to generate image via gemini-2.5-flash-image
async function generateImagenImage(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["IMAGE"]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resJson = await response.json();
  if (resJson.error) {
    throw new Error(`Gemini Image Generation Error: ${resJson.error.message}`);
  }

  const candidates = resJson.candidates;
  const parts = candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No candidates or parts returned from Gemini Image model");
  }

  let base64Image = null;
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      base64Image = part.inlineData.data;
      break;
    }
  }

  if (!base64Image) {
    throw new Error("No image data found in Gemini response");
  }

  return base64Image;
}

// Helper to resolve comic image path (dil_1, dil_2, dil_3)
function getComicImagePath(filename) {
  const baseName = path.basename(filename);
  let partFolder = 'dil_1';
  if (baseName.startsWith('02_')) partFolder = 'dil_2';
  if (baseName.startsWith('03_')) partFolder = 'dil_3';
  return path.join(__dirname, 'img', 'comic', partFolder, filename);
}

// 4. API endpoint to list all panels by parsing index_v2.html
app.get('/api/panels', (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'index_v2.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Parse all blocks (paragraphs, quotes, bullets) to build a mapping of data-i -> text
    const paragraphRegex = /<(p|blockquote|div)\s+data-i="(\d+)"[^>]*>([\s\S]*?)<\/\1>/g;
    const paragraphs = {};
    let pMatch;
    while ((pMatch = paragraphRegex.exec(htmlContent)) !== null) {
      const i = parseInt(pMatch[2]);
      let text = pMatch[3]
        .replace(/<[^>]+>/g, '') // remove HTML tags
        .replace(/\s+/g, ' ')    // collapse whitespaces
        .trim();
      paragraphs[i] = text;
    }

    // Parse HTML panels using a regex to capture relevant attributes
    const panelRegex = /<div\s+class="comic-panel[^"]*"\s+data-i="(\d+)"\s+data-sentence="(\d+)">[\s\S]*?<img\s+src="([^"]+)"[\s\S]*?<\/div>/g;
    
    const panels = [];
    let match;
    
    while ((match = panelRegex.exec(htmlContent)) !== null) {
      const globalI = parseInt(match[1]);
      const sentenceIdx = parseInt(match[2]);
      const imgSrc = match[3];
      
      // Get the correct sentence text from the paragraph mapping
      const paraText = paragraphs[globalI] || "";
      let text = "";
      if (paraText) {
        let sentences = paraText.match(/[^.?!]+[.?!]+(?=\s|$)|[^.?!]+$/g);
        if (!sentences) sentences = [paraText];
        sentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
        text = (sentenceIdx < sentences.length) ? sentences[sentenceIdx] : "";
      }
      
      // Try to guess default visual prompts based on the character of the Part
      let defaultPrompt = "";
      let filename = path.basename(imgSrc); // e.g. 01_01_01.jpg
      
      // Constructing a high quality prompt template based on Dil I, II, III style guidance
      if (filename.startsWith('01_')) {
        defaultPrompt = `A 2D graphic novel illustration style, comic book aesthetic. Bold black ink outlines, hatching, high contrast black and white with selective vibrant neon orange / amber light. Rudolf Müller (@Ruda) stands in New Berlin, looking neutral, video in Style of @Image.`;
      } else if (filename.startsWith('02_')) {
        defaultPrompt = `A 2D graphic novel illustration style, comic book aesthetic. Bold black ink outlines, hatching, high contrast black and white with selective vibrant fialová (neon purple) and golden amber lights. Mia Müller (@Mia), a young female engineer in New Berlin, looking neutral, video in Style of @Image.`;
      } else {
        defaultPrompt = `A 2D graphic novel illustration style, comic book aesthetic. Bold black ink outlines, hatching, high contrast black and white with selective vibrant neon toxicky žluto-zelená (#ccff00) lights. Krtek (@Krtek) or Mia (@Mia) in an industrial sci-fi setting, looking neutral, video in Style of @Image.`;
      }

      panels.push({
        globalI,
        sentenceIdx,
        imgSrc,
        text,
        filename,
        defaultPrompt
      });
    }

    res.json(panels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Submit generation via Gemini / Imagen 3
app.post('/api/generate', async (req, res) => {
  const { prompt, filename, remake, stylePreset } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  // If remake is false, prompt is required
  if (remake !== true && !prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not defined.' });
  }

  try {
    const baseName = path.basename(filename, path.extname(filename));
    const tempImagePath = path.join(TEMP_DIR, `${baseName}_temp.jpg`);

    let finalPrompt = prompt || "";

    if (remake === true) {
      console.log(`Analyzing original panel for remake (style: ${stylePreset}): ${filename}`);
      const originalImagePath = getComicImagePath(filename);
      finalPrompt = await generateGeminiPrompt(originalImagePath, finalPrompt, stylePreset, filename);
      console.log(`Generated remake prompt: ${finalPrompt}`);
    } else {
      console.log(`Generating directly from prompt: ${finalPrompt}`);
    }

    console.log(`Requesting image generation from Gemini image model...`);
    const base64Image = await generateImagenImage(finalPrompt);

    fs.writeFileSync(tempImagePath, Buffer.from(base64Image, 'base64'));
    console.log(`Saved generated temp image: ${tempImagePath}`);

    res.json({
      success: true,
      tempImageUrl: `/img/screenshots/temp/${baseName}_temp.jpg`
    });

  } catch (error) {
    console.error('Generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Approve and Replace
app.post('/api/approve', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  const baseName = path.basename(filename, path.extname(filename)); // e.g. 01_01_01
  const targetImagePath = getComicImagePath(filename);
  const tempImagePath = path.join(TEMP_DIR, `${baseName}_temp.jpg`);
  const tempVideoPath = path.join(TEMP_DIR, `${baseName}_temp.mp4`);

  // Target video path inside video/dil_N/ e.g. video/dil_1/01_01_01.mp4
  let partFolder = 'dil_1';
  if (baseName.startsWith('02_')) partFolder = 'dil_2';
  if (baseName.startsWith('03_')) partFolder = 'dil_3';
  const targetVideoPath = path.join(__dirname, 'video', partFolder, `${baseName}.mp4`);

  try {
    // Make backups of existing files if they exist
    if (fs.existsSync(targetImagePath)) {
      const backupImagePath = path.join(BACKUP_DIR, `${baseName}_backup_${Date.now()}.jpg`);
      fs.copyFileSync(targetImagePath, backupImagePath);
      console.log(`Backed up original image to ${backupImagePath}`);
    }

    if (fs.existsSync(targetVideoPath)) {
      const backupVideoPath = path.join(BACKUP_DIR, `${baseName}_backup_${Date.now()}.mp4`);
      fs.copyFileSync(targetVideoPath, backupVideoPath);
      console.log(`Backed up original video to ${backupVideoPath}`);
    }

    // Overwrite target image
    if (fs.existsSync(tempImagePath)) {
      fs.copyFileSync(tempImagePath, targetImagePath);
      console.log(`Replaced image: ${targetImagePath}`);
    } else {
      throw new Error(`Temp image not found at ${tempImagePath}`);
    }

    // Overwrite target video
    if (fs.existsSync(tempVideoPath)) {
      fs.copyFileSync(tempVideoPath, targetVideoPath);
      console.log(`Replaced video: ${targetVideoPath}`);
    }

    // Clear temp files
    try {
      if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    } catch (e) {
      console.warn("Could not clean up temp files:", e);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Discard temp files
app.post('/api/discard', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  const baseName = path.basename(filename, path.extname(filename));
  const tempImagePath = path.join(TEMP_DIR, `${baseName}_temp.jpg`);
  const tempVideoPath = path.join(TEMP_DIR, `${baseName}_temp.mp4`);

  try {
    if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Crop original image
app.post('/api/crop', (req, res) => {
  const { filename, imageData } = req.body;
  if (!filename || !imageData) {
    return res.status(400).json({ error: 'Missing filename or imageData' });
  }

  const baseName = path.basename(filename, path.extname(filename));
  const targetImagePath = getComicImagePath(filename);
  
  // Clean base64 prefix if present
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');

  try {
    // Make backup of the original image
    if (fs.existsSync(targetImagePath)) {
      const backupImagePath = path.join(BACKUP_DIR, `${baseName}_backup_${Date.now()}${path.extname(filename)}`);
      fs.copyFileSync(targetImagePath, backupImagePath);
      console.log(`Backed up original image to ${backupImagePath} before crop`);
    }

    // Overwrite target image with cropped image
    fs.writeFileSync(targetImagePath, buffer);
    console.log(`Saved cropped image: ${targetImagePath}`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Comic Editor backend listening at http://localhost:${PORT}`);
});

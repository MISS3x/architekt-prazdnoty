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

app.use(express.json());
app.use(express.static(__dirname));

const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_BASE_URL = 'https://api-singapore.klingai.com';

// Ensure directories exist
const BACKUP_DIR = path.join(__dirname, 'img', 'screenshots', 'backup');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
const TEMP_DIR = path.join(__dirname, 'img', 'screenshots', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 1. Helper to submit Kling task
async function submitKlingTask(prompt, aspectRatio = '1:1') {
  const url = `${KLING_BASE_URL}/v1/videos/text2video`;
  const payload = {
    model_name: 'kling-v3',
    prompt: prompt,
    duration: 5,
    aspect_ratio: aspectRatio,
    mode: 'std',
    sound: 'off'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Kling Submit HTTP ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

// 2. Helper to check Kling task status
async function checkKlingStatus(taskId) {
  const url = `${KLING_BASE_URL}/v1/videos/text2video/${taskId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${KLING_API_KEY}`
    }
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Kling Poll HTTP ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

// 3. Helper to download file
async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

// 4. API endpoint to list all panels by parsing index.html
app.get('/api/panels', (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Parse all paragraphs to build a mapping of data-i -> text
    const paragraphRegex = /<p\s+data-i="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    const paragraphs = {};
    let pMatch;
    while ((pMatch = paragraphRegex.exec(htmlContent)) !== null) {
      const i = parseInt(pMatch[1]);
      let text = pMatch[2]
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

// 5. Submit generation
app.post('/api/generate', async (req, res) => {
  const { prompt, filename } = req.body;
  if (!prompt || !filename) {
    return res.status(400).json({ error: 'Missing prompt or filename' });
  }

  if (!KLING_API_KEY) {
    return res.status(500).json({ error: 'KLING_API_KEY environment variable is not defined.' });
  }

  try {
    console.log(`Submitting prompt to Kling: ${prompt}`);
    const submitRes = await submitKlingTask(prompt);
    const taskId = submitRes.data?.task_id || submitRes.data?.id || submitRes.task_id || submitRes.id;
    
    if (!taskId) {
      return res.status(500).json({ error: `Kling submission error: ${JSON.stringify(submitRes)}` });
    }

    res.json({ taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Poll status
app.get('/api/generate/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    const statusRes = await checkKlingStatus(taskId);
    const statusData = statusRes.data || statusRes;
    const taskStatus = statusData.task_status || statusData.status;

    if (taskStatus === 'succeed' || taskStatus === 'completed') {
      let videoUrl = null;
      const videos = statusData.task_result?.videos || statusData.videos;
      if (Array.isArray(videos) && videos.length > 0) {
        videoUrl = videos[0].url;
      } else if (statusData.task_result?.video?.url) {
        videoUrl = statusData.task_result.video.url;
      } else if (statusData.video?.url) {
        videoUrl = statusData.video.url;
      } else if (statusData.url) {
        videoUrl = statusData.url;
      }

      if (!videoUrl) {
        return res.json({ status: 'failed', error: 'No video URL found in success response' });
      }

      res.json({ status: 'succeed', videoUrl });
    } else if (taskStatus === 'failed') {
      res.json({ status: 'failed', error: statusData.task_status_desc || 'Unknown generation failure' });
    } else {
      res.json({ status: 'processing' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Download and extract frame
app.post('/api/download-frame', async (req, res) => {
  const { videoUrl, filename } = req.body;
  if (!videoUrl || !filename) {
    return res.status(400).json({ error: 'Missing videoUrl or filename' });
  }

  const baseName = path.basename(filename, path.extname(filename)); // e.g. 01_01_01
  const tempVideoPath = path.join(TEMP_DIR, `${baseName}_temp.mp4`);
  const tempImagePath = path.join(TEMP_DIR, `${baseName}_temp.jpg`);

  try {
    // 1. Download video
    await downloadFile(videoUrl, tempVideoPath);

    // 2. Extract first frame using ffmpeg command line (fast, reliable since we verified ffmpeg is on PATH)
    const cmd = `ffmpeg -y -i "${tempVideoPath}" -vframes 1 -f image2 "${tempImagePath}"`;
    
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error('ffmpeg extraction error:', err);
        return res.status(500).json({ error: 'Failed to extract frame with ffmpeg: ' + err.message });
      }
      
      console.log(`Successfully extracted frame to ${tempImagePath}`);
      
      // Return relative URLs for frontend display
      res.json({
        tempVideoUrl: `/img/screenshots/temp/${baseName}_temp.mp4`,
        tempImageUrl: `/img/screenshots/temp/${baseName}_temp.jpg`
      });
    });

  } catch (error) {
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
  const targetImagePath = path.join(__dirname, 'img', 'screenshots', filename);
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

app.listen(PORT, () => {
  console.log(`🚀 Comic Editor backend listening at http://localhost:${PORT}`);
});

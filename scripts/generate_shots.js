import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const BASE_URL = 'https://api-singapore.klingai.com';
const API_KEY = process.env.KLING_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: KLING_API_KEY environment variable is not defined.');
  console.error('Please make sure you have created a .env file with KLING_API_KEY="...".');
  process.exit(1);
}

// Helper to make request
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

// Download helper
async function downloadFile(url, destPath) {
  console.log(`📥 Downloading from ${url} to ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  console.log(`✅ File saved to ${destPath}`);
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Allow custom config path from argument, e.g. node scripts/generate_shots.js story/shots_config_part1.json
  let configFilename = 'story/shots_config.json';
  const customConfig = args.find(arg => arg.endsWith('.json'));
  if (customConfig) {
    configFilename = customConfig;
  }

  const configPath = path.isAbsolute(configFilename) 
    ? configFilename 
    : path.join(__dirname, '..', configFilename);

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: Config file not found at ${configPath}`);
    process.exit(1);
  }

  const shots = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`Using config: ${configPath}`);
  console.log(`Found ${shots.length} shots to generate in configuration.`);

  const videoDir = path.join(__dirname, '..', 'video');
  if (!fs.existsSync(videoDir)) {
    console.log(`Creating directory: ${videoDir}`);
    fs.mkdirSync(videoDir, { recursive: true });
  }

  if (dryRun) {
    console.log('\n--- DRY RUN MODE ---');
    console.log('Testing authentication against Kling API...');
    try {
      // Test the credentials by making a dummy request or listing active tasks
      // GET /v1/videos/text2video usually returns the list of tasks if no ID is provided
      const tasks = await makeRequest('/v1/videos/text2video');
      console.log('✅ Kling API Connection successful!');
      console.log('Recent tasks response structure:', JSON.stringify(tasks).substring(0, 300) + '...');
    } catch (error) {
      console.error('❌ Kling API Connection failed during dry run:');
      console.error(error.message);
      process.exit(1);
    }
    console.log('\nParsed shot prompts:');
    shots.forEach((shot, index) => {
      console.log(`[${index + 1}/${shots.length}] ID: ${shot.id}`);
      console.log(`  Prompt: "${shot.prompt}"`);
      console.log(`  Duration: ${shot.duration || 5}s`);
      console.log(`  Aspect Ratio: ${shot.aspect_ratio || '16:9'}`);
    });
    console.log('Dry run complete. No generation tasks were submitted.');
    return;
  }

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const outputFilename = `${shot.id}.mp4`;
    const outputPath = path.join(videoDir, outputFilename);

    if (fs.existsSync(outputPath)) {
      console.log(`\n⏭️ Skipping shot [${i + 1}/${shots.length}] (${shot.id}) - file already exists.`);
      continue;
    }

    console.log(`\n🎬 Generating shot [${i + 1}/${shots.length}] (${shot.id})...`);
    console.log(`Prompt: "${shot.prompt}"`);

    try {
      const payload = {
        model_name: 'kling-v3',
        prompt: shot.prompt,
        duration: shot.duration || 5,
        aspect_ratio: shot.aspect_ratio || '16:9',
        mode: 'std',
        sound: 'off'
      };

      console.log('Submitting task to Kling...');
      const submitRes = await makeRequest('/v1/videos/text2video', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('Submit response:', JSON.stringify(submitRes));
      
      const taskId = submitRes.data?.task_id || submitRes.data?.id || submitRes.task_id || submitRes.id;
      if (!taskId) {
        throw new Error(`Could not find task ID in response: ${JSON.stringify(submitRes)}`);
      }

      console.log(`Task submitted successfully! Task ID: ${taskId}`);
      console.log('Waiting for generation to complete (polling every 15 seconds)...');

      let completed = false;
      let checkCount = 0;
      
      while (!completed) {
        // Wait 15 seconds
        await new Promise(resolve => setTimeout(resolve, 15000));
        checkCount++;

        console.log(`Polling status (check #${checkCount})...`);
        const statusRes = await makeRequest(`/v1/videos/text2video/${taskId}`);
        
        // Handle various response patterns
        const statusData = statusRes.data || statusRes;
        const taskStatus = statusData.task_status || statusData.status;
        console.log(`Task status: ${taskStatus}`);

        if (taskStatus === 'succeed' || taskStatus === 'completed') {
          completed = true;
          
          // Try to extract video url
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
            throw new Error(`Video generation succeeded, but no video URL was found in response: ${JSON.stringify(statusRes)}`);
          }

          console.log(`🎉 Generation Succeeded! Video URL: ${videoUrl}`);
          await downloadFile(videoUrl, outputPath);
          
        } else if (taskStatus === 'failed') {
          throw new Error(`Video generation failed. Reason/Response: ${JSON.stringify(statusRes)}`);
        } else {
          // Still waiting or processing
          if (checkCount > 40) { // 10 minutes timeout
            throw new Error('Timeout: Video generation is taking too long.');
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error generating shot ${shot.id}:`, error.message);
      console.log('Moving to next shot...');
    }
  }

  console.log('\n🎉 Finished processing all shots!');
}

main().catch(error => {
  console.error('Fatal error in generator script:', error);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { spawn } = require('child_process');
const os = require('os');

// Manually load env from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const FILE_PATH = path.join(process.cwd(), 'data', 'analyzed-videos.json');

// --- Helper: Parse JSON3 Subtitle ---
function parseJson3Subtitle(json3) {
  if (!json3.events || !Array.isArray(json3.events)) {
    return '';
  }
  return json3.events
    .filter((event) => event.segs && Array.isArray(event.segs))
    .map((event) => event.segs.map((seg) => seg.utf8 || '').join(''))
    .join('\n')
    .trim();
}

// --- Helper: Extract Subtitle using yt-dlp ---
async function fetchTranscript(videoId, lang = 'ko') {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const outputTemplate = path.join(tempDir, `${videoId}_repair_subtitle`);

    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs', lang,
      '--sub-format', 'json3',
      '--skip-download',
      '-o', outputTemplate,
      '--no-warnings',
      '--quiet',
    ];

    const child = spawn('yt-dlp', args);

    child.on('close', async (code) => {
        // Try exact match first, then auto-generated
        const possibleFiles = [
            `${outputTemplate}.${lang}.json3`, // Manual
            `${outputTemplate}.json3`          // Sometimes fallback
        ];
        
        // Also check if yt-dlp appended the language code differently or if it's auto-generated
        // Usually yt-dlp outputs: filename.ko.json3
        
        let foundPath = null;
        for (const p of possibleFiles) {
            if (fs.existsSync(p)) {
                foundPath = p;
                break;
            }
        }

        if (!foundPath) {
             resolve(null);
             return;
        }

        try {
            const fileContent = fs.readFileSync(foundPath, 'utf-8');
            const json3 = JSON.parse(fileContent);
            const text = parseJson3Subtitle(json3);
            fs.unlinkSync(foundPath); // cleanup
            resolve(text.length > 0 ? text : null);
        } catch (e) {
            console.error(`Failed to parse subtitle for ${videoId}:`, e.message);
            resolve(null);
        }
    });

    child.on('error', (err) => {
      console.error(`yt-dlp spawn error for ${videoId}:`, err.message);
      resolve(null);
    });
  });
}

async function repair() {
  console.log('Starting transcript repair script...');
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error('File not found:', FILE_PATH);
    return;
  }

  const raw = fs.readFileSync(FILE_PATH, 'utf-8');
  let videos = JSON.parse(raw);
  
  // Filter: Not context report, Missing transcript, and (Caption is TRUE or Undefined)
  // We skip videos that are explicitly marked as caption: false (unless we want to double check)
  // Let's try to fetch for anything missing transcript to be safe, as "caption" metadata might be stale or referring to hard-subs.
  // Actually, let's respect the user's request: "download subtitles for analyzed videos where it's not saved".
  
  const targets = videos.filter(v => 
    v.type !== 'context' && !v.transcript
  );

  console.log(`Found ${targets.length} videos missing transcripts.`);

  if (targets.length === 0) {
    console.log('All videos have transcripts. Done.');
    return;
  }

  // Process in small batches (concurrently) because yt-dlp spawns processes
  const BATCH_SIZE = 5; 
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}...`);

    const promises = batch.map(async (video) => {
      const text = await fetchTranscript(video.videoId, 'ko');
      if (text) {
        video.transcript = text;
        video.caption = true; // Ensure metadata reflects it
        return true;
      } else {
        // Optionally mark as no caption if we failed?
        // No, maybe network issue. Leave as is.
        return false;
      }
    });

    const results = await Promise.all(promises);
    const succeeded = results.filter(r => r).length;
    successCount += succeeded;
    failCount += (batch.length - succeeded);
    
    // Save intermediate progress every 50 videos or so
    if ((i + BATCH_SIZE) % 50 === 0) {
        fs.writeFileSync(FILE_PATH, JSON.stringify(videos, null, 2));
        console.log(`[Checkpoint] Saved progress. Success: ${successCount}, Fail: ${failCount}`);
    }
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(videos, null, 2));
  console.log(`Repair complete. Total Fetched: ${successCount}, Failed/No Subs: ${failCount}. Saved to analyzed-videos.json`);
}

repair();

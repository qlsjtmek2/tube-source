const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

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

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

const FILE_PATH = path.join(process.cwd(), 'data', 'analyzed-videos.json');

async function repair() {
  console.log('Starting repair script...');
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error('File not found:', FILE_PATH);
    return;
  }

  const raw = fs.readFileSync(FILE_PATH, 'utf-8');
  let videos = JSON.parse(raw);
  
  const missingMetadata = videos.filter(v => 
    v.type !== 'context' && (!v.duration || v.caption === undefined || v.creativeCommons === undefined)
  );

  console.log(`Found ${missingMetadata.length} videos missing metadata.`);

  if (missingMetadata.length === 0) {
    console.log('All videos have metadata. Done.');
    return;
  }

  // Process in batches of 50
  for (let i = 0; i < missingMetadata.length; i += 50) {
    const chunk = missingMetadata.slice(i, i + 50);
    const ids = chunk.map(v => v.videoId);

    console.log(`Fetching metadata for batch ${Math.floor(i / 50) + 1}... (${ids.length} ids)`);

    try {
      const res = await youtube.videos.list({
        part: ['contentDetails', 'status'],
        id: ids,
      });

      const items = res.data.items || [];
      const metadataMap = new Map(items.map(item => [item.id, item]));

      chunk.forEach(video => {
        const item = metadataMap.get(video.videoId);
        if (item) {
          video.duration = video.duration || item.contentDetails.duration;
          video.caption = video.caption ?? (item.contentDetails.caption === 'true');
          video.creativeCommons = video.creativeCommons ?? (item.status.license === 'creativeCommon');
        }
      });
    } catch (error) {
      console.error('Error fetching from YouTube API:', error.message);
    }
  }

  fs.writeFileSync(FILE_PATH, JSON.stringify(videos, null, 2));
  console.log('Repair complete. Saved to analyzed-videos.json');
}

repair();
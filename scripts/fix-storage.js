const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(process.cwd(), 'data', 'analyzed-videos.json');

try {
    const rawContent = fs.readFileSync(FILE_PATH, 'utf-8');
    const arrays = [];
    let bracketCount = 0;
    let startPos = -1;
    
    for (let i = 0; i < rawContent.length; i++) {
        if (rawContent[i] === '[') {
            if (bracketCount === 0) startPos = i;
            bracketCount++;
        } else if (rawContent[i] === ']') {
            bracketCount--;
            if (bracketCount === 0 && startPos !== -1) {
                const jsonStr = rawContent.substring(startPos, i + 1);
                try {
                    arrays.push(JSON.parse(jsonStr));
                } catch (e) {
                    // console.error('Failed to parse a segment:', e.message);
                }
                startPos = -1;
            }
        }
    }

    if (arrays.length === 0) {
        process.exit(1);
    }

    const allVideos = arrays.flat();
    const uniqueVideos = allVideos.reduce((acc, video) => {
        if (!video.videoId) return acc;
        const existing = acc.find(v => v.videoId === video.videoId);
        if (!existing) {
            acc.push(video);
        } else {
            const existingDate = new Date(existing.analyzedAt).getTime();
            const currentDate = new Date(video.analyzedAt).getTime();
            if (currentDate > existingDate) {
                const index = acc.indexOf(existing);
                acc[index] = video;
            }
        }
        return acc;
    }, []);

    fs.writeFileSync(FILE_PATH, JSON.stringify(uniqueVideos, null, 2));
    console.log(`Successfully fixed storage. Merged ${arrays.length} blocks into ${uniqueVideos.length} unique videos.`);
} catch (error) {
    console.error('Fix script error:', error);
    process.exit(1);
}

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');

// 데이터 폴더 및 파일 초기화
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(CHANNELS_FILE);
    } catch {
      await fs.writeFile(CHANNELS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Storage Init Error:', error);
  }
}

export interface SavedChannel {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  addedAt: string;
}

export async function getSavedChannels(): Promise<SavedChannel[]> {
  await initStorage();
  const data = await fs.readFile(CHANNELS_FILE, 'utf-8');
  return JSON.parse(data);
}

export async function saveChannel(channel: SavedChannel) {
  await initStorage();
  const channels = await getSavedChannels();
  
  if (channels.find(c => c.channelId === channel.channelId)) {
    return channels; // 이미 존재함
  }
  
  const updated = [...channels, channel];
  await fs.writeFile(CHANNELS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

export async function removeChannel(channelId: string) {
  const channels = await getSavedChannels();
  const updated = channels.filter(c => c.channelId !== channelId);
  await fs.writeFile(CHANNELS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

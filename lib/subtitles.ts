import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface SubtitleData {
  videoId: string;
  language: string;
  text: string;
  format: string;
}

/**
 * 단일 영상의 자막을 추출합니다.
 * @param videoId - YouTube 영상 ID
 * @param lang - 자막 언어 (예: 'ko', 'en')
 * @returns 자막 데이터 또는 null (자막이 없거나 실패한 경우)
 */
export async function extractSubtitle(videoId: string, lang: string): Promise<SubtitleData | null> {
  return new Promise((resolve) => {
    // 임시 디렉토리에 자막 저장
    const tempDir = os.tmpdir();
    const outputTemplate = path.join(tempDir, `${videoId}_subtitle`);

    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      '--write-subs',           // 자막 다운로드
      '--write-auto-subs',      // 자동 생성 자막도 시도
      '--sub-langs', lang,      // 언어 지정
      '--sub-format', 'json3',  // JSON3 포맷
      '--skip-download',        // 영상은 다운로드하지 않음
      '-o', outputTemplate,     // 출력 경로
      '--no-warnings',          // 경고 메시지 숨김
      '--quiet',                // 불필요한 출력 숨김
    ];

    const child = spawn('yt-dlp', args);

    child.on('close', async () => {
      // 자막 파일 경로 (yt-dlp는 언어 코드와 포맷을 파일명에 추가)
      const subtitlePath = `${outputTemplate}.${lang}.json3`;

      try {
        // 자막 파일 읽기
        const fileContent = await fs.readFile(subtitlePath, 'utf-8');
        const json3 = JSON.parse(fileContent);
        const text = parseJson3Subtitle(json3);

        // 임시 파일 삭제
        await fs.unlink(subtitlePath).catch(() => {});

        if (text.length > 0) {
          resolve({
            videoId,
            language: lang,
            text,
            format: 'json3',
          });
        } else {
          resolve(null);
        }
      } catch {
        // 파일이 없거나 파싱 실패 시 null 반환
        resolve(null);
      }
    });

    child.on('error', () => {
      console.error(`[Subtitle] yt-dlp error for ${videoId}`);
      resolve(null);
    });
  });
}

/**
 * 여러 영상의 자막을 병렬로 추출합니다.
 * @param videoIds - YouTube 영상 ID 배열
 * @param lang - 자막 언어
 * @returns videoId를 키로 하는 자막 데이터 Map
 */
export async function extractSubtitlesBatch(
  videoIds: string[],
  lang: string
): Promise<Map<string, SubtitleData>> {
  console.log(`[Subtitle Batch] Extracting subtitles for ${videoIds.length} videos...`);

  const promises = videoIds.map((videoId) => extractSubtitle(videoId, lang));
  const results = await Promise.allSettled(promises);

  const subtitlesMap = new Map<string, SubtitleData>();

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      subtitlesMap.set(result.value.videoId, result.value);
    }
  });

  console.log(`[Subtitle Batch] Successfully extracted ${subtitlesMap.size}/${videoIds.length} subtitles`);

  return subtitlesMap;
}

/**
 * JSON3 포맷의 자막을 순수 텍스트로 변환합니다.
 * @param json3 - JSON3 자막 데이터
 * @returns 순수 텍스트 (타임스탬프 제거)
 */
function parseJson3Subtitle(json3: { events?: Array<{ segs?: Array<{ utf8?: string }> }> }): string {
  if (!json3.events || !Array.isArray(json3.events)) {
    return '';
  }

  return json3.events
    .filter((event) => event.segs && Array.isArray(event.segs))
    .map((event) =>
      event.segs!
        .map((seg) => seg.utf8 || '')
        .join('')
    )
    .join('\n')
    .trim();
}

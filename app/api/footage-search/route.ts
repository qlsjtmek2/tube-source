import { NextRequest, NextResponse } from 'next/server';
import { extractKeywordsBatch, searchAllSources, LineSearchResults } from '@/lib/footage-search';

/**
 * POST /api/footage-search
 *
 * 자막 텍스트를 받아서 라인별로 키워드 추출 및 이미지 검색 수행
 *
 * Request Body:
 * {
 *   subtitleText: string;  // 자막 전체 텍스트
 *   startLine?: number;    // 시작 라인 (페이지네이션, 기본값: 0)
 *   count?: number;        // 가져올 라인 수 (기본값: 5)
 * }
 *
 * Response:
 * {
 *   results: LineSearchResults[];  // 검색 결과 배열
 *   hasMore: boolean;              // 더 가져올 라인이 있는지
 *   totalLines: number;            // 전체 라인 수
 *   currentRange: { start: number; end: number };  // 현재 범위
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subtitleText, startLine = 0, count = 5 } = body;

    // ===========================
    // Validation
    // ===========================
    if (!subtitleText || typeof subtitleText !== 'string') {
      return NextResponse.json(
        { error: 'subtitleText is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof startLine !== 'number' || startLine < 0) {
      return NextResponse.json(
        { error: 'startLine must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof count !== 'number' || count < 1 || count > 20) {
      return NextResponse.json(
        { error: 'count must be between 1 and 20' },
        { status: 400 }
      );
    }

    // ===========================
    // Step 1: Split subtitle by line breaks
    // ===========================
    const allLines = subtitleText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (allLines.length === 0) {
      return NextResponse.json({
        results: [],
        hasMore: false,
        totalLines: 0,
        currentRange: { start: 0, end: 0 }
      });
    }

    // ===========================
    // Step 2: Extract requested range (pagination)
    // ===========================
    const lines = allLines.slice(startLine, startLine + count);

    if (lines.length === 0) {
      return NextResponse.json({
        results: [],
        hasMore: false,
        totalLines: allLines.length,
        currentRange: { start: startLine, end: startLine }
      });
    }

    console.log(`[FootageSearch API] Processing lines ${startLine + 1}-${startLine + lines.length} of ${allLines.length}`);

    // ===========================
    // Step 3: Extract keywords using Gemini
    // ===========================
    const keywords = await extractKeywordsBatch(lines);
    console.log(`[FootageSearch API] Extracted keywords for ${keywords.length} lines`);

    // ===========================
    // Step 4: Search all sources for each line (parallel)
    // ===========================
    const searchPromises = keywords.map(kw => searchAllSources(kw));
    const results = await Promise.all(searchPromises);

    console.log(`[FootageSearch API] Search completed for ${results.length} lines`);

    // ===========================
    // Response
    // ===========================
    return NextResponse.json({
      results,
      hasMore: startLine + count < allLines.length,
      totalLines: allLines.length,
      currentRange: { start: startLine, end: startLine + lines.length }
    });

  } catch (error: any) {
    console.error('[FootageSearch API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

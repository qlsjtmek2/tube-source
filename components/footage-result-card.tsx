"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FootageSearchResult } from "@/lib/footage-search";
import { Download, Copy, Check, ExternalLink } from "lucide-react";

interface FootageResultCardProps {
  result: FootageSearchResult;
}

export function FootageResultCard({ result }: FootageResultCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  /**
   * 이미지 다운로드 (CORS 대응)
   */
  const handleDownload = async () => {
    try {
      setDownloadError(false);

      // Try direct download first
      const response = await fetch(result.downloadUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.source}-${result.id}.${result.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError(true);
      // Fallback: Open in new tab
      window.open(result.downloadUrl, '_blank');
    }
  };

  /**
   * URL 복사
   */
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(result.url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  /**
   * 새 탭에서 열기
   */
  const handleOpenInNewTab = () => {
    window.open(result.url, '_blank');
  };

  return (
    <div className="group relative aspect-video rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary hover:shadow-lg transition-all">
      {/* 이미지/영상 썸네일 */}
      <img
        src={result.type === 'video' ? result.thumbnail : result.url}
        alt={result.title || ''}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* 영상 배지 */}
      {result.type === 'video' && (
        <Badge
          variant="danger"
          className="absolute top-2 right-2 text-white font-semibold shadow-md"
        >
          Video
        </Badge>
      )}

      {/* Hover 시 액션 버튼 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
        {/* 다운로드 버튼 */}
        <Button
          size="sm"
          onClick={handleDownload}
          className="w-full max-w-[200px]"
        >
          <Download className="w-4 h-4 mr-1" />
          다운로드
        </Button>

        {/* URL 복사 버튼 */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyUrl}
          className="w-full max-w-[200px]"
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              URL 복사
            </>
          )}
        </Button>

        {/* 새 탭에서 열기 버튼 */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpenInNewTab}
          className="w-full max-w-[200px]"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          새 탭에서 열기
        </Button>

        {downloadError && (
          <p className="text-xs text-red-400 mt-1">
            다운로드 실패 - 새 탭에서 열렸습니다
          </p>
        )}
      </div>

      {/* 출처 및 작가 표시 */}
      {result.author && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 text-white text-xs truncate">
          <span className="font-semibold">{result.author}</span>
          <span className="mx-1">·</span>
          <span className="text-muted-foreground capitalize">{result.source}</span>
        </div>
      )}
    </div>
  );
}

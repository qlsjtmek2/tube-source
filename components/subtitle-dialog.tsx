"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Subtitles, AlertCircle } from "lucide-react";

interface SubtitleDialogProps {
  subtitle: {
    videoId: string;
    language: string;
    text: string;
    format: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
}

export function SubtitleDialog({ subtitle, isOpen, onClose, videoTitle }: SubtitleDialogProps) {
  const hasSubtitle = subtitle && subtitle.text && subtitle.text.length > 0;

  // 연속된 줄바꿈을 하나로 합치고 자연스럽게 단락 구분
  const formatSubtitleText = (text: string) => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-blue-500" />
            자막
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {videoTitle}
          </DialogDescription>
          {hasSubtitle && subtitle.language && (
            <div className="pt-2">
              <Badge variant="secondary" className="text-xs">
                {subtitle.language.toUpperCase()}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 min-h-0">
          {!hasSubtitle ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-slate-500">
              <AlertCircle className="w-12 h-12 text-slate-300" />
              <p className="text-center">
                이 영상에는 자막이 없습니다.<br />
                자동 생성 자막도 제공되지 않습니다.
              </p>
            </div>
          ) : (
            <div className="pt-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <p className="text-sm leading-relaxed font-sans text-slate-700 dark:text-slate-300 break-words">
                  {formatSubtitleText(subtitle.text)}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

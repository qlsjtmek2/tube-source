"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, FileVideo, Music, CheckCircle2, AlertCircle } from "lucide-react";

interface DownloadDialogProps {
  video: { id: string; title: string } | null;
  url?: string;
  title?: string;
  urls?: string[]; // Deprecated, replaced by items
  items?: { url: string; title?: string }[];
  isOpen: boolean;
  onClose: () => void;
  onDownloadStart?: (downloadInfo: any) => void;
}

export function DownloadDialog({ video, url, title, items, isOpen, onClose, onDownloadStart }: DownloadDialogProps) {
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");

  const startDownload = (selectedFormat: "mp4" | "mp3") => {
    if (!video && !url && (!items || items.length === 0)) return;
    
    if (onDownloadStart) {
      if (items && items.length > 0) {
        const infos = items.map(item => ({
          id: item.url,
          title: item.title || item.url,
          format: selectedFormat,
          url: item.url
        }));
        onDownloadStart(infos);
      } else {
        onDownloadStart({
          id: video?.id || url || Date.now().toString(),
          title: video?.title || title || url || "Unknown",
          format: selectedFormat,
          url: url,
          videoId: video?.id
        });
      }
    }
    onClose();
  };

  const description = video?.title || title || url || (items ? `${items.length}개의 링크` : "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>다운로드 형식 선택</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <Button 
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => startDownload("mp4")}
          >
            <FileVideo className="h-8 w-8 text-red-500" />
            <span className="font-bold">MP4 영상</span>
          </Button>
          <Button 
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            onClick={() => startDownload("mp3")}
          >
            <Music className="h-8 w-8 text-blue-500" />
            <span className="font-bold">MP3 음원</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadDialog({ video, isOpen, onClose }: DownloadDialogProps) {
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [status, setStatus] = useState<"idle" | "downloading" | "completed" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const startDownload = () => {
    if (!video) return;
    
    setStatus("downloading");
    setProgress(0);
    setMessage("다운로드 시작 중...");

    const eventSource = new EventSource(`/api/download?videoId=${video.id}&format=${format}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.status === "progress") {
        const percent = parseFloat(data.progress.replace("%", ""));
        setProgress(percent);
        setMessage(data.message);
      } else if (data.status === "completed") {
        setStatus("completed");
        setProgress(100);
        setMessage("다운로드 완료! downloads 폴더를 확인하세요.");
        eventSource.close();
      } else if (data.status === "error") {
        setStatus("error");
        setMessage(`에러 발생: ${data.message}`);
        eventSource.close();
      } else {
        setMessage(data.message);
      }
    };

    eventSource.onerror = () => {
      setStatus("error");
      setMessage("서버 연결에 실패했습니다.");
      eventSource.close();
    };
  };

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setProgress(0);
      setMessage("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>영상 다운로드</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {video?.title}
          </DialogDescription>
        </DialogHeader>

        {status === "idle" ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={format === "mp4" ? "default" : "outline"} 
                className="h-20 flex flex-col gap-2"
                onClick={() => setFormat("mp4")}
              >
                <FileVideo className="h-6 w-6" />
                <span>MP4 영상</span>
              </Button>
              <Button 
                variant={format === "mp3" ? "default" : "outline"} 
                className="h-20 flex flex-col gap-2"
                onClick={() => setFormat("mp3")}
              >
                <Music className="h-6 w-6" />
                <span>MP3 음원</span>
              </Button>
            </div>
            <Button className="w-full" onClick={startDownload}>
              다운로드 시작
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4 text-center">
              {status === "downloading" && <Download className="h-12 w-12 text-blue-500 animate-bounce" />}
              {status === "completed" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
              {status === "error" && <AlertCircle className="h-12 w-12 text-red-500" />}
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>{message}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
            
            {status !== "downloading" && (
              <Button className="w-full" variant="outline" onClick={onClose}>
                닫기
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

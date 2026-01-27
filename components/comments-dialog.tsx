"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, ThumbsUp, Loader2, User } from "lucide-react";
import { YouTubeComment } from "@/lib/youtube";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommentsDialogProps {
  comments: YouTubeComment[];
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
  isLoading?: boolean;
}

export function CommentsDialog({
  comments,
  isOpen,
  onClose,
  videoTitle,
  isLoading = false,
}: CommentsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                베스트 댓글 반응
              </DialogTitle>
              <DialogDescription className="line-clamp-1 mt-1.5">
                {videoTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p>베스트 댓글을 불러오는 중입니다...</p>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={comment.authorThumbnail} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm truncate">{comment.authorName}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(comment.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.likeCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p>표시할 댓글이 없습니다.</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <Button onClick={onClose} className="w-full sm:w-auto ml-auto">
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

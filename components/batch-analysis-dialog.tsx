"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface BatchAnalysisDialogProps {
  isOpen: boolean;
  total: number;
  current: number;
  successCount: number;
  failCount: number;
  isAnalyzing: boolean;
  onClose: () => void;
  onCancel?: () => void;
}

export function BatchAnalysisDialog({
  isOpen,
  total,
  current,
  successCount,
  failCount,
  isAnalyzing,
  onClose,
  onCancel,
}: BatchAnalysisDialogProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isAnalyzing && open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                일괄 분석 진행 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                분석 완료
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isAnalyzing 
              ? "선택한 영상들을 AI가 분석하고 있습니다." 
              : "모든 영상의 분석이 완료되었습니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>진행률 ({current}/{total})</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</div>
              <div className="text-xs text-green-600/80 dark:text-green-400/80">성공</div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failCount}</div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">실패</div>
            </div>
          </div>

          {isAnalyzing && onCancel && (
            <Button variant="outline" className="w-full mt-2" onClick={onCancel}>
              <XCircle className="w-4 h-4 mr-2" />
              분석 중단하기
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

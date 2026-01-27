"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, X, AlertCircle } from "lucide-react";
import { BatchJob } from "@/app/page";

interface BatchProcessBarProps {
  job: BatchJob;
  onClose: () => void;
  onCancel: () => void;
}

export function BatchProcessBar({
  job,
  onClose,
  onCancel,
}: BatchProcessBarProps) {
  const { progress, status, label } = job;
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isRunning = status === 'running';
  const isCancelled = status === 'cancelled';

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-4">
        {/* 라벨 표시 */}
        <div
          className="text-xs text-slate-500 truncate max-w-[120px] shrink-0"
          title={label}
        >
          {label}
        </div>

        {/* Status Icon & Text */}
        <div className="flex items-center gap-3 shrink-0 min-w-[130px]">
          {isRunning ? (
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>분석 진행 중...</span>
            </div>
          ) : isCancelled ? (
            <div className="flex items-center gap-2 text-yellow-600 font-medium">
              <AlertCircle className="w-5 h-5" />
              <span>취소됨</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>분석 완료</span>
            </div>
          )}
        </div>

        {/* Progress Bar & Stats */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-slate-500 px-0.5">
            <span>{progress.current} / {progress.total} 영상 처리됨</span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2 w-full" />
        </div>

        {/* Counts */}
        <div className="flex gap-3 shrink-0 text-sm">
          <div className="flex flex-col items-center px-3 border-r border-slate-100 dark:border-slate-800">
            <span className="text-green-600 font-bold">{progress.success}</span>
            <span className="text-[10px] text-slate-400">성공</span>
          </div>
          <div className="flex flex-col items-center px-3">
            <span className="text-red-500 font-bold">{progress.fail}</span>
            <span className="text-[10px] text-slate-400">실패</span>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 ml-2">
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400"
              onClick={onCancel}
            >
              <XCircle className="w-3.5 h-3.5" />
              중단
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onClose}
            >
              <X className="w-4 h-4 text-slate-500" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

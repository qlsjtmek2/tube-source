"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Minimize2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isMinimized, setIsMinimized] = useState(false);
  const progress = total > 0 ? (current / total) * 100 : 0;

  if (!isOpen) return null;

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 z-50 w-80 shadow-2xl transition-all duration-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950",
      isMinimized ? "h-auto" : "h-auto"
    )}>
      <CardHeader className="p-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              일괄 분석 중 ({current}/{total})
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              분석 완료
            </>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          {!isAnalyzing && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:text-red-500" 
              onClick={onClose}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>진행률</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{successCount}</div>
              <div className="text-[10px] text-green-600/80 dark:text-green-400/80">성공</div>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{failCount}</div>
              <div className="text-[10px] text-red-600/80 dark:text-red-400/80">실패</div>
            </div>
          </div>

          {isAnalyzing && onCancel && (
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onCancel}>
              <XCircle className="w-3 h-3 mr-1.5" />
              분석 중단하기
            </Button>
          )}
          
          {!isAnalyzing && (
             <Button variant="default" size="sm" className="w-full text-xs h-8" onClick={onClose}>
               확인
             </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

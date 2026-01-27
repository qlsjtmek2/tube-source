"use client";

import { BatchProcessBar } from "./batch-process-bar";
import { BatchJob } from "@/app/page";

interface BatchProcessStackProps {
  jobs: BatchJob[];
  onClose: (jobId: string) => void;
  onCancel: (jobId: string) => void;
}

export function BatchProcessStack({ jobs, onClose, onCancel }: BatchProcessStackProps) {
  if (jobs.length === 0) return null;

  // 실행 중인 작업을 상단에 표시, 같은 상태 내에서는 최근 시작된 작업이 상단
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (b.status === 'running' && a.status !== 'running') return 1;
    return b.startedAt.getTime() - a.startedAt.getTime();
  });

  const runningCount = jobs.filter(j => j.status === 'running').length;

  return (
    <div className="space-y-2">
      {/* 진행 중인 작업 수 표시 (2개 이상일 때) */}
      {runningCount > 1 && (
        <div className="text-xs text-slate-500 px-1 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          {runningCount}개의 분석이 동시 진행 중
        </div>
      )}

      {sortedJobs.map(job => (
        <BatchProcessBar
          key={job.id}
          job={job}
          onClose={() => onClose(job.id)}
          onCancel={() => onCancel(job.id)}
        />
      ))}
    </div>
  );
}

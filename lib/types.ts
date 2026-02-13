// BatchJob 인터페이스 - 다중 분석 작업 관리
export interface BatchJob {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'cancelled';
  progress: {
    total: number;
    current: number;
    success: number;
    fail: number;
  };
  abortController: AbortController;
  startedAt: Date;
}

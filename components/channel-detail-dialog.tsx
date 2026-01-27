'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChannelDetails } from "@/lib/youtube";
import { Calendar, Eye, FileVideo, Globe, Heart, Search, Star, ThumbsUp, Users } from "lucide-react";

interface ChannelDetailDialogProps {
  channelId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLoadToSearch: (channelId: string, channelTitle: string) => void;
}

export function ChannelDetailDialog({ channelId, isOpen, onClose, onLoadToSearch }: ChannelDetailDialogProps) {
  const [details, setDetails] = useState<ChannelDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && channelId) {
      fetchDetails(channelId);
    } else {
      setDetails(null);
      setError(null);
    }
  }, [isOpen, channelId]);

  const fetchDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/details?channelId=${id}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      setDetails(data.details);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {loading ? "채널 정보 불러오는 중..." : error ? "오류 발생" : details?.title || "채널 상세 정보"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-10 space-y-4">
             <div className="flex items-center gap-4">
               <Skeleton className="h-20 w-20 rounded-full" />
               <div className="space-y-2 flex-1">
                 <Skeleton className="h-6 w-1/3" />
                 <Skeleton className="h-4 w-1/4" />
               </div>
             </div>
             <Skeleton className="h-32 w-full" />
             <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">
            <p>채널 정보를 불러오는데 실패했습니다.</p>
            <p className="text-sm text-slate-400 mt-2">{error}</p>
          </div>
        ) : details ? (
          <>
            {/* Header / Banner */}
            <div className="relative">
               {details.banner && (
                 <div className="w-full h-32 bg-slate-100 overflow-hidden">
                   <img src={details.banner} alt="Banner" className="w-full h-full object-cover" />
                 </div>
               )}
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
               {/* Channel Profile */}
               <div className="flex flex-col md:flex-row gap-5 mb-6 -mt-10 relative z-10">
                  <div className="shrink-0">
                    <img 
                      src={details.thumbnail} 
                      alt={details.title} 
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-sm bg-white" 
                    />
                  </div>
                  <div className="flex-1 pt-2 md:pt-10">
                    <DialogTitle className="text-xl font-bold mb-1">{details.title}</DialogTitle>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                      {details.customUrl && <span>{details.customUrl}</span>}
                      <span>•</span>
                      <span>개설일: {formatDate(details.publishedAt)}</span>
                      {details.country && (
                        <>
                           <span>•</span>
                           <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {details.country}</span>
                        </>
                      )}
                    </div>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <CardStat icon={<Users className="w-4 h-4 text-blue-500" />} label="구독자" value={formatNumber(details.subscriberCount)} />
                  <CardStat icon={<Eye className="w-4 h-4 text-green-500" />} label="총 조회수" value={formatNumber(details.viewCount)} />
                  <CardStat icon={<FileVideo className="w-4 h-4 text-red-500" />} label="총 영상수" value={formatNumber(details.videoCount)} />
                  <CardStat icon={<Calendar className="w-4 h-4 text-orange-500" />} label="마지막 업로드" value={details.lastUploadAt ? formatDate(details.lastUploadAt) : '-'} />
                  <CardStat icon={<Heart className="w-4 h-4 text-pink-500" />} label="평균 좋아요 (Sample)" value={formatNumber(details.averageLikes)} />
                  <CardStat icon={<ThumbsUp className="w-4 h-4 text-purple-500" />} label="성과도 (Avg)" value="-" />
               </div>

               {/* Description */}
               <div className="mb-8">
                 <h3 className="font-semibold mb-2">채널 설명</h3>
                 <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar text-slate-600 dark:text-slate-300">
                   {details.description || "채널 설명이 없습니다."}
                 </div>
               </div>

               {/* Action Button at the bottom */}
               <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                 <Button onClick={() => onLoadToSearch(details.id, details.title)} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white shadow-sm">
                   <Search className="w-4 h-4 mr-2" />
                   채널 검색 탭으로 불러오기
                 </Button>
               </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CardStat({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm">
      <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">{label}</p>
        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

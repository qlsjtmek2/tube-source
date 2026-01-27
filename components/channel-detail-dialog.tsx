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
               <div className="absolute top-4 right-4 z-10">
                 <Button onClick={() => onLoadToSearch(details.id, details.title)} className="bg-white/90 text-black hover:bg-white shadow-sm border border-slate-200">
                   <Search className="w-4 h-4 mr-2" />
                   채널 검색 탭으로 불러오기
                 </Button>
               </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
               {/* Channel Profile */}
               <div className="flex flex-col md:flex-row gap-6 mb-8 -mt-12 relative z-10">
                  <div className="shrink-0">
                    <img 
                      src={details.thumbnail} 
                      alt={details.title} 
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md bg-white" 
                    />
                  </div>
                  <div className="flex-1 pt-4 md:pt-12">
                    <h2 className="text-2xl font-bold mb-1">{details.title}</h2>
                    <div className="flex flex-wrap gap-2 text-sm text-slate-500 mb-4">
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

               {/* Popular Videos */}
               <div>
                 <h3 className="font-semibold mb-3 flex items-center gap-2">
                   <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                   인기 영상 Top 3
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {details.topVideos.map(video => (
                     <div key={video.id} className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:shadow-md transition-all">
                       <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="block aspect-video bg-slate-100 relative">
                         <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                         <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                           {video.duration.replace('PT','').replace('H',':').replace('M',':').replace('S','')}
                         </div>
                       </a>
                       <div className="p-3">
                         <h4 className="text-xs font-bold line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">{video.title}</h4>
                         <div className="flex justify-between text-[10px] text-slate-500">
                           <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNumber(video.viewCount)}</span>
                           <span>{formatDate(video.publishedAt)}</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
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

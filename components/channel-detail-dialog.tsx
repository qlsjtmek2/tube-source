'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChannelDetails } from "@/lib/youtube";
import { Calendar, Eye, FileVideo, Globe, Heart, Search, TrendingUp, User, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

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

  const formatFullNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-950 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {loading ? "채널 정보 불러오는 중..." : error ? "오류 발생" : details?.title || "채널 상세 정보"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 space-y-6 flex flex-col items-center justify-center h-[500px]">
             <Skeleton className="h-24 w-24 rounded-full" />
             <div className="space-y-2 w-full max-w-md flex flex-col items-center">
               <Skeleton className="h-8 w-1/2" />
               <Skeleton className="h-4 w-1/3" />
             </div>
             <div className="grid grid-cols-3 gap-4 w-full mt-4">
               <Skeleton className="h-20 w-full" />
               <Skeleton className="h-20 w-full" />
               <Skeleton className="h-20 w-full" />
             </div>
             <Skeleton className="h-48 w-full mt-4" />
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 h-[300px] flex flex-col items-center justify-center">
            <p className="font-semibold text-lg">채널 정보를 불러오는데 실패했습니다.</p>
            <p className="text-sm text-slate-400 mt-2">{error}</p>
          </div>
        ) : details ? (
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
               <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <img 
                      src={details.thumbnail} 
                      alt={details.title} 
                      className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-md bg-white dark:bg-slate-800 object-cover" 
                    />
                    {details.country && (
                      <Badge variant="secondary" className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] shadow-sm border-white dark:border-slate-800 border-2">
                        {details.country}
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <DialogTitle className="text-xl font-bold mb-1 tracking-tight">{details.title}</DialogTitle>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {details.customUrl && <span>{details.customUrl}</span>}
                      <span>•</span>
                      <span>개설일: {formatDate(details.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Quick Stats Row - Grid Layout for stability */}
                  <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-2 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(details.subscriberCount)}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">구독자</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(details.viewCount)}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">총 조회수</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(details.videoCount)}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">영상 수</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                 
                 {/* Recent Videos Chart */}
                 <div>
                   <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
                     <TrendingUp className="w-4 h-4 text-red-500" />
                     최근 영상 조회수 추이 (10개)
                   </h3>
                   <div className="h-52 w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm relative">
                     {details.recentVideos.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={[...details.recentVideos].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                           <XAxis 
                             dataKey="title" 
                             hide 
                           />
                           <YAxis 
                             tick={{ fontSize: 10, fill: '#94a3b8' }}
                             tickFormatter={(value) => new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 0 }).format(value)}
                             axisLine={false}
                             tickLine={false}
                           />
                           <Tooltip 
                             cursor={{ fill: 'transparent' }}
                             content={({ active, payload }) => {
                               if (active && payload && payload.length) {
                                 return (
                                   <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl max-w-[200px] z-50 border border-slate-800">
                                     <p className="font-semibold mb-1 line-clamp-2 leading-snug">{payload[0].payload.title}</p>
                                     <p className="text-slate-300">조회수: <span className="text-white font-bold">{formatFullNumber(payload[0].value as number)}</span></p>
                                     <p className="text-[10px] text-slate-400 mt-1">{formatDate(payload[0].payload.publishedAt)}</p>
                                   </div>
                                 );
                               }
                               return null;
                             }}
                           />
                           <Bar dataKey="viewCount" radius={[4, 4, 0, 0]} maxBarSize={40}>
                             {details.recentVideos.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index === details.recentVideos.length - 1 ? '#ef4444' : '#cbd5e1'} className="hover:fill-red-400 transition-all duration-300" />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">
                          데이터가 충분하지 않습니다.
                        </div>
                     )}
                     <p className="text-center text-[10px] text-slate-400 mt-2 absolute bottom-2 w-full left-0 pointer-events-none">← 과거  |  최신 →</p>
                   </div>
                 </div>

                 {/* Additional Stats */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" /> 마지막 업로드
                      </div>
                      <p className="text-sm font-semibold">{details.lastUploadAt ? formatDate(details.lastUploadAt) : '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-medium">
                        <Heart className="w-3.5 h-3.5" /> 평균 좋아요
                      </div>
                      <p className="text-sm font-semibold">{formatNumber(details.averageLikes)}</p>
                    </div>
                 </div>

                 {/* Description */}
                 {details.description && (
                   <div>
                     <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">채널 설명</h3>
                     <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-xs leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
                       {details.description}
                     </div>
                   </div>
                 )}
              </div>
            </ScrollArea>

            {/* Footer Action */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
               <Button 
                 onClick={() => onLoadToSearch(details.id, details.title)} 
                 className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm h-11 text-sm font-semibold"
               >
                 <Search className="w-4 h-4 mr-2" />
                 이 채널의 영상 검색하기
               </Button>
            </div>
          </div>
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

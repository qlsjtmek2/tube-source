import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export async function POST() {
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  
  try {
    // 폴더가 없으면 생성
    await fs.mkdir(downloadsDir, { recursive: true });
    
    // OS별 폴더 열기 명령
    const command = process.platform === 'win32' 
      ? `explorer "${downloadsDir}"` 
      : `open "${downloadsDir}"`;
      
    exec(command);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function TypewriterApp() {
  const [text, setText] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio API 초기화
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
    };

    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('click', initAudio, { once: true });

    return () => {
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('click', initAudio);
    };
  }, []);

  // 1. 타자기 타격음
  const playTypeSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  };

  // 2. 줄바꿈 종 소리
  const playBellSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  };

  // 키 입력 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      playBellSound();
    } else if (e.key.length === 1 || e.key === 'Backspace') {
      playTypeSound();
    }
  };

  // .txt 파일 저장 핸들러
  const handleSaveTxt = () => {
    if (!text.trim()) {
      alert('저장할 내용을 입력해 주세요.');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typewriter_note_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 현재 줄 수 계산 (엔터 기준)
  const lineCount = text.split('\n').length;
  // 한 줄 높이(lineHeight: 32px)만큼 translateY로 전체 텍스트를 위로 밀어 올림
  const offsetY = (lineCount - 1) * 32;

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      gap: '15px'
    }}>
      {/* 타자기 컨테이너 */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '4 / 3',
        backgroundImage: 'url("/typewriter-base.png")',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* 마스크 영역 (타자기 롤러 위쪽 공간 고정) */}
        <div style={{
          position: 'absolute',
          top: '5%', // 위로 사라지는 텍스트 보일 상단 범위
          left: '20%',
          width: '60%',
          height: '240px', // 타자기 롤러 위쪽 전체 높이
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)'
        }}>
          {/* 실제 입력창: 줄 수가 늘어나면 Y축 이동으로 위로 슬라이딩 */}
          <div style={{
            position: 'absolute',
            bottom: '20px', // 첫 줄 입력 시작 위치 (타자기 롤러 바로 위)
            width: '100%',
            transform: `translateY(-${offsetY}px)`,
            transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
          }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="타자기를 치듯 글을 작성해보세요..."
              rows={lineCount}
              autoFocus
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                resize: 'none',
                fontFamily: 'Courier New, Courier, monospace',
                fontSize: '18px',
                lineHeight: '32px',
                color: '#ffffff',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                padding: '0',
                margin: '0',
                overflow: 'hidden'
              }}
            />
          </div>
        </div>
      </div>

      {/* .txt 저장 버튼 */}
      <button
        onClick={handleSaveTxt}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontFamily: 'Courier New, monospace',
          color: '#ffffff',
          backgroundColor: '#2a2a2a',
          border: '1px solid #444444',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#3a3a3a')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2a2a2a')}
      >
        💾 .txt 저장하기
      </button>
    </main>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function TypewriterApp() {
  const [text, setText] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      playBellSound();
    } else if (e.key.length === 1 || e.key === 'Backspace') {
      playTypeSound();
    }
  };

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

  const lines = text.split('\n');
  const lineCount = lines.length;
  const lineHeight = 32; // 한 줄 높이 (px)

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
        {/* 상단 뷰포트 액자 영역 */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '20%',
          width: '60%',
          height: '180px',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)'
        }}>
          {/* 단일 textarea로 통합 및 위치 자동 트랜스폼 */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="타자기를 치듯 글을 작성해보세요..."
            autoFocus
            style={{
              position: 'absolute',
              bottom: '20px', // 최하단 타격 지점 고정
              left: 0,
              width: '100%',
              height: `${lineCount * lineHeight}px`,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: '17px',
              lineHeight: `${lineHeight}px`,
              color: '#ffffff',
              caretColor: '#ffffff',
              textAlign: 'center',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              padding: 0,
              margin: 0,
              overflow: 'hidden',
              // 입력 중인 아랫줄이 bottom: 20px 위치에 오도록 위로 당겨줌
              transform: `translateY(-${(lineCount - 1) * lineHeight}px)`
            }}
          />
        </div>
      </div>

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

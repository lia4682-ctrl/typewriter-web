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

  const lineCount = text.split('\n').length;
  // 엔터 한 번당 올라가는 세로 이동량 (더 촘촘하게 18px로 조정)
  const stepHeight = 18;
  // 최대 상승 제한을 두어 작성 중인 줄이 화면 밖으로 완전히 사라지지 않도록 보호 (최대 70px까지만 상승)
  const offsetY = Math.min((lineCount - 1) * stepHeight, 70);

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
        {/* 입력 액자 영역 */}
        <div style={{
          position: 'absolute',
          top: '12%',
          left: '20%',
          width: '60%',
          height: '130px',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)'
        }}>
          {/* 실제 텍스트 이동 컨테이너 */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            width: '100%',
            transform: `translateY(-${offsetY}px)`,
            transition: 'transform 0.18s ease-out'
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
                fontSize: '16px',
                lineHeight: '24px',
                color: '#ffffff',
                textAlign: 'center',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
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

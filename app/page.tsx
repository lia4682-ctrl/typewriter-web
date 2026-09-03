'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function TypewriterApp() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  // 커서가 있는 줄을 입력 영역 하단(타격선)에 정확히 맞추는 스크롤 제어
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const lineHeight = 32;
    const selectionStart = el.selectionStart;
    const linesBeforeCursor = text.substring(0, selectionStart).split('\n').length;
    
    // 현재 작성 중인 줄이 입력창 최하단 타격선에 걸치도록 scrollTop 계산
    const targetScrollTop = Math.max(0, (linesBeforeCursor - 1) * lineHeight);
    el.scrollTop = targetScrollTop;
  }, [text]);

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
        {/* 실제 종이 영역에 채워지는 뷰포트 */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '28%',
          width: '44%',
          height: '210px',
          overflow: 'hidden'
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onSelect={() => {
              // 마우스 클릭이나 키보드로 커서 위치 이동 시 스크롤 동기화
              if (textareaRef.current) {
                const el = textareaRef.current;
                const linesBefore = text.substring(0, el.selectionStart).split('\n').length;
                el.scrollTop = Math.max(0, (linesBefore - 1) * 32);
              }
            }}
            placeholder="타자기를 치듯 글을 작성해보세요..."
            autoFocus
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: '16px',
              lineHeight: '32px',
              color: '#1a1a1a', // 종이 위 검은 글씨 연출
              caretColor: '#1a1a1a',
              textAlign: 'center',
              padding: '0 10px',
              margin: 0,
              overflowY: 'hidden' // 스크롤바 감추고 내부 scrollTop으로만 제어
            }}
          />
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div style={{ display: 'flex', gap: '10px' }}>
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

        {/* 후원 버튼 */}
        <a
          href="https://buymeacoffee.com/your_id" // 본인의 Buy Me a Coffee / Toss Link 주소로 변경
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            backgroundColor: '#FF813F', // Buy Me a Coffee 시그니처 오렌지
            border: 'none',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          ☕ 개발자에게 커피 한 잔 선물하기
        </a>
      </div>
    </main>
  );
}

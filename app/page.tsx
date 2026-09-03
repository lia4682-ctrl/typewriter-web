'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DiscardedPaper {
  id: number;
  text: string;
  x: number;
  y: number;
  rotate: number;
}

export default function TypewriterApp() {
  const [text, setText] = useState('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaperText, setSelectedPaperText] = useState<string | null>(null);
  const [isHoveredBin, setIsHoveredBin] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // 1. 오디오 컨텍스트 초기화
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  // 2. [방법 2 핵심] 텍스트 입력 시 스크롤을 항상 최하단으로 부드럽게 고정
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
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

  const playTrashSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const duration = 0.25;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
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

  const handleDiscard = () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const newPaper: DiscardedPaper = {
      id: Date.now(),
      text: text,
      x: Math.floor(Math.random() * (windowWidth * 0.4)) + 50,
      y: Math.floor(Math.random() * (windowHeight * 0.4)) + 100,
      rotate: Math.floor(Math.random() * 360) - 180
    };

    setPapers((prev) => [...prev, newPaper]);
    setText('');
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, paperX: number, paperY: number) => {
    e.preventDefault();
    setDraggingId(id);
    isDraggingRef.current = false;
    dragOffsetRef.current = {
      x: e.clientX - paperX,
      y: e.clientY - paperY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingId === null) return;

      isDraggingRef.current = true;

      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      setPapers((prev) =>
        prev.map((p) => (p.id === draggingId ? { ...p, x: newX, y: newY } : p))
      );

      if (binRef.current) {
        const binRect = binRef.current.getBoundingClientRect();
        const isOver =
          e.clientX >= binRect.left &&
          e.clientX <= binRect.right &&
          e.clientY >= binRect.top &&
          e.clientY <= binRect.bottom;

        setIsHoveredBin(isOver);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingId === null) return;

      if (binRef.current) {
        const binRect = binRef.current.getBoundingClientRect();
        const isOver =
          e.clientX >= binRect.left &&
          e.clientX <= binRect.right &&
          e.clientY >= binRect.top &&
          e.clientY <= binRect.bottom;

        if (isOver) {
          playTrashSound();
          setPapers((prev) => prev.filter((p) => p.id !== draggingId));
        }
      }

      setDraggingId(null);
      setIsHoveredBin(false);
    };

    if (draggingId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId]);

  const handlePaperClick = (paperText: string) => {
    if (!isDraggingRef.current) {
      setSelectedPaperText(paperText);
    }
  };

  return (
    <main style={{
      position: 'relative',
      minHeight: '100vh',
      backgroundColor: '#121212',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      gap: '15px',
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* 휴지통 */}
      <div
        ref={binRef}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '40vw',
          maxWidth: '280px',
          zIndex: 15,
          transition: 'transform 0.2s ease',
          transform: isHoveredBin ? 'scale(1.15)' : 'scale(1)',
          pointerEvents: 'none'
        }}
      >
        <img
          src="/bin.png"
          alt="Trash Bin"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* 버려진 종이들 */}
      {papers.map((paper) => (
        <img
          key={paper.id}
          src="/paper.png"
          alt="Discarded Paper"
          onMouseDown={(e) => handleMouseDown(e, paper.id, paper.x, paper.y)}
          onClick={() => handlePaperClick(paper.text)}
          style={{
            position: 'absolute',
            left: `${paper.x}px`,
            top: `${paper.y}px`,
            width: '20vw',
            maxWidth: '160px',
            transform: `rotate(${paper.rotate}deg)`,
            zIndex: draggingId === paper.id ? 100 : 20,
            cursor: 'pointer',
            transition: draggingId === paper.id ? 'none' : 'transform 0.1s ease'
          }}
        />
      ))}

      {/* 타자기 전체 영역 */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '4 / 3',
        zIndex: 1
      }}>
        {/* 종이 배경 및 입력 레이어 (위치 고정) */}
        <div style={{
          position: 'absolute',
          top: '5%',
          left: '30%',
          width: '40%',
          height: '60%',
          backgroundColor: '#fcf8f2',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          borderRadius: '2px',
          padding: '20px',
          zIndex: 1
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
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
              color: '#1a1a1a',
              textAlign: 'center',
              padding: 0,
              margin: 0,
              // Y축 스크롤은 허용하되 스크롤바는 숨김
              overflowY: 'auto',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE/Edge
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          />
        </div>

        {/* 타자기 본체 이미지 (종이 위에 고정) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url("/typewriter-base.png")',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
          zIndex: 2
        }} />
      </div>

      {/* 하단 버튼 그룹 */}
      <div style={{ display: 'flex', gap: '10px', zIndex: 10 }}>
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

        <button
          onClick={handleDiscard}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontFamily: 'Courier New, monospace',
            color: '#ffffff',
            backgroundColor: '#d9534f',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c9302c')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#d9534f')}
        >
          🗑️ 버리기
        </button>

        <a
          href="https://buymeacoffee.com/your_id"
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
            backgroundColor: '#FF813F',
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

      {/* 작성 글 확인 모달 */}
      {selectedPaperText !== null && (
        <div
          onClick={() => setSelectedPaperText(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 200,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              backgroundColor: '#fbf8f1',
              color: '#2a2a2a',
              width: '100%',
              maxWidth: '450px',
              padding: '30px 25px 25px 25px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              fontFamily: 'Courier New, monospace',
              lineHeight: '1.6'
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#888',
              borderBottom: '1px solid #ddd',
              paddingBottom: '8px',
              marginBottom: '15px'
            }}>
              📜 버려진 원고 내용
            </div>
            
            <p style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '300px',
              overflowY: 'auto',
              margin: 0,
              fontSize: '15px'
            }}>
              {selectedPaperText}
            </p>

            <button
              onClick={() => setSelectedPaperText(null)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '8px 0',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Courier New, monospace'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

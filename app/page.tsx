'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';

type SentimentType = 'positive' | 'negative' | 'neutral';

interface DiscardedPaper {
  id: number;
  text: string;
  x: number;
  y: number;
  rotate: number;
  sentiment: SentimentType;
}

interface FrameStyle {
  id: string;
  name: string;
  bgColor: string;
  bgPattern: string;
  textColor: string;
  subTextColor: string;
  borderColor: string;
  fontFamily: string;
}

const FRAME_STYLES: FrameStyle[] = [
  {
    id: 'grid-vintage',
    name: '📜 vintage ',
    bgColor: '#fbf8f1',
    bgPattern: 'radial-gradient(#e2d9cc 1px, transparent 1px)',
    textColor: '#2b2b2b',
    subTextColor: '#8c8275',
    borderColor: '#2b2b2b',
    fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
  },
  {
    id: 'dark-typewriter',
    name: '🖤 type letter',
    bgColor: '#1e1e1e',
    bgPattern: 'radial-gradient(#333333 1px, transparent 1px)',
    textColor: '#e0e0e0',
    subTextColor: '#777777',
    borderColor: '#444444',
    fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
  },
  {
    id: 'old-letter',
    name: '☕ old style',
    bgColor: '#f4ede2',
    bgPattern: 'linear-gradient(to right, #e2d7c5 1px, transparent 1px)',
    textColor: '#3c2a1e',
    subTextColor: '#9e8976',
    borderColor: '#3c2a1e',
    fontFamily: 'serif',
  },
  {
    id: 'pastel-pink',
    name: '🌸 mood',
    bgColor: '#fdf0f0',
    bgPattern: 'radial-gradient(#f4c7c7 1px, transparent 1px)',
    textColor: '#4a3535',
    subTextColor: '#a88282',
    borderColor: '#4a3535',
    fontFamily: 'sans-serif',
  },
];

const POSITIVE_WORDS = [
  '좋아', '좋은', '좋다', '기쁘', '행복', '감사', '고마', '사랑', '즐거운', '신나',
  '희망', '웃음', '설레', '최고', '완벽', '따뜻', '평화', '성공', '응원', '빛나'
];

const NEGATIVE_WORDS = [
  '싫어', '싫다', '짜증', '슬프', '힘들', '우울', '화나', '아프', '지쳐', '괴로',
  '포기', '최악', '눈물', '불안', '걱정', '절망', '상처', '외롭', '답답', '후회'
];

export default function TypewriterApp() {
  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaperText, setSelectedPaperText] = useState<string | null>(null);
  const [isHoveredBin, setIsHoveredBin] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);

  // 미리보기 모달 관련 상태
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binRef = useRef<HTMLDivElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    const savedText = localStorage.getItem('typewriter_text');
    if (savedText) setText(savedText);

    const savedPapers = localStorage.getItem('typewriter_papers');
    if (savedPapers) {
      try {
        setPapers(JSON.parse(savedPapers));
      } catch (e) {
        console.error('Failed to parse saved papers:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('typewriter_text', text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem('typewriter_papers', JSON.stringify(papers));
  }, [papers]);

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
    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('click', initAudio, { once: true });

    return () => {
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('click', initAudio);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text]);

  const analyzeSentiment = (inputText: string): SentimentType => {
    let posScore = 0;
    let negScore = 0;

    POSITIVE_WORDS.forEach((word) => {
      const matches = inputText.match(new RegExp(word, 'g'));
      if (matches) posScore += matches.length;
    });

    NEGATIVE_WORDS.forEach((word) => {
      const matches = inputText.match(new RegExp(word, 'g'));
      if (matches) negScore += matches.length;
    });

    if (posScore === negScore) return 'neutral';
    return posScore > negScore ? 'positive' : 'negative';
  };

  const getPaperImageSrc = (sentiment: SentimentType) => {
    switch (sentiment) {
      case 'positive':
        return '/paper_pos.png';
      case 'negative':
        return '/paper_neg.png';
      case 'neutral':
      default:
        return '/paper_neu.png';
    }
  };

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

  const downloadTxtFile = (content: string, filenamePrefix: string) => {
    if (!content.trim()) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTxt = () => {
    if (!text.trim()) {
      alert('저장할 내용을 입력해 주세요.');
      return;
    }
    downloadTxtFile(text, 'typewriter_note');
  };

  const handleOpenPreview = () => {
    if (!text.trim()) {
      alert('저장할 내용을 입력해 주세요.');
      return;
    }
    setIsPreviewOpen(true);
  };

  const handleRandomFrame = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * FRAME_STYLES.length);
    } while (nextIndex === currentFrameIndex && FRAME_STYLES.length > 1);
    setCurrentFrameIndex(nextIndex);
  };

  const handleRandomDiscardedFrame = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * FRAME_STYLES.length);
    } while (nextIndex === discardedFrameIndex && FRAME_STYLES.length > 1);
    setDiscardedFrameIndex(nextIndex);
  };

  const downloadImageFromRef = async (ref: React.RefObject<HTMLDivElement | null>, frameId: string, prefix: string) => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${prefix}_${frameId}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('이미지 생성에 실패했습니다.');
    }
  };

  const handleDownloadImage = () => {
    downloadImageFromRef(previewCardRef, FRAME_STYLES[currentFrameIndex].id, 'typewriter');
  };

  const handleDownloadDiscardedImage = () => {
    downloadImageFromRef(discardedPreviewCardRef, FRAME_STYLES[discardedFrameIndex].id, 'discarded_note');
  };

  const handleDiscard = () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
    const isLeft = Math.random() > 0.5;
    const newX = isLeft
      ? Math.floor(Math.random() * (windowWidth * 0.12)) + 10
      : Math.floor(Math.random() * (windowWidth * 0.12)) + (windowWidth * 0.65);

    const newY = Math.floor(Math.random() * 80) + 70;
    const sentiment = analyzeSentiment(text);
    const randomRotate = Math.floor(Math.random() * 360) - 180;

    const newPaper: DiscardedPaper = {
      id: Date.now(),
      text: text,
      x: newX,
      y: newY,
      rotate: randomRotate,
      sentiment: sentiment,
    };

    setPapers((prev) => [...prev, newPaper]);
    setText('');
  };

  const handlePermanentDelete = (id: number) => {
    playTrashSound();
    setPapers((prev) => prev.filter((p) => p.id !== id));
    if (selectedPaperText) setSelectedPaperText(null);
  };

  const startDrag = (clientX: number, clientY: number, id: number, paperX: number, paperY: number) => {
    setDraggingId(id);
    isDraggingRef.current = false;
    dragOffsetRef.current = {
      x: clientX - paperX,
      y: clientY - paperY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, paperX: number, paperY: number) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY, id, paperX, paperY);
  };

  const handleTouchStartDrag = (e: React.TouchEvent, id: number, paperX: number, paperY: number) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, id, paperX, paperY);
  };

  useEffect(() => {
    const processMove = (clientX: number, clientY: number) => {
      if (draggingId === null) return;
      isDraggingRef.current = true;

      const newX = clientX - dragOffsetRef.current.x;
      const newY = clientY - dragOffsetRef.current.y;

      setPapers((prev) =>
        prev.map((p) => (p.id === draggingId ? { ...p, x: newX, y: newY } : p))
      );

      if (binRef.current) {
        const binRect = binRef.current.getBoundingClientRect();
        const isOver =
          clientX >= binRect.left &&
          clientX <= binRect.right &&
          clientY >= binRect.top &&
          clientY <= binRect.bottom;

        setIsHoveredBin(isOver);
      }
    };

    const processEnd = (clientX: number, clientY: number) => {
      if (draggingId === null) return;

      if (binRef.current) {
        const binRect = binRef.current.getBoundingClientRect();
        const isOver =
          clientX >= binRect.left &&
          clientX <= binRect.right &&
          clientY >= binRect.top &&
          clientY <= binRect.bottom;

        if (isOver) {
          playTrashSound();
          setPapers((prev) => prev.filter((p) => p.id !== draggingId));
        } else if (isDraggingRef.current) {
          const angleShift = Math.floor(Math.random() * 30) - 15;
          setPapers((prev) =>
            prev.map((p) =>
              p.id === draggingId ? { ...p, rotate: p.rotate + angleShift } : p
            )
          );
        }
      }

      setDraggingId(null);
      setIsHoveredBin(false);
    };

    const handleMouseMove = (e: MouseEvent) => processMove(e.clientX, e.clientY);
    const handleMouseUp = (e: MouseEvent) => processEnd(e.clientX, e.clientY);

    const handleTouchMove = (e: TouchEvent) => {
      if (draggingId !== null) {
        e.preventDefault();
        const touch = e.touches[0];
        processMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (draggingId !== null) {
        const touch = e.changedTouches[0];
        processEnd(touch.clientX, touch.clientY);
      }
    };

    if (draggingId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingId]);

  const handlePaperClick = (paperText: string) => {
    if (!isDraggingRef.current) {
      setSelectedPaperText(paperText);
      setIsDiscardedPreviewOpen(true);
    }
  };

  const handleTouchStartSwipe = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMoveSwipe = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEndSwipe = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const swipeDistance = touchStartX.current - touchEndX.current;

    if (swipeDistance > 70 && currentPage === 'typewriter') {
      setCurrentPage('trash');
    }
    if (swipeDistance < -70 && currentPage === 'trash') {
      setCurrentPage('typewriter');
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const currentFrame = FRAME_STYLES[currentFrameIndex];
  const currentDiscardedFrame = FRAME_STYLES[discardedFrameIndex];

  return (
    <main
      onTouchStart={handleTouchStartSwipe}
      onTouchMove={handleTouchMoveSwipe}
      onTouchEnd={handleTouchEndSwipe}
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#121212',
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .typewriter-wrapper {
          width: 90%;
          max-width: 850px;
          aspect-ratio: 4 / 3.3;
        }
        .typewriter-textarea {
          font-size: 14px;
        }
        @media (max-width: 500px) {
          .typewriter-wrapper {
            width: 130vw !important;
            max-width: none !important;
          }
          .typewriter-textarea {
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* 좌/우 슬라이드 터치 영역 */}
      <div
        style={{
          display: 'flex',
          width: '200vw',
          height: '100%',
          transition: 'transform 0.5s ease-in-out',
          transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)',
        }}
      >
        {/* ================= 1. 타자기 화면 ================= */}
        <section
          style={{
            width: '100vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* 우측 상단/중단 페이지 이동 버튼 */}
          <button
            onClick={() => setCurrentPage('trash')}
            style={{
              position: 'absolute',
              right: '25px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#e0e0e0',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '10px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              zIndex: 50,
              fontSize: '13px',
              backdropFilter: 'blur(4px)',
            }}
          >
            버린 종이들 모아보기 ▶
          </button>

          {/* 우측 상단 쓰레기통 (크기 확대: 180px, zIndex: 10) */}
          <div
            ref={binRef}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '180px',
              zIndex: 10,
              transition: 'transform 0.2s ease',
              transform: isHoveredBin ? 'scale(1.15)' : 'scale(1)',
              pointerEvents: 'none',
            }}
          >
            <img src="/bin.png" alt="Trash Bin" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          {/* 화면 상 바닥에 버려진 종이들 */}
          {papers.map((paper) => (
            <img
              key={paper.id}
              src={getPaperImageSrc(paper.sentiment)}
              alt={`${paper.sentiment} Discarded Paper`}
              onMouseDown={(e) => handleMouseDown(e, paper.id, paper.x, paper.y)}
              onTouchStart={(e) => handleTouchStartDrag(e, paper.id, paper.x, paper.y)}
              onClick={() => handlePaperClick(paper.text)}
              style={{
                position: 'absolute',
                left: `${paper.x}px`,
                top: `${paper.y}px`,
                width: '110px',
                transform: `rotate(${paper.rotate}deg)`,
                zIndex: draggingId === paper.id ? 100 : 25,
                cursor: 'pointer',
                touchAction: 'none',
                transition: draggingId === paper.id ? 'none' : 'transform 0.1s ease',
              }}
            />
          ))}

          {/* 타자기 프레임 (zIndex: 40으로 상위 배치) */}
          <div className="typewriter-wrapper" style={{ position: 'relative', zIndex: 40 }}>
            <div
              style={{
                position: 'absolute',
                top: '18.5%',
                left: '36.8%',
                width: '26.4%',
                height: '14%',
                padding: '20px 2px 2px 2px',
                boxSizing: 'border-box',
                zIndex: 3,
              }}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="타자기를 치듯 글을 작성해보세요..."
                autoFocus
                className="typewriter-textarea"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  resize: 'none',
                  fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
                  lineHeight: '1.4',
                  color: '#1a1a1a',
                  textAlign: 'left',
                  padding: 0,
                  margin: 0,
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              />
            </div>

            <div
              style={{
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
                zIndex: 2,
              }}
            />
          </div>

          {/* 하단 중앙 버튼 그룹 */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '90%',
              maxWidth: '380px',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                onClick={handleSaveTxt}
                style={{
                  flex: 1,
                  padding: '12px 6px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
                  color: '#ffffff',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444444',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                💾 .txt
              </button>

              <button
                onClick={handleOpenPreview}
                style={{
                  flex: 1.2,
                  padding: '12px 6px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
                  color: '#ffffff',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444444',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                🖼️ 미리보기
              </button>

              <button
                onClick={handleDiscard}
                style={{
                  flex: 1,
                  padding: '12px 6px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
                  color: '#ffffff',
                  backgroundColor: '#d9534f',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                🗑️ 버리기
              </button>
            </div>

            <button
              onClick={() => setIsKakaoModalOpen(true)}
              style={{
                width: '100%',
                padding: '12px 8px',
                fontSize: '13px',
                fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
                color: '#ffffff',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444444',
                borderRadius: '10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              ☕ 개발자에게 커피 한 잔 사주기
            </button>
          </div>
        </section>

        {/* ================= 2. 버린 종이들 모아보기 공간 (우측 화면) ================= */}
        <section
          style={{
            width: '100vw',
            height: '100%',
            backgroundColor: '#181818',
            color: '#e0e0e0',
            padding: '40px 20px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setCurrentPage('typewriter')}
            style={{
              position: 'absolute',
              left: '20px',
              top: '20px',
              backgroundColor: 'transparent',
              color: '#aaa',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ◀ 타자기로 돌아가기
          </button>

          <header style={{ textAlign: 'center', marginTop: '30px', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '22px', letterSpacing: '2px', color: '#f0f0f0', margin: 0 }}>
              📜 버려진 종이 조각들
            </h2>
            <p style={{ fontSize: '12px', color: '#777', marginTop: '8px' }}>
              쓰레기통에 버린 종이는 나타나지 않습니다.
            </p>
          </header>

          <main
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px',
              paddingBottom: '60px',
            }}
          >
            {papers.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '60px 0' }}>
                버려진 종이가 없습니다.
              </div>
            ) : (
              papers.map((paper, index) => (
                <div
                  key={paper.id}
                  onClick={() => handlePaperClick(paper.text)}
                  style={{
                    backgroundColor: '#262626',
                    border: '1px solid #3d3d3d',
                    borderRadius: '8px',
                    padding: '16px',
                    height: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transform: `rotate(${index % 2 === 0 ? '-1deg' : '1deg'})`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#ddd',
                      margin: 0,
                      lineHeight: '1.5',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {paper.text}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      paddingTop: '8px',
                      borderTop: '1px solid #383838',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePermanentDelete(paper.id);
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#d9534f',
                        border: 'none',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️ 쓰레기통에 버리기
                    </button>
                  </div>
                </div>
              ))
            )}
          </main>
        </section>
      </div>

      {/* 🖼️ 작성 중인 글 미리보기 모달 */}
      {isPreviewOpen && (
        <div
          onClick={() => setIsPreviewOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 250,
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxHeight: '90vh',
              maxWidth: '420px',
              width: '100%',
            }}
          >
            <div
              ref={previewCardRef}
              style={{
                width: '100%',
                minHeight: '480px',
                backgroundColor: currentFrame.bgColor,
                backgroundImage: currentFrame.bgPattern,
                backgroundSize: '20px 20px',
                padding: '35px 30px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: currentFrame.fontFamily,
                color: currentFrame.textColor,
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                overflowY: 'auto',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: currentFrame.subTextColor,
                    borderBottom: `2px solid ${currentFrame.borderColor}`,
                    paddingBottom: '8px',
                    marginBottom: '25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    letterSpacing: '1px',
                  }}
                >
                  <span>VINTAGE TYPEWRITER</span>
                  <span>{new Date().toISOString().slice(0, 10)}</span>
                </div>

                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {text}
                </p>
              </div>

              <div
                style={{
                  marginTop: '40px',
                  paddingTop: '15px',
                  borderTop: `1px dashed ${currentFrame.subTextColor}`,
                  fontSize: '10px',
                  color: currentFrame.subTextColor,
                  textAlign: 'center',
                  letterSpacing: '2px',
                }}
              >
                {currentFrame.name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
              <button
                onClick={handleRandomFrame}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#333333',
                  color: '#ffffff',
                  border: '1px solid #555555',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                🎲 프레임 변경
              </button>
              <button
                onClick={handleDownloadImage}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                💾 이미지 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📜 버려진 종이 상세보기/미리보기 모달 */}
      {isDiscardedPreviewOpen && selectedPaperText && (
        <div
          onClick={() => setIsDiscardedPreviewOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 250,
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxHeight: '90vh',
              maxWidth: '420px',
              width: '100%',
            }}
          >
            <div
              ref={discardedPreviewCardRef}
              style={{
                width: '100%',
                minHeight: '480px',
                backgroundColor: currentDiscardedFrame.bgColor,
                backgroundImage: currentDiscardedFrame.bgPattern,
                backgroundSize: '20px 20px',
                padding: '35px 30px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: currentDiscardedFrame.fontFamily,
                color: currentDiscardedFrame.textColor,
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                overflowY: 'auto',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    color: currentDiscardedFrame.subTextColor,
                    borderBottom: `2px solid ${currentDiscardedFrame.borderColor}`,
                    paddingBottom: '8px',
                    marginBottom: '25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    letterSpacing: '1px',
                  }}
                >
                  <span>DISCARDED NOTE</span>
                  <span>{new Date().toISOString().slice(0, 10)}</span>
                </div>

                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {selectedPaperText}
                </p>
              </div>

              <div
                style={{
                  marginTop: '40px',
                  paddingTop: '15px',
                  borderTop: `1px dashed ${currentDiscardedFrame.subTextColor}`,
                  fontSize: '10px',
                  color: currentDiscardedFrame.subTextColor,
                  textAlign: 'center',
                  letterSpacing: '2px',
                }}
              >
                {currentDiscardedFrame.name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
              <button
                onClick={handleRandomDiscardedFrame}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#333333',
                  color: '#ffffff',
                  border: '1px solid #555555',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                🎲 프레임 변경
              </button>
              <button
                onClick={handleDownloadDiscardedImage}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                💾 이미지 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ☕ 후원 모달 (kakao_image.png 적용) */}
      {isKakaoModalOpen && (
        <div
          onClick={() => setIsKakaoModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#222222',
              padding: '24px',
              borderRadius: '16px',
              textAlign: 'center',
              color: '#ffffff',
              maxWidth: '320px',
              width: '85%',
              border: '1px solid #444444',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>☕ 마음 표현하기</h3>
            <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.4', marginBottom: '16px' }}>
              타자기 앱을 응원해 주셔서 감사합니다!
            </p>
            
            <div style={{ width: '100%', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden' }}>
              <img
                src="/kakao_image.png"
                alt="카카오 송금"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <button
              onClick={() => setIsKakaoModalOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#444444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
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

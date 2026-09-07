'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toPng } from 'html-to-image';

type SentimentType = 'positive' | 'negative' | 'neutral';

interface DiscardedPaper {
  id: number;
  created_at?: string;
  text: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
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
    id: 'monologue-3am',
    name: 'Monologue at 3 AM',
    bgColor: '#121318',
    bgPattern: 'radial-gradient(#2b2e3b 1px, transparent 1px)',
    textColor: '#e2e4ed',
    subTextColor: '#626880',
    borderColor: '#3a3e52',
    fontFamily: 'var(--font-mona), monospace',
  },
  {
    id: 'poetic-parchment',
    name: 'Poetic Parchment',
    bgColor: '#f7f4ed',
    bgPattern: 'linear-gradient(#e5dec9 1px, transparent 1px), linear-gradient(90deg, #e5dec9 1px, transparent 1px)',
    textColor: '#2c2825',
    subTextColor: '#8c8273',
    borderColor: '#4a4237',
    fontFamily: 'serif',
  },
  {
    id: 'faded-blueprint',
    name: 'Faded Blueprint',
    bgColor: '#1a2634',
    bgPattern: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
    textColor: '#b2c9e0',
    subTextColor: '#48688a',
    borderColor: '#375270',
    fontFamily: 'monospace',
  },
  {
    id: 'midnight-rain',
    name: 'Midnight Rain',
    bgColor: '#0f171e',
    bgPattern: 'linear-gradient(180deg, rgba(255,255,255,0.03) 50%, transparent 50%)',
    textColor: '#d0d7de',
    subTextColor: '#57606a',
    borderColor: '#30363d',
    fontFamily: 'serif',
  },
  {
    id: 'rose-dust-memory',
    name: 'Rose Dust Memory',
    bgColor: '#fbf0ef',
    bgPattern: 'radial-gradient(#e8c4c1 1.5px, transparent 1.5px)',
    textColor: '#422c2b',
    subTextColor: '#9e7370',
    borderColor: '#6e4947',
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
  const [mounted, setMounted] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [paperDateStr, setPaperDateStr] = useState('');

  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<DiscardedPaper | null>(null);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);

  // 미리보기 모달 관련 상태
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const typewriterSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Client Hydration 처리 및 초기 날짜 세팅
  useEffect(() => {
    setMounted(true);

    const today = new Date();
    setCurrentDateStr(today.toISOString().slice(0, 10));

    const formattedPaperDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
    setPaperDateStr(formattedPaperDate);
  }, []);

  // 1. Supabase에서 버려진 종이(is_picked: false) 데이터 가져오기 및 랜덤 배치 좌표 부여
  const fetchPapers = async () => {
    const { data, error } = await supabase
      .from('papers')
      .select('id, created_at, content, sentiment, is_picked')
      .eq('is_picked', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('글 가져오기 오류:', error);
    } else if (data) {
      // 바닥 영역 퍼센트(%) 기반 무작위 위치 및 회전각 생성
      const formattedPapers: DiscardedPaper[] = data.map((item) => {
        const randomX = Math.floor(Math.random() * 80) + 5; // 5% ~ 85%
        const randomY = Math.floor(Math.random() * 70) + 10; // 10% ~ 80%
        const randomRotate = Math.floor(Math.random() * 40) - 20; // -20deg ~ 20deg
        const randomScale = 0.85 + Math.random() * 0.3; // 0.85 ~ 1.15

        return {
          id: item.id,
          created_at: item.created_at,
          text: item.content,
          x: randomX,
          y: randomY,
          rotate: randomRotate,
          scale: randomScale,
          sentiment: (item.sentiment as SentimentType) || 'neutral',
        };
      });
      setPapers(formattedPapers);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchPapers();
    }
  }, [mounted]);

  // 공유 받은 URL 쿼리 파라미터 감지 (?paper=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedPaper = params.get('paper');
      if (sharedPaper) {
        setSelectedPaper({
          id: 0,
          text: sharedPaper,
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          sentiment: 'neutral',
        });
        setIsDiscardedPreviewOpen(true);
      }
    }
  }, []);

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
    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * FRAME_STYLES.length);
    } while (nextIndex === currentFrameIndex && FRAME_STYLES.length > 1);
    setCurrentFrameIndex(nextIndex);
  };

  const handleRandomDiscardedFrame = () => {
    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * FRAME_STYLES.length);
    } while (nextIndex === discardedFrameIndex && FRAME_STYLES.length > 1);
    setDiscardedFrameIndex(nextIndex);
  };

  const downloadImageFromRef = async (ref: React.RefObject<HTMLDivElement | null>, frameId: string, prefix: string) => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
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

  const handleCopyShareLink = (shareText: string) => {
    if (!shareText) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?paper=${encodeURIComponent(shareText)}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => alert('링크가 복사되었습니다! 친구에게 공유해보세요.'),
      () => alert('링크 복사에 실패했습니다.')
    );
  };

  // 2. 글 버리기 로직
  const handleDiscard = async () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    const sentiment = analyzeSentiment(text);

    const { error } = await supabase.from('papers').insert([
      {
        content: text,
        sentiment: sentiment,
        is_picked: false,
      },
    ]);

    if (error) {
      alert('버리기에 실패했습니다.');
      console.error(error);
    } else {
      alert('원고가 어둠 속으로 버려졌습니다.');
      setText('');
      fetchPapers();
    }
  };

  // 3. 쓰레기 줍기 기능 (Supabase Update: is_picked -> true)
  const handlePickUp = async (paperId: number) => {
    playTrashSound();
    const { error } = await supabase
      .from('papers')
      .update({ is_picked: true })
      .eq('id', paperId);

    if (error) {
      alert('주우는데 실패했습니다.');
      console.error('수거 오류:', error);
    } else {
      alert('타인의 버려진 마음을 주웠습니다.');
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      setSelectedPaper(null);
      setIsDiscardedPreviewOpen(false);
    }
  };

  const handlePaperClick = (paper: DiscardedPaper) => {
    setSelectedPaper(paper);
    setIsDiscardedPreviewOpen(true);
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

  if (!mounted) {
    return <main style={{ backgroundColor: '#121212', height: '100vh', width: '100vw' }} />;
  }

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
        @import url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/UnJaeum.woff');

        @font-face {
          font-family: 'UnJaeum';
          src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/UnJaeum.woff') format('woff');
          font-weight: normal;
          font-style: normal;
        }

        .typewriter-wrapper {
          width: 90%;
          max-width: 850px;
          aspect-ratio: 4 / 3.3;
        }
        .typewriter-textarea {
          font-family: 'UnJaeum', var(--font-mona), monospace;
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
          ref={typewriterSectionRef}
          style={{
            width: '100vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
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

          {/* 바닥 영역에 무작위 흩뿌려진 종이들 */}
          {papers.map((paper) => (
            <div
              key={paper.id}
              onClick={() => handlePaperClick(paper)}
              style={{
                position: 'absolute',
                left: `${paper.x}%`,
                top: `${paper.y}%`,
                width: '110px',
                transform: `rotate(${paper.rotate}deg) scale(${paper.scale})`,
                zIndex: 30,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, z-index 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `rotate(0deg) scale(1.15)`;
                e.currentTarget.style.zIndex = '60';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `rotate(${paper.rotate}deg) scale(${paper.scale})`;
                e.currentTarget.style.zIndex = '30';
              }}
            >
              <img
                src={getPaperImageSrc(paper.sentiment)}
                alt={`${paper.sentiment} Discarded Paper`}
                style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
              />
            </div>
          ))}

          {/* 타자기 이미지 및 입력 창 */}
          <div
            className="typewriter-wrapper"
            style={{
              position: 'relative',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
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
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {paperDateStr && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#555',
                    textAlign: 'center',
                    fontFamily: 'UnJaeum, sans-serif',
                    marginBottom: '4px',
                    letterSpacing: '1px',
                  }}
                  suppressHydrationWarning
                >
                  {paperDateStr}
                </div>
              )}

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

          {/* 하단 버튼 바 */}
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
                  fontFamily: 'var(--font-mona), monospace',
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
                  fontFamily: 'var(--font-mona), monospace',
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
                  fontFamily: 'var(--font-mona), monospace',
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
                fontFamily: 'var(--font-mona), monospace',
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
              수거된 종이는 나타나지 않습니다.
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
                  onClick={() => handlePaperClick(paper)}
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
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '8px',
                      borderTop: '1px solid #383838',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyShareLink(paper.text);
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#888',
                        border: 'none',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      🔗 공유
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePickUp(paper.id);
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#d9534f',
                        border: 'none',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      마음 줍기
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
                  <span>{currentFrame.name.toUpperCase()}</span>
                  <span suppressHydrationWarning>{currentDateStr}</span>
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

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', width: '100%' }}>
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
                  fontSize: '12px',
                }}
              >
                🎲 Frame
              </button>
              <button
                onClick={() => handleCopyShareLink(text)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2b3e50',
                  color: '#ffffff',
                  border: '1px solid #48688a',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🔗 Link Share
              </button>
              <button
                onClick={handleDownloadImage}
                style={{
                  flex: 1.2,
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                💾 Save PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📜 버려진 종이 상세보기 및 줍기(수거) 모달 */}
      {isDiscardedPreviewOpen && selectedPaper && (
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
                  <span>{currentDiscardedFrame.name.toUpperCase()}</span>
                  <span suppressHydrationWarning>
                    {selectedPaper.created_at
                      ? new Date(selectedPaper.created_at).toLocaleDateString('ko-KR')
                      : currentDateStr}
                  </span>
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
                  {selectedPaper.text}
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

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', width: '100%' }}>
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
                  fontSize: '12px',
                }}
              >
                🎲 Frame
              </button>
              <button
                onClick={() => handleCopyShareLink(selectedPaper.text)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2b3e50',
                  color: '#ffffff',
                  border: '1px solid #48688a',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🔗 Share
              </button>
              {selectedPaper.id !== 0 && (
                <button
                  onClick={() => handlePickUp(selectedPaper.id)}
                  style={{
                    flex: 1.2,
                    padding: '12px',
                    backgroundColor: '#d9534f',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  🧹 마음 줍기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ☕ 후원 모달 */}
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

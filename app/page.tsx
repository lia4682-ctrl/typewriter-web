'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  user_id?: string;
  picked_by?: string;
  is_picked?: boolean;
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

// 타자기 중앙 영역 좌표 제외 (타자기 및 하단 버튼과 겹침 방지)
const generateNonOverlappingPos = () => {
  let x = 0;
  let y = 0;
  let isOverlap = true;

  while (isOverlap) {
    x = Math.floor(Math.random() * 80) + 5; // 5% ~ 85%
    y = Math.floor(Math.random() * 80) + 5; // 5% ~ 85%

    // 타자기 및 하단 UI 영역 (x: 25~75%, y: 15~85%) 배제
    if (x > 22 && x < 78 && y > 15 && y < 88) {
      isOverlap = true;
    } else {
      isOverlap = false;
    }
  }

  return { x, y };
};

export default function TypewriterApp() {
  const [mounted, setMounted] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [paperDateStr, setPaperDateStr] = useState('');

  const [userId, setUserId] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [trashTab, setTrashTab] = useState<'others' | 'mine'>('others');
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [allPapers, setAllPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<DiscardedPaper | null>(null);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  // 드래그 상태 관리
  const [draggingPaperId, setDraggingPaperId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBinHovered, setIsBinHovered] = useState(false);

  const trashBinRef = useRef<HTMLDivElement | null>(null);
  const typewriterSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    setMounted(true);

    // 고유 익명 사용자 ID 부여 (localStorage)
    let storedUserId = localStorage.getItem('typewriter_user_id');
    if (!storedUserId) {
      storedUserId = 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('typewriter_user_id', storedUserId);
    }
    setUserId(storedUserId);

    const today = new Date();
    setCurrentDateStr(today.toISOString().slice(0, 10));

    const formattedPaperDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
    setPaperDateStr(formattedPaperDate);
  }, []);

  const fetchPapers = async () => {
    try {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('글 가져오기 오류:', error);
        return;
      }

      if (data) {
        const formattedPapers: DiscardedPaper[] = data.map((item) => {
          const { x, y } = generateNonOverlappingPos();
          const randomRotate = Math.floor(Math.random() * 40) - 20;
          const randomScale = 0.85 + Math.random() * 0.3;

          return {
            id: item.id,
            created_at: item.created_at,
            text: item.content || item.text || '',
            x,
            y,
            rotate: randomRotate,
            scale: randomScale,
            sentiment: (item.sentiment as SentimentType) || 'neutral',
            user_id: item.user_id,
            picked_by: item.picked_by,
            is_picked: item.is_picked,
          };
        });

        setAllPapers(formattedPapers);
        // 바닥에는 아직 아무도 줍지 않은 종이만 뿌림
        setPapers(formattedPapers.filter((p) => !p.is_picked));
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    }
  };

  useEffect(() => {
    if (mounted) fetchPapers();
  }, [mounted]);

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

  const handleDiscard = async () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    const sentiment = analyzeSentiment(text);

    const payload = {
      content: text,
      sentiment: sentiment,
      is_picked: false,
      user_id: userId,
    };

    const { error } = await supabase.from('papers').insert([payload]);

    if (error) {
      alert('버리기에 실패했습니다.');
      console.error(error);
    } else {
      alert('원고가 바닥으로 버려졌습니다.');
      setText('');
      fetchPapers();
    }
  };

  const handlePickUp = async (paperId: number) => {
    playTrashSound();
    const payload = {
      is_picked: true,
      picked_by: userId,
    };

    const { error } = await supabase
      .from('papers')
      .update(payload)
      .eq('id', paperId);

    if (error) {
      alert('주우는데 실패했습니다.');
      console.error('수거 오류:', error);
    } else {
      alert('타인의 버려진 마음을 주웠습니다!');
      setSelectedPaper(null);
      setIsDiscardedPreviewOpen(false);
      fetchPapers();
    }
  };

  // 드래그 시작
  const handleMouseDownPaper = (e: React.MouseEvent, paperId: number) => {
    e.stopPropagation();
    setDraggingPaperId(paperId);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPaperId) return;
    setDragPos({ x: e.clientX, y: e.clientY });

    if (trashBinRef.current) {
      const rect = trashBinRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setIsBinHovered(isInside);
    }
  };

  const handleMouseUp = async () => {
    if (draggingPaperId && isBinHovered) {
      await handlePickUp(draggingPaperId);
    }
    setDraggingPaperId(null);
    setIsBinHovered(false);
  };

  if (!mounted) {
    return <main style={{ backgroundColor: '#121212', height: '100vh', width: '100vw' }} />;
  }

  // 탭별 필터링
  const myPapers = allPapers.filter((p) => p.user_id === userId || p.picked_by === userId);
  const othersPapers = allPapers.filter((p) => p.user_id !== userId && p.picked_by !== userId && !p.is_picked);

  return (
    <main
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
          font-family: var(--font-mona), monospace;
          font-size: 14px;
        }
        @media (max-width: 500px) {
          .typewriter-wrapper {
            width: 130vw !important;
            max-width: none !important;
          }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          width: '200vw',
          height: '100%',
          transition: 'transform 0.5s ease-in-out',
          transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)',
        }}
      >
        {/* 1. 타자기 화면 */}
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
          {/* 우측 상단 쓰레기통 아이콘 (bin.png) 및 모아보기 버튼 */}
          <div
            style={{
              position: 'absolute',
              right: '25px',
              top: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 100,
            }}
          >
            <div
              ref={trashBinRef}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: isBinHovered ? 'rgba(217, 83, 79, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                border: isBinHovered ? '2px dashed #d9534f' : '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                transform: isBinHovered ? 'scale(1.15)' : 'scale(1)',
              }}
              title="쓰레기를 여기로 드래그해서 버리세요"
            >
              <img src="/bin.png" alt="Trash Bin" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>

            <button
              onClick={() => setCurrentPage('trash')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#e0e0e0',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '10px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '13px',
                backdropFilter: 'blur(4px)',
              }}
            >
              버린 종이들 모아보기 ▶
            </button>
          </div>

          {/* 바닥에 흩뿌려진 종이 조각들 */}
          {papers.map((paper) => {
            const isDragging = draggingPaperId === paper.id;
            return (
              <div
                key={paper.id}
                onMouseDown={(e) => handleMouseDownPaper(e, paper.id)}
                onClick={() => {
                  if (!isDragging) {
                    setSelectedPaper(paper);
                    setIsDiscardedPreviewOpen(true);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: isDragging ? `${dragPos.x - 40}px` : `${paper.x}%`,
                  top: isDragging ? `${dragPos.y - 40}px` : `${paper.y}%`,
                  width: '80px',
                  transform: isDragging
                    ? 'scale(1.2) rotate(0deg)'
                    : `rotate(${paper.rotate}deg) scale(${paper.scale})`,
                  zIndex: isDragging ? 200 : 30,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                  opacity: isDragging ? 0.8 : 1,
                }}
              >
                <img
                  src={getPaperImageSrc(paper.sentiment)}
                  alt="Discarded Paper"
                  style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
                />
              </div>
            );
          })}

          {/* 타자기 본체 */}
          <div className="typewriter-wrapper" style={{ position: 'relative', zIndex: 20, pointerEvents: 'none' }}>
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
                <div style={{ fontSize: '10px', color: '#555', textAlign: 'center', marginBottom: '4px', letterSpacing: '1px' }}>
                  {paperDateStr}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
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

          {/* 하단 버튼 영역 */}
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
                onClick={() => {
                  if (!text.trim()) return alert('내용이 없습니다.');
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `note_${Date.now()}.txt`;
                  a.click();
                }}
                style={{ flex: 1, padding: '12px 6px', fontSize: '13px', color: '#fff', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer' }}
              >
                💾 .txt
              </button>

              <button
                onClick={() => {
                  if (!text.trim()) return alert('내용이 없습니다.');
                  setIsPreviewOpen(true);
                }}
                style={{ flex: 1.2, padding: '12px 6px', fontSize: '13px', color: '#fff', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer' }}
              >
                🖼️ 미리보기
              </button>

              <button
                onClick={handleDiscard}
                style={{ flex: 1, padding: '12px 6px', fontSize: '13px', color: '#fff', backgroundColor: '#d9534f', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
              >
                🗑️ 버리기
              </button>
            </div>

            <button
              onClick={() => setIsKakaoModalOpen(true)}
              style={{ width: '100%', padding: '12px 8px', fontSize: '13px', color: '#fff', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer' }}
            >
              ☕ 개발자에게 커피 한 잔 사주기
            </button>
          </div>
        </section>

        {/* 2. 버린 종이 모아보기 페이지 */}
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
            style={{ position: 'absolute', left: '20px', top: '20px', backgroundColor: 'transparent', color: '#aaa', border: 'none', fontSize: '14px', cursor: 'pointer' }}
          >
            ◀ 타자기로 돌아가기
          </button>

          <header style={{ textAlign: 'center', marginTop: '30px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', letterSpacing: '2px', color: '#f0f0f0', margin: 0 }}>📜 버려진 종이 조각들</h2>

            <div style={{ display: 'inline-flex', gap: '8px', marginTop: '16px', backgroundColor: '#262626', padding: '4px', borderRadius: '20px' }}>
              <button
                onClick={() => setTrashTab('others')}
                style={{
                  padding: '6px 16px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  backgroundColor: trashTab === 'others' ? '#444' : 'transparent', color: trashTab === 'others' ? '#fff' : '#888',
                }}
              >
                🌊 타인의 마음 ({othersPapers.length})
              </button>
              <button
                onClick={() => setTrashTab('mine')}
                style={{
                  padding: '6px 16px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  backgroundColor: trashTab === 'mine' ? '#444' : 'transparent', color: trashTab === 'mine' ? '#fff' : '#888',
                }}
              >
                🕯️ 내가 흘린 & 주운 마음 ({myPapers.length})
              </button>
            </div>
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
            {(trashTab === 'others' ? othersPapers : myPapers).length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: '60px 0' }}>
                {trashTab === 'others' ? '타인의 버려진 종이가 없습니다.' : '내가 버리거나 주운 종이가 없습니다.'}
              </div>
            ) : (
              (trashTab === 'others' ? othersPapers : myPapers).map((paper, index) => {
                const isMine = paper.user_id === userId;
                const isPickedByMe = paper.picked_by === userId;

                return (
                  <div
                    key={paper.id}
                    onClick={() => {
                      setSelectedPaper(paper);
                      setIsDiscardedPreviewOpen(true);
                    }}
                    style={{
                      backgroundColor: '#262626',
                      border: `1px solid ${isMine ? '#d9534f' : isPickedByMe ? '#4a90e2' : '#3d3d3d'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      height: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transform: `rotate(${index % 2 === 0 ? '-1deg' : '1deg'})`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      position: 'relative',
                    }}
                  >
                    {isMine && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', backgroundColor: '#d9534f', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                        내 글
                      </span>
                    )}
                    {isPickedByMe && !isMine && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', backgroundColor: '#4a90e2', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                        주운 마음
                      </span>
                    )}

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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #383838' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {paper.created_at ? new Date(paper.created_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                      {!isMine && !isPickedByMe && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePickUp(paper.id);
                          }}
                          style={{ backgroundColor: 'transparent', color: '#d9534f', border: 'none', fontSize: '11px', cursor: 'pointer' }}
                        >
                          마음 줍기
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </main>
        </section>
      </div>

      {/* 미리보기 모달 */}
      {isPreviewOpen && (
        <div onClick={() => setIsPreviewOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 250, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <div ref={previewCardRef} style={{ backgroundColor: FRAME_STYLES[currentFrameIndex].bgColor, padding: '30px', color: FRAME_STYLES[currentFrameIndex].textColor, borderRadius: '8px', minHeight: '400px' }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{text}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px' }}>🎲 Frame 변경</button>
              <button onClick={() => setIsPreviewOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '6px' }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 종이 상세 모달 */}
      {isDiscardedPreviewOpen && selectedPaper && (
        <div onClick={() => setIsDiscardedPreviewOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 250, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <div ref={discardedPreviewCardRef} style={{ backgroundColor: FRAME_STYLES[discardedFrameIndex].bgColor, padding: '30px', color: FRAME_STYLES[discardedFrameIndex].textColor, borderRadius: '8px', minHeight: '400px' }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{selectedPaper.text}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setDiscardedFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px' }}>🎲 Frame 변경</button>
              {selectedPaper.user_id !== userId && selectedPaper.picked_by !== userId && (
                <button onClick={() => handlePickUp(selectedPaper.id)} style={{ flex: 1.2, padding: '10px', backgroundColor: '#d9534f', color: '#fff', border: 'none', borderRadius: '6px' }}>🧹 마음 줍기</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 후원 모달 */}
      {isKakaoModalOpen && (
        <div onClick={() => setIsKakaoModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#222', padding: '24px', borderRadius: '16px', textAlign: 'center', color: '#fff', maxWidth: '320px', border: '1px solid #444' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>☕ 개발자에게 커피 사주기</h3>
            <img src="/kakao_image.png" alt="카카오 송금" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />
            <button onClick={() => setIsKakaoModalOpen(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}>닫기</button>
          </div>
        </div>
      )}
    </main>
  );
}

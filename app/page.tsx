'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';

type SentimentType = 'positive' | 'negative' | 'neutral';

interface DiscardedPaper {
  id: string | number;
  text: string;
  x: number;
  y: number;
  rotate: number;
  sentiment: SentimentType;
  isPublic?: boolean; // 다른 사람이 볼 수 있는 쓰레기 여부
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
    name: '새벽 3시의 혼잣말',
    bgColor: '#121318',
    bgPattern: 'radial-gradient(#2b2e3b 1px, transparent 1px)',
    textColor: '#e2e4ed',
    subTextColor: '#626880',
    borderColor: '#3a3e52',
    fontFamily: 'var(--font-mona), monospace',
  },
  {
    id: 'poetic-parchment',
    name: '빛바랜 원고지',
    bgColor: '#f7f4ed',
    bgPattern: 'linear-gradient(#e5dec9 1px, transparent 1px), linear-gradient(90deg, #e5dec9 1px, transparent 1px)',
    textColor: '#2c2825',
    subTextColor: '#8c8273',
    borderColor: '#4a4237',
    fontFamily: 'serif',
  },
  {
    id: 'faded-blueprint',
    name: '심야의 청사진',
    bgColor: '#1a2634',
    bgPattern: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
    textColor: '#b2c9e0',
    subTextColor: '#48688a',
    borderColor: '#375270',
    fontFamily: 'monospace',
  },
  {
    id: 'midnight-rain',
    name: '자정의 빗소리',
    bgColor: '#0f171e',
    bgPattern: 'linear-gradient(180deg, rgba(255,255,255,0.03) 50%, transparent 50%)',
    textColor: '#d0d7de',
    subTextColor: '#57606a',
    borderColor: '#30363d',
    fontFamily: 'serif',
  },
  {
    id: 'rose-dust-memory',
    name: '장밋빛 추억',
    bgColor: '#fbf0ef',
    bgPattern: 'radial-gradient(#e8c4c1 1.5px, transparent 1.5px)',
    textColor: '#422c2b',
    subTextColor: '#9e7370',
    borderColor: '#6e4947',
    fontFamily: 'sans-serif',
  },
];

const POSITIVE_WORDS = ['좋아', '좋은', '좋다', '기쁘', '행복', '감사', '고마', '사랑', '즐거운', '신나', '희망', '웃음', '설레', '최고', '완벽', '따뜻', '평화', '성공', '응원', '빛나'];
const NEGATIVE_WORDS = ['싫어', '싫다', '짜증', '슬프', '힘들', '우울', '화나', '아프', '지쳐', '괴로', '포기', '최악', '눈물', '불안', '걱정', '절망', '상처', '외롭', '답답', '후회'];

export default function TypewriterApp() {
  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [publicPapers, setPublicPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaperText, setSelectedPaperText] = useState<string | null>(null);
  const [isHoveredBin, setIsHoveredBin] = useState(false);
  const [draggingId, setDraggingId] = useState<string | number | null>(null);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);

  // 미리보기 모달
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const typewriterSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binRef = useRef<HTMLDivElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMovedRef = useRef<boolean>(false);
  const draggingIdRef = useRef<string | number | null>(null);

  // URL 쿼리 파라미터 감지 (?paper=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedPaper = params.get('paper');
      if (sharedPaper) {
        setSelectedPaperText(sharedPaper);
        setIsDiscardedPreviewOpen(true);
      }
    }
  }, []);

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
      default:
        return '/paper_neu.png';
    }
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

  const handleCopyShareLink = (shareText: string) => {
    if (!shareText) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?paper=${encodeURIComponent(shareText)}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => alert('링크가 복사되었습니다! 타인에게 공유할 수 있습니다.'),
      () => alert('링크 복사에 실패했습니다.')
    );
  };

  // 타인의 쓰레기 내 목록으로 줍기 (웹앱용 확장 기능)
  const handlePickupPaper = (paper: DiscardedPaper) => {
    setPapers((prev) => [paper, ...prev]);
    alert('타인의 쓰레기를 내 보관함에 주웠습니다!');
  };

  const handleDiscard = () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    let sectionWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
    let sectionHeight = typeof window !== 'undefined' ? window.innerHeight : 600;

    if (typewriterSectionRef.current) {
      const rect = typewriterSectionRef.current.getBoundingClientRect();
      sectionWidth = rect.width;
      sectionHeight = rect.height;
    }

    const paperWidth = 110;
    const margin = 20;
    const isLeft = Math.random() > 0.5;

    let newX: number;
    if (isLeft) {
      const minX = margin;
      const maxX = Math.max(margin, sectionWidth * 0.25 - paperWidth);
      newX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    } else {
      const minX = Math.min(sectionWidth - paperWidth - margin, sectionWidth * 0.75);
      const maxX = sectionWidth - paperWidth - margin;
      newX = Math.floor(Math.random() * (Math.max(1, maxX - minX + 1))) + minX;
    }

    const maxY = Math.max(80, sectionHeight - 200);
    const newY = Math.floor(Math.random() * (maxY - 80 + 1)) + 80;

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

  const currentFrame = FRAME_STYLES[currentFrameIndex];
  const currentDiscardedFrame = FRAME_STYLES[discardedFrameIndex];

  return (
    <main style={{ position: 'relative', height: '100vh', width: '100vw', backgroundColor: '#121212', overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        .action-btn {
          padding: 12px 6px;
          font-size: 13px;
          font-family: inherit;
          color: #ffffff;
          background-color: #2a2a2a;
          border: 1px solid #444444;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          transition: background-color 0.2s;
        }
        .action-btn:hover {
          background-color: #3a3a3a;
        }
      `}</style>

      {/* 타자기 및 쓰레기통 화면 구성 */}
      <div style={{ display: 'flex', width: '200vw', height: '100%', transition: 'transform 0.5s ease-in-out', transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)' }}>
        <section ref={typewriterSectionRef} style={{ width: '100vw', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          
          <button onClick={() => setCurrentPage('trash')} style={{ position: 'absolute', right: '25px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#e0e0e0', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', zIndex: 50, fontSize: '13px' }}>
            버린 종이들 모아보기 ▶
          </button>

          {/* 타자기 및 인풋 레이어 생략 (기존 구조 동일) */}

          {/* 하단 버튼 그룹 */}
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '10px', width: '90%', maxWidth: '380px', zIndex: 50 }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => {}}>💾 .txt 저장</button>
              <button className="action-btn" style={{ flex: 1.2 }} onClick={() => setIsPreviewOpen(true)}>🖼️ 미리보기</button>
              <button className="action-btn" style={{ flex: 1, backgroundColor: '#d9534f', border: 'none' }} onClick={handleDiscard}>🗑️ 구겨서 버리기</button>
            </div>
            <button className="action-btn" style={{ width: '100%' }} onClick={() => setIsKakaoModalOpen(true)}>☕ 개발자에게 커피 한 잔 선물하기</button>
          </div>
        </section>

        {/* 버려진 종이들 공간 */}
        <section style={{ width: '100vw', height: '100%', backgroundColor: '#181818', color: '#e0e0e0', padding: '40px 20px', boxSizing: 'border-box', overflowY: 'auto' }}>
          <button onClick={() => setCurrentPage('typewriter')} style={{ backgroundColor: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}>◀ 타자기로 돌아가기</button>
          <header style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ fontSize: '22px', color: '#f0f0f0' }}>📜 버려진 원고 조각들</h2>
            <p style={{ fontSize: '12px', color: '#777' }}>다른 사람들이 버린 마음에 귀를 기울여보세요.</p>
          </header>
        </section>
      </div>

      {/* 🖼️ 작성 중인 글 미리보기 모달 */}
      {isPreviewOpen && (
        <div onClick={() => setIsPreviewOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 250, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <div ref={previewCardRef} style={{ minHeight: '480px', backgroundColor: currentFrame.bgColor, backgroundImage: currentFrame.bgPattern, padding: '35px 30px', color: currentFrame.textColor, borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: currentFrame.subTextColor, borderBottom: `2px solid ${currentFrame.borderColor}`, paddingBottom: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{currentFrame.name}</span>
                <span>{new Date().toISOString().slice(0, 10)}</span>
              </div>
              <p style={{ fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</p>
            </div>

            {/* 스타일 통일된 한국어 버튼 레이어 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', width: '100%' }}>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)}>
                🎲 프레임 변경
              </button>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => handleCopyShareLink(text)}>
                🔗 링크 공유
              </button>
              <button className="action-btn" style={{ flex: 1.2, backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold', border: 'none' }} onClick={() => downloadImageFromRef(previewCardRef, currentFrame.id, 'typewriter')}>
                💾 PNG 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

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
  user_id?: string; // 작성자 ID
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
];

const POSITIVE_WORDS = ['좋아', '좋은', '좋다', '기쁘', '행복', '감사', '고마', '사랑', '희망'];
const NEGATIVE_WORDS = ['싫어', '싫다', '짜증', '슬프', '힘들', '우울', '화나', '아프', '지쳐'];

export default function TypewriterApp() {
  const [mounted, setMounted] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [paperDateStr, setPaperDateStr] = useState('');

  // 사용자 세션 정보
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [trashTab, setTrashTab] = useState<'others' | 'mine'>('others'); // 탭 구분 (남의 마음 / 내 마음)
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<DiscardedPaper | null>(null);

  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const typewriterSectionRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  // 1. 익명 로그인 처리 및 세션 확인
  useEffect(() => {
    setMounted(true);

    const today = new Date();
    setCurrentDateStr(today.toISOString().slice(0, 10));
    setPaperDateStr(
      today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
    );

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        // 세션 없으면 자동으로 익명 로그인 진행
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.user) {
          setCurrentUser(data.user);
        }
      }
    };

    initAuth();
  }, []);

  // 2. 종이 불러오기 (user_id 포함)
  const fetchPapers = async () => {
    const { data, error } = await supabase
      .from('papers')
      .select('id, created_at, content, sentiment, is_picked, user_id')
      .eq('is_picked', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedPapers: DiscardedPaper[] = data.map((item) => ({
        id: item.id,
        created_at: item.created_at,
        text: item.content,
        x: Math.floor(Math.random() * 80) + 5,
        y: Math.floor(Math.random() * 70) + 10,
        rotate: Math.floor(Math.random() * 40) - 20,
        scale: 0.85 + Math.random() * 0.3,
        sentiment: (item.sentiment as SentimentType) || 'neutral',
        user_id: item.user_id,
      }));
      setPapers(formattedPapers);
    }
  };

  useEffect(() => {
    if (mounted) fetchPapers();
  }, [mounted]);

  // 감정 분석
  const analyzeSentiment = (inputText: string): SentimentType => {
    let posScore = 0, negScore = 0;
    POSITIVE_WORDS.forEach((w) => { if (inputText.includes(w)) posScore++; });
    NEGATIVE_WORDS.forEach((w) => { if (inputText.includes(w)) negScore++; });
    if (posScore === negScore) return 'neutral';
    return posScore > negScore ? 'positive' : 'negative';
  };

  // 3. 종이 버리기 (user_id 기록)
  const handleDiscard = async () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    const { error } = await supabase.from('papers').insert([
      {
        content: text,
        sentiment: analyzeSentiment(text),
        is_picked: false,
        user_id: currentUser?.id || null, // 내 익명/계정 ID 저장
      },
    ]);

    if (error) {
      alert('버리기에 실패했습니다.');
    } else {
      alert('원고가 어둠 속으로 버려졌습니다.');
      setText('');
      fetchPapers();
    }
  };

  // 4. 마음 줍기 (picked_by 기록)
  const handlePickUp = async (paperId: number) => {
    const { error } = await supabase
      .from('papers')
      .update({
        is_picked: true,
        picked_by: currentUser?.id || null, // 주운 사람 ID 기록
      })
      .eq('id', paperId);

    if (error) {
      alert('주우는데 실패했습니다.');
    } else {
      alert('타인의 버려진 마음을 주웠습니다.');
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      setSelectedPaper(null);
      setIsDiscardedPreviewOpen(false);
    }
  };

  const handleCopyShareLink = (shareText: string) => {
    if (!shareText) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?paper=${encodeURIComponent(shareText)}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert('링크가 복사되었습니다!'));
  };

  if (!mounted) return <main style={{ backgroundColor: '#121212', height: '100vh', width: '100vw' }} />;

  const currentFrame = FRAME_STYLES[currentFrameIndex];
  const currentDiscardedFrame = FRAME_STYLES[discardedFrameIndex];

  // 내 글과 남의 글 필터링
  const myPapers = papers.filter((p) => p.user_id && p.user_id === currentUser?.id);
  const othersPapers = papers.filter((p) => !p.user_id || p.user_id !== currentUser?.id);

  return (
    <main style={{ position: 'relative', height: '100vh', width: '100vw', backgroundColor: '#121212', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/UnJaeum.woff');
        .typewriter-wrapper { width: 90%; max-width: 850px; aspect-ratio: 4 / 3.3; }
        .typewriter-textarea { font-family: 'UnJaeum', monospace; font-size: 14px; }
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
        {/* SECTION 1: 타자기 */}
        <section style={{ width: '100vw', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={() => setCurrentPage('trash')}
            style={{
              position: 'absolute', right: '25px', top: '50%', transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#e0e0e0', border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '10px 16px', borderRadius: '20px', cursor: 'pointer', zIndex: 50, fontSize: '13px',
            }}
          >
            버린 종이들 모아보기 ▶
          </button>

          {/* 타자기 및 입력폼 */}
          <div className="typewriter-wrapper" style={{ position: 'relative', zIndex: 20 }}>
            <div style={{ position: 'absolute', top: '18.5%', left: '36.8%', width: '26.4%', height: '14%', padding: '20px 2px 2px 2px', zIndex: 3 }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="타자기를 치듯 글을 작성해보세요..."
                className="typewriter-textarea"
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', resize: 'none' }}
              />
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url("/typewriter-base.png")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', zIndex: 2 }} />
          </div>

          {/* 하단 버튼 바 */}
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 50 }}>
            <button onClick={handleDiscard} style={{ padding: '12px 20px', backgroundColor: '#d9534f', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
              🗑️ 버리기
            </button>
          </div>
        </section>

        {/* SECTION 2: 버린 종이 모아보기 (내 마음 vs 남의 마음 탭) */}
        <section style={{ width: '100vw', height: '100%', backgroundColor: '#181818', color: '#e0e0e0', padding: '40px 20px', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' }}>
          <button onClick={() => setCurrentPage('typewriter')} style={{ position: 'absolute', left: '20px', top: '20px', backgroundColor: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}>
            ◀ 타자기로 돌아가기
          </button>

          <header style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', color: '#f0f0f0', margin: 0 }}>📜 버려진 종이 조각들</h2>
            
            {/* 탭 전환 스위치 */}
            <div style={{ display: 'inline-flex', gap: '10px', marginTop: '16px', backgroundColor: '#262626', padding: '4px', borderRadius: '20px' }}>
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
                🕯️ 내가 흘린 마음 ({myPapers.length})
              </button>
            </div>
          </header>

          {/* 리스트 목록 */}
          <main style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', paddingBottom: '60px' }}>
            {(trashTab === 'others' ? othersPapers : myPapers).map((paper) => {
              const isMine = paper.user_id === currentUser?.id;
              return (
                <div
                  key={paper.id}
                  onClick={() => { setSelectedPaper(paper); setIsDiscardedPreviewOpen(true); }}
                  style={{
                    backgroundColor: '#262626', border: `1px solid ${isMine ? '#d9534f' : '#3d3d3d'}`,
                    borderRadius: '8px', padding: '16px', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', position: 'relative'
                  }}
                >
                  {isMine && (
                    <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', backgroundColor: '#d9534f', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                      내 글
                    </span>
                  )}
                  <p style={{ fontSize: '13px', color: '#ddd', margin: 0, lineHeight: '1.5', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                    {paper.text}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #383838' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleCopyShareLink(paper.text); }} style={{ backgroundColor: 'transparent', color: '#888', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
                      🔗 공유
                    </button>
                    {!isMine && (
                      <button onClick={(e) => { e.stopPropagation(); handlePickUp(paper.id); }} style={{ backgroundColor: 'transparent', color: '#d9534f', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
                        마음 줍기
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </main>
        </section>
      </div>
    </main>
  );
}

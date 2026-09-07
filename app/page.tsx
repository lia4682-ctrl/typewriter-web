'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

const FRAME_STYLES = [
  {
    id: 'monologue-3am',
    name: 'Monologue at 3 AM',
    bgColor: '#121318',
    textColor: '#e2e4ed',
  },
  {
    id: 'poetic-parchment',
    name: 'Poetic Parchment',
    bgColor: '#f7f4ed',
    textColor: '#2c2825',
  },
  {
    id: 'faded-blueprint',
    name: 'Faded Blueprint',
    bgColor: '#1a2634',
    textColor: '#b2c9e0',
  },
];

const POSITIVE_WORDS = ['좋아', '좋은', '좋다', '기쁘', '행복', '감사', '고마', '사랑', '즐거운', '신나', '희망'];
const NEGATIVE_WORDS = ['싫어', '싫다', '짜증', '슬프', '힘들', '우울', '화나', '아프', '지쳐', '괴로', '포기'];

const generateNonOverlappingPos = () => {
  let x = 0;
  let y = 0;
  let isOverlap = true;

  while (isOverlap) {
    x = Math.floor(Math.random() * 80) + 5;
    y = Math.floor(Math.random() * 80) + 5;

    if (x > 22 && x < 78 && y > 15 && y < 85) {
      isOverlap = true;
    } else {
      isOverlap = false;
    }
  }
  return { x, y };
};

export default function TypewriterApp() {
  const [mounted, setMounted] = useState(false);
  const [paperDateStr, setPaperDateStr] = useState('');
  const [userId, setUserId] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [trashTab, setTrashTab] = useState<'others' | 'mine'>('others');
  const [text, setText] = useState<string>('');
  
  const [allPapers, setAllPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<DiscardedPaper | null>(null);

  // 모달 상태
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  // 드래그앤드롭
  const [draggingPaper, setDraggingPaper] = useState<DiscardedPaper | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBinHovered, setIsBinHovered] = useState(false);

  const trashBinRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setMounted(true);

    // 식별용 로그인/사용자 ID 관리 (localStorage)
    let storedUserId = localStorage.getItem('typewriter_user_id');
    if (!storedUserId) {
      // 8자리 무작위 숫자로 고유 ID 생성 (예: 010-8472-1928 또는 사용자 고유 번호)
      const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
      storedUserId = `010-${randomNum.substring(0, 4)}-${randomNum.substring(4)}`;
      localStorage.setItem('typewriter_user_id', storedUserId);
    }
    setUserId(storedUserId);

    const today = new Date();
    setPaperDateStr(
      today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).toUpperCase()
    );
  }, []);

  // Supabase 데이터 불러오기 (안전한 쿼리 처리)
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
          return {
            id: item.id,
            created_at: item.created_at,
            text: item.content || item.text || '',
            x,
            y,
            rotate: Math.floor(Math.random() * 40) - 20,
            scale: 0.85 + Math.random() * 0.3,
            sentiment: (item.sentiment as SentimentType) || 'neutral',
            user_id: String(item.user_id || ''),
            picked_by: String(item.picked_by || ''),
            is_picked: Boolean(item.is_picked),
          };
        });

        setAllPapers(formattedPapers);
      }
    } catch (err) {
      console.error('Fetch 예외 발생:', err);
    }
  };

  useEffect(() => {
    if (mounted) fetchPapers();
  }, [mounted]);

  const analyzeSentiment = (inputText: string): SentimentType => {
    let posScore = 0;
    let negScore = 0;

    POSITIVE_WORDS.forEach((word) => {
      if (inputText.includes(word)) posScore++;
    });
    NEGATIVE_WORDS.forEach((word) => {
      if (inputText.includes(word)) negScore++;
    });

    if (posScore === negScore) return 'neutral';
    return posScore > negScore ? 'positive' : 'negative';
  };

  const getPaperImageSrc = (sentiment: SentimentType) => {
    switch (sentiment) {
      case 'positive': return '/paper_pos.png';
      case 'negative': return '/paper_neg.png';
      default: return '/paper_neu.png';
    }
  };

  // 1. 종이 버리기
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
        user_id: userId,
      },
    ]);

    if (error) {
      alert('버리기에 실패했습니다.');
      console.error(error);
    } else {
      setText('');
      fetchPapers();
    }
  };

  // 2. 마음 줍기
  const handlePickUp = async (paperId: number) => {
    const { error } = await supabase
      .from('papers')
      .update({
        is_picked: true,
        picked_by: userId,
      })
      .eq('id', paperId);

    if (error) {
      alert('주우는데 실패했습니다.');
      console.error(error);
    } else {
      setSelectedPaper(null);
      setIsDiscardedPreviewOpen(false);
      fetchPapers();
    }
  };

  // 3. 쓰레기통 드래그 앤 드롭으로 완전히 삭제
  const handleDeletePaper = async (paperId: number) => {
    const { error } = await supabase
      .from('papers')
      .delete()
      .eq('id', paperId);

    if (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    } else {
      fetchPapers();
    }
  };

  // 드래그 이벤트를 window 기준으로 추적
  const handleMouseDownPaper = (e: React.MouseEvent, paper: DiscardedPaper) => {
    e.stopPropagation();
    setDraggingPaper(paper);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPaper) return;
    setDragPos({ x: e.clientX, y: e.clientY });

    if (trashBinRef.current) {
      const rect = trashBinRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left - 15 &&
        e.clientX <= rect.right + 15 &&
        e.clientY >= rect.top - 15 &&
        e.clientY <= rect.bottom + 15;
      setIsBinHovered(isInside);
    }
  };

  const handleMouseUp = async () => {
    if (draggingPaper) {
      if (isBinHovered) {
        await handleDeletePaper(draggingPaper.id);
      }
      setDraggingPaper(null);
      setIsBinHovered(false);
    }
  };

  if (!mounted) {
    return <main style={{ backgroundColor: '#121212', height: '100vh', width: '100vw' }} />;
  }

  // 타자기 바닥: 내 종이 + 주운 종이만
  const myFloorPapers = allPapers.filter(
    (p) => p.user_id === userId || (p.is_picked && p.picked_by === userId)
  );

  // 모아보기 목록
  const othersPapers = allPapers.filter((p) => p.user_id !== userId && !p.is_picked);
  const myCollectedPapers = allPapers.filter((p) => p.user_id === userId || p.picked_by === userId);

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
      }}
    >
      <style>{`
        .typewriter-wrapper {
          width: 90%;
          max-width: 850px;
          aspect-ratio: 4 / 3.3;
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
        {/* 1. 메인 타자기 화면 */}
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
          {/* 상단 컨트롤 영역: ✏️ 연필 버튼, 날것의 쓰레기통 이미지, 모아보기 버튼 */}
          <div
            style={{
              position: 'absolute',
              right: '25px',
              top: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              zIndex: 100,
            }}
          >
            {/* ✏️ 로그인 정보/연필 버튼 */}
            <button
              onClick={() => setShowProfileModal(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                backdropFilter: 'blur(4px)',
              }}
              title="내 로그인 정보"
            >
              ✏️
            </button>

            {/* 날것의 bin.png 쓰레기통 */}
            <img
              ref={trashBinRef}
              src="/bin.png"
              alt="Trash Bin"
              style={{
                width: '46px',
                height: '46px',
                objectFit: 'contain',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, filter 0.2s ease',
                transform: isBinHovered ? 'scale(1.25)' : 'scale(1)',
                filter: isBinHovered ? 'drop-shadow(0 0 8px rgba(217, 83, 79, 0.8))' : 'none',
              }}
              title="드래그해서 여기 놓으면 완전히 삭제됩니다"
            />

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

          {/* 타자기 바닥 쓰레기들 (내 글 + 주운 글) */}
          {myFloorPapers.map((paper) => {
            const isDragging = draggingPaper?.id === paper.id;
            return (
              <div
                key={paper.id}
                onMouseDown={(e) => handleMouseDownPaper(e, paper)}
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
                  opacity: isDragging ? 0.85 : 1,
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
                <div style={{ fontSize: '10px', color: '#555', textAlign: 'center', marginBottom: '4px' }}>
                  {paperDateStr}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="타자기를 치듯 글을 작성해보세요..."
                autoFocus
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  resize: 'none',
                  lineHeight: '1.4',
                  color: '#1a1a1a',
                  fontSize: '14px',
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

          {/* 하단 버튼들 */}
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
            <h2 style={{ fontSize: '22px', color: '#f0f0f0', margin: 0 }}>📜 버려진 종이 조각들</h2>

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
                🕯️ 내가 흘린 & 주운 마음 ({myCollectedPapers.length})
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
            {(trashTab === 'others' ? othersPapers : myCollectedPapers).map((paper, index) => {
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
            })}
          </main>
        </section>
      </div>

      {/* ✏️ 연필 버튼 클릭 시 내 정보 팝업 모달 */}
      {showProfileModal && (
        <div onClick={() => setShowProfileModal(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>✏️ 내 로그인 정보</h3>
            <div style={{ backgroundColor: '#1e1e1e', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>현재 접속중인 계정 번호</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#4a90e2', letterSpacing: '1px' }}>
                {userId}
              </p>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 카카오 커피 지원 모달 */}
      {isKakaoModalOpen && (
        <div onClick={() => setIsKakaoModalOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <h3 style={{ margin: '0 0 12px 0' }}>☕ 개발자에게 커피 사주기</h3>
            <img src="/kakao_image.png" alt="카카오" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />
            <button onClick={() => setIsKakaoModalOpen(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}>닫기</button>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {isPreviewOpen && (
        <div onClick={() => setIsPreviewOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <div style={{ backgroundColor: FRAME_STYLES[currentFrameIndex].bgColor, padding: '30px', color: FRAME_STYLES[currentFrameIndex].textColor, borderRadius: '8px', minHeight: '350px' }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{text}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px' }}>🎲 Frame 변경</button>
              <button onClick={() => setIsPreviewOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '6px' }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 버린 종이 보기 모달 */}
      {isDiscardedPreviewOpen && selectedPaper && (
        <div onClick={() => setIsDiscardedPreviewOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <div style={{ backgroundColor: FRAME_STYLES[discardedFrameIndex].bgColor, padding: '30px', color: FRAME_STYLES[discardedFrameIndex].textColor, borderRadius: '8px', minHeight: '350px' }}>
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
    </main>
  );
}

const modalBgStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0,
  width: '100vw', height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 300,
  padding: '20px',
};

const modalCardStyle: React.CSSProperties = {
  backgroundColor: '#262626',
  padding: '24px',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '320px',
  textAlign: 'center',
  border: '1px solid #444',
  color: '#fff',
};

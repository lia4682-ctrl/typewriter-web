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
    id: 'midnight-monologue',
    name: '새벽의 독백',
    bgColor: '#0e1116',
    textColor: '#e8eaed',
    font: 'serif',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), inset 0 0 80px rgba(0, 0, 0, 0.5)',
  },
  {
    id: 'vintage-film',
    name: '빛바랜 필름',
    bgColor: '#f4efe6',
    textColor: '#2b2621',
    font: 'serif',
    border: '8px solid #f9f6f0',
    boxShadow: '0 10px 30px rgba(43, 38, 33, 0.15), inset 0 0 40px rgba(0,0,0,0.03)',
  },
  {
    id: 'deep-forest',
    name: '고요한 숲',
    bgColor: '#161c18',
    textColor: '#d4ded7',
    font: 'serif',
    border: '1px solid rgba(160, 180, 165, 0.15)',
    boxShadow: '0 20px 40px rgba(10, 15, 12, 0.7), inset 0 0 60px rgba(30, 45, 35, 0.3)',
  },
  {
    id: 'warm-paper',
    name: '기억의 방',
    bgColor: '#faf8f5',
    textColor: '#4a4238',
    font: 'sans-serif',
    border: '1px dashed #d1c7bd',
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.08)',
  },
  {
    id: 'seaside-fog',
    name: '흐린 바닷가',
    bgColor: '#1a2129',
    textColor: '#cbd5e1',
    font: 'sans-serif',
    border: '1px solid rgba(100, 120, 140, 0.2)',
    boxShadow: '0 20px 40px rgba(10, 15, 20, 0.8), inset 0 0 50px rgba(30, 45, 60, 0.2)',
  },
  {
    id: 'sunset-glow',
    name: '스미는 노을',
    bgColor: '#1f1618',
    textColor: '#f3d9d5',
    font: 'serif',
    border: '1px solid rgba(220, 150, 140, 0.2)',
    boxShadow: '0 20px 40px rgba(15, 10, 12, 0.8), inset 0 0 60px rgba(60, 30, 30, 0.3)',
  },
];

const POSITIVE_WORDS = ['좋아', '좋은', '좋다', '기쁘', '행복', '감사', '고마', '사랑', '즐거운', '신나', '희망'];
const NEGATIVE_WORDS = ['싫어', '싫다', '짜증', '슬프', '힘들', '우울', '화나', '아프', '지쳐', '괴로', '포기'];

const generateNonOverlappingPos = () => {
  let x = Math.floor(Math.random() * 75) + 10;
  let y = Math.floor(Math.random() * 75) + 10;
  return { x, y };
};

export default function TypewriterApp() {
  const [mounted, setMounted] = useState(false);
  const [paperDateStr, setPaperDateStr] = useState('');
  const [userId, setUserId] = useState<string>('');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');

  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [trashTab, setTrashTab] = useState<'others' | 'mine'>('others');
  const [text, setText] = useState<string>('');

  const [allPapers, setAllPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<DiscardedPaper | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const [draggingPaper, setDraggingPaper] = useState<DiscardedPaper | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBinHovered, setIsBinHovered] = useState(false);

  const trashBinRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setMounted(true);

    const storedUserId = localStorage.getItem('typewriter_user_id');
    if (!storedUserId) {
      setShowLoginModal(true);
    } else {
      setUserId(storedUserId);
    }

    const today = new Date();
    setPaperDateStr(
      today.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).toUpperCase()
    );

    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('id');
    if (sharedId) {
      fetchSharedPaper(Number(sharedId));
    }
  }, []);

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim() || !inputPassword.trim()) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUsername.trim())
        .single();

      if (existingUser) {
        if (existingUser.password === inputPassword.trim()) {
          localStorage.setItem('typewriter_user_id', existingUser.username);
          setUserId(existingUser.username);
          setShowLoginModal(false);
          alert('로그인되었습니다! 환영해요.');
          fetchPapers();
        } else {
          alert('비밀번호가 일치하지 않습니다.');
        }
      } else {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{ username: inputUsername.trim(), password: inputPassword.trim() }])
          .select()
          .single();

        if (insertError) {
          alert('회원가입 실패: ' + insertError.message);
          return;
        }

        if (newUser) {
          localStorage.setItem('typewriter_user_id', newUser.username);
          setUserId(newUser.username);
          setShowLoginModal(false);
          alert('새로운 계정으로 가입 및 로그인되었습니다!');
          fetchPapers();
        }
      }
    } catch (err) {
      console.error('로그인 처리 중 오류 발생:', err);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('typewriter_user_id');
    setUserId('');
    setShowProfileModal(false);
    setShowLoginModal(true);
  };

  const fetchSharedPaper = async (id: number) => {
    const { data, error } = await supabase.from('papers').select('*').eq('id', id).single();
    if (data && !error) {
      setSelectedPaper({
        id: Number(data.id),
        created_at: data.created_at,
        text: data.content || '',
        x: 50,
        y: 50,
        rotate: 0,
        scale: 1,
        sentiment: data.sentiment || 'neutral',
        user_id: data.user_id,
        picked_by: data.picked_by,
        is_picked: data.is_picked,
      });
      setIsDiscardedPreviewOpen(true);
    }
  };

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
        setAllPapers((prevPapers) => {
          return data.map((item) => {
            const idNum = Number(item.id);
            const existing = prevPapers.find((p) => p.id === idNum);
            if (existing) {
              return existing;
            }

            const { x, y } = generateNonOverlappingPos();
            return {
              id: idNum,
              created_at: item.created_at,
              text: item.content || '',
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
        });
      }
    } catch (err) {
      console.error('Fetch 예외 발생:', err);
    }
  };

  useEffect(() => {
    if (mounted && userId) fetchPapers();
  }, [mounted, userId]);

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

  const handleDiscard = async () => {
    if (!text.trim()) {
      alert('버릴 내용이 없습니다.');
      return;
    }

    const sentiment = analyzeSentiment(text);
    const tempId = Date.now();

    const newPaper: DiscardedPaper = {
      id: tempId,
      created_at: new Date().toISOString(),
      text: text,
      x: Math.floor(Math.random() * 75) + 10,
      y: Math.floor(Math.random() * 75) + 10,
      rotate: Math.floor(Math.random() * 40) - 20,
      scale: 0.85 + Math.random() * 0.3,
      sentiment: sentiment,
      user_id: userId,
      is_picked: false,
    };

    setAllPapers((prev) => [newPaper, ...prev]);
    setText('');

    const { data, error } = await supabase.from('papers').insert([
      {
        content: newPaper.text,
        sentiment: newPaper.sentiment,
        is_picked: false,
        user_id: String(userId),
      },
    ]).select();

    if (error) {
      alert('버리기에 실패했습니다: ' + error.message);
      setAllPapers((prev) => prev.filter((p) => p.id !== tempId));
    } else if (data && data[0]) {
      const realId = Number(data[0].id);
      setAllPapers((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, id: realId } : p))
      );
    }
  };

  const handlePickUp = async (paperId: number) => {
    setAllPapers((prev) =>
      prev.map((p) => (p.id === paperId ? { ...p, is_picked: true, picked_by: userId } : p))
    );
    setSelectedPaper(null);
    setIsDiscardedPreviewOpen(false);

    const { error } = await supabase
      .from('papers')
      .update({
        is_picked: true,
        picked_by: String(userId),
      })
      .eq('id', Number(paperId));

    if (error) {
      alert('주우는데 실패했습니다: ' + error.message);
    }
  };

  const handleDeletePaper = async (paperId: number) => {
    const targetId = Number(paperId);
    
    setAllPapers((prev) => prev.filter((p) => p.id !== targetId));
    setDraggingPaper(null);
    setIsDraggingActive(false);
    setIsBinHovered(false);

    const { error } = await supabase
      .from('papers')
      .delete()
      .eq('id', targetId);

    if (error) {
      alert('삭제에 실패했습니다: ' + error.message);
    }
  };

  const handleCopyShareLink = (paperId: number) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${paperId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('클립보드에 공유 링크가 복사되었습니다! 🔗');
    });
  };

  const handleMouseDownPaper = (e: React.MouseEvent, paper: DiscardedPaper) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    setDraggingPaper(paper);
    setIsDraggingActive(false);
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPaper) return;

    if (!isDraggingActive) {
      const dist = Math.hypot(e.clientX - dragPos.x, e.clientY - dragPos.y);
      if (dist > 3) {
        setIsDraggingActive(true);
      }
    }

    setDragPos({ x: e.clientX, y: e.clientY });

    if (trashBinRef.current) {
      const rect = trashBinRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left - 40 &&
        e.clientX <= rect.right + 40 &&
        e.clientY >= rect.top - 40 &&
        e.clientY <= rect.bottom + 40;
      setIsBinHovered(isInside);
    }
  };

  const handleMouseUp = async () => {
    if (draggingPaper) {
      if (isBinHovered) {
        await handleDeletePaper(draggingPaper.id);
      } else if (isDraggingActive) {
        const newPixelX = dragPos.x - dragOffset.x;
        const newPixelY = dragPos.y - dragOffset.y;
        const newX = Math.max(0, Math.min(92, (newPixelX / window.innerWidth) * 100));
        const newY = Math.max(0, Math.min(88, (newPixelY / window.innerHeight) * 100));

        setAllPapers((prev) =>
          prev.map((p) => (p.id === draggingPaper.id ? { ...p, x: newX, y: newY } : p))
        );
      }
      setDraggingPaper(null);
      setIsDraggingActive(false);
      setIsBinHovered(false);
    }
  };

  if (!mounted) {
    return <main style={{ backgroundColor: '#121212', height: '100vh', width: '100vw' }} />;
  }

  const myFloorPapers = allPapers.filter(
    (p) => p.user_id === userId || (p.is_picked && p.picked_by === userId)
  );

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

      {showLoginModal && (
        <div style={modalBgStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '360px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#fff' }}>🔑 로그인 / 회원가입</h3>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
              사용할 아이디와 비밀번호를 입력하세요.<br/>없는 아이디라면 자동으로 가입됩니다.
            </p>
            <form onSubmit={handleLoginOrRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="아이디"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #444', color: '#fff', outline: 'none' }}
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #444', color: '#fff', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ padding: '12px', backgroundColor: '#4a90e2', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
              >
                시작하기
              </button>
            </form>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          width: '200vw',
          height: '100%',
          transition: 'transform 0.5s ease-in-out',
          transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)',
        }}
      >
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
          <img
            src="/pencil.png"
            alt="Pencil"
            onClick={() => setShowProfileModal(true)}
            style={{
              position: 'absolute',
              left: '30px',
              top: '25px',
              width: '120px',
              height: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
              zIndex: 100,
              opacity: 0.85,
              transition: 'transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.85';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="내 계정 정보"
          />

          <img
            ref={trashBinRef}
            src="/bin.png"
            alt="Trash Bin"
            style={{
              position: 'absolute',
              right: '20px',
              top: '15px',
              width: '240px',
              height: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
              zIndex: 100,
              transition: 'transform 0.2s ease, filter 0.2s ease',
              transform: isBinHovered ? 'scale(1.1)' : 'scale(1)',
              filter: isBinHovered
                ? 'drop-shadow(0 0 24px rgba(255, 255, 255, 0.95)) brightness(1.2)'
                : 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))',
            }}
            title="드래그해서 여기 놓으면 완전히 삭제됩니다"
          />

          <button
            onClick={() => setCurrentPage('trash')}
            style={{
              position: 'absolute',
              right: '30px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#d0d0d0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '10px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          >
            버린 종이들 모아보기 ▶
          </button>

          {myFloorPapers.map((paper) => {
            const isDragging = draggingPaper?.id === paper.id && isDraggingActive;
            return (
              <div
                key={paper.id}
                onMouseDown={(e) => handleMouseDownPaper(e, paper)}
                onClick={() => {
                  if (!isDraggingActive) {
                    setSelectedPaper(paper);
                    setIsDiscardedPreviewOpen(true);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: isDragging ? `${dragPos.x - dragOffset.x}px` : `${paper.x}%`,
                  top: isDragging ? `${dragPos.y - dragOffset.y}px` : `${paper.y}%`,
                  width: '80px',
                  transform: isDragging
                    ? 'scale(1.15) rotate(0deg)'
                    : `rotate(${paper.rotate}deg) scale(${paper.scale})`,
                  zIndex: isDragging ? 200 : 30,
                  cursor: 'grab',
                  opacity: isDragging ? 0.85 : 1,
                  transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
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
                    border: isMine 
                      ? '1px solid #d9534f' 
                      : isPickedByMe 
                      ? '1px solid #4a90e2' 
                      : '1px solid #3d3d3d',
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
                  <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '10px', color: isMine ? '#d9534f' : isPickedByMe ? '#4a90e2' : '#777' }}>
                    {isMine ? '✍️ 내가 씀' : isPickedByMe ? '📦 내가 주움' : '🌊 타인의 조각'}
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: '#ddd',
                      margin: '12px 0 0 0',
                      lineHeight: '1.5',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
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

      {showProfileModal && (
        <div onClick={() => setShowProfileModal(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>✏️ 내 계정 정보</h3>
            <div style={{ backgroundColor: '#1e1e1e', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>현재 로그인된 아이디</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#4a90e2', letterSpacing: '1px' }}>
                {userId}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{ width: '100%', padding: '10px', backgroundColor: '#d9534f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '8px' }}
            >
              로그아웃
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              style={{ width: '100%', padding: '10px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {isKakaoModalOpen && (
        <div onClick={() => setIsKakaoModalOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <h3 style={{ margin: '0 0 12px 0' }}>☕ 개발자에게 커피 사주기</h3>
            <img src="/kakao_image.png" alt="카카오" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />
            <button onClick={() => setIsKakaoModalOpen(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}>닫기</button>
          </div>
        </div>
      )}

      {isPreviewOpen && (
        <div onClick={() => setIsPreviewOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%', padding: '0 20px' }}>
            <div 
              style={{ 
                backgroundColor: FRAME_STYLES[currentFrameIndex].bgColor, 
                color: FRAME_STYLES[currentFrameIndex].textColor, 
                fontFamily: FRAME_STYLES[currentFrameIndex].font,
                border: FRAME_STYLES[currentFrameIndex].border,
                boxShadow: FRAME_STYLES[currentFrameIndex].boxShadow,
                padding: '45px 35px', 
                borderRadius: '4px', 
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.4s ease',
              }}
            >
              <span style={{ position: 'absolute', top: '20px', left: '25px', fontSize: '10px', opacity: 0.4, letterSpacing: '2px' }}>
                {FRAME_STYLES[currentFrameIndex].name}
              </span>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.8', fontSize: '15px', fontWeight: 300 }}>
                {text}
              </p>
              <span style={{ position: 'absolute', bottom: '20px', right: '25px', fontSize: '10px', opacity: 0.3 }}>
                TYPEWRITER ARCHIVE
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🎲 무드 변경</button>
              <button onClick={() => setIsPreviewOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#fff', color: '#111', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>완료</button>
            </div>
          </div>
        </div>
      )}

      {isDiscardedPreviewOpen && selectedPaper && (
        <div onClick={() => setIsDiscardedPreviewOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%', padding: '0 20px' }}>
            <div 
              style={{ 
                backgroundColor: FRAME_STYLES[discardedFrameIndex].bgColor, 
                color: FRAME_STYLES[discardedFrameIndex].textColor, 
                fontFamily: FRAME_STYLES[discardedFrameIndex].font,
                border: FRAME_STYLES[discardedFrameIndex].border,
                boxShadow: FRAME_STYLES[discardedFrameIndex].boxShadow,
                padding: '45px 35px', 
                borderRadius: '4px', 
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.4s ease',
              }}
            >
              <span style={{ position: 'absolute', top: '20px', left: '25px', fontSize: '10px', opacity: 0.4, letterSpacing: '2px' }}>
                {FRAME_STYLES[discardedFrameIndex].name}
              </span>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.8', fontSize: '15px', fontWeight: 300 }}>
                {selectedPaper.text}
              </p>
              <span style={{ position: 'absolute', bottom: '20px', right: '25px', fontSize: '10px', opacity: 0.3 }}>
                TYPEWRITER ARCHIVE
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setDiscardedFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🎲 무드 변경</button>
              <button onClick={() => handleCopyShareLink(selectedPaper.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#2a52be', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🔗 공유 링크</button>
              {selectedPaper.user_id !== userId && selectedPaper.picked_by !== userId && (
                <button onClick={() => handlePickUp(selectedPaper.id)} style={{ flex: 1.2, padding: '12px', backgroundColor: '#d9534f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🧹 줍기</button>
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

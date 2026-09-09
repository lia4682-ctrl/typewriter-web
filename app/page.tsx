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
    bgColor: '#0f0f11',
    textColor: '#e1e1e6',
    font: 'serif',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
  },
  {
    id: 'vintage-film',
    name: '빛바랜 필름',
    bgColor: '#f2eee3',
    textColor: '#292522',
    font: 'serif',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
  },
  {
    id: 'deep-forest',
    name: '고요한 숲',
    bgColor: '#141816',
    textColor: '#cfe2d4',
    font: 'serif',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
  },
  {
    id: 'warm-paper',
    name: '기억의 방',
    bgColor: '#f7f5f0',
    textColor: '#423c35',
    font: 'sans-serif',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
  },
  {
    id: 'modern-cinema',
    name: '모던 시네마',
    bgColor: '#08080a',
    textColor: '#f4f4f5',
    font: 'sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.95)',
  },
  {
    id: 'film-noir',
    name: '필름 누아르',
    bgColor: '#111113',
    textColor: '#b3b3b8',
    font: 'monospace',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
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
  const [userId, setUserId] = useState<string>('');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');

  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [trashTab, setTrashTab] = useState<'others' | 'mine'>('others');
  const [text, setText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [allPapers, setAllPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<DiscardedPaper | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const [draggingPaper, setDraggingPaper] = useState<DiscardedPaper | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isBinHovered, setIsBinHovered] = useState(false);

  const trashBinRef = useRef<HTMLImageElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const storedUserId = localStorage.getItem('typewriter_user_id');
    if (!storedUserId) {
      setShowLoginModal(true);
    } else {
      setUserId(storedUserId);
    }

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

  const handleGenerateAIContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (response.status === 429) {
        const errorMessage = await response.text();
        alert(errorMessage || '오늘의 무료 AI 사용량을 모두 소모했습니다. 내일 다시 이용해주세요.');
        setIsGenerating(false);
        return;
      }

      if (!response.ok || !response.body) {
        alert('AI 문장을 불러오는데 실패했습니다.');
        setIsGenerating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      setText((prev) => (prev ? prev + (prev.endsWith('\n') ? '' : ' ') : ''));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setText((prev) => prev + chunk);
      }
    } catch (err) {
      console.error('AI 생성 중 오류:', err);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
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
    setIsBinHovered(false);
    setSelectedPaper(null);
    setIsDiscardedPreviewOpen(false);

    const { error } = await supabase
      .from('papers')
      .delete()
      .eq('id', targetId);

    if (error) {
      alert('삭제에 실패했습니다: ' + error.message);
      fetchPapers();
    }
  };

  const handleCopyShareLink = (paperId: number) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${paperId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('클립보드에 공유 링크가 복사되었습니다! 🔗');
    });
  };

  const handleSaveFrameAsImage = async (cardRef: React.RefObject<HTMLDivElement | null>, frameName: string) => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = image;
      a.download = `typewriter_${frameName}_${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error('이미지 저장 실패:', err);
      alert('이미지 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDragStart = (clientX: number, clientY: number, target: HTMLElement, paper: DiscardedPaper) => {
    const rect = target.getBoundingClientRect();
    setDraggingPaper(paper);
    setDragPos({ x: clientX, y: clientY });
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!draggingPaper) return;

    setDragPos({ x: clientX, y: clientY });

    if (trashBinRef.current) {
      const rect = trashBinRef.current.getBoundingClientRect();
      const isInside =
        clientX >= rect.left - 50 &&
        clientX <= rect.right + 50 &&
        clientY >= rect.top - 50 &&
        clientY <= rect.bottom + 50;
      setIsBinHovered(isInside);
    }
  };

  const handleDragEnd = async () => {
    if (draggingPaper) {
      if (isBinHovered) {
        await handleDeletePaper(draggingPaper.id);
      } else {
        const newPixelX = dragPos.x - dragOffset.x;
        const newPixelY = dragPos.y - dragOffset.y;
        const newX = Math.max(0, Math.min(92, (newPixelX / window.innerWidth) * 100));
        const newY = Math.max(0, Math.min(88, (newPixelY / window.innerHeight) * 100));

        setAllPapers((prev) =>
          prev.map((p) => (p.id === draggingPaper.id ? { ...p, x: newX, y: newY } : p))
        );
      }
      setDraggingPaper(null);
      setIsBinHovered(false);
    }
  };

  if (!mounted) {
    return <main style={{ backgroundColor: '#0a0a0c', height: '100dvh', width: '100vw' }} />;
  }

  const myFloorPapers = allPapers.filter(
    (p) => p.user_id === userId || (p.is_picked && p.picked_by === userId)
  );

  const othersPapers = allPapers.filter((p) => p.user_id !== userId && !p.is_picked);
  const myCollectedPapers = allPapers.filter((p) => p.user_id === userId || p.picked_by === userId);

  return (
    <main
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={handleDragEnd}
      onTouchMove={(e) => {
        if (e.touches.length > 0) {
          handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handleDragEnd}
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100vw',
        backgroundColor: '#0a0a0c', // Cognity 레퍼런스 스타일의 깊이감 있는 매트 블랙
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <style>{`
        .typewriter-screen {
          width: 100vw;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          box-sizing: border-box;
        }
        .typewriter-container {
          width: 90%;
          max-width: 680px;
          aspect-ratio: 16 / 12;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 80px;
        }
        .typewriter-input-wrapper {
          position: absolute;
          top: 18%;
          left: 33%;
          width: 34%;
          height: 15%;
          padding: 8px;
          box-sizing: border-box;
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .typewriter-container {
            width: 95%;
            max-width: 460px;
            margin-bottom: 90px;
          }
          .typewriter-input-wrapper {
            top: 25%;
            left: 27%;
            width: 46%;
            height: 14%;
          }
        }
      `}</style>

      {showLoginModal && (
        <div style={modalBgStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '340px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 500, color: '#f5f5f7' }}>Welcome</h3>
            <p style={{ fontSize: '12px', color: '#86868b', marginBottom: '20px' }}>
              아이디와 비밀번호를 입력해 시작하세요.
            </p>
            <form onSubmit={handleLoginOrRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="아이디"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                style={inputStyle}
              />
              <button
                type="submit"
                style={primaryBtnStyle}
              >
                입장하기
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
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)',
        }}
      >
        <section className="typewriter-screen">
          <img
            src="/pencil.png"
            alt="Pencil"
            onClick={() => setShowProfileModal(true)}
            style={{
              position: 'absolute',
              left: '28px',
              top: '28px',
              width: '120px',
              height: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
              zIndex: 100,
              opacity: 0.8,
              transition: 'opacity 0.2s ease, transform 0.2s ease',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            }}
            title="내 계정 정보"
          />

          <img
            ref={trashBinRef}
            src="/bin.png"
            alt="Trash Bin"
            style={{
              position: 'absolute',
              right: '28px',
              top: '28px',
              width: '100px',
              height: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
              zIndex: 100,
              transition: 'transform 0.2s ease, filter 0.2s ease',
              transform: isBinHovered ? 'scale(1.15)' : 'scale(1)',
              filter: isBinHovered
                ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.4)) brightness(1.1)'
                : 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            }}
            title="드래그해서 여기 놓으면 완전히 삭제됩니다"
          />

          <button
            onClick={() => setCurrentPage('trash')}
            style={{
              position: 'absolute',
              right: '28px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#161618',
              color: '#d1d1d6',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '10px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              letterSpacing: '-0.2px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            버린 종이들 모아보기 ↗
          </button>

          {myFloorPapers.map((paper) => {
            const isDragging = draggingPaper?.id === paper.id;
            return (
              <div
                key={paper.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleDragStart(e.clientX, e.clientY, e.currentTarget, paper);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches.length > 0) {
                    handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget, paper);
                  }
                }}
                onClick={() => {
                  if (!isDragging) {
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
                    ? 'scale(1.1) rotate(0deg)'
                    : `rotate(${paper.rotate}deg) scale(${paper.scale})`,
                  zIndex: isDragging ? 200 : 30,
                  cursor: 'grab',
                  opacity: isDragging ? 0.8 : 1,
                  transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
                  touchAction: 'none',
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

          <div className="typewriter-container">
            <div className="typewriter-input-wrapper">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="조용히 생각을 적어보세요..."
                autoFocus
                disabled={isGenerating}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  resize: 'none',
                  textAlign: 'center',
                  lineHeight: '1.5',
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
              bottom: '36px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 100,
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
                style={secondaryBtnStyle}
              >
                💾 .txt 저장
              </button>

              <button
                onClick={() => {
                  if (!text.trim()) return alert('내용이 없습니다.');
                  setIsPreviewOpen(true);
                }}
                style={secondaryBtnStyle}
              >
                🎨 카드 꾸미기
              </button>

              <button
                onClick={handleDiscard}
                style={dangerBtnStyle}
              >
                🗑️ 버리기
              </button>
            </div>

            <button
              onClick={handleGenerateAIContent}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '13px 8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#0a0a0c',
                backgroundColor: '#f5f5f7',
                border: 'none',
                borderRadius: '10px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                transition: 'opacity 0.2s ease',
                opacity: isGenerating ? 0.6 : 1,
              }}
            >
              {isGenerating ? '영감을 불러오는 중...' : '✨ 영감 불러오기'}
            </button>
          </div>
        </section>

        <section
          style={{
            width: '100vw',
            height: '100dvh',
            backgroundColor: '#0a0a0c',
            color: '#f5f5f7',
            padding: '40px 20px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setCurrentPage('typewriter')}
            style={{ position: 'absolute', left: '24px', top: '24px', backgroundColor: 'transparent', color: '#86868b', border: 'none', fontSize: '13px', cursor: 'pointer' }}
          >
            ◀ 타자기로 돌아가기
          </button>

          <header style={{ textAlign: 'center', marginTop: '30px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', margin: '0 0 12px 0', letterSpacing: '-0.3px' }}>버려진 조각들</h2>

            <div style={{ display: 'inline-flex', gap: '4px', backgroundColor: '#161618', padding: '4px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setTrashTab('others')}
                style={{
                  padding: '6px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  backgroundColor: trashTab === 'others' ? '#2c2c2e' : 'transparent', color: trashTab === 'others' ? '#fff' : '#86868b',
                  transition: 'background 0.2s',
                }}
              >
                타인의 마음 ({othersPapers.length})
              </button>
              <button
                onClick={() => setTrashTab('mine')}
                style={{
                  padding: '6px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  backgroundColor: trashTab === 'mine' ? '#2c2c2e' : 'transparent', color: trashTab === 'mine' ? '#fff' : '#86868b',
                  transition: 'background 0.2s',
                }}
              >
                내가 흘린 & 주운 마음 ({myCollectedPapers.length})
              </button>
            </div>
          </header>

          <main
            style={{
              maxWidth: '840px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
              paddingBottom: '60px',
            }}
          >
            {(trashTab === 'others' ? othersPapers : myCollectedPapers).map((paper) => {
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
                    backgroundColor: '#161618',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '20px',
                    height: '170px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    position: 'relative',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '11px', color: '#86868b' }}>
                    {isMine ? '내가 씀' : isPickedByMe ? '내가 주움' : '타인의 조각'}
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: '#d1d1d6',
                      margin: '16px 0 0 0',
                      lineHeight: '1.5',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {paper.text}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '11px', color: '#636366' }}>
                      {paper.created_at ? new Date(paper.created_at).toLocaleDateString('ko-KR') : ''}
                    </span>
                    {!isMine && !isPickedByMe && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickUp(paper.id);
                        }}
                        style={{ backgroundColor: 'transparent', color: '#f5f5f7', border: 'none', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: '#f5f5f7' }}>계정 정보</h3>
            <div style={{ backgroundColor: '#161618', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#86868b' }}>현재 계정</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#f5f5f7' }}>
                {userId}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{ width: '100%', padding: '11px', backgroundColor: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '8px' }}
            >
              로그아웃
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              style={{ width: '100%', padding: '11px', backgroundColor: '#222225', color: '#d1d1d6', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {isPreviewOpen && (
        <div onClick={() => setIsPreviewOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              ref={previewCardRef}
              style={{ 
                width: '100%',
                backgroundColor: FRAME_STYLES[currentFrameIndex].bgColor, 
                color: FRAME_STYLES[currentFrameIndex].textColor, 
                fontFamily: FRAME_STYLES[currentFrameIndex].font,
                border: FRAME_STYLES[currentFrameIndex].border,
                boxShadow: FRAME_STYLES[currentFrameIndex].boxShadow,
                padding: '48px 36px', 
                borderRadius: '8px', 
                minHeight: '360px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ position: 'absolute', top: '24px', left: '28px', fontSize: '10px', opacity: 0.4, letterSpacing: '1px' }}>
                {FRAME_STYLES[currentFrameIndex].name}
              </span>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.7', fontSize: '15px', fontWeight: 400, textAlign: 'center' }}>
                {text}
              </p>
              <span style={{ position: 'absolute', bottom: '24px', right: '28px', fontSize: '10px', opacity: 0.3, letterSpacing: '0.5px' }}>
                TYPEWRITER
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%' }}>
              <button onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={modalControlBtnStyle}>🎲 무드 변경</button>
              <button onClick={() => handleSaveFrameAsImage(previewCardRef, FRAME_STYLES[currentFrameIndex].id)} style={modalControlBtnStyle}>💾 저장</button>
              <button onClick={() => setIsPreviewOpen(false)} style={modalControlBtnStyle}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {isDiscardedPreviewOpen && selectedPaper && (
        <div onClick={() => setIsDiscardedPreviewOpen(false)} style={modalBgStyle}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              ref={discardedPreviewCardRef}
              style={{ 
                width: '100%',
                backgroundColor: FRAME_STYLES[discardedFrameIndex].bgColor, 
                color: FRAME_STYLES[discardedFrameIndex].textColor, 
                fontFamily: FRAME_STYLES[discardedFrameIndex].font,
                border: FRAME_STYLES[discardedFrameIndex].border,
                boxShadow: FRAME_STYLES[discardedFrameIndex].boxShadow,
                padding: '48px 36px', 
                borderRadius: '8px', 
                minHeight: '360px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ position: 'absolute', top: '24px', left: '28px', fontSize: '10px', opacity: 0.4, letterSpacing: '1px' }}>
                {FRAME_STYLES[discardedFrameIndex].name}
              </span>
              <p style={{ whiteSpace: 'pre-wrap', margin: '0', lineHeight: '1.7', fontSize: '15px', fontWeight: '400', textAlign: 'center' }}>
                {selectedPaper.text}
              </p>
              <span style={{ position: 'absolute', bottom: '24px', right: '28px', fontSize: '10px', opacity: 0.3, letterSpacing: '0.5px' }}>
                TYPEWRITER
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%', flexWrap: 'wrap' }}>
              <button onClick={() => setDiscardedFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={modalControlBtnStyle}>🎲 무드 변경</button>
              <button onClick={() => handleSaveFrameAsImage(discardedPreviewCardRef, FRAME_STYLES[discardedFrameIndex].id)} style={modalControlBtnStyle}>💾 저장</button>
              <button onClick={() => handleCopyShareLink(selectedPaper.id)} style={modalControlBtnStyle}>🔗 공유</button>
              {selectedPaper.user_id !== userId && selectedPaper.picked_by !== userId && (
                <button onClick={() => handlePickUp(selectedPaper.id)} style={{ flex: 1.2, padding: '11px', backgroundColor: '#f5f5f7', color: '#0a0a0c', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>🧹 줍기</button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// 스타일 객체 리팩토링 (AI틱한 형광색이나 과한 그림자 배제, 미니멀 뉴트럴 스타일 적용)
const modalBgStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0,
  width: '100vw', height: '100dvh',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(6px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 300,
  padding: '20px',
};

const modalCardStyle: React.CSSProperties = {
  backgroundColor: '#161618',
  padding: '28px',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '320px',
  textAlign: 'center',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#f5f5f7',
  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
};

const inputStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '10px',
  backgroundColor: '#0a0a0c',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#f5f5f7',
  outline: 'none',
  fontSize: '13px',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: '#f5f5f7',
  color: '#0a0a0c',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 500,
  cursor: 'pointer',
  marginTop: '4px',
  fontSize: '13px',
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 6px',
  fontSize: '13px',
  color: '#d1d1d6',
  backgroundColor: '#161618',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const dangerBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 6px',
  fontSize: '13px',
  color: '#ff453a',
  backgroundColor: 'rgba(255, 69, 58, 0.08)',
  border: '1px solid rgba(255, 69, 58, 0.15)',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const modalControlBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '11px',
  backgroundColor: '#161618',
  color: '#d1d1d6',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
};

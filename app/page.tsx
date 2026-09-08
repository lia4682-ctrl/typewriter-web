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
  {
    id: 'modern-cinema',
    name: '모던 시네마',
    bgColor: '#080808',
    textColor: '#f5f5f7',
    font: 'sans-serif',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
  },
  {
    id: 'diary-note',
    name: '다이어리 노트',
    bgColor: '#fffff8',
    textColor: '#333333',
    font: 'sans-serif',
    border: '2px solid #e2ded0',
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  {
    id: 'film-noir',
    name: '필름 누아르',
    bgColor: '#121212',
    textColor: '#cccccc',
    font: 'monospace',
    border: '2px double #444444',
    boxShadow: '0 15px 35px rgba(0,0,0,0.8)',
  },
  {
    id: 'vintage-postcard',
    name: '빈티지 엽서',
    bgColor: '#f0ece1',
    textColor: '#524534',
    font: 'serif',
    border: '6px solid #e4dccc',
    boxShadow: '0 10px 25px rgba(82,69,52,0.12)',
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

  // --- Gemini AI 스트리밍 연동 함수 ---
  const handleGenerateAIContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok || !response.body) {
        alert('AI 문장을 불러오는데 실패했습니다.');
        setIsGenerating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 줄바꿈이 필요한 경우에 대비해 공백 처리 추가
      setText((prev) => (prev ? prev + (prev.endsWith('\n') ? '' : '\n') : ''));

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
    setIsDraggingActive(false);
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
    setIsDraggingActive(true);
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
      setIsDraggingActive(false);
      setIsBinHovered(false);
    }
  };

  if (!mounted) {
    return <main style={{ backgroundColor: '#000000', height: '100dvh', width: '100vw' }} />;
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
        backgroundColor: '#000000',
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
        <section className="typewriter-screen">
          <img
            src="/pencil.png"
            alt="Pencil"
            onClick={() => setShowProfileModal(true)}
            style={{
              position: 'absolute',
              left: '24px',
              top: '24px',
              width: '140px',
              height: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
              zIndex: 100,
              opacity: 0.85,
              transition: 'transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))',
            }}
            title="내 계정 정보"
          />

          <img
            ref={trashBinRef}
            src="/bin.png"
            alt="Trash Bin"
            style={{
              position: 'absolute',
              right: '24px',
              top: '24px',
              width: '110px',
              height: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
              zIndex: 100,
              transition: 'transform 0.2s ease, filter 0.2s ease',
              transform: isBinHovered ? 'scale(1.2)' : 'scale(1)',
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
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#d0d0d0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '10px 14px',
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
                    ? 'scale(1.15) rotate(0deg)'
                    : `rotate(${paper.rotate}deg) scale(${paper.scale})`,
                  zIndex: isDragging ? 200 : 30,
                  cursor: 'grab',
                  opacity: isDragging ? 0.85 : 1,
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
                placeholder="타자기를 치듯 글을 작성해보세요..."
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
                style={{ flex: 1, padding: '12px 6px', fontSize: '13px', color: '#fff', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer' }}
              >
                💾 .txt 저장
              </button>

              <button
                onClick={handleDiscard}
                style={{ flex: 1, padding: '12px 6px', fontSize: '13px', color: '#fff', backgroundColor: '#d9534f', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
              >
                🗑️ 버리기
              </button>
            </div>

            <button
              onClick={handleGenerateAIContent}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '12px 6px',
                fontSize: '13px',
                color: '#fff',
                backgroundColor: isGenerating ? '#555' : '#4a90e2',
                border: 'none',
                borderRadius: '10px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.2s ease',
              }}
            >
              {isGenerating ? '✍️ 영감을 불러오는 중...' : '✨ AI 영감 받기'}
            </button>

            <div style={{ width: '100%' }}>
              <button
                onClick={() => setIsKakaoModalOpen(true)}
                style={{ flex: 1, width: '100%', padding: '12px 6px', fontSize: '13px', color: '#fff', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer' }}
              >
                ☕ 카카오페이로 커피 한 잔 선물하기
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            width: '100vw',
            height: '100dvh',
            backgroundColor: '#000000',
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
                padding: '45px 35px', 
                borderRadius: '4px', 
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.4s ease',
              }}
            >
              <span style={{ position: 'absolute', top: '20px', left: '25px', fontSize: '10px', opacity: 0.4, letterSpacing: '2px' }}>
                {FRAME_STYLES[currentFrameIndex].name}
              </span>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.8', fontSize: '15px', fontWeight: 300, textAlign: 'center' }}>
                {text}
              </p>
              <span style={{ position: 'absolute', bottom: '20px', right: '25px', fontSize: '10px', opacity: 0.3 }}>
                TYPEWRITER ARCHIVE
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%' }}>
              <button onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🎲 무드 변경</button>
              <button onClick={() => handleSaveFrameAsImage(previewCardRef, FRAME_STYLES[currentFrameIndex].id)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>💾 저장</button>
              <button onClick={() => setIsPreviewOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>닫기</button>
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
                padding: '45px 35px', 
                borderRadius: '4px', 
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.4s ease',
              }}
            >
              <span style={{ position: 'absolute', top: '20px', left: '25px', fontSize: '10px', opacity: 0.4, letterSpacing: '2px' }}>
                {FRAME_STYLES[discardedFrameIndex].name}
              </span>
              <p style={{ whiteSpace: 'pre-wrap', margin: '0', lineHeight: '1.8', fontSize: '15px', fontWeight: '300', textAlign: 'center' }}>
                {selectedPaper.text}
              </p>
              <span style={{ position: 'absolute', bottom: '20px', right: '25px', fontSize: '10px', opacity: 0.3 }}>
                TYPEWRITER 아카이브
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%', flexWrap: 'wrap' }}>
              <button onClick={() => setDiscardedFrameIndex((prev) => (prev + 1) % FRAME_STYLES.length)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🎲 무드 변경</button>
              <button onClick={() => handleSaveFrameAsImage(discardedPreviewCardRef, FRAME_STYLES[discardedFrameIndex].id)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>💾 저장</button>
              <button onClick={() => handleCopyShareLink(selectedPaper.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#222', color: '#ccc', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🔗 공유</button>
              {selectedPaper.user_id !== userId && selectedPaper.picked_by !== userId && (
                <button onClick={() => handlePickUp(selectedPaper.id)} style={{ flex: 1.2, padding: '12px', backgroundColor: '#d9534f', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' }}>🧹 줍기</button>
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
  width: '100vw', height: '100dvh',
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

'use client';

import React, { useState, useRef, useEffect } from 'react';

type SentimentType = 'positive' | 'negative' | 'neutral';

interface DiscardedPaper {
  id: number;
  text: string;
  x: number;
  y: number;
  rotate: number;
  sentiment: SentimentType;
}

const POSITIVE_WORDS = [
  '좋아', '좋은', '좋다', '기쁘', '행복', '감사', '고마', '사랑', '즐거운', '신나',
  '희망', '웃음', '설레', '최고', '완벽', '따뜻', '평화', '성공', '응원', '빛나'
];

const NEGATIVE_WORDS = [
  '싫어', '싫다', '짜증', '슬프', '힘들', '우울', '화나', '아프', '지쳐', '괴로',
  '포기', '최악', '눈물', '불안', '걱정', '절망', '상처', '외롭', '답답', '후회'
];

export default function TypewriterApp() {
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaperText, setSelectedPaperText] = useState<string | null>(null);
  const [isHoveredBin, setIsHoveredBin] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

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
      sentiment: sentiment
    };

    setPapers((prev) => [...prev, newPaper]);
    setText('');
  };

  const startDrag = (clientX: number, clientY: number, id: number, paperX: number, paperY: number) => {
    setDraggingId(id);
    isDraggingRef.current = false;
    dragOffsetRef.current = {
      x: clientX - paperX,
      y: clientY - paperY
    };
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, paperX: number, paperY: number) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY, id, paperX, paperY);
  };

  const handleTouchStart = (e: React.TouchEvent, id: number, paperX: number, paperY: number) => {
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

    const handleMouseMove = (e: MouseEvent) => {
      processMove(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      processEnd(e.clientX, e.clientY);
    };

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
    }
  };

  return (
    <main
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#121212',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box'
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

        @media (max-width: 400px) {
          .typewriter-wrapper {
            width: 175vw !important;
            max-width: none !important;
          }

          .typewriter-textarea {
            font-size: 13px !important;
          }
        }
      `}</style>

      {/* 쓰레기통 */}
      <div
        ref={binRef}
        style={{
          position: 'fixed',
          top: '25px',
          right: '30px',
          width: '140px',
          zIndex: 30,
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
          src={getPaperImageSrc(paper.sentiment)}
          alt={`${paper.sentiment} Discarded Paper`}
          onMouseDown={(e) => handleMouseDown(e, paper.id, paper.x, paper.y)}
          onTouchStart={(e) => handleTouchStart(e, paper.id, paper.x, paper.y)}
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
            transition: draggingId === paper.id ? 'none' : 'transform 0.1s ease'
          }}
        />
      ))}

      {/* 타자기 프레임 */}
      <div className="typewriter-wrapper" style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: '18.5%',
            left: '36.8%',
            width: '26.4%',
            height: '14%',
            padding: '20px 2px 2px 2px',
            boxSizing: 'border-box',
            zIndex: 3
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
              wordBreak: 'break-word'
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
            zIndex: 2
          }}
        />
      </div>

      {/* 하단 버튼 그룹 */}
      <div
        style={{
          position: 'fixed',
          bottom: '10vh',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: 'calc(100% - 40px)',
          maxWidth: '380px',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={handleSaveTxt}
            style={{
              flex: 1,
              padding: '14px 8px',
              fontSize: '14px',
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            💾 .txt 저장하기
          </button>

          <button
            onClick={handleDiscard}
            style={{
              flex: 1,
              padding: '14px 8px',
              fontSize: '14px',
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            🗑️ 버리기
          </button>
        </div>

        <button
          onClick={() => setIsKakaoModalOpen(true)}
          style={{
            width: '100%',
            padding: '14px 8px',
            fontSize: '14px',
            fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
            color: '#3C1E1E',
            backgroundColor: '#FEE500',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          ☕ 개발자에게 커피 한 잔 사주기
        </button>
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
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 200,
            padding: '20px',
            boxSizing: 'border-box'
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
              padding: '25px 20px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
              lineHeight: '1.6'
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#888',
                borderBottom: '1px solid #ddd',
                paddingBottom: '8px',
                marginBottom: '15px'
              }}
            >
              📜 버려진 원고 내용
            </div>

            <p
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '300px',
                overflowY: 'auto',
                margin: 0,
                fontSize: '14px'
              }}
            >
              {selectedPaperText}
            </p>

            <button
              onClick={() => setSelectedPaperText(null)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '10px 0',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mona), var(--font-special-elite), monospace'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 카카오페이 QR 모달 */}
      {isKakaoModalOpen && (
        <div
          onClick={() => setIsKakaoModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 200,
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '300px',
              width: '100%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              fontFamily: 'var(--font-mona), var(--font-special-elite), monospace'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1a1a1a' }}>
              💛 카카오페이 후원
            </h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
              카카오톡 카메라나 카카오페이 앱으로<br />아래 QR코드를 스캔해 주세요.
            </p>

            <img
              src="/kakao_image.png"
              alt="카카오페이 송금 QR"
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />

            <button
              onClick={() => setIsKakaoModalOpen(false)}
              style={{
                marginTop: '15px',
                width: '100%',
                padding: '10px 0',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mona), var(--font-special-elite), monospace'
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

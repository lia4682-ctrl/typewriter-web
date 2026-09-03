'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Paper {
  id: string;
  content: string;
  createdAt: string;
  status: 'draft' | 'trashed' | 'deleted';
}

export default function TypewriterApp() {
  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [text, setText] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/typewriter-key.mp3');
    if (audioRef.current) audioRef.current.volume = 0.4;
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    if (audioRef.current && newText.length > text.length) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleThrowAway = () => {
    if (!text.trim()) return;

    const newPaper: Paper = {
      id: Date.now().toString(),
      content: text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'trashed',
    };

    setPapers((prev) => [newPaper, ...prev]);
    setText('');
  };

  const handlePermanentDelete = (id: string) => {
    setPapers((prev) =>
      prev.map((paper) => (paper.id === id ? { ...paper, status: 'deleted' } : paper))
    );
  };

  const handleSaveTxt = () => {
    if (!text.trim()) return;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `typewriter_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
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

  // 영구 삭제('deleted')된 항목 제외하고 버린 종이만 추출
  const activeTrashedPapers = papers.filter((paper) => paper.status === 'trashed');

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#e8e4d9',
        color: '#2c2a29',
        fontFamily: 'serif',
        userSelect: 'none',
      }}
    >
      {/* 2개의 화면 슬라이더 컨테이너 */}
      <div
        style={{
          display: 'flex',
          width: '200vw',
          height: '100%',
          transition: 'transform 0.5s ease-in-out',
          transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)',
        }}
      >
        {/* ================= 1. 타자기 작성 화면 ================= */}
        <section
          style={{
            width: '100vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justify: 'space-between',
            padding: '24px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* 오른쪽 힌트 버튼 */}
          <button
            onClick={() => setCurrentPage('trash')}
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '14px',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            버린 종이들 ◀
          </button>

          {/* 헤더 */}
          <header style={{ textAlign: 'center', marginTop: '10px' }}>
            <h1 style={{ fontSize: '24px', letterSpacing: '3px', margin: 0, color: '#423b32' }}>
              ANALOG TYPEWRITER
            </h1>
            <p style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>
              좌측으로 스와이프하면 버린 원고를 확인하실 수 있습니다.
            </p>
          </header>

          {/* 타자기 원고지 영역 */}
          <div
            style={{
              width: '100%',
              maxWidth: '650px',
              height: '55vh',
              backgroundColor: '#fdfcf7',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              border: '1px solid #d3cebe',
              borderRadius: '4px',
              padding: '24px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="타자기 소리와 함께 글을 작성해보세요..."
              spellCheck={false}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: '16px',
                lineHeight: '1.8',
                color: '#2b2b2b',
              }}
            />
          </div>

          {/* 하단 버튼 */}
          <footer style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={handleThrowAway}
              style={{
                padding: '10px 20px',
                backgroundColor: '#7a6b5d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🗑️ 구겨서 버리기
            </button>
            <button
              onClick={handleSaveTxt}
              style={{
                padding: '10px 20px',
                backgroundColor: '#d6cfbe',
                color: '#3b352e',
                border: '1px solid #b8af9c',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              💾 .txt 저장
            </button>
          </footer>
        </section>

        {/* ================= 2. 버린 종이들 모음 화면 ================= */}
        <section
          style={{
            width: '100vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            backgroundColor: '#ded8c8',
            position: 'relative',
            overflowY: 'auto',
          }}
        >
          {/* 돌아가기 버튼 */}
          <button
            onClick={() => setCurrentPage('typewriter')}
            style={{
              position: 'absolute',
              left: '24px',
              top: '24px',
              background: 'none',
              border: 'none',
              color: '#52483d',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ▶ 타자기로 돌아가기
          </button>

          <header style={{ textAlign: 'center', marginTop: '30px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', letterSpacing: '2px', color: '#4a4035', margin: 0 }}>
              버려진 원고 조각들
            </h2>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
              영구 삭제 처리되거나 비워진 종이는 이곳에 나타나지 않습니다.
            </p>
          </header>

          {/* 버려진 원고 그리드 */}
          <main
            style={{
              width: '100%',
              maxWidth: '850px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '20px',
              paddingBottom: '40px',
            }}
          >
            {activeTrashedPapers.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '80px 0',
                  color: '#777',
                  fontSize: '14px',
                }}
              >
                버려진 원고가 없습니다.
              </div>
            ) : (
              activeTrashedPapers.map((paper, index) => (
                <div
                  key={paper.id}
                  style={{
                    backgroundColor: '#fcfbf7',
                    padding: '20px',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #c2baa8',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '200px',
                    boxSizing: 'border-box',
                    transform: index % 2 === 0 ? 'rotate(-1.5deg)' : 'rotate(1.5deg)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#38332d',
                      margin: 0,
                      lineHeight: '1.6',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {paper.content}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      color: '#999',
                      paddingTop: '10px',
                      borderTop: '1px solid #eee9dc',
                    }}
                  >
                    <span>{paper.createdAt}</span>
                    <button
                      onClick={() => handlePermanentDelete(paper.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e57373',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '11px',
                      }}
                    >
                      영구 삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </main>
        </section>
      </div>
    </div>
  );
}

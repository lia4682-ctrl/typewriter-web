'use client';

import React, { useState, useRef, useEffect } from 'react';

// 종이 데이터 타입
interface Paper {
  id: string;
  content: string;
  createdAt: string;
  status: 'draft' | 'trashed' | 'deleted'; // trashed: 버려진 종이, deleted: 영구 삭제(목록 제외)
}

export default function TypewriterApp() {
  // 현재 페이지 상태 ('typewriter': 메인 타자기, 'trash': 버린 종이 공간)
  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');

  // 작성 중인 텍스트 및 라인 관리
  const [text, setText] = useState('');
  const [lines, setLines] = useState<string[]>(['']);

  // 버린 종이들 목록
  const [papers, setPapers] = useState<Paper[]>([]);

  // DOM & Audio Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 스와이프 터치 감지용 Ref
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // 오디오 효과음 초기화 (타격음)
  useEffect(() => {
    audioRef.current = new Audio('/sounds/typewriter-key.mp3'); // public/sounds 경로 sound 파일
    audioRef.current.volume = 0.4;
  }, []);

  // 텍스트 변경 처리 및 줄바꿈 관리
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setLines(newText.split('\n'));

    // 키 입력 소리 재생
    if (audioRef.current && newText.length > text.length) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); // 자동재생 차단 예외 처리
    }
  };

  // 1. 현재 원고 구겨서 버리기
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
    setLines(['']);
  };

  // 2. 휴지통 내부에서 영구 삭제 (status를 'deleted'로 변경하여 완전 제외)
  const handlePermanentDelete = (id: string) => {
    setPapers((prev) =>
      prev.map((paper) => (paper.id === id ? { ...paper, status: 'deleted' } : paper))
    );
  };

  // 3. .txt 파일로 다운로드 저장
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

  // 4. 스와이프 인터랙션 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const swipeDistance = touchStartX.current - touchEndX.current;

    // 왼쪽으로 스와이프 (70px 이상) -> 버린 종이 페이지로 이동
    if (swipeDistance > 70 && currentPage === 'typewriter') {
      setCurrentPage('trash');
    }
    // 오른쪽으로 스와이프 (-70px 이하) -> 타자기 페이지로 복귀
    if (swipeDistance < -70 && currentPage === 'trash') {
      setCurrentPage('typewriter');
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // ★ 삭제된('deleted') 쓰레기는 제외하고 'trashed' 상태인 종이만 추출
  const activeTrashedPapers = papers.filter((paper) => paper.status === 'trashed');

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#e8e4d9] text-[#2c2a29] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 2개 화면 수평 슬라이더 뷰 컨테이너 */}
      <div
        className="flex w-[200vw] h-full transition-transform duration-500 ease-in-out"
        style={{
          transform: currentPage === 'typewriter' ? 'translateX(0)' : 'translateX(-100vw)',
        }}
      >
        {/* ================= SECTION 1: 타자기 작성 화면 ================= */}
        <section className="w-[100vw] h-full flex flex-col items-center justify-between p-6 relative">
          {/* 오른쪽 힌트 버튼 (버린 종이 보러가기) */}
          <button
            onClick={() => setCurrentPage('trash')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity z-20 font-serif"
          >
            버린 종이들 ◀
          </button>

          {/* 상단 타이틀 */}
          <header className="text-center mt-2 z-10">
            <h1 className="text-xl sm:text-2xl font-serif tracking-widest text-[#423b32]">
              ANALOG TYPEWRITER
            </h1>
            <p className="text-xs text-gray-500 mt-1">좌측으로 스와이프하면 버린 원고를 확인하실 수 있습니다.</p>
          </header>

          {/* 타자기 본체 및 종이 영역 */}
          <div className="relative w-full max-w-2xl h-[60vh] my-auto flex flex-col items-center justify-center">
            {/* 종이 연출 마스킹 레이어 (타자기 롤러 고정 및 슬라이드) */}
            <div className="relative w-[90%] sm:w-[80%] h-full bg-[#fdfcf7] shadow-xl border border-[#d3cebe] rounded-sm p-8 overflow-hidden flex flex-col">
              {/* 실제 타이핑 구역 */}
              <div className="relative w-full h-full flex flex-col">
                <textarea
                  ref={textAreaRef}
                  value={text}
                  onChange={handleTextChange}
                  placeholder="타자기 소리와 함께 글을 작성해보세요..."
                  className="w-full h-full bg-transparent resize-none outline-none font-mono text-base sm:text-lg leading-relaxed text-[#2b2b2b] z-10"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* 하단 컨트롤 버튼 모음 */}
          <footer className="flex items-center gap-3 mb-4 z-10">
            <button
              onClick={handleThrowAway}
              className="px-5 py-2 bg-[#7a6b5d] text-white text-sm rounded shadow hover:bg-[#635548] transition-colors font-serif"
            >
              🗑️ 구겨서 버리기
            </button>
            <button
              onClick={handleSaveTxt}
              className="px-5 py-2 bg-[#d6cfbe] text-[#3b352e] text-sm rounded border border-[#b8af9c] hover:bg-[#c7beaa] transition-colors font-serif"
            >
              💾 .txt 저장
            </button>
          </footer>
        </section>

        {/* ================= SECTION 2: 버린 종이들 모음 화면 (좌측 스와이프) ================= */}
        <section className="w-[100vw] h-full flex flex-col items-center p-6 bg-[#ded8c8] relative overflow-y-auto">
          {/* 돌아가기 버튼 */}
          <button
            onClick={() => setCurrentPage('typewriter')}
            className="absolute left-6 top-6 text-[#52483d] text-xs sm:text-sm flex items-center gap-1 font-serif hover:underline z-20"
          >
            ▶ 타자기로 돌아가기
          </button>

          <header className="text-center mt-10 mb-8">
            <h2 className="text-xl sm:text-2xl font-serif tracking-wider text-[#4a4035]">
              버려진 원고 조각들
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              영구 삭제 처리되거나 비워진 종이는 이곳에 나타나지 않습니다.
            </p>
          </header>

          {/* 버려진 종이 리스트 (3D 회전 종이 카드) */}
          <main className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-16">
            {activeTrashedPapers.length === 0 ? (
              <div className="col-span-full text-center py-24 text-gray-500 font-serif text-sm">
                버려진 원고가 없습니다.
              </div>
            ) : (
              activeTrashedPapers.map((paper, index) => (
                <div
                  key={paper.id}
                  className="bg-[#fcfbf7] p-6 rounded shadow-md border border-[#c2baa8] flex flex-col justify-between h-56 transition-all hover:scale-[1.02]"
                  style={{
                    transform: `rotate(${index % 2 === 0 ? '-1.5deg' : '1.5deg'})`,
                  }}
                >
                  <p className="font-mono text-sm text-[#38332d] line-clamp-6 whitespace-pre-wrap leading-relaxed">
                    {paper.content}
                  </p>

                  <div className="flex justify-between items-center text-xs text-gray-400 mt-4 pt-3 border-t border-[#eee9dc]">
                    <span>{paper.createdAt}</span>
                    <button
                      onClick={() => handlePermanentDelete(paper.id)}
                      className="text-red-400 hover:text-red-600 transition-colors font-serif"
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

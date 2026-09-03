'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';

type SentimentType = 'positive' | 'negative' | 'neutral';

interface DiscardedPaper {
  id: number;
  text: string;
  x: number;
  y: number;
  rotate: number;
  sentiment: SentimentType;
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
    id: 'grid-vintage',
    name: '📜 빈티지 원고지',
    bgColor: '#fbf8f1',
    bgPattern: 'radial-gradient(#e2d9cc 1px, transparent 1px)',
    textColor: '#2b2b2b',
    subTextColor: '#8c8275',
    borderColor: '#2b2b2b',
    fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
  },
  {
    id: 'dark-typewriter',
    name: '🖤 칠흑 타자기',
    bgColor: '#1e1e1e',
    bgPattern: 'radial-gradient(#333333 1px, transparent 1px)',
    textColor: '#e0e0e0',
    subTextColor: '#777777',
    borderColor: '#444444',
    fontFamily: 'var(--font-mona), var(--font-special-elite), monospace',
  },
  {
    id: 'old-letter',
    name: '☕ 올드 레터',
    bgColor: '#f4ede2',
    bgPattern: 'linear-gradient(to right, #e2d7c5 1px, transparent 1px)',
    textColor: '#3c2a1e',
    subTextColor: '#9e8976',
    borderColor: '#3c2a1e',
    fontFamily: 'serif',
  },
  {
    id: 'pastel-pink',
    name: '🌸 감성 파스텔',
    bgColor: '#fdf0f0',
    bgPattern: 'radial-gradient(#f4c7c7 1px, transparent 1px)',
    textColor: '#4a3535',
    subTextColor: '#a88282',
    borderColor: '#4a3535',
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

export default function TypewriterApp() {
  const [currentPage, setCurrentPage] = useState<'typewriter' | 'trash'>('typewriter');
  const [text, setText] = useState<string>('');
  const [papers, setPapers] = useState<DiscardedPaper[]>([]);
  const [selectedPaperText, setSelectedPaperText] = useState<string | null>(null);
  const [isHoveredBin, setIsHoveredBin] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isKakaoModalOpen, setIsKakaoModalOpen] = useState(false);

  // 미리보기 모달 관련 상태
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDiscardedPreviewOpen, setIsDiscardedPreviewOpen] = useState(false);
  const [discardedFrameIndex, setDiscardedFrameIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binRef = useRef<HTMLDivElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const discardedPreviewCardRef = useRef<HTMLDivElement | null>(null);

  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  const downloadTxtFile = (content: string, filenamePrefix: string) => {
    if (!content.trim()) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTxt = () => {
    if (!text.trim()) {
      alert('저장할 내용을 입력해 주세요.');
      return;
    }
    downloadTxtFile(text, 'typewriter_note');
  };

  const handleOpenPreview = () => {
    if (!text.trim()) {
      alert('저장할 내용을 입력해 주세요.');
      return;
    }
    setIsPreviewOpen(true);
  };

  const handleRandomFrame = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * FRAME_STYLES.length);
    } while (nextIndex === currentFrameIndex && FRAME_STYLES.length > 1);
    setCurrentFrameIndex(nextIndex);
  };

  const handleRandomDiscardedFrame = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * FRAME_STYLES.length);
    } while (nextIndex === discardedFrameIndex && FRAME_STYLES.length > 1);
    setDiscardedFrameIndex(nextIndex);
  };

  const downloadImageFromRef = async (ref: React.RefObject<HTMLDivElement>, frameId: string, prefix: string) => {
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

  const handleDownloadImage = () => {
    downloadImageFromRef(previewCardRef, FRAME_STYLES[currentFrameIndex].id, 'typewriter');
  };

  const handleDownloadDiscardedImage = () => {
    downloadImageFromRef(discardedPreviewCardRef, FRAME_STYLES[discardedFrameIndex].id, 'discarded_note');
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
      sentiment: sentiment,
    };

    setPapers((prev) => [...prev, newPaper]);
    setText('');
  };

  const handlePermanentDelete = (id: number) => {
    playTrashSound();
    setPapers((prev) => prev.filter((p) => p.id !== id));
    if (selectedPaperText) setSelectedPaperText(null);
  };

  const startDrag = (clientX: number, clientY: number, id: number, paperX: number, paperY: number) => {
    setDraggingId(id);
    isDraggingRef.current = false;
    dragOffsetRef.current = {
      x: clientX - paperX,
      y: clientY - paperY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, paperX: number, paperY: number) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY, id, paperX, paperY);
  };

  const handleTouchStartDrag = (e: React.TouchEvent, id: number, paperX: number, paperY: number) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, id, paperX, paperY);
  };

  useEffect(() => {
    const processMove = (clientX: number, clientY: number) => {
      if (draggingId === null) return;
      isDraggingRef.current = true;

      const newX = clientX - dragOffsetRef.current.x;
      const newY = clientY - dragOffset

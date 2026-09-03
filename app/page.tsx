{/* 입력 레이어 (빨간 영역 위치로 정밀 조율) */}
<div
  style={{
    position: 'absolute',
    top: '18.8%',
    left: '36.8%',
    width: '26.4%',
    height: '16.5%',
    padding: '8px',
    boxSizing: 'border-box',
    zIndex: 1
  }}
>
  <textarea
    ref={textareaRef}
    value={text}
    onChange={(e) => setText(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="타자기를 치듯 글을 작성해보세요..."
    autoFocus
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      resize: 'none',
      fontFamily: 'Courier New, Courier, monospace',
      fontSize: '13px',
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

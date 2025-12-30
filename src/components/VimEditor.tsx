import React, { useRef, useEffect, useState } from 'react';
import { Mode, type VimState } from '../types';
import { getRange } from '../utils/stringUtils';

interface VimEditorProps {
  vimState: VimState;
}

export const VimEditor: React.FC<VimEditorProps> = ({ vimState }) => {
  const { lines, cursor, mode, visualStart, clipboard } = vimState;
  const editorRef = useRef<HTMLDivElement>(null);
  const [yankFlash, setYankFlash] = useState<{ line: number; col?: number } | null>(null);

  useEffect(() => {
    // 마운트 시 에디터 포커스
    editorRef.current?.focus();
  }, []);

  // 커서 위치에 따른 자동 스크롤 (Vim의 scrolloff 기능 모방)
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    // 현재 커서가 있는 라인 요소를 찾습니다.
    const lineNode = container.querySelector(`[data-line="${cursor.line}"]`) as HTMLElement;
    if (!lineNode) return;

    const containerHeight = container.clientHeight;
    const lineHeight = lineNode.offsetHeight;
    const lineTop = lineNode.offsetTop;
    const scrollTop = container.scrollTop;
    
    // 화면 상하단에 여유 공간(scrolloff)을 둡니다.
    const SCROLL_MARGIN = 3; 
    const offset = SCROLL_MARGIN * lineHeight;

    // 1. 커서가 뷰포트 상단보다 위에 있거나, 상단 여유 공간 내에 진입한 경우 (위로 스크롤)
    if (lineTop < scrollTop + offset) {
      container.scrollTop = Math.max(0, lineTop - offset);
    }
    // 2. 커서가 뷰포트 하단보다 아래에 있거나, 하단 여유 공간 내에 진입한 경우 (아래로 스크롤)
    else if (lineTop + lineHeight > scrollTop + containerHeight - offset) {
      container.scrollTop = lineTop + lineHeight - containerHeight + offset;
    }
  }, [cursor.line]);

  // Yank(복사) 시 플래시 효과
  useEffect(() => {
    if (clipboard) {
      // 렌더 사이클 도중에 동기적으로 setState를 호출하면 경고가 발생하므로,
      // setTimeout을 사용하여 비동기적으로 처리합니다.
      // 이렇게 하면 렌더링이 완료된 후에 상태 업데이트가 발생하여 "cascading renders" 문제를 방지할 수 있습니다.

      const timerId = setTimeout(() => {
        setYankFlash({ line: cursor.line });
        setTimeout(() => setYankFlash(null), 200);
      }, 0);
      return () => clearTimeout(timerId);
    }
  }, [clipboard, cursor.line]);

  const isSelected = (line: number, col: number) => {
    if (!mode.startsWith('VISUAL') || !visualStart) return false;

    const { start, end } = getRange(visualStart, cursor);

    if (mode === Mode.VISUAL_LINE) {
      return line >= start.line && line <= end.line;
    }

    if (mode === Mode.VISUAL_BLOCK) {
      if (line < start.line || line > end.line) return false;
      const minCol = Math.min(visualStart.col, cursor.col);
      const maxCol = Math.max(visualStart.col, cursor.col);
      return col >= minCol && col <= maxCol;
    }

    // 일반 비주얼 모드
    if (line < start.line || line > end.line) return false;
    if (line === start.line && line === end.line) {
      return col >= start.col && col <= end.col;
    }
    if (line === start.line) return col >= start.col;
    if (line === end.line) return col <= end.col;
    return true;
  };

  return (
    <div
      className="bg-[#1e1e1e] text-[#d4d4d4] font-mono text-lg p-4 h-full overflow-auto outline-none scrollbar-hide"
      ref={editorRef}
      tabIndex={0}
    >
      <div className="relative">
        {lines.map((lineContent, lineIndex) => {
          const isFlash = yankFlash && yankFlash.line === lineIndex; // 라인 전체 플래시

          return (
            <div
              key={lineIndex}
              data-line={lineIndex}
              className={`flex relative leading-relaxed whitespace-pre ${
                isFlash ? 'bg-white/20 transition-colors duration-200' : ''
              }`}
            >
              {/* 줄 번호 */}
              <div className="w-12 text-right mr-4 text-[#858585] select-none">{lineIndex + 1}</div>

              {/* 줄 내용 */}
              <div className="flex-1 relative">
                {lineContent.length === 0 ? (
                  <span
                    className={`inline-block ${
                      cursor.line === lineIndex && cursor.col === 0
                        ? mode === Mode.INSERT
                          ? 'border-l-2 border-white'
                          : 'bg-white/50 w-[1ch]'
                        : ''
                    } ${isSelected(lineIndex, 0) ? 'bg-[#264f78]' : ''}`}
                  >
                    &nbsp;
                  </span>
                ) : (
                  lineContent.split('').map((char, colIndex) => {
                    const isCursor = cursor.line === lineIndex && cursor.col === colIndex;
                    const selected = isSelected(lineIndex, colIndex);

                    let className = 'inline-block'; // width/height/transform 등을 적용하기 위해 inline-block 사용

                    if (selected) {
                      className += ' bg-[#264f78]';
                    }

                    if (isCursor) {
                      if (mode === Mode.INSERT || mode === Mode.VISUAL_BLOCK_INSERT) {
                        // Bar 형태의 커서: 기존 border-left 방식은 레이아웃 이동을 유발했습니다.
                        // 절대 위치(absolute positioning)를 사용하여 텍스트 레이아웃에 영향을 주지 않도록 변경했습니다.
                        // relative 클래스를 추가하여 내부의 absolute 커서 요소가 이 span을 기준으로 배치되게 합니다.
                        className += ' relative';
                        // 커서 요소는 아래에서 조건부 렌더링으로 추가됩니다.
                      } else {
                        // Block 형태의 커서 (Normal/Visual 모드)
                        className += ' bg-white text-black animate-pulse';
                      }
                    }

                    return (
                      <span key={colIndex} className={className}>
                        {char}
                        {isCursor && (mode === Mode.INSERT || mode === Mode.VISUAL_BLOCK_INSERT) && (
                          <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-white"></span>
                        )}
                      </span>
                    );
                  })
                )}

                {/* 줄 끝에 커서가 있을 때 처리 */}
                {/* 로직: Insert 모드이고 커서가 줄의 길이만큼(맨 끝) 갔을 때, 빈 칸에 Bar 커서를 표시합니다. */}
                {(mode === Mode.INSERT || mode === Mode.VISUAL_BLOCK_INSERT) &&
                  cursor.line === lineIndex &&
                  cursor.col === lineContent.length && (
                    <span className="relative inline-block w-[1ch]">
                      &nbsp;
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-white"></span>
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

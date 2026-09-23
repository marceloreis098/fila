import React from 'react';

// Deterministic matrix generator for visually crisp PIX QR Code display
export const PixQRCode: React.FC<{ payload: string; size?: number }> = ({ payload, size = 220 }) => {
  // Generate a reproducible pseudo-pattern based on payload hash + standard QR locator patterns
  const gridSize = 29;
  const matrix: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));

  // Function to draw standard QR finder pattern (7x7 with 3x3 core)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 || // outer square
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // inner 3x3 core
        ) {
          matrix[startY + r][startX + c] = true;
        }
      }
    }
  };

  // Top-left, top-right, bottom-left finders
  drawFinder(0, 0);
  drawFinder(gridSize - 7, 0);
  drawFinder(0, gridSize - 7);

  // Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    if (i % 2 === 0) {
      matrix[6][i] = true;
      matrix[i][6] = true;
    }
  }

  // Hash payload to fill data cells predictably
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 31 + payload.charCodeAt(i)) & 0xffffffff;
  }

  // Populate data regions avoiding finder patterns
  let pseudoRand = Math.abs(hash);
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;
      const inCenterLogo = r >= 11 && r <= 17 && c >= 11 && c <= 17;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inCenterLogo) {
        pseudoRand = (pseudoRand * 1103515245 + 12345) & 0x7fffffff;
        if ((pseudoRand % 100) < 48) {
          matrix[r][c] = true;
        }
      }
    }
  }

  const cellSize = size / gridSize;

  return (
    <div className="relative inline-block p-3 bg-white rounded-xl shadow-md border border-slate-200">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="#FFFFFF" />
        {matrix.map((row, r) =>
          row.map((active, c) => {
            if (!active) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.3}
                height={cellSize + 0.3}
                fill="#0F172A"
              />
            );
          })
        )}
      </svg>
      {/* Central PIX emblem */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ width: size + 24, height: size + 24, margin: '-12px' }}
      >
        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
          <div className="w-8 h-8 rounded bg-[#32BCAD] flex items-center justify-center text-white font-bold text-[10px] tracking-wider shadow-sm">
            PIX
          </div>
        </div>
      </div>
    </div>
  );
};

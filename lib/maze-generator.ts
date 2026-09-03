// Maze generation and validation with BFS pathfinding

export interface MazeCell {
  x: number;
  y: number;
  top: boolean;    // true if wall exists
  right: boolean;  // true if wall exists
  bottom: boolean; // true if wall exists
  left: boolean;   // true if wall exists
}

export interface MazeData {
  id: string;
  name: string;
  difficulty: 'Beginner' | 'Medium' | 'Challenging' | 'Master';
  cols: number;
  rows: number;
  cellSize: number; // in 3D world units
  wallHeight: number;
  wallThickness: number;
  start: { x: number; y: number };
  goal: { x: number; y: number };
  // Wall segments: { x, z, length, isHorizontal }
  walls: Array<{
    x: number;
    z: number;
    width: number;
    depth: number;
  }>;
  pathLength: number; // BFS shortest path length
}

// Solvability verification using Breadth-First Search
export function solveMazeBFS(
  cols: number,
  rows: number,
  hWalls: boolean[][], // hWalls[y][x]: wall between (x, y-1) and (x, y)
  vWalls: boolean[][], // vWalls[y][x]: wall between (x-1, y) and (x, y)
  start: { x: number; y: number },
  goal: { x: number; y: number }
): { solvable: boolean; path: Array<{ x: number; y: number }> } {
  const queue: Array<{ x: number; y: number; path: Array<{ x: number; y: number }> }> = [
    { x: start.x, y: start.y, path: [{ x: start.x, y: start.y }] },
  ];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      return { solvable: true, path: current.path };
    }

    const neighbors: Array<{ x: number; y: number }> = [];

    // Up: check hWalls[y][x]
    if (current.y > 0 && !hWalls[current.y][current.x]) {
      neighbors.push({ x: current.x, y: current.y - 1 });
    }
    // Down: check hWalls[y+1][x]
    if (current.y < rows - 1 && !hWalls[current.y + 1][current.x]) {
      neighbors.push({ x: current.x, y: current.y + 1 });
    }
    // Left: check vWalls[y][x]
    if (current.x > 0 && !vWalls[current.y][current.x]) {
      neighbors.push({ x: current.x - 1, y: current.y });
    }
    // Right: check vWalls[y][x+1]
    if (current.x < cols - 1 && !vWalls[current.y][current.x + 1]) {
      neighbors.push({ x: current.x + 1, y: current.y });
    }

    for (const nb of neighbors) {
      const key = `${nb.x},${nb.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          x: nb.x,
          y: nb.y,
          path: [...current.path, nb],
        });
      }
    }
  }

  return { solvable: false, path: [] };
}

// Converts grid walls to 3D bounding boxes for Rapier and Three.js
export function generateMazeData(
  cols: number = 9,
  rows: number = 9,
  cellSize: number = 1.0,
  wallThickness: number = 0.16,
  wallHeight: number = 0.52,
  seed?: number
): MazeData {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    attempts++;

    // Horizontal walls: (rows + 1) rows of cols segments
    // hWalls[y][x] is the wall above cell (x, y). hWalls[0] and hWalls[rows] are borders.
    const hWalls: boolean[][] = Array.from({ length: rows + 1 }, () =>
      Array(cols).fill(true)
    );
    // Vertical walls: rows rows of (cols + 1) segments
    // vWalls[y][x] is the wall left of cell (x, y). vWalls[y][0] and vWalls[y][cols] are borders.
    const vWalls: boolean[][] = Array.from({ length: rows }, () =>
      Array(cols + 1).fill(true)
    );

    // Random walk / recursive backtracker algorithm to carve paths
    const visitedCells = Array.from({ length: rows }, () => Array(cols).fill(false));
    const stack: Array<{ x: number; y: number }> = [];

    const startX = 0;
    const startY = 0;
    visitedCells[startY][startX] = true;
    stack.push({ x: startX, y: startY });

    // Custom deterministic pseudo-random if seed provided
    let s = seed !== undefined ? seed + attempts * 997 : Date.now() + attempts;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Array<{ x: number; y: number; dir: 'U' | 'D' | 'L' | 'R' }> = [];

      if (current.y > 0 && !visitedCells[current.y - 1][current.x]) {
        neighbors.push({ x: current.x, y: current.y - 1, dir: 'U' });
      }
      if (current.y < rows - 1 && !visitedCells[current.y + 1][current.x]) {
        neighbors.push({ x: current.x, y: current.y + 1, dir: 'D' });
      }
      if (current.x > 0 && !visitedCells[current.y][current.x - 1]) {
        neighbors.push({ x: current.x - 1, y: current.y, dir: 'L' });
      }
      if (current.x < cols - 1 && !visitedCells[current.y][current.x + 1]) {
        neighbors.push({ x: current.x + 1, y: current.y, dir: 'R' });
      }

      if (neighbors.length > 0) {
        // Pick random unvisited neighbor
        const nextIdx = Math.floor(rng() * neighbors.length);
        const next = neighbors[nextIdx];

        // Remove the wall between current and next
        if (next.dir === 'U') {
          hWalls[current.y][current.x] = false;
        } else if (next.dir === 'D') {
          hWalls[current.y + 1][current.x] = false;
        } else if (next.dir === 'L') {
          vWalls[current.y][current.x] = false;
        } else if (next.dir === 'R') {
          vWalls[current.y][current.x + 1] = false;
        }

        visitedCells[next.y][next.x] = true;
        stack.push({ x: next.x, y: next.y });
      } else {
        stack.pop();
      }
    }

    // Add controlled braiding (remove 10-15% of dead-end walls to create interesting loops and false paths)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (rng() < 0.12) {
          // Attempt to knock down one internal wall
          if (x < cols - 1 && vWalls[y][x + 1]) {
            vWalls[y][x + 1] = false;
          } else if (y < rows - 1 && hWalls[y + 1][x]) {
            hWalls[y + 1][x] = false;
          }
        }
      }
    }

    const start = { x: 0, y: 0 };
    const goal = { x: cols - 1, y: rows - 1 };

    // Validate solvability
    const solution = solveMazeBFS(cols, rows, hWalls, vWalls, start, goal);

    if (solution.solvable && solution.path.length >= Math.floor((cols + rows) * 1.2)) {
      // Valid, rich maze found!
      const wallsList = build3DWalls(cols, rows, cellSize, wallThickness, hWalls, vWalls);

      let diff: MazeData['difficulty'] = 'Medium';
      if (solution.path.length < 16) diff = 'Beginner';
      else if (solution.path.length > 24) diff = 'Challenging';
      if (solution.path.length > 32) diff = 'Master';

      return {
        id: `maze-${cols}x${rows}-${Date.now()}`,
        name: `Labyrinth ${cols}×${rows}`,
        difficulty: diff,
        cols,
        rows,
        cellSize,
        wallHeight,
        wallThickness,
        start,
        goal,
        walls: wallsList,
        pathLength: solution.path.length,
      };
    }
  }

  // Fallback guaranteed maze if random generator hits edge case
  return getCuratedPresets()[0];
}

function build3DWalls(
  cols: number,
  rows: number,
  cellSize: number,
  wallThickness: number,
  hWalls: boolean[][],
  vWalls: boolean[][]
) {
  const wallsList: Array<{ x: number; z: number; width: number; depth: number }> = [];

  const halfWidth = (cols * cellSize) / 2;
  const halfDepth = (rows * cellSize) / 2;

  // 1. Horizontal runs: merge contiguous cells along each row y into continuous segments
  for (let y = 1; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (hWalls[y][x]) {
        const startX = x;
        while (x + 1 < cols && hWalls[y][x + 1]) {
          x++;
        }
        const endX = x;
        const count = endX - startX + 1;
        const posX = -halfWidth + ((startX + endX + 1) * cellSize) / 2;
        const posZ = -halfDepth + y * cellSize;
        wallsList.push({
          x: posX,
          z: posZ,
          width: count * cellSize + wallThickness * 0.5,
          depth: wallThickness,
        });
      }
      x++;
    }
  }

  // 2. Vertical runs: merge contiguous cells along each column x into continuous segments
  for (let x = 1; x < cols; x++) {
    let y = 0;
    while (y < rows) {
      if (vWalls[y][x]) {
        const startY = y;
        while (y + 1 < rows && vWalls[y + 1][x]) {
          y++;
        }
        const endY = y;
        const count = endY - startY + 1;
        const posX = -halfWidth + x * cellSize;
        const posZ = -halfDepth + ((startY + endY + 1) * cellSize) / 2;
        wallsList.push({
          x: posX,
          z: posZ,
          width: wallThickness,
          depth: count * cellSize + wallThickness * 0.5,
        });
      }
      y++;
    }
  }

  return wallsList;
}

// Curated handcrafted presets
export function getCuratedPresets(): MazeData[] {
  // Preset 1: Classic Labyrinth (9x9)
  const cellSize = 1.0;
  const wallThickness = 0.16;
  const wallHeight = 0.52;

  // Pre-validated layout 1: "Classic Labyrinth"
  const m1 = generateMazeData(9, 9, cellSize, wallThickness, wallHeight, 4242);
  m1.name = "Classic Labyrinth";
  m1.difficulty = "Medium";

  // Preset 2: "The Minotaur" (11x11, winding and complex)
  const m2 = generateMazeData(11, 11, cellSize, wallThickness, wallHeight, 7819);
  m2.name = "The Minotaur";
  m2.difficulty = "Challenging";

  // Preset 3: "Serpent's Run" (9x9 with long snake corridors)
  const m3 = generateMazeData(9, 9, cellSize, wallThickness, wallHeight, 9123);
  m3.name = "Serpent's Run";
  m3.difficulty = "Challenging";

  // Preset 4: "Gentle Start" (7x7, great for quick relaxing runs)
  const m4 = generateMazeData(7, 7, 1.2, wallThickness, wallHeight, 1337);
  m4.name = "Gentle Start";
  m4.difficulty = "Beginner";

  return [m1, m2, m3, m4];
}

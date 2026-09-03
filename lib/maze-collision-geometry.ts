import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MazeData } from './maze-generator';

export interface ConvexHullShape {
  id: string;
  vertices: Float32Array;
}

export interface MazeCollisionData {
  // Unified monolithic Trimesh (floor + all walls + outer rims welded into one seamless manifold)
  unifiedVertices: Float32Array;
  unifiedIndices: Uint32Array;

  // Precision separate floor Trimesh (planar slab, top at y = 0.00)
  floorVertices: Float32Array;
  floorIndices: Uint32Array;

  // Precision separate walls + rims Trimesh (welded wall network with embedded base)
  wallsVertices: Float32Array;
  wallsIndices: Uint32Array;

  // Interior maze walls only (excluding outer rims)
  interiorWallsVertices: Float32Array;
  interiorWallsIndices: Uint32Array;

  // Precision Convex Hull shapes for walls & rims
  convexHulls: ConvexHullShape[];

  // Precision Convex Hull for the floor slab
  floorConvexHull: Float32Array;
}

/**
 * Recalculate precision collision geometry for the maze walls and floor.
 * Uses welded Trimesh and Convex Hull representations in Rapier to eliminate
 * seam snagging, ghost collisions, and marble sinking.
 */
export function computeMazeCollisionGeometry(maze: MazeData): MazeCollisionData {
  const { cols, rows, cellSize, wallHeight, walls } = maze;
  const totalWidth = cols * cellSize;
  const totalDepth = rows * cellSize;
  const rimThickness = 0.38;
  const rimHeight = 1.10;
  const floorThickness = 0.40;

  // 1. Floor Box Geometry
  // Top face is positioned exactly at y = 0.000, extending well past the rims
  const floorGeom = new THREE.BoxGeometry(totalWidth + rimThickness * 4, floorThickness, totalDepth + rimThickness * 4, 4, 1, 4);
  floorGeom.translate(0, -floorThickness / 2, 0);

  // 2. Wall Geometries with base embedded to y = -0.04
  // Embedding the base below the floor plane prevents the rolling marble's contact
  // sphere from ever striking horizontal bottom wall seams or corner edges.
  const wallBottomY = -0.04;
  const effectiveWallHeight = wallHeight - wallBottomY;
  const wallCenterY = wallBottomY + effectiveWallHeight / 2;

  const interiorGeoms: THREE.BufferGeometry[] = [];
  const wallGeoms: THREE.BufferGeometry[] = [];
  const convexHulls: ConvexHullShape[] = [];

  // Add interior walls
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const geom = new THREE.BoxGeometry(wall.width, effectiveWallHeight, wall.depth);
    geom.translate(wall.x, wallCenterY, wall.z);
    interiorGeoms.push(geom);
    wallGeoms.push(geom.clone());

    // Compute exact 8-corner vertex cloud for Rapier ConvexHullCollider
    const hw = wall.width / 2;
    const hd = wall.depth / 2;
    const y0 = wallBottomY;
    const y1 = wallHeight;
    const corners = new Float32Array([
      wall.x - hw, y0, wall.z - hd,
      wall.x + hw, y0, wall.z - hd,
      wall.x + hw, y1, wall.z - hd,
      wall.x - hw, y1, wall.z - hd,
      wall.x - hw, y0, wall.z + hd,
      wall.x + hw, y0, wall.z + hd,
      wall.x + hw, y1, wall.z + hd,
      wall.x - hw, y1, wall.z + hd,
    ]);
    convexHulls.push({ id: `wall_${i}`, vertices: corners });
  }

  // 3. Outer Rims (North, South, West, East) with full corner interlocking
  const northRimGeom = new THREE.BoxGeometry(totalWidth + rimThickness * 2, rimHeight - wallBottomY, rimThickness);
  northRimGeom.translate(0, wallBottomY + (rimHeight - wallBottomY) / 2, -totalDepth / 2 - rimThickness / 2);
  wallGeoms.push(northRimGeom);

  const southRimGeom = new THREE.BoxGeometry(totalWidth + rimThickness * 2, rimHeight - wallBottomY, rimThickness);
  southRimGeom.translate(0, wallBottomY + (rimHeight - wallBottomY) / 2, totalDepth / 2 + rimThickness / 2);
  wallGeoms.push(southRimGeom);

  const westRimGeom = new THREE.BoxGeometry(rimThickness, rimHeight - wallBottomY, totalDepth + rimThickness * 2);
  westRimGeom.translate(-totalWidth / 2 - rimThickness / 2, wallBottomY + (rimHeight - wallBottomY) / 2, 0);
  wallGeoms.push(westRimGeom);

  const eastRimGeom = new THREE.BoxGeometry(rimThickness, rimHeight - wallBottomY, totalDepth + rimThickness * 2);
  eastRimGeom.translate(totalWidth / 2 + rimThickness / 2, wallBottomY + (rimHeight - wallBottomY) / 2, 0);
  wallGeoms.push(eastRimGeom);

  // Add outer rims to convex hulls list
  const addRimHull = (id: string, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const hw = w / 2;
    const hd = d / 2;
    const y0 = wallBottomY;
    const y1 = wallBottomY + h;
    convexHulls.push({
      id,
      vertices: new Float32Array([
        x - hw, y0, z - hd,
        x + hw, y0, z - hd,
        x + hw, y1, z - hd,
        x - hw, y1, z - hd,
        x - hw, y0, z + hd,
        x + hw, y0, z + hd,
        x + hw, y1, z + hd,
        x - hw, y1, z + hd,
      ]),
    });
  };

  addRimHull('rim_north', 0, 0, -totalDepth / 2 - rimThickness / 2, totalWidth + rimThickness * 2, rimHeight - wallBottomY, rimThickness);
  addRimHull('rim_south', 0, 0, totalDepth / 2 + rimThickness / 2, totalWidth + rimThickness * 2, rimHeight - wallBottomY, rimThickness);
  addRimHull('rim_west', -totalWidth / 2 - rimThickness / 2, 0, 0, rimThickness, rimHeight - wallBottomY, totalDepth + rimThickness * 2);
  addRimHull('rim_east', totalWidth / 2 + rimThickness / 2, 0, 0, rimThickness, rimHeight - wallBottomY, totalDepth + rimThickness * 2);

  // 4. Floor Convex Hull
  const floorConvexHull = new Float32Array([
    -totalWidth / 2, -floorThickness, -totalDepth / 2,
     totalWidth / 2, -floorThickness, -totalDepth / 2,
     totalWidth / 2, 0.000,           -totalDepth / 2,
    -totalWidth / 2, 0.000,           -totalDepth / 2,
    -totalWidth / 2, -floorThickness,  totalDepth / 2,
     totalWidth / 2, -floorThickness,  totalDepth / 2,
     totalWidth / 2, 0.000,            totalDepth / 2,
    -totalWidth / 2, 0.000,            totalDepth / 2,
  ]);

  // 5. Weld Geometries into Precision Trimeshes
  const weldedFloor = mergeVertices(floorGeom.clone(), 0.001);
  const floorVertices = new Float32Array(weldedFloor.attributes.position.array);
  const floorIndices = new Uint32Array(weldedFloor.index ? weldedFloor.index.array : []);

  const mergedInteriorRaw = mergeGeometries(interiorGeoms);
  const weldedInterior = mergeVertices(mergedInteriorRaw, 0.001);
  const interiorWallsVertices = new Float32Array(weldedInterior.attributes.position.array);
  const interiorWallsIndices = new Uint32Array(weldedInterior.index ? weldedInterior.index.array : []);

  const mergedWallsRaw = mergeGeometries(wallGeoms);
  const weldedWalls = mergeVertices(mergedWallsRaw, 0.001);
  const wallsVertices = new Float32Array(weldedWalls.attributes.position.array);
  const wallsIndices = new Uint32Array(weldedWalls.index ? weldedWalls.index.array : []);

  // Unified monolithic geometry (floor + walls + rims merged into one single continuous mesh)
  const unifiedRaw = mergeGeometries([floorGeom, ...wallGeoms]);
  const unified = mergeVertices(unifiedRaw, 0.001);
  const unifiedVertices = new Float32Array(unified.attributes.position.array);
  const unifiedIndices = new Uint32Array(unified.index ? unified.index.array : []);

  // Dispose temporary geometries to prevent memory leaks
  floorGeom.dispose();
  interiorGeoms.forEach((g) => g.dispose());
  mergedInteriorRaw.dispose();
  weldedInterior.dispose();
  wallGeoms.forEach((g) => g.dispose());
  mergedWallsRaw.dispose();
  weldedFloor.dispose();
  weldedWalls.dispose();
  unifiedRaw.dispose();
  unified.dispose();

  return {
    unifiedVertices,
    unifiedIndices,
    floorVertices,
    floorIndices,
    wallsVertices,
    wallsIndices,
    interiorWallsVertices,
    interiorWallsIndices,
    convexHulls,
    floorConvexHull,
  };
}

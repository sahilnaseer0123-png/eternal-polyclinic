import type { CSSProperties } from "react";

type Point2D = readonly [number, number];

interface PathSpec {
  readonly key: string;
  readonly d: string;
  readonly cls: string;
  readonly order: number;
}

interface FloatGroupSpec {
  readonly key: string;
  readonly index: number;
  readonly paths: readonly PathSpec[];
}

interface HeroClinicalScene {
  readonly viewBox: string;
  readonly width: number;
  readonly height: number;
  readonly gridPaths: readonly PathSpec[];
  readonly floatGroups: readonly FloatGroupSpec[];
  readonly staticPaths: readonly PathSpec[];
}

const ISO_K = Math.sqrt(3) / 2;

const FLOATING_SLIPS: readonly (readonly [number, number, number, number, number])[] = [
  [-276, -24, 68, 42, 54],
  [-242, 38, 22, 32, 42],
  [-216, -62, 112, 30, 38],
  [-192, 8, 56, 46, 60],
  [-168, 58, 10, 32, 42],
  [-148, -40, 34, 26, 34],
  [-128, -2, 100, 36, 46],
  [-102, 24, 28, 30, 40],
];

const fmt = (n: number): string => n.toFixed(1);

const polyPath = (pts: readonly Point2D[], closed = true): string =>
  `${pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)},${fmt(y)}`).join(" ")}${closed ? " Z" : ""}`;

function buildHeroClinicalScene(): HeroClinicalScene {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let order = 0;

  const track = (sx: number, sy: number): Point2D => {
    if (sx < minX) minX = sx;
    if (sy < minY) minY = sy;
    if (sx > maxX) maxX = sx;
    if (sy > maxY) maxY = sy;
    return [sx, sy];
  };

  const p = (x: number, y: number, z = 0): Point2D =>
    track((x - y) * ISO_K, (x + y) / 2 - z);

  const at = (a: number, b: number): readonly [number, number] => [a + b, -a + b];

  const gridPaths: PathSpec[] = [];
  const floatGroups: FloatGroupSpec[] = [];
  const staticPaths: PathSpec[] = [];

  const pushPath = (list: PathSpec[], d: string, cls = "ln", prefix = "p") => {
    const idx = order++;
    list.push({ key: `${prefix}-${idx}`, d, cls, order: idx });
  };

  const addSlab = (
    list: PathSpec[],
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    cls = "ln",
    prefix = "slab"
  ) => {
    // Front-left face (y + dy)
    pushPath(
      list,
      polyPath([
        p(x, y + dy, z),
        p(x + dx, y + dy, z),
        p(x + dx, y + dy, z + dz),
        p(x, y + dy, z + dz),
      ]),
      cls,
      prefix
    );
    // Front-right face (x + dx)
    pushPath(
      list,
      polyPath([
        p(x + dx, y, z),
        p(x + dx, y + dy, z),
        p(x + dx, y + dy, z + dz),
        p(x + dx, y, z + dz),
      ]),
      cls,
      prefix
    );
    // Top face (z + dz)
    pushPath(
      list,
      polyPath([
        p(x, y, z + dz),
        p(x + dx, y, z + dz),
        p(x + dx, y + dy, z + dz),
        p(x, y + dy, z + dz),
      ]),
      cls,
      prefix
    );
  };

  // 1. 6x6 faint isometric floor grid centered beneath the confirmed stack at(228, 52)
  const [gx, gy] = at(228, 52);
  const gridStep = 26;
  const gridSpan = gridStep * 3;
  for (let i = -3; i <= 3; i++) {
    const offset = i * gridStep;
    pushPath(
      gridPaths,
      polyPath([p(gx - gridSpan, gy + offset, 0), p(gx + gridSpan, gy + offset, 0)], false),
      "ln faint open",
      "grid-x"
    );
    pushPath(
      gridPaths,
      polyPath([p(gx + offset, gy - gridSpan, 0), p(gx + offset, gy + gridSpan, 0)], false),
      "ln faint open",
      "grid-y"
    );
  }

  // 2. Eight floating patient intake & diagnostic slips (--f: 0..7)
  FLOATING_SLIPS.forEach(([a, b, z, w, h], idx) => {
    const [sx, sy] = at(a, b);
    const x0 = sx - w / 2;
    const x1 = sx + w / 2;
    const slipPaths: PathSpec[] = [];

    // Sheet body in upright XZ plane
    pushPath(
      slipPaths,
      polyPath([p(x0, sy, z), p(x1, sy, z), p(x1, sy, z + h), p(x0, sy, z + h)]),
      idx === 3 ? "ln card" : "ln",
      `slip-${idx}`
    );

    // Top medical header rule + 2-3 summary lines inside sheet
    const padX = Math.max(4, w * 0.16);
    const topZ = z + h - Math.max(8, h * 0.2);
    const headerCls = idx === 3 ? "ln accent open" : "ln thin open";
    pushPath(
      slipPaths,
      polyPath([p(x0 + padX, sy, topZ), p(x0 + w * 0.52, sy, topZ)], false),
      headerCls,
      `slip-${idx}-hdr`
    );

    const lineCount = h >= 44 ? 3 : 2;
    for (let li = 0; li < lineCount; li++) {
      const lz = topZ - (li + 1) * Math.max(6.5, h * 0.17);
      const frac = li === lineCount - 1 ? 0.56 : 0.78;
      pushPath(
        slipPaths,
        polyPath([p(x0 + padX, sy, lz), p(x0 + w * frac, sy, lz)], false),
        "ln thin open",
        `slip-${idx}-ln${li}`
      );
    }

    floatGroups.push({
      key: `float-${idx}`,
      index: idx,
      paths: slipPaths,
    });
  });

  // 3. Dashed flow connectors converging from slips into the diagnostic ECG scanner
  const [endX, endY] = at(-6, 6);
  const flowSources: readonly (readonly [number, number, number])[] = [
    [-52, -30, 108],
    [-52, 8, 72],
    [-52, 34, 34],
  ];
  flowSources.forEach(([fa, fb, fz], idx) => {
    const [fx, fy] = at(fa, fb);
    const [p0x, p0y] = p(fx, fy, fz);
    const [p1x, p1y] = p(endX, endY, 72);
    const ctrlX = (p0x + p1x) / 2;
    const ctrlY = p0y * 0.65 + p1y * 0.35;
    pushPath(
      staticPaths,
      `M${fmt(p0x)},${fmt(p0y)} Q${fmt(ctrlX)},${fmt(ctrlY)} ${fmt(p1x)},${fmt(p1y)}`,
      "ln flow open",
      `flow-in-${idx}`
    );
  });

  // 4. Upright isometric diagnostic scanner frame at(28, 8)
  const [lx, ly] = at(28, 8);
  const faceY = ly + 6;
  const centerZ = 75;
  addSlab(staticPaths, lx - 58, ly, 0, 116, 6, 150, "ln", "frame");

  // Concentric 48-segment diagnostic rings on the upright front face
  const ringSegments = 48;
  for (const [rIdx, radius] of ([44, 28] as const).entries()) {
    const pts: Point2D[] = [];
    for (let i = 0; i < ringSegments; i++) {
      const angle = (i / ringSegments) * Math.PI * 2;
      pts.push(p(lx + radius * Math.cos(angle), faceY, centerZ + radius * Math.sin(angle)));
    }
    pushPath(
      staticPaths,
      polyPath(pts, true),
      rIdx === 0 ? "ln thin open" : "ln faint open",
      `ring-${radius}`
    );
  }

  // Four cardinal calibration ticks on the outer diagnostic ring
  for (let ti = 0; ti < 4; ti++) {
    const angle = (ti * Math.PI) / 2;
    const inner = p(lx + 40 * Math.cos(angle), faceY, centerZ + 40 * Math.sin(angle));
    const outer = p(lx + 50 * Math.cos(angle), faceY, centerZ + 50 * Math.sin(angle));
    pushPath(staticPaths, polyPath([inner, outer], false), "ln thin open", `tick-${ti}`);
  }

  // Isometric P-Q-R-S-T ECG heartbeat waveform across the diagnostic panel
  const ecgPoints: readonly (readonly [number, number])[] = [
    [-48, 0],
    [-26, 0],
    [-20, 6],
    [-14, 0],
    [-9, -6],
    [-3, 27],
    [4, -15],
    [10, 0],
    [18, 9],
    [26, 0],
    [48, 0],
  ];
  const ecgD = polyPath(
    ecgPoints.map(([dx, dz]) => p(lx + dx, faceY, centerZ + dz)),
    false
  );
  pushPath(staticPaths, ecgD, "ln ecg-base open", "ecg-base");
  pushPath(staticPaths, ecgD, "ln ecg-pulse open", "ecg-pulse");

  // 5. Outlet dashed flow path from diagnostic panel to confirmed stack
  const [out0x, out0y] = at(70, 10);
  const [out1x, out1y] = at(154, 42);
  const sOut0 = p(out0x, out0y, 75);
  const sOut1 = p(out1x, out1y, 62);
  const outCtrlX = (sOut0[0] + sOut1[0]) / 2;
  const outCtrlY = Math.min(sOut0[1], sOut1[1]) - 14;
  pushPath(
    staticPaths,
    `M${fmt(sOut0[0])},${fmt(sOut0[1])} Q${fmt(outCtrlX)},${fmt(outCtrlY)} ${fmt(sOut1[0])},${fmt(sOut1[1])}`,
    "ln flow open",
    "flow-out"
  );

  // 6. Confirmed 4-slab appointment & diagnostic report stack at(228, 52)
  const [rx, ry] = at(228, 52);
  const stackW = 98;
  const stackD = 122;
  const stackLevels = [0, 13, 26, 39] as const;
  stackLevels.forEach((sz, idx) => {
    const isTop = idx === stackLevels.length - 1;
    addSlab(
      staticPaths,
      rx - stackW / 2,
      ry - stackD / 2,
      sz,
      stackW,
      stackD,
      8,
      isTop ? "ln hot" : "ln",
      `stack-${idx}`
    );
  });

  // Top surface details on confirmed sapphire slab (z = 47)
  const topSurfaceZ = 47;
  const cardLeftX = rx - stackW / 2 + 16;
  const cardRightX = rx + stackW / 2 - 16;

  // Confirmation checkmark badge at top-left quadrant of top slab
  pushPath(
    staticPaths,
    polyPath(
      [
        p(rx - 22, ry - 30, topSurfaceZ),
        p(rx - 14, ry - 20, topSurfaceZ),
        p(rx + 6, ry - 40, topSurfaceZ),
      ],
      false
    ),
    "ln accent open",
    "confirm-check"
  );

  // Four ruled consultation summary lines across the top slab
  const ruleOffsets = [-4, 10, 24, 38] as const;
  ruleOffsets.forEach((dyOff, rIdx) => {
    const endXRule = rIdx === 3 ? rx + 12 : cardRightX;
    pushPath(
      staticPaths,
      polyPath(
        [p(cardLeftX, ry + dyOff, topSurfaceZ), p(endXRule, ry + dyOff, topSurfaceZ)],
        false
      ),
      "ln thin open",
      `confirm-ln-${rIdx}`
    );
  });

  const pad = 16;
  const vx = minX - pad;
  const vy = minY - pad;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  return {
    viewBox: `${fmt(vx)} ${fmt(vy)} ${fmt(vw)} ${fmt(vh)}`,
    width: Math.round(vw),
    height: Math.round(vh),
    gridPaths,
    floatGroups,
    staticPaths,
  };
}

const HERO_SCENE = buildHeroClinicalScene();

function renderPaths(paths: readonly PathSpec[]) {
  return paths.map((node) => (
    <path
      key={node.key}
      d={node.d}
      className={node.cls}
      pathLength={1}
      style={{ "--d": node.order } as CSSProperties}
    />
  ));
}

/**
 * Deterministic TAMYIZ-style isometric Clinical & Live ECG Hero Illustration.
 */
export function HeroClinicalArt() {
  return (
    <svg
      className="ep-il ep-il-hero h-auto w-full max-w-none select-none overflow-visible"
      viewBox={HERO_SCENE.viewBox}
      width={HERO_SCENE.width}
      height={HERO_SCENE.height}
      fill="none"
      aria-hidden="true"
      focusable={false}
    >
      <g className="il-grid">{renderPaths(HERO_SCENE.gridPaths)}</g>
      {HERO_SCENE.floatGroups.map((group) => (
        <g
          key={group.key}
          className="il-float"
          style={{ "--f": group.index } as CSSProperties}
        >
          {renderPaths(group.paths)}
        </g>
      ))}
      <g className="il-main">{renderPaths(HERO_SCENE.staticPaths)}</g>
    </svg>
  );
}

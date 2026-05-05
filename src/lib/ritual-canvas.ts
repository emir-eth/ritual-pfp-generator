export type FrameStyle = "minimal" | "sigil" | "terminal";

export interface CanvasEffectOptions {
  glitch: number;
  contrast: number;
}

export interface ProfileCardSpec {
  frameStyle: FrameStyle;
  /** null → render ANONYMOUS RITUAL */
  handleDisplay: string | null;
  /** Discord username / display — null hides second line. */
  discordDisplay: string | null;
  ritualName: string;
  rarity: string;
  seedHex: string;
  variation: number;
  /** Drives repeatable noise / glitch */
  effectSeed: number;
}

const OUTPUT = 1024;
const M = 36;

function drawImageCoverFull(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const scale = Math.max(w / nw, h / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyContrast(data: ImageData, amount: number): void {
  const a = clamp(amount, 0, 1);
  const f = 1 + a * 1.25;
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i] = clamp((data.data[i]! - 128) * f + 128, 0, 255);
    data.data[i + 1] = clamp((data.data[i + 1]! - 128) * f + 128, 0, 255);
    data.data[i + 2] = clamp((data.data[i + 2]! - 128) * f + 128, 0, 255);
  }
}

function applyGlitchSeeded(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number,
  rng: () => number,
) {
  if (strength <= 0.01) return;
  const strips = Math.floor(3 + strength * 12);
  for (let i = 0; i < strips; i++) {
    const y = Math.floor(rng() * (h - 6));
    const hh = 2 + Math.floor(rng() * 7);
    const shift = Math.floor((rng() - 0.5) * 22 * strength);
    try {
      const slice = ctx.getImageData(0, y, w, hh);
      ctx.putImageData(slice, shift, y);
    } catch {
      /* skip strip if pixel readback fails */
    }
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}

function drawFrameMinimal(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(220,215,205,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(M - 1, M - 1, w - 2 * M + 2, h - 2 * M + 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(M + 6, M + 6, w - 2 * M - 12, h - 2 * M - 12);
}

function drawFrameSigil(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const inset = M;
  const L = 44;
  const t = 2;
  ctx.strokeStyle = "rgba(201,162,39,0.55)";
  ctx.lineWidth = t;

  const corners: [number, number, number, number][] = [
    [inset, inset, 1, 0],
    [inset, inset, 0, 1],
    [w - inset, inset, -1, 0],
    [w - inset, inset, 0, 1],
    [inset, h - inset, 1, 0],
    [inset, h - inset, 0, -1],
    [w - inset, h - inset, -1, 0],
    [w - inset, h - inset, 0, -1],
  ];

  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * L);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * L, cy);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(230,225,215,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 10, inset + 10, w - 2 * inset - 20, h - 2 * inset - 20);

  ctx.strokeStyle = "rgba(201,162,39,0.2)";
  for (let i = 0; i < 5; i++) {
    const o = 80 + i * 28;
    ctx.beginPath();
    ctx.moveTo(inset + o, inset + 18);
    ctx.lineTo(inset + o + 12, inset + 18);
    ctx.stroke();
  }
}

function drawFrameTerminal(ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number) {
  const inset = M;
  ctx.strokeStyle = "rgba(160,200,160,0.35)";
  ctx.lineWidth = 1;
  const seg = 52;
  for (let x = inset; x < w - inset; x += seg) {
    if (rng() > 0.25) {
      ctx.beginPath();
      ctx.moveTo(x, inset);
      ctx.lineTo(Math.min(x + seg * 0.65, w - inset), inset);
      ctx.stroke();
    }
  }
  for (let x = inset; x < w - inset; x += seg) {
    if (rng() > 0.3) {
      ctx.beginPath();
      ctx.moveTo(x, h - inset);
      ctx.lineTo(Math.min(x + seg * 0.55, w - inset), h - inset);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.setLineDash([6, 10]);
  ctx.strokeRect(inset + 4, inset + 4, w - 2 * inset - 8, h - 2 * inset - 8);
  ctx.setLineDash([]);
}

function drawIdentityPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spec: ProfileCardSpec,
) {
  const plateTop = h * 0.74;
  const plateH = h - plateTop - M + 8;

  const plateGrad = ctx.createLinearGradient(0, plateTop, 0, h);
  plateGrad.addColorStop(0, "rgba(6,6,10,0.02)");
  plateGrad.addColorStop(0.15, "rgba(4,4,8,0.78)");
  plateGrad.addColorStop(1, "rgba(2,2,6,0.92)");
  ctx.fillStyle = plateGrad;
  ctx.fillRect(0, plateTop, w, plateH + M);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(M, plateTop + 8, w - 2 * M, 1);

  const xDisplay = spec.handleDisplay ?? "ANONYMOUS RITUAL";
  const isAnonX = !spec.handleDisplay;
  const discordLine = spec.discordDisplay ?? "—";

  const colHalf = (w - 2 * M) / 2;
  const maxLeftW = colHalf - 36;
  const maxRightW = colHalf - 36;
  const truncateForCanvas = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string => {
    if (!text || ctx.measureText(text).width <= maxW) return text;
    const ell = "…";
    for (let len = text.length - 1; len >= 0; len--) {
      const candidate = text.slice(0, len) + ell;
      if (ctx.measureText(candidate).width <= maxW) return candidate;
    }
    return ell;
  };

  ctx.textBaseline = "middle";

  const leftCx = M + colHalf / 2;
  const rightCx = M + colHalf + colHalf / 2;
  const yLabel = plateTop + plateH * 0.17;
  const yVal = plateTop + plateH * 0.29;

  const labelSize = Math.round(h * 0.018);
  const valueSize = Math.round(h * 0.031);

  ctx.textAlign = "center";
  ctx.font = `600 ${labelSize}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillStyle = "rgba(201,162,39,0.92)";
  ctx.fillText("X", leftCx, yLabel);

  ctx.font = `600 ${valueSize}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillStyle = isAnonX ? "rgba(200,195,185,0.88)" : "#f7f4ee";
  ctx.fillText(truncateForCanvas(ctx, xDisplay, maxLeftW), leftCx, yVal);

  ctx.font = `600 ${labelSize}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillStyle = "rgba(165,180,252,0.95)";
  ctx.fillText("DISCORD", rightCx, yLabel);

  ctx.font = `600 ${valueSize}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillStyle = spec.discordDisplay ? "#eef0ff" : "rgba(160,155,148,0.55)";
  ctx.fillText(truncateForCanvas(ctx, discordLine, maxRightW), rightCx, yVal);

  const divY = plateTop + plateH * 0.42;
  ctx.strokeStyle = "rgba(201,162,39,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M + 28, divY);
  ctx.lineTo(w - M - 28, divY);
  ctx.stroke();

  const metaY = plateTop + plateH * 0.78;
  const metaFont = `${Math.round(h * 0.016)}px "Geist Mono", ui-monospace, monospace`;
  ctx.font = metaFont;
  ctx.fillStyle = "rgba(168,164,156,0.88)";

  ctx.textAlign = "left";
  const leftLabel = `RARITY  ${spec.rarity.toUpperCase()}`;
  ctx.fillText(leftLabel, M + 18, metaY);

  ctx.textAlign = "center";
  ctx.fillText("RITUAL IDENTITY", w / 2, metaY);

  ctx.textAlign = "right";
  const rightMeta = `SEED  ${spec.seedHex.toUpperCase()}  ·  VAR ${spec.variation}`;
  ctx.fillText(rightMeta, w - M - 18, metaY);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(120,118,112,0.58)";
  ctx.font = `${Math.round(h * 0.014)}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillText(spec.ritualName.toUpperCase(), w / 2, plateTop + plateH * 0.93);
}

/**
 * Renders a 1:1 Ritual profile card (downloadable PNG).
 */
export async function renderRitualProfileCard(
  imageUrl: string,
  canvas: HTMLCanvasElement,
  effects: CanvasEffectOptions,
  spec: ProfileCardSpec,
): Promise<void> {
  const img = await loadImage(imageUrl);
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (nw < 1 || nh < 1) {
    throw new Error(`Image has no drawable dimensions: ${imageUrl}`);
  }

  const w = OUTPUT;
  const h = OUTPUT;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");

  const rng = createRng(spec.effectSeed ^ 0x51ed);

  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, w, h);
  drawImageCoverFull(ctx, img, w, h);

  try {
    const imageData = ctx.getImageData(0, 0, w, h);
    applyContrast(imageData, effects.contrast);
    ctx.putImageData(imageData, 0, 0);
  } catch {
    /* keep pixels if readback fails */
  }
  if (spec.frameStyle === "terminal") {
    drawScanlines(ctx, w, h, 0.12);
  }
  applyGlitchSeeded(ctx, w, h, effects.glitch * (spec.frameStyle === "terminal" ? 1.15 : 1), rng);

  if (spec.frameStyle === "minimal") {
    drawFrameMinimal(ctx, w, h);
  } else if (spec.frameStyle === "sigil") {
    drawFrameSigil(ctx, w, h);
  } else {
    drawFrameTerminal(ctx, w, h, rng);
    ctx.fillStyle = "rgba(140,200,140,0.45)";
    ctx.textAlign = "left";
    ctx.font = `${Math.round(h * 0.018)}px "Geist Mono", ui-monospace, monospace`;
    ctx.fillText(`RIT_ID · VAR ${spec.variation}`, M + 12, M + 22);
  }
  if (spec.frameStyle === "terminal") {
    drawScanlines(ctx, w, h, 0.08);
  }

  drawIdentityPlate(ctx, w, h, spec);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = document.createElement("img");
    let settled = false;
    let finishStarted = false;

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(msg));
    };

    const finishOk = async () => {
      if (settled || finishStarted) return;
      finishStarted = true;
      const width = im.naturalWidth || im.width;
      const height = im.naturalHeight || im.height;
      if (width < 1 || height < 1) {
        fail(`Image has no usable pixels: ${src}`);
        return;
      }
      try {
        await im.decode();
      } catch {
        /* bitmap may still be drawable */
      }
      if (settled) return;
      settled = true;
      resolve(im);
    };

    im.onload = () => void finishOk();
    im.onerror = () => fail(`Failed to load image: ${src}`);
    im.src = src;
  });
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      1,
    );
  });
}

export const EXPORT_SIZE = OUTPUT;

import { canvasToPngBlob } from "@/lib/ritual-canvas";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const r = reader.result;
      if (typeof r === "string") resolve(r);
      else reject(new Error("readAsDataURL failed"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

/** Builds `data:application/json;base64,...` tokenURI from the forged card canvas (current pixels). */
export async function buildDataUriTokenUriFromCardCanvas(canvas: HTMLCanvasElement): Promise<string> {
  // Shrink + JPEG-compress before embedding to keep calldata/storage costs manageable.
  const downscaled = document.createElement("canvas");
  const target = Math.min(512, Math.max(256, Math.min(canvas.width || 1024, canvas.height || 1024)));
  downscaled.width = target;
  downscaled.height = target;
  const ctx = downscaled.getContext("2d");
  if (!ctx) throw new Error("Could not prepare metadata image canvas");
  ctx.drawImage(canvas, 0, 0, target, target);

  let blob: Blob;
  try {
    blob = await new Promise<Blob>((resolve, reject) => {
      downscaled.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not export compressed image blob"))),
        "image/jpeg",
        0.78,
      );
    });
  } catch {
    // Fallback to PNG if the browser fails JPEG export.
    blob = await canvasToPngBlob(downscaled);
  }
  const imageDataUrl = await blobToDataUrl(blob);

  const metadata = {
    name: "Ritual PFP",
    description: "Generated on Ritual PFP System",
    image: imageDataUrl,
  };

  const json = JSON.stringify(metadata);
  const jsonBase64 = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${jsonBase64}`;
}

const MINTED_STORAGE_KEY = "ritual-pfp-minted-v1";

export type StoredMintEntry = {
  tokenId: string;
  txHash: string;
  at: number;
};

export function loadStoredMints(): StoredMintEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MINTED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is StoredMintEntry =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as StoredMintEntry).tokenId === "string" &&
        typeof (x as StoredMintEntry).txHash === "string" &&
        typeof (x as StoredMintEntry).at === "number",
    );
  } catch {
    return [];
  }
}

export function appendStoredMint(entry: StoredMintEntry): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadStoredMints();
    prev.push(entry);
    window.localStorage.setItem(MINTED_STORAGE_KEY, JSON.stringify(prev));
  } catch {
    /* ignore quota / privacy mode */
  }
}

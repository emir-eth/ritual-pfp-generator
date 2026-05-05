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
  const blob = await canvasToPngBlob(canvas);
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

function shortCanvasFingerprint(canvas: HTMLCanvasElement): string {
  const size = 16;
  const probe = document.createElement("canvas");
  probe.width = size;
  probe.height = size;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "unknown";
  ctx.drawImage(canvas, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let h = 5381;
  for (let i = 0; i < data.length; i += 13) {
    h = ((h << 5) + h) ^ data[i];
    h = ((h << 5) + h) ^ data[i + 1];
    h = ((h << 5) + h) ^ data[i + 2];
  }
  return `0x${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function compactOnchainSvg(fingerprint: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'><rect width='256' height='256' fill='#10151f'/><text x='128' y='122' text-anchor='middle' font-family='monospace' font-size='18' fill='#d4af37'>RITUAL</text><text x='128' y='145' text-anchor='middle' font-family='monospace' font-size='10' fill='#8ca0bf'>${fingerprint}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Builds `data:application/json;base64,...` tokenURI from the forged card canvas (current pixels). */
export async function buildDataUriTokenUriFromCardCanvas(canvas: HTMLCanvasElement): Promise<string> {
  const fingerprint = shortCanvasFingerprint(canvas);
  const imageDataUrl = compactOnchainSvg(fingerprint);

  const metadata = {
    name: `Ritual #${fingerprint.slice(-4)}`,
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

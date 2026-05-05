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
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#090c12'/><stop offset='1' stop-color='#141a24'/></linearGradient></defs><rect width='512' height='512' fill='url(#g)'/><text x='256' y='228' text-anchor='middle' font-family='monospace' font-size='36' fill='#d4af37'>RITUAL PFP</text><text x='256' y='286' text-anchor='middle' font-family='monospace' font-size='20' fill='#8ca0bf'>${fingerprint}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Builds `data:application/json;base64,...` tokenURI from the forged card canvas (current pixels). */
export async function buildDataUriTokenUriFromCardCanvas(canvas: HTMLCanvasElement): Promise<string> {
  const fingerprint = shortCanvasFingerprint(canvas);
  const imageDataUrl = compactOnchainSvg(fingerprint);

  const metadata = {
    name: "Ritual PFP",
    description: "Compact on-chain metadata minted from Ritual Forge.",
    image: imageDataUrl,
    attributes: [{ trait_type: "Card Fingerprint", value: fingerprint }],
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

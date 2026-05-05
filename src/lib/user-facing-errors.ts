/**
 * Maps wallet / RPC / contract errors to short copy for end users (no dev jargon).
 */
export function mintErrorMessageForUser(err: unknown): string {
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.name, err.message);
    const c = (err as Error & { cause?: unknown }).cause;
    if (c instanceof Error) parts.push(c.message);
  } else if (typeof err === "string") {
    parts.push(err);
  } else if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.shortMessage === "string") parts.push(o.shortMessage);
    if (typeof o.message === "string") parts.push(o.message);
    if (typeof o.details === "string") parts.push(o.details);
  }
  const blob = parts.join(" ").toLowerCase();

  if (
    blob.includes("user rejected") ||
    blob.includes("rejected the request") ||
    blob.includes("user denied") ||
    blob.includes("4001") ||
    blob.includes("action_rejected")
  ) {
    return "You cancelled the request in your wallet.";
  }
  if (blob.includes("insufficient funds") || blob.includes("insufficient balance")) {
    return "Not enough RITUAL for gas. Top up from the faucet and try again — some RPCs also mislabel other failures as “insufficient funds”.";
  }
  if (blob.includes("chain mismatch") || blob.includes("wrong network") || blob.includes("incorrect chain")) {
    return "Switch your wallet to Ritual (chain 1979), then try again.";
  }
  if (
    blob.includes("out of gas") ||
    blob.includes("ran out of gas") ||
    blob.includes("intrinsic gas too low")
  ) {
    return "The transaction ran out of gas or the calldata is very large. Try minting again; if it persists, use a lighter card preview.";
  }
  if (
    blob.includes("transaction too large") ||
    blob.includes("oversized data") ||
    blob.includes("tx too big") ||
    blob.includes("response too large")
  ) {
    return "The token payload may be hitting network limits. Try again with a smaller card or simpler artwork.";
  }
  if (blob.includes("reverted") || blob.includes("execution reverted") || blob.includes("transaction failed")) {
    return "The transaction did not complete on-chain. Try again in a moment.";
  }
  if (blob.includes("gas") && (blob.includes("limit") || blob.includes("too low"))) {
    return "Gas limit was too low. Try again and let your wallet re-estimate, or refresh the page.";
  }
  if (blob.includes("rate limit") || blob.includes("too many requests") || blob.includes("timeout")) {
    return "The network is busy. Wait a few seconds and try again.";
  }
  if (blob.includes("nonce")) {
    return "Wallet may be out of sync. Open your wallet, wait a moment, then try minting again.";
  }
  if (blob.includes("internal json-rpc") || blob.includes("rpc error")) {
    return "Network is temporarily unavailable. Please try again.";
  }

  return "Mint could not finish. Please try again shortly.";
}

export function cardExportErrorMessageForUser(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("toblob") || msg.includes("tainted") || msg.includes("canvas")) {
    return "Could not export the card image from your browser. Try another browser or relax strict blocking for this site.";
  }
  return "Could not prepare the image for minting. Try again.";
}

/** Card render on canvas — same sensible defaults as export. */
export function cardRenderErrorMessageForUser(err: unknown): string {
  return cardExportErrorMessageForUser(err);
}

export function portraitDownloadErrorMessageForUser(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("http") || msg.includes("fetch") || msg.includes("network")) {
    return "Could not download the portrait. Check your connection and try again.";
  }
  return "Could not download the portrait.";
}

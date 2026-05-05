"use client";

import type {
  Archetype,
  Aura,
  Element,
  Intensity,
  RitualImageMeta,
  Style,
} from "@data/images";
import { ARCHETYPES, AURAS, ELEMENTS, INTENSITIES, STYLES } from "@data/images";
import {
  type CanvasEffectOptions,
  canvasToPngBlob,
  type FrameStyle,
  renderRitualProfileCard,
} from "@/lib/ritual-canvas";
import {
  deriveRitualSeed,
  formatDiscordForDisplay,
  formatHandleForDisplay,
  formatSeed,
  generateRitualName,
  type ForgeChoices,
  normalizeDiscordHandle,
  normalizeXHandle,
  rarityFromScore,
  selectRitualImage,
  type Rarity,
} from "@/lib/ritual-select";
import {
  buildRitualImageMetaRealm,
  deriveRealmSynthSeed,
  forgeChoicesFromRealmSeed,
} from "@/lib/realm-select";
import { MintPfpSection } from "@/components/ritual/mint-pfp-section";
import {
  cardExportErrorMessageForUser,
  cardRenderErrorMessageForUser,
  portraitDownloadErrorMessageForUser,
} from "@/lib/user-facing-errors";
import { REALM_WORLD_LABEL, REALM_WORLDS, type RealmWorld } from "@data/realm-worlds";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Step = "form" | "generating" | "result";

interface BindingGenBundle {
  kind: "binding";
  choices: ForgeChoices;
  handleNorm: string;
  discordNorm: string;
  frameStyle: FrameStyle;
  variation: number;
}

interface RealmGenBundle {
  kind: "realm";
  world: RealmWorld;
  randomRunIndex: number;
  handleNorm: string;
  discordNorm: string;
  frameStyle: FrameStyle;
}

type ActiveGenBundle = BindingGenBundle | RealmGenBundle;

function validateSocialHandles(
  xRaw: string,
  dRaw: string,
): { ok: true; xNorm: string; dNorm: string } | { ok: false; message: string } {
  const xNorm = normalizeXHandle(xRaw);
  const dNorm = normalizeDiscordHandle(dRaw);
  if (!xNorm) return { ok: false, message: "Enter your X handle." };
  if (xNorm.length < 2) return { ok: false, message: "X handle must be at least 2 characters." };
  if (!dNorm) return { ok: false, message: "Enter your Discord username." };
  if (dNorm.length < 2) return { ok: false, message: "Discord username must be at least 2 characters." };
  return { ok: true, xNorm, dNorm };
}

interface ResultContext {
  bundle: ActiveGenBundle;
  image: RitualImageMeta;
  name: string;
  rarity: Rarity;
  synthSeed: number;
  /** When the realm folder had no usable PNG files, image is served from the root ritual pool. */
  realmFallbackToBinding?: boolean;
}

function resultImageApiUrl(ctx: ResultContext): string {
  if (ctx.bundle.kind === "realm" && !ctx.realmFallbackToBinding) {
    return `/api/ritual-image/${ctx.bundle.world}/${ctx.image.file}`;
  }
  return `/api/ritual-image/${ctx.image.file}`;
}

function cardVariationForRender(bundle: ActiveGenBundle): number {
  if (bundle.kind === "binding") return bundle.variation;
  return bundle.randomRunIndex;
}

const ARCHETYPE_LABEL: Record<Archetype, string> = {
  oracle: "Oracle",
  warden: "Warden",
  phantom: "Phantom",
  sovereign: "Sovereign",
  martyr: "Martyr",
  harbinger: "Harbinger",
  revenant: "Revenant",
  herald: "Herald",
  architect: "Architect",
  scion: "Scion",
};

const ELEMENT_LABEL: Record<Element, string> = {
  fire: "Ember (Fire)",
  water: "Tides (Water)",
  earth: "Stone (Earth)",
  air: "Gale (Air)",
  void: "Abyss (Void)",
  storm: "Storm (Thunder)",
  ice: "Rime (Ice)",
  shadow: "Gloom (Shadow)",
};

const INTENSITY_LABEL: Record<Intensity, string> = {
  dormant: "Dormant — hush",
  low: "Low — whisper",
  medium: "Medium — storm",
  high: "High — cataclysm",
  primordial: "Primordial — myth",
};

const AURA_LABEL: Record<Aura, string> = {
  aggressive: "Aggressive",
  mysterious: "Mysterious",
  divine: "Divine",
  corrupted: "Corrupted",
  silent: "Silent",
  serene: "Serene",
  volatile: "Volatile",
  cryptic: "Cryptic",
  radiant: "Radiant",
};

const STYLE_LABEL: Record<Style, string> = {
  clean: "Clean",
  glitch: "Glitch",
  heavy: "Heavy",
  minimal: "Minimal",
  noir: "Noir",
  neon: "Neon",
  etched: "Etched",
};

const FRAME_OPTIONS: { value: FrameStyle; label: string }[] = [
  { value: "minimal", label: "Minimal" },
  { value: "sigil", label: "Sigil" },
  { value: "terminal", label: "Terminal" },
];

const SYNTH_MESSAGES = [
  "Reading social signature...",
  "Hashing ritual handle...",
  "Mapping identity traits...",
  "Tuning aura resonance field...",
  "Locking presentation manifold...",
  "Constructing visual sigil...",
  "Rendering profile frame...",
  "Stabilizing final avatar...",
];

const FRAME_LABEL: Record<FrameStyle, string> = {
  minimal: "Minimal",
  sigil: "Sigil",
  terminal: "Terminal",
};

function randomRitualIdentityFilename(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0;
  }
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `ritual-identity-0x${hex}.png`;
}

export function ForgeClient() {
  const [step, setStep] = useState<Step>("form");
  const [archetype, setArchetype] = useState<Archetype>("oracle");
  const [element, setElement] = useState<Element>("void");
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [aura, setAura] = useState<Aura>("mysterious");
  /** Empty string = auto (omit style axis in matcher). */
  const [stylePick, setStylePick] = useState<"" | Style>("");
  const [xHandleInput, setXHandleInput] = useState("");
  const [discordInput, setDiscordInput] = useState("");
  const [bindingSocialError, setBindingSocialError] = useState<string | null>(null);
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("sigil");

  const [activeGen, setActiveGen] = useState<ActiveGenBundle | null>(null);
  const [resultCtx, setResultCtx] = useState<ResultContext | null>(null);

  const [seedDisplay, setSeedDisplay] = useState(0);
  const [progress, setProgress] = useState(0);
  /** Increments each synth run so the progress bar remounts (no width transition from 100% → 0%). */
  const [synthRunId, setSynthRunId] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const genStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [effects, setEffects] = useState<CanvasEffectOptions>({
    glitch: 0.22,
    contrast: 0.36,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCompletedRef = useRef<ActiveGenBundle | null>(null);
  const realmRandomRunRef = useRef(0);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  /** Bumps after the result canvas finishes a successful draw (for mint gas prefetch). */
  const [cardRenderEpoch, setCardRenderEpoch] = useState(0);

  const [realmHandleInput, setRealmHandleInput] = useState("");
  const [realmDiscordInput, setRealmDiscordInput] = useState("");
  const [realmSocialError, setRealmSocialError] = useState<string | null>(null);
  const [realmWorld, setRealmWorld] = useState<RealmWorld>("ocean");

  const pushTerminal = useCallback((line: string) => {
    setTerminalLines((prev) => [...prev.slice(-48), line]);
  }, []);

  useEffect(() => {
    if (step !== "generating" || !activeGen) return;
    let cancelled = false;
    const bundle = activeGen;
    const synthSeed =
      bundle.kind === "binding"
        ? deriveRitualSeed(bundle.handleNorm, bundle.choices, bundle.variation)
        : deriveRealmSynthSeed(bundle.handleNorm, bundle.world, bundle.randomRunIndex);

    setProgress(0);
    genStartRef.current = 0;

    const tick = () => {
      if (cancelled) return;
      const start = genStartRef.current;
      if (start <= 0) return;
      const t = (performance.now() - start) / 6000;
      setProgress(Math.min(100, t * 100));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const boot = window.setTimeout(() => {
      if (cancelled) return;
      setTerminalLines([]);
      setSeedDisplay(synthSeed);
      pushTerminal(`> seed ${formatSeed(synthSeed)}`);
      if (bundle.kind === "binding") {
        pushTerminal(`> aura vector :: ${bundle.choices.aura}`);
        if (bundle.choices.style) {
          pushTerminal(`> style manifold :: ${bundle.choices.style}`);
        } else {
          pushTerminal("> style manifold :: auto");
        }
        pushTerminal(`X: ${formatHandleForDisplay(bundle.handleNorm) ?? "—"}`);
        pushTerminal(`Discord: ${formatDiscordForDisplay(bundle.discordNorm) ?? "—"}`);
      } else {
        const rc = forgeChoicesFromRealmSeed(synthSeed);
        pushTerminal(`> world lock :: ${bundle.world}`);
        pushTerminal("Locking visual realm...");
        pushTerminal("Scanning realm signature...");
        pushTerminal("Binding world layer...");
        pushTerminal(`X: ${formatHandleForDisplay(bundle.handleNorm) ?? "—"}`);
        pushTerminal(`Discord: ${formatDiscordForDisplay(bundle.discordNorm) ?? "—"}`);
        pushTerminal(`> aura vector :: ${rc.aura}`);
        if (rc.style) {
          pushTerminal(`> style manifold :: ${rc.style}`);
        } else {
          pushTerminal("> style manifold :: auto");
        }
      }
      genStartRef.current = performance.now();
      setProgress(0);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }, 0);

    let lineIdx = 0;
    const lineTimer = window.setInterval(() => {
      if (cancelled || lineIdx >= SYNTH_MESSAGES.length) return;
      pushTerminal(SYNTH_MESSAGES[lineIdx]!);
      lineIdx += 1;
    }, 520);

    const done = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        setProgress(100);

        const blocked = new Set<string>();
        try {
          const res = await fetch("/api/ritual-cooldown", { cache: "no-store" });
          if (res.ok) {
            const data: unknown = await res.json();
            if (
              data &&
              typeof data === "object" &&
              "blocked" in data &&
              Array.isArray((data as { blocked: unknown }).blocked)
            ) {
              for (const x of (data as { blocked: unknown[] }).blocked) {
                if (typeof x === "string") blocked.add(x);
              }
            }
          }
        } catch {
          // Cooldown fetch failed; selection still runs without global blocks.
        }

        if (cancelled) return;

        if (bundle.kind === "binding") {
          const { image, matchScore: ms } = selectRitualImage(bundle.choices, synthSeed, {
            isImageCooling: (file) => blocked.has(file),
          });

          try {
            await fetch("/api/ritual-assignment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ file: image.file }),
            });
          } catch {
            // Assignment is best-effort.
          }

          if (cancelled) return;
          const name = generateRitualName(bundle.choices, synthSeed);
          const rarity = rarityFromScore(ms, synthSeed);
          lastCompletedRef.current = bundle;
          setResultCtx({
            bundle,
            image,
            name,
            rarity,
            synthSeed,
          });
          setStep("result");
          return;
        }

        let realmFallbackToBinding = false;
        let image: RitualImageMeta;
        let ms: number;

        try {
          const pickRes = await fetch("/api/ritual-realm-pick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              world: bundle.world,
              synthSeed,
              blocked: [...blocked],
            }),
          });
          const pickJson: unknown = pickRes.ok ? await pickRes.json() : null;
          const pick =
            pickJson && typeof pickJson === "object" && pickJson !== null
              ? (pickJson as Record<string, unknown>)
              : null;
          const useFallback =
            !pick ||
            pick.fallback === true ||
            pick.ok !== true ||
            typeof pick.file !== "string";

          if (useFallback) {
            realmFallbackToBinding = true;
            const realmChoices = forgeChoicesFromRealmSeed(synthSeed);
            const picked = selectRitualImage(realmChoices, synthSeed, {
              isImageCooling: (f) => blocked.has(f),
            });
            image = picked.image;
            ms = picked.matchScore;
            try {
              await fetch("/api/ritual-assignment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: image.file }),
              });
            } catch {
              // Assignment is best-effort.
            }
          } else {
            const file = pick.file as string;
            ms = typeof pick.matchScore === "number" ? pick.matchScore : 12;
            try {
              await fetch("/api/ritual-assignment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file, world: bundle.world }),
              });
            } catch {
              // Assignment is best-effort.
            }
            image = buildRitualImageMetaRealm(bundle.world, file, synthSeed);
          }
        } catch {
          realmFallbackToBinding = true;
          const realmChoices = forgeChoicesFromRealmSeed(synthSeed);
          const picked = selectRitualImage(realmChoices, synthSeed, {
            isImageCooling: (f) => blocked.has(f),
          });
          image = picked.image;
          ms = picked.matchScore;
          try {
            await fetch("/api/ritual-assignment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ file: image.file }),
            });
          } catch {
            // Assignment is best-effort.
          }
        }

        if (cancelled) return;
        const realmChoices = forgeChoicesFromRealmSeed(synthSeed);
        const name = generateRitualName(realmChoices, synthSeed);
        const rarity = rarityFromScore(ms, synthSeed);
        lastCompletedRef.current = bundle;
        setResultCtx({
          bundle,
          image,
          name,
          rarity,
          synthSeed,
          realmFallbackToBinding: realmFallbackToBinding || undefined,
        });
        setStep("result");
      })();
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(boot);
      clearInterval(lineTimer);
      clearTimeout(done);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [step, activeGen, pushTerminal]);

  useLayoutEffect(() => {
    if (step !== "result" || !resultCtx) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageUrl = resultImageApiUrl(resultCtx);
    const spec = {
      frameStyle: resultCtx.bundle.frameStyle,
      handleDisplay: formatHandleForDisplay(resultCtx.bundle.handleNorm),
      discordDisplay: formatDiscordForDisplay(resultCtx.bundle.discordNorm),
      ritualName: resultCtx.name,
      rarity: resultCtx.rarity,
      seedHex: formatSeed(resultCtx.synthSeed),
      variation: cardVariationForRender(resultCtx.bundle),
      effectSeed: resultCtx.synthSeed,
    };

    let cancelled = false;
    setCanvasError(null);

    void (async () => {
      try {
        await renderRitualProfileCard(imageUrl, canvas, effects, spec);
        if (!cancelled) {
          setCanvasError(null);
          setCardRenderEpoch((n) => n + 1);
        }
      } catch (e) {
        if (!cancelled) {
          setCanvasError(cardRenderErrorMessageForUser(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, resultCtx, effects]);

  const startGeneration = (bundle: ActiveGenBundle) => {
    setCanvasError(null);
    setSynthRunId((n) => n + 1);
    setProgress(0);
    setActiveGen(bundle);
    setStep("generating");
  };

  const onForge = () => {
    const v = validateSocialHandles(xHandleInput, discordInput);
    if (!v.ok) {
      setBindingSocialError(v.message);
      return;
    }
    setBindingSocialError(null);
    startGeneration({
      kind: "binding",
      choices: {
        archetype,
        element,
        intensity,
        aura,
        style: stylePick === "" ? null : stylePick,
      },
      handleNorm: v.xNorm,
      discordNorm: v.dNorm,
      frameStyle,
      variation: 0,
    });
  };

  const onRealmForge = () => {
    const v = validateSocialHandles(realmHandleInput, realmDiscordInput);
    if (!v.ok) {
      setRealmSocialError(v.message);
      return;
    }
    setRealmSocialError(null);
    realmRandomRunRef.current += 1;
    startGeneration({
      kind: "realm",
      world: realmWorld,
      randomRunIndex: realmRandomRunRef.current,
      handleNorm: v.xNorm,
      discordNorm: v.dNorm,
      frameStyle,
    });
  };

  const onRegenerate = () => {
    const prev = lastCompletedRef.current;
    if (!prev) return;
    if (prev.kind === "binding") {
      startGeneration({
        ...prev,
        variation: prev.variation + 1,
      });
      return;
    }
    startGeneration({
      ...prev,
      randomRunIndex: prev.randomRunIndex + 1,
    });
  };

  const onAgain = () => {
    setStep("form");
    setActiveGen(null);
    setResultCtx(null);
    lastCompletedRef.current = null;
    setProgress(0);
    setTerminalLines([]);
    setCanvasError(null);
    setBindingSocialError(null);
    setRealmSocialError(null);
    setCardRenderEpoch(0);
  };

  /** Raw portrait PNG from the API (no card frame). */
  const downloadRitualPhotoPng = async () => {
    if (!resultCtx) return;
    const imageUrl = resultImageApiUrl(resultCtx);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = randomRitualIdentityFilename();
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setCanvasError(portraitDownloadErrorMessageForUser(e));
    }
  };

  /** Full card PNG using current effect sliders. */
  const downloadCardPng = async () => {
    if (!resultCtx) return;
    const imageUrl = resultImageApiUrl(resultCtx);
    const spec = {
      frameStyle: resultCtx.bundle.frameStyle,
      handleDisplay: formatHandleForDisplay(resultCtx.bundle.handleNorm),
      discordDisplay: formatDiscordForDisplay(resultCtx.bundle.discordNorm),
      ritualName: resultCtx.name,
      rarity: resultCtx.rarity,
      seedHex: formatSeed(resultCtx.synthSeed),
      variation: cardVariationForRender(resultCtx.bundle),
      effectSeed: resultCtx.synthSeed,
    };
    const off = document.createElement("canvas");
    try {
      setCanvasError(null);
      await renderRitualProfileCard(imageUrl, off, effects, spec);
      const blob = await canvasToPngBlob(off);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ritual-card-${formatSeed(resultCtx.synthSeed).replace(/^0x/, "")}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setCanvasError(cardExportErrorMessageForUser(e));
    }
  };

  const shareOnX = () => {
    if (!resultCtx) return;
    const handle = formatHandleForDisplay(resultCtx.bundle.handleNorm);
    const discord = formatDiscordForDisplay(resultCtx.bundle.discordNorm);
    const realmLine =
      resultCtx.bundle.kind === "realm" ? REALM_WORLD_LABEL[resultCtx.bundle.world] : null;
    const parts = [
      "My Ritual Identity has been forged.",
      handle ? handle : null,
      discord ? `Discord: ${discord}` : null,
      realmLine,
      `Seed ${formatSeed(resultCtx.synthSeed)}`,
      "#RitualIdentity",
    ].filter(Boolean);
    const text = parts.join(" ");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="ritual-glitch-wrap">
      {step === "form" && (
        <>
          <header className="mb-10 text-center">
            <h1 className="text-balance text-lg font-semibold tracking-wide text-foreground md:text-xl">
              Choose how you want to forge your identity
            </h1>
            <p className="mx-auto mt-3 max-w-4xl text-pretty text-sm leading-relaxed text-muted md:text-[15px]">
              Left: forge from trait axes — weighted match into the portrait pool. Right: bind to one
              visual realm folder. Either path works on its own.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.82fr)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-14">
            <section className="rounded-sm border border-border bg-surface/80 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] md:p-12 lg:p-14">
              <h2 className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
                Binding parameters
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Choose your axes. The forge binds them into one ritual profile card — optimized for
                social avatars.
              </p>

              <div className="mt-10 rounded-sm border border-white/[0.08] bg-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Social identities</p>
                <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-muted">
                  X and Discord are required. They are etched into your ritual card and this summary.
                </p>
                <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      X handle <span className="text-accent">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="username"
                      placeholder="@username"
                      value={xHandleInput}
                      onChange={(e) => {
                        setBindingSocialError(null);
                        setXHandleInput(e.target.value);
                      }}
                      className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent/50"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Discord handle <span className="text-accent">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      placeholder="username"
                      value={discordInput}
                      onChange={(e) => {
                        setBindingSocialError(null);
                        setDiscordInput(e.target.value);
                      }}
                      className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent/50"
                    />
                  </label>
                </div>
                {bindingSocialError ? (
                  <p className="mt-4 font-mono text-[11px] text-red-200/90" role="alert">
                    {bindingSocialError}
                  </p>
                ) : null}
              </div>

              <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-x-8 md:gap-y-10">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Character Type
              </span>
              <span className="text-[11px] leading-snug text-muted/75">
                Choose the type of entity you want to forge
              </span>
              <select
                value={archetype}
                onChange={(e) => setArchetype(e.target.value as Archetype)}
                className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {ARCHETYPE_LABEL[a]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Energy Source
              </span>
              <span className="text-[11px] leading-snug text-muted/75">
                Select the origin of its power
              </span>
              <select
                value={element}
                onChange={(e) => setElement(e.target.value as Element)}
                className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
              >
                {ELEMENTS.map((el) => (
                  <option key={el} value={el}>
                    {ELEMENT_LABEL[el]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Intensity Level
              </span>
              <span className="text-[11px] leading-snug text-muted/75">
                Define how strong or chaotic the identity is
              </span>
              <select
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as Intensity)}
                className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
              >
                {INTENSITIES.map((i) => (
                  <option key={i} value={i}>
                    {INTENSITY_LABEL[i]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-x-8 md:gap-y-10">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Mood
              </span>
              <span className="text-[11px] leading-snug text-muted/75">
                Set the emotional presence of the entity
              </span>
              <select
                value={aura}
                onChange={(e) => setAura(e.target.value as Aura)}
                className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
              >
                {AURAS.map((au) => (
                  <option key={au} value={au}>
                    {AURA_LABEL[au]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Visual Style
              </span>
              <span className="text-[11px] leading-snug text-muted/75">
                Adjust how the image is rendered (optional)
              </span>
              <select
                value={stylePick}
                onChange={(e) => setStylePick(e.target.value as "" | Style)}
                className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
              >
                <option value="">Auto — forge decides</option>
                {STYLES.map((st) => (
                  <option key={st} value={st}>
                    {STYLE_LABEL[st]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-10 flex max-w-lg flex-col gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Frame style
            </span>
            <select
              value={frameStyle}
              onChange={(e) => setFrameStyle(e.target.value as FrameStyle)}
              className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
            >
              {FRAME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

              <button
                type="button"
                onClick={onForge}
                className="mt-10 w-full rounded-sm border border-accent/40 bg-gradient-to-b from-[#1a1810] to-[#0f0e0a] py-3.5 text-sm font-medium tracking-wide text-accent transition hover:border-accent hover:from-[#221e14] hover:to-[#12100c] md:mt-12 md:max-w-xs"
              >
                Forge Identity
              </button>
            </section>

            <section className="rounded-sm border border-border bg-surface/80 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] md:p-10 lg:p-11">
              <h2 className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
                Realm Generator
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Bind your card to a single visual realm.
              </p>

              <div className="mt-8 rounded-sm border border-white/[0.08] bg-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Social identities</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  X and Discord are required for realm binding too.
                </p>
                <div className="mt-5 grid gap-5">
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      X handle <span className="text-accent">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="username"
                      placeholder="@username"
                      value={realmHandleInput}
                      onChange={(e) => {
                        setRealmSocialError(null);
                        setRealmHandleInput(e.target.value);
                      }}
                      className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent/50"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      Discord handle <span className="text-accent">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      placeholder="username"
                      value={realmDiscordInput}
                      onChange={(e) => {
                        setRealmSocialError(null);
                        setRealmDiscordInput(e.target.value);
                      }}
                      className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent/50"
                    />
                  </label>
                </div>
                {realmSocialError ? (
                  <p className="mt-4 font-mono text-[11px] text-red-200/90" role="alert">
                    {realmSocialError}
                  </p>
                ) : null}
              </div>

              <label className="mt-8 flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  World
                </span>
                <span className="text-[11px] leading-snug text-muted/75">
                  Select a world to bind your identity
                </span>
                <select
                  value={realmWorld}
                  onChange={(e) => setRealmWorld(e.target.value as RealmWorld)}
                  className="min-h-11 rounded-sm border border-white/10 bg-[#0a0a0f] px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
                >
                  {REALM_WORLDS.map((w) => (
                    <option key={w} value={w}>
                      {REALM_WORLD_LABEL[w]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={onRealmForge}
                className="mt-10 w-full rounded-sm border border-accent/40 bg-gradient-to-b from-[#1a1810] to-[#0f0e0a] py-3.5 text-sm font-medium tracking-wide text-accent transition hover:border-accent hover:from-[#221e14] hover:to-[#12100c] md:mt-12"
              >
                FORGE FROM REALM
              </button>
            </section>
          </div>
        </>
      )}

      {step === "generating" && (
        <section className="relative overflow-hidden rounded-sm border border-border bg-[#050508] p-6 font-mono text-xs md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-30 ritual-scanline" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-muted">
              <span className="text-accent">RITUAL_SYNTH</span>
              <span>seed {formatSeed(seedDisplay)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                key={synthRunId}
                className="h-full rounded-full bg-gradient-to-r from-accent-dim via-accent to-amber-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 max-h-[min(50vh,320px)] min-h-[200px] overflow-y-auto rounded-sm border border-white/[0.06] bg-black/40 p-4 text-[11px] leading-relaxed text-emerald-200/90">
              {terminalLines.map((line, i) => (
                <div key={`${i}-${line.slice(0, 16)}`} className="whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))}
              <span className="inline-block h-3 w-2 animate-pulse bg-emerald-400/80 align-middle" />
            </div>
            <p className="text-[10px] text-muted">Runs entirely in your browser.</p>
          </div>
        </section>
      )}

      {step === "result" && resultCtx && (
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-balance text-xl font-semibold tracking-[0.12em] text-foreground md:text-2xl">
              YOUR RITUAL IDENTITY HAS BEEN FORGED
            </h2>
            <dl className="mx-auto mt-6 grid max-w-lg gap-3 text-left text-xs text-muted md:max-w-2xl">
              <div className="rounded-sm border border-accent/20 bg-gradient-to-br from-[#0b0b12] via-[#08080e] to-[#06060a] p-4 shadow-[0_0_40px_-18px_rgba(201,162,39,0.12),inset_0_1px_0_rgba(255,255,255,0.05)] md:p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-accent/95">Your handles</p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-white/[0.06] font-mono text-[11px] font-bold text-foreground">
                        X
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Handle</span>
                    </div>
                    <p className="break-all font-mono text-sm leading-snug text-foreground md:text-base">
                      {formatHandleForDisplay(resultCtx.bundle.handleNorm) ?? "—"}
                    </p>
                  </div>
                  <div className="space-y-2 border-t border-white/[0.06] pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#5865F2]/35 bg-[#5865F2]/15 font-mono text-[10px] font-bold text-[#c8ccff]">
                        D
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Discord</span>
                    </div>
                    <p className="break-all font-mono text-sm leading-snug text-foreground md:text-base">
                      {formatDiscordForDisplay(resultCtx.bundle.discordNorm) ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                <dt className="uppercase tracking-wider text-[10px]">Name</dt>
                <dd className="text-accent">{resultCtx.name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                <dt className="uppercase tracking-wider text-[10px]">Rarity</dt>
                <dd className="text-foreground">{resultCtx.rarity}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                <dt className="uppercase tracking-wider text-[10px]">Seed</dt>
                <dd className="text-foreground">{formatSeed(resultCtx.synthSeed)}</dd>
              </div>
              {resultCtx.bundle.kind === "binding" ? (
                <>
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                    <dt className="uppercase tracking-wider text-[10px]">Mood</dt>
                    <dd className="text-foreground">{AURA_LABEL[resultCtx.bundle.choices.aura]}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                    <dt className="uppercase tracking-wider text-[10px]">Visual Style</dt>
                    <dd className="text-foreground">
                      {resultCtx.bundle.choices.style
                        ? STYLE_LABEL[resultCtx.bundle.choices.style]
                        : "Auto"}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                  <dt className="uppercase tracking-wider text-[10px]">World</dt>
                  <dd className="text-foreground">{REALM_WORLD_LABEL[resultCtx.bundle.world]}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 font-mono">
                <dt className="uppercase tracking-wider text-[10px]">Frame style</dt>
                <dd className="text-foreground">{FRAME_LABEL[resultCtx.bundle.frameStyle]}</dd>
              </div>
              {resultCtx.bundle.kind === "binding" ? (
                <div className="flex justify-between gap-4 py-1.5 font-mono">
                  <dt className="uppercase tracking-wider text-[10px]">Variation</dt>
                  <dd className="text-foreground/80">{resultCtx.bundle.variation}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="mx-auto max-w-[min(100%,420px)]">
            {canvasError ? (
              <div
                role="alert"
                className="mb-3 rounded-sm border border-red-500/35 bg-red-950/25 px-3 py-2 font-mono text-[11px] leading-relaxed text-red-200/95"
              >
                {canvasError}
              </div>
            ) : null}
            <div className="relative overflow-hidden rounded-sm border border-border bg-black shadow-[0_0_60px_-12px_rgba(201,162,39,0.25)] select-none">
              <canvas
                ref={canvasRef}
                className="h-auto w-full"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  aspectRatio: "1",
                  WebkitTouchCallout: "none",
                }}
              />
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface/60 p-5 md:p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Card treatments
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["glitch", "Glitch"] as const,
                  ["contrast", "Contrast"] as const,
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(effects[key] * 100)}
                    onChange={(e) =>
                      setEffects((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value) / 100,
                      }))
                    }
                    className="accent-accent"
                  />
                </label>
              ))}
            </div>
          </div>

          <MintPfpSection canvasRef={canvasRef} canvasError={canvasError} cardRenderEpoch={cardRenderEpoch} />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={downloadRitualPhotoPng}
              className="min-h-11 rounded-sm border border-accent/50 bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={downloadCardPng}
              className="min-h-11 rounded-sm border border-accent/50 bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20"
            >
              Download Card PNG
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="min-h-11 rounded-sm border border-white/15 bg-transparent px-6 py-2.5 text-sm text-foreground transition hover:border-white/30"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={onAgain}
              className="min-h-11 rounded-sm border border-white/15 bg-transparent px-6 py-2.5 text-sm text-foreground transition hover:border-white/30"
            >
              Generate Again
            </button>
            <button
              type="button"
              onClick={shareOnX}
              className="min-h-11 rounded-sm border border-white/15 px-6 py-2.5 text-sm text-foreground transition hover:border-white/30"
            >
              Share on X
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Realm worlds (slug keys). Images are resolved server-side from private-assets/ritual/{world}/.
 */
export type RealmWorld =
  | "ocean"
  | "volcanic"
  | "clockwork"
  | "glass"
  | "ancient"
  | "energy"
  | "mystical"
  | "cosmic";

export const REALM_WORLDS: readonly RealmWorld[] = [
  "ocean",
  "volcanic",
  "clockwork",
  "glass",
  "ancient",
  "energy",
  "mystical",
  "cosmic",
];

export function isRealmWorld(s: string): s is RealmWorld {
  return (REALM_WORLDS as readonly string[]).includes(s);
}

export const REALM_WORLD_LABEL: Record<RealmWorld, string> = {
  ocean: "Ocean",
  volcanic: "Volcanic",
  clockwork: "Clockwork",
  glass: "Glass",
  ancient: "Ancient",
  energy: "Energy",
  mystical: "Mystical",
  cosmic: "Cosmic",
};

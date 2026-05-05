/** Minimal ABI for RitualPFP.sol (mint + Minted event). */
export const ritualPfpAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenURI", type: "string" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "Minted",
    inputs: [
      { name: "user", type: "address", indexed: false },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "tokenURI", type: "string", indexed: false },
    ],
  },
] as const;

/** Ritual deploy — CommonJS so Windows/Node does not treat the script as ESM (avoids noisy exit). */
const hre = require("hardhat");

async function main() {
  const factory = await hre.ethers.getContractFactory("RitualPFP");
  const ritualPfp = await factory.deploy();
  await ritualPfp.waitForDeployment();
  const address = await ritualPfp.getAddress();
  console.log("RitualPFP deployed to:", address);
  console.log("");
  console.log("NEXT_PUBLIC_RITUAL_PFP_ADDRESS=" + address);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

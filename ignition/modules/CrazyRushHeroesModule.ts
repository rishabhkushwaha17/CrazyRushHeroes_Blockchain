// modules/CrazyRushHeroesModule.js
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CrazyRushHeroesModule", (m) => {
  // Deploy the CrazyRushHeroes contract
  const crazyRushHeroes = m.contract("CrazyRushHeroes");

  // Configure initial accepted token: USDC
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Replace with actual USDC address on target network
  const tokenName = "USDC";

  m.call(crazyRushHeroes, "addAcceptedToken", [tokenName, usdcAddress]);

  return { crazyRushHeroes };
});

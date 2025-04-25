const hre = require("hardhat");

async function main() {
  const AffiliateRegistry = await hre.ethers.getContractFactory("AffiliateRegistry");
  const registry = await AffiliateRegistry.deploy();
  await registry.waitForDeployment();

  console.log("AffiliateRegistry deployed to:", await registry.getAddress());

  // Wait for a few block confirmations
  await registry.deploymentTransaction().wait(5);

  // Verify the contract
  if (process.env.ETHERSCAN_API_KEY) {
    await hre.run("verify:verify", {
      address: await registry.getAddress(),
      constructorArguments: []
    });
    console.log("Contract verified on Etherscan");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

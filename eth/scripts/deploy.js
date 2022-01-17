const hre = require("hardhat");
const config = require("../config");

async function main() {
  const CoinFlip = await hre.ethers.getContractFactory("CoinFlip");
  const contract = await CoinFlip.deploy(
    config.vrfCoordinator,
    config.linkToken,
    config.vrfKeyHash,
    config.vrfFee
  );
  console.log("deploying...");

  await contract.deployed();

  console.log("CoinFlip deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

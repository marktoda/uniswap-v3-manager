import { Config, getConfig } from "./config";
import { ethers, Wallet } from "ethers";
import { getPool, UniswapPositionFetcher } from "./uniswap";
import { NewPosition, UniPosition } from "./position";
import { SwapManager } from "./swap";
import { getFastGasPrice, sleep } from "./utils";
import { ERC20__factory } from "./typechain";
import { Pool } from "@uniswap/v3-sdk";

function explainPosition(position: UniPosition) {
  console.log("********* Position *********");
  console.log(
    `range: ${position.token0PriceUpper.invert().toFixed(10)} - ${position.token0PriceLower.invert().toFixed(10)}`,
  );
  console.log(`current price`, position.pool.token1Price.toFixed(10));
  console.log(`Total value 0: ${position.totalValue0.toFixed()}`);
  console.log(`Total value 1: ${position.totalValue1.toFixed()}`);
  console.log(`in range: ${position.inRange()}`);
  console.log(`value0`, position.amount0.toFixed());
  console.log(`value1`, position.amount1.toFixed());
  console.log("****************************");
  console.log();
}

const assertApproved = async (config: Config, wallet: Wallet) => {
  const token0 = ERC20__factory.connect(config.pair.token0, wallet.provider);
  const token1 = ERC20__factory.connect(config.pair.token1, wallet.provider);
  const gasPrice = await getFastGasPrice();

  const txs = [];
  if ((await token0.allowance(await wallet.getAddress(), config.uniswap.positions)).eq(0)) {
    const tx = await token0
      .connect(wallet)
      .approve(config.uniswap.positions, ethers.constants.MaxUint256, { gasPrice });
    txs.push(tx);
  }

  if ((await token1.allowance(await wallet.getAddress(), config.uniswap.positions)).eq(0)) {
    const tx = await token1
      .connect(wallet)
      .approve(config.uniswap.positions, ethers.constants.MaxUint256, { gasPrice });
    txs.push(tx);
  }

  if ((await token0.allowance(await wallet.getAddress(), config.uniswap.router)).eq(0)) {
    const tx = await token0.connect(wallet).approve(config.uniswap.router, ethers.constants.MaxUint256, { gasPrice });
    txs.push(tx);
  }

  if ((await token1.allowance(await wallet.getAddress(), config.uniswap.router)).eq(0)) {
    const tx = await token1.connect(wallet).approve(config.uniswap.router, ethers.constants.MaxUint256, { gasPrice });
    txs.push(tx);
  }

  for (const tx of txs) {
    await tx.wait();
  }
};

const createNewPosition = async (
  config: Config,
  swapManager: SwapManager,
  pool: Pool,
  wallet: Wallet,
): Promise<void> => {
  await swapManager.split(wallet);
  const token0Position = await swapManager.getBalance(await wallet.getAddress(), pool.token0.address);
  const newPosition = NewPosition.withRange(pool, config.priceWidthPercentage, token0Position.toString());
  explainPosition(newPosition);
  await newPosition.mint(wallet);
};

async function runLoop(config: Config, pool: Pool, wallet: Wallet) {
  const address = await wallet.getAddress();
  console.log(`Address: ${address}`);

  const uniswap = new UniswapPositionFetcher(config, pool);
  const positions = await uniswap.getActivePositions(address);
  const swapManager = new SwapManager(config, pool);

  await assertApproved(config, wallet);

  if (positions.length > 1) {
    throw new Error("I can only handle one position :)");
  } else if (positions.length === 0) {
    console.log("No positions, creating new one");
    await createNewPosition(config, swapManager, pool, wallet);
  } else {
    const position = positions[0];
    explainPosition(position);

    if (position.inRange()) {
      console.log("position still in range - all good");
    } else {
      console.log("position out of range - burning old position and creating a new one");
      await position.burn(wallet);
      await createNewPosition(config, swapManager, pool, wallet);
    }
  }
}

async function main() {
  const config = getConfig();

  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const wallet = new Wallet(config.privateKey, provider);
  const pool = await getPool(config.pair, provider);

  for (;;) {
    await runLoop(config, pool, wallet);

    console.log("sleeping...");

    // sleep for a few minutes
    await sleep(5 * 60 * 1000);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

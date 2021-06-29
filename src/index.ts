import { ethers, Wallet, BigNumber } from "ethers";
import { Pool } from "@uniswap/v3-sdk";
import { CurrencyAmount } from "@uniswap/sdk-core";
import { getPool, UniswapPositionFetcher } from "./uniswap";
import { Config, getConfig } from "./config";
import { ActivePosition, NewPosition, UniPosition } from "./position";
import { SwapManager } from "./swap";
import { ethToTokenValue, getFastGasPrice, sleep } from "./utils";
import { FilePositionStore } from "./store";
import { ERC20__factory } from "./typechain";
import { WETH_ADDRESS } from "./constants";

/**
 * Print details about the position to the console
 */
function explainPosition(position: UniPosition) {
  console.log("********* Position *********");
  console.log(
    `Range: ${position.token0PriceUpper.invert().toFixed(10)} - ${position.token0PriceLower.invert().toFixed(10)}`,
  );
  console.log(`Current Price`, position.pool.token1Price.toFixed(10));
  console.log(`In Range: ${position.inRange()}`);
  console.log(`Position total value ${position.pool.token0.symbol}: ${position.totalValue0.toFixed()}`);
  console.log(`Position total value ${position.pool.token1.symbol}: ${position.totalValue1.toFixed()}`);
  console.log(`Position liquidity ${position.pool.token0.symbol}`, position.amount0.toFixed());
  console.log(`Position liquidity ${position.pool.token1.symbol}`, position.amount1.toFixed());
  console.log("****************************");
  console.log();
}

/**
 * Ensure that the tokens in the pool have been approved from the wallet to the contracts that will need them
 * This only needs to be done once, so we just check and do it if it has not been done yet
 */
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

/**
 * Get the total value of the wallet in ETH, including the value of the position
 */
const getWalletTotalValue = async (wallet: Wallet, position: UniPosition): Promise<BigNumber> => {
  const balance = await wallet.provider.getBalance(await wallet.getAddress());
  const token0IsWeth = position.pool.token0.address === WETH_ADDRESS;
  const positionEthValue = token0IsWeth ? position.totalValue0 : position.totalValue1;
  const token = token0IsWeth
    ? ERC20__factory.connect(position.pool.token1.address, wallet.provider)
    : ERC20__factory.connect(position.pool.token0.address, wallet.provider);
  const tokenValue = await token.balanceOf(await wallet.getAddress());
  const tokenValueInEth = token0IsWeth
    ? position.pool.token1Price.quote(CurrencyAmount.fromRawAmount(position.pool.token1, tokenValue.toString()))
    : position.pool.token0Price.quote(CurrencyAmount.fromRawAmount(position.pool.token0, tokenValue.toString()));

  return BigNumber.from(positionEthValue.quotient.toString(10)).add(balance).add(tokenValueInEth.quotient.toString(10));
};

/**
 * Create a new uniswap position from the given wallet
 * Uses the configured price width to determine the lower and upper bounds of the position
 * Swaps from the current balances of token0 and token1 to get an even split of value
 * @param config The configuration for this app
 * @param swapManager class to handle creation of swaps
 * @param pool The pool to swap and add liquidity for
 * @return newPosition The newly created position
 */
const createNewPosition = async (
  config: Config,
  swapManager: SwapManager,
  pool: Pool,
  wallet: Wallet,
): Promise<ActivePosition> => {
  await swapManager.split(wallet);
  const token0Position = await swapManager.getBalance(await wallet.getAddress(), pool.token0.address);
  const newPosition = NewPosition.withRange(pool, config.priceWidthPercentage, token0Position.toString());
  console.log(`Minting new position`);
  const id = await newPosition.mint(wallet);
  return ActivePosition.fromPosition(newPosition, id);
};

/**
 * Finds the user's active relevant positionId and returns it
 * If no position is active, creates a new one
 * @return the tokenId of the active position
 */
async function getActivePositionId(config: Config, wallet: Wallet): Promise<BigNumber> {
  const address = await wallet.getAddress();

  const pool = await getPool(config.pair, wallet.provider);
  const uniswap = new UniswapPositionFetcher(config, pool);
  const positions = await uniswap.getActivePositions(address);
  const swapManager = new SwapManager(config, pool);

  await assertApproved(config, wallet);

  if (positions.length > 1) {
    throw new Error("More than one active position at once");
  } else if (positions.length === 0) {
    console.log("No positions, creating new one");
    const newPosition = await createNewPosition(config, swapManager, pool, wallet);
    return newPosition.id;
  } else {
    const position = positions[0];
    return position.id;
  }
}

/**
 * Runs the main loop
 * Checks if the user's position is in bounds, cashes it out and creates a new one if not
 * @return the tokenId of the new active position
 */
async function runLoop(config: Config, wallet: Wallet, positionId: BigNumber): Promise<BigNumber> {
  const address = await wallet.getAddress();
  console.log(`Address: ${address}`);

  const pool = await getPool(config.pair, wallet.provider);
  const uniswap = new UniswapPositionFetcher(config, pool);
  const position = new ActivePosition(pool, await uniswap.getPosition(positionId));
  const swapManager = new SwapManager(config, pool);

  await assertApproved(config, wallet);

  explainPosition(position);
  const totalWalletValue = await getWalletTotalValue(wallet, position);
  console.log(`Total wallet value: ${ethers.utils.formatEther(totalWalletValue)} ETH, ${ethToTokenValue(totalWalletValue, pool)} tokens`);

  if (BigNumber.from(position.liquidity.toString(10)).eq(0)) {
    console.log("Position inactive, creating new one");
    const newPosition = await createNewPosition(config, swapManager, pool, wallet);
    explainPosition(newPosition);
    return newPosition.id;
  } else if (position.inRange()) {
    console.log("Position still in range");
    return position.id;
  } else {
    console.log("Position out of range - burning old position and creating a new one");
    await position.burn(wallet);
    const newPosition = await createNewPosition(config, swapManager, pool, wallet);
    explainPosition(newPosition);

    new FilePositionStore(config.historyFile).storeHistory(FilePositionStore.createItem(totalWalletValue, newPosition));
    return newPosition.id;
  }
}

async function main() {
  const config = await getConfig();

  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const wallet = new Wallet(config.privateKey, provider);

  console.log(`Searching for open positions on address: ${await wallet.getAddress()}`);
  let positionId = await getActivePositionId(config, wallet);

  for (;;) {
    try {
      positionId = await runLoop(config, wallet, positionId);
    } catch (e) {
      console.log(e);
    }

    console.log("sleeping...");

    // sleep for a few minutes
    await sleep(10 * 60 * 1000);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

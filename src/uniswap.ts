import { BigNumber, ethers, providers } from "ethers";
import { Config } from "./config";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { ActivePosition } from "./position";
import { ERC20__factory, Pool__factory, Positions, Positions__factory } from "./typechain";

export interface PositionData {
  id: BigNumber;
  token0: string;
  token1: string;
  liquidity: BigNumber;
  tickLower: number;
  tickUpper: number;
}

/**
 * Fetch data about a pool and return a representation of the pool
 * @param pair The pair description
 * @param provider An Ethers provider object for fetching data from the blockchain
 * @return pool The in-memory representation of the pool
 */
export async function getPool(pair: Config["pair"], provider: providers.Provider): Promise<Pool> {
  const chainId = (await provider.getNetwork()).chainId;
  const token0Contract = ERC20__factory.connect(pair.token0, provider);
  const token1Contract = ERC20__factory.connect(pair.token1, provider);
  const token0 = new Token(
    chainId,
    pair.token0,
    parseInt((await token0Contract.decimals()).toString()),
    await token0Contract.symbol(),
    await token0Contract.name(),
  );
  const token1 = new Token(
    chainId,
    pair.token1,
    parseInt((await token1Contract.decimals()).toString()),
    await token1Contract.symbol(),
    await token1Contract.name(),
  );

  const poolAddress = Pool.getAddress(token0, token1, pair.fee);
  const poolContract = Pool__factory.connect(poolAddress, provider);

  const liquidity = await poolContract.liquidity();
  const slot0 = await poolContract.slot0();

  return new Pool(token0, token1, pair.fee, slot0.sqrtPriceX96.toString(), liquidity.toString(), slot0.tick);
}

/**
 * Class to fetch positions from uniswap contracts
 */
export class UniswapPositionFetcher {
  public positions: Positions;

  constructor(config: Config, public pool: Pool) {
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

    this.positions = Positions__factory.connect(config.uniswap.positions, provider);
  }

  /**
   * Fetch data about the given position NFT tokenId
   */
  async getPosition(tokenId: BigNumber): Promise<PositionData> {
    const position = await this.positions.positions(tokenId);

    return {
      id: tokenId,
      token0: position.token0,
      token1: position.token1,
      liquidity: position.liquidity,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    };
  }

  /**
   * Fetch all positions for the given accounts
   */
  async getPositions(address: string): Promise<PositionData[]> {
    const result: PositionData[] = [];

    let exists = true;
    let i = 0;
    while (exists) {
      try {
        const token = await this.positions.tokenOfOwnerByIndex(address, i);
        result.push(await this.getPosition(token));

        i++;
      } catch (e) {
        exists = false;
      }
    }

    return result;
  }

  /**
   * Fetch all active positions for the given accounts
   * Active here is defined as having some liquidity and being in a pool that is relevant to the configured tokens
   */
  async getActivePositions(address: string): Promise<ActivePosition[]> {
    return (await this.getPositions(address))
      .filter((p: PositionData) => p.liquidity.gt(0))
      .filter((p: PositionData) => {
        return (
          (p.token0.toLowerCase() === this.pool.token0.address.toLowerCase() &&
            p.token1.toLowerCase() === this.pool.token1.address.toLowerCase()) ||
          (p.token1.toLowerCase() === this.pool.token0.address.toLowerCase() &&
            p.token0.toLowerCase() === this.pool.token1.address.toLowerCase())
        );
      })
      .map((p: PositionData) => new ActivePosition(this.pool, p));
  }
}

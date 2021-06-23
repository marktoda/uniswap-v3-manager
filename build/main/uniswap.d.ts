import { BigNumber, providers } from "ethers";
import { Config } from "./config";
import { Pool } from "@uniswap/v3-sdk";
import { ActivePosition } from "./position";
import { Positions } from "./typechain";
export interface PositionData {
  id: BigNumber;
  token0: string;
  token1: string;
  liquidity: BigNumber;
  tickLower: number;
  tickUpper: number;
}
export declare function getPool(pair: Config["pair"], provider: providers.Provider): Promise<Pool>;
export declare class UniswapPositionFetcher {
  pool: Pool;
  positions: Positions;
  constructor(config: Config, pool: Pool);
  getPositions(address: string): Promise<PositionData[]>;
  getActivePositions(address: string): Promise<ActivePosition[]>;
}

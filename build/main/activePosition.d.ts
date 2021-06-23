import { PositionData } from "./uniswap";
import { BigNumber } from "ethers";
import { Pool, Position } from "@uniswap/v3-sdk";
export declare class ActivePosition extends Position {
  id: BigNumber;
  constructor(pool: Pool, data: PositionData);
  inRange(): boolean;
}

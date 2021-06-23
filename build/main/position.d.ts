import { Pool, Position } from "@uniswap/v3-sdk";
import { CurrencyAmount, Price, Token } from "@uniswap/sdk-core";
import { BigNumber, Wallet } from "ethers";
import { PositionData } from "./uniswap";
export declare class UniPosition extends Position {
  inRange(): boolean;
  get totalValue0(): CurrencyAmount<Token>;
  get totalValue1(): CurrencyAmount<Token>;
}
export declare class ActivePosition extends UniPosition {
  id: BigNumber;
  constructor(pool: Pool, data: PositionData);
  burn(wallet: Wallet): Promise<void>;
}
export declare class NewPosition extends UniPosition {
  static fromPosition(position: Position): NewPosition;
  static withRange(pool: Pool, rangePercentage: number, amount0: string): NewPosition;
  mint(wallet: Wallet): Promise<void>;
}
interface PriceRange {
  lower: Price<Token, Token>;
  upper: Price<Token, Token>;
}
export declare function calculatePriceRange(
  currentPrice: Price<Token, Token>,
  priceWidthPercentage: number,
): PriceRange;
export {};

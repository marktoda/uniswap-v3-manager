import * as fs from "fs";
import { CurrencyAmount } from "@uniswap/sdk-core";
import { BigNumber } from "ethers";
import { UniPosition } from "./position";
import { WETH_ADDRESS } from "./constants";

export interface PositionHistory {
  totalWalletValueEth: string;
  totalWalletValueToken: string;
  lowerPrice: string;
  upperPrice: string;
  timestamp: number;
}

export interface PositionHistoryStore {
  storeHistory(history: PositionHistory): void;
}

export class FilePositionStore implements PositionHistoryStore {
  constructor(private file: string) {}

  storeHistory(data: PositionHistory): void {
    let existingData: PositionHistory[] = [];
    if (fs.existsSync(this.file)) {
      existingData = JSON.parse(fs.readFileSync(this.file).toString());
    }
    existingData.push(data);
    fs.writeFileSync(this.file, JSON.stringify(existingData));
  }

  static createItem(totalWalletValue: BigNumber, position: UniPosition): PositionHistory {
    const totalWalletValueToken =
      position.pool.token0.address === WETH_ADDRESS
        ? position.pool.token0Price.quote(
            CurrencyAmount.fromRawAmount(position.pool.token0, totalWalletValue.toString()),
          )
        : position.pool.token1Price.quote(
            CurrencyAmount.fromRawAmount(position.pool.token1, totalWalletValue.toString()),
          );

    return {
      totalWalletValueEth: totalWalletValue.toString(),
      totalWalletValueToken: totalWalletValueToken.quotient.toString(10),
      lowerPrice: position.token0PriceLower.toFixed(10),
      upperPrice: position.token0PriceUpper.toFixed(10),
      timestamp: Date.now(),
    };
  }
}

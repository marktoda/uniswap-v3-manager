import * as fs from "fs";
import { BigNumber } from "ethers";
import { UniPosition } from "./position";
import { ethToTokenValue } from './utils';

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
    return {
      totalWalletValueEth: totalWalletValue.toString(),
      totalWalletValueToken: ethToTokenValue(totalWalletValue, position.pool).toString(),
      lowerPrice: position.token0PriceLower.toFixed(10),
      upperPrice: position.token0PriceUpper.toFixed(10),
      timestamp: Date.now(),
    };
  }
}

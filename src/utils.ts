import got from "got";
import { BigNumber, ethers } from "ethers";

interface GasPriceData {
  fastest: number;
}

export async function getFastGasPrice(): Promise<BigNumber> {
  const gasPriceData: GasPriceData = await got("https://www.etherchain.org/api/gasPriceOracle").json();
  return ethers.utils.parseUnits(gasPriceData.fastest.toString(), 9);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

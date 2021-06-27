import got from "got";
import { BigNumber, ethers } from "ethers";
import { CurrencyAmount } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";
import { WETH_ADDRESS } from "./constants";

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


export function ethToTokenValue(value: BigNumber, pool: Pool): BigNumber {
    return BigNumber.from(pool.token0.address === WETH_ADDRESS
        ? pool.token0Price.quote(
            CurrencyAmount.fromRawAmount(pool.token0, value.toString()),
        )
        : pool.token1Price.quote(
            CurrencyAmount.fromRawAmount(pool.token1, value.toString()),
        ).quotient.toString(10));

}

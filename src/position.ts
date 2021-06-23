import { NonfungiblePositionManager, Pool, Position, priceToClosestTick } from "@uniswap/v3-sdk";
import { Percent, Ether, CurrencyAmount, Fraction, Price, Token } from "@uniswap/sdk-core";
import { ethers, BigNumber, Wallet } from "ethers";
import { PositionData } from "./uniswap";
import { getFastGasPrice } from "./utils";
import { Positions__factory } from "./typechain";

const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const POSITIONS_ADDRESS = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
const MAX_UINT128 = BigNumber.from(2).pow(128).sub(1);

export class UniPosition extends Position {
  inRange(): boolean {
    const lower = this.token0PriceLower;
    const upper = this.token0PriceUpper;
    return this.pool.token0Price.greaterThan(lower) && this.pool.token0Price.lessThan(upper);
  }

  get totalValue0(): CurrencyAmount<Token> {
    const price = this.pool.token1Price;
    return this.amount0.add(price.quote(this.amount1));
  }

  get totalValue1(): CurrencyAmount<Token> {
    const price = this.pool.token0Price;
    return this.amount1.add(price.quote(this.amount0));
  }
}

export class ActivePosition extends UniPosition {
  public id: BigNumber;

  constructor(pool: Pool, data: PositionData) {
    super({
      pool,
      liquidity: data.liquidity.toString(),
      tickLower: data.tickLower,
      tickUpper: data.tickUpper,
    });

    this.id = data.id;
  }

  async burn(wallet: Wallet): Promise<void> {
    const positions = Positions__factory.connect(POSITIONS_ADDRESS, wallet.provider);
    const [fee0, fee1] = await positions.callStatic.collect(
      {
        tokenId: this.id.toString(),
        recipient: await wallet.getAddress(), // some tokens might fail if transferred to address(0)
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      },
      { from: await wallet.getAddress() }, // need to simulate the call as the owner
    );

    const token0 =
      this.pool.token0.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? Ether.onChain((await wallet.provider.getNetwork()).chainId)
        : this.pool.token0;
    const token1 =
      this.pool.token1.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? Ether.onChain((await wallet.provider.getNetwork()).chainId)
        : this.pool.token1;

    const params = NonfungiblePositionManager.removeCallParameters(this, {
      tokenId: this.id.toString(),
      liquidityPercentage: new Percent(100, 100),
      slippageTolerance: new Percent(5, 100),
      deadline: ethers.constants.MaxUint256.toString(),
      collectOptions: {
        expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, fee0.toString()),
        expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, fee1.toString()),
        recipient: await wallet.getAddress(),
      },
    });

    const tx = await wallet.sendTransaction({
      to: POSITIONS_ADDRESS,
      from: await wallet.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await getFastGasPrice(),
      gasLimit: 600000,
    });
    await tx.wait();
  }
}

export class NewPosition extends UniPosition {
  static fromPosition(position: Position): NewPosition {
    return new NewPosition({
      pool: position.pool,
      liquidity: position.liquidity,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    });
  }

  static withRange(pool: Pool, rangePercentage: number, amount0: string): NewPosition {
    const newPriceRange = calculatePriceRange(pool.token0Price, rangePercentage);

    const tickSpacing = pool.tickSpacing;
    const tickLower = priceToClosestTick(newPriceRange.lower) - (priceToClosestTick(newPriceRange.lower) % tickSpacing);
    const tickUpper =
      priceToClosestTick(newPriceRange.upper) + (tickSpacing - (priceToClosestTick(newPriceRange.upper) % tickSpacing));

    return NewPosition.fromPosition(
      NewPosition.fromAmount0({
        pool,
        tickLower,
        tickUpper,
        amount0,
        useFullPrecision: true,
      }),
    );
  }

  async mint(wallet: Wallet): Promise<void> {
    const params = NonfungiblePositionManager.addCallParameters(this, {
      slippageTolerance: new Percent(5, 100),
      deadline: ethers.constants.MaxUint256.toString(),
      recipient: await wallet.getAddress(),
      createPool: false,
      useNative: Ether.onChain((await wallet.provider.getNetwork()).chainId),
    });

    const tx = await wallet.sendTransaction({
      to: POSITIONS_ADDRESS,
      from: await wallet.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await getFastGasPrice(),
      gasLimit: 600000,
    });
    await tx.wait();
  }
}

interface PriceRange {
  lower: Price<Token, Token>;
  upper: Price<Token, Token>;
}

const fractionToPrice = (referencePrice: Price<Token, Token>, fraction: Fraction): Price<Token, Token> => {
  // uniswap price library is wacky and denom / numer are flipped
  return new Price(referencePrice.baseCurrency, referencePrice.quoteCurrency, fraction.denominator, fraction.numerator);
};

export function calculatePriceRange(currentPrice: Price<Token, Token>, priceWidthPercentage: number): PriceRange {
  const diff = currentPrice.asFraction.multiply(new Fraction(priceWidthPercentage, 100));

  const lower = currentPrice.asFraction.subtract(diff);
  const upper = currentPrice.asFraction.add(diff);

  return {
    lower: fractionToPrice(currentPrice, lower),
    upper: fractionToPrice(currentPrice, upper),
  };
}

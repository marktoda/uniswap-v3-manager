"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePriceRange = exports.NewPosition = exports.ActivePosition = exports.UniPosition = void 0;
const v3_sdk_1 = require("@uniswap/v3-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const ethers_1 = require("ethers");
const utils_1 = require("./utils");
const typechain_1 = require("./typechain");
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const POSITIONS_ADDRESS = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
const MAX_UINT128 = ethers_1.BigNumber.from(2).pow(128).sub(1);
class UniPosition extends v3_sdk_1.Position {
  inRange() {
    const lower = this.token0PriceLower;
    const upper = this.token0PriceUpper;
    return this.pool.token0Price.greaterThan(lower) && this.pool.token0Price.lessThan(upper);
  }
  get totalValue0() {
    const price = this.pool.token1Price;
    return this.amount0.add(price.quote(this.amount1));
  }
  get totalValue1() {
    const price = this.pool.token0Price;
    return this.amount1.add(price.quote(this.amount0));
  }
}
exports.UniPosition = UniPosition;
class ActivePosition extends UniPosition {
  constructor(pool, data) {
    super({
      pool,
      liquidity: data.liquidity.toString(),
      tickLower: data.tickLower,
      tickUpper: data.tickUpper,
    });
    this.id = data.id;
  }
  async burn(wallet) {
    const positions = typechain_1.Positions__factory.connect(POSITIONS_ADDRESS, wallet.provider);
    const [fee0, fee1] = await positions.callStatic.collect(
      {
        tokenId: this.id.toString(),
        recipient: await wallet.getAddress(),
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      },
      { from: await wallet.getAddress() },
    );
    const token0 =
      this.pool.token0.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? sdk_core_1.Ether.onChain((await wallet.provider.getNetwork()).chainId)
        : this.pool.token0;
    const token1 =
      this.pool.token1.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? sdk_core_1.Ether.onChain((await wallet.provider.getNetwork()).chainId)
        : this.pool.token1;
    const params = v3_sdk_1.NonfungiblePositionManager.removeCallParameters(this, {
      tokenId: this.id.toString(),
      liquidityPercentage: new sdk_core_1.Percent(100, 100),
      slippageTolerance: new sdk_core_1.Percent(5, 100),
      deadline: ethers_1.ethers.constants.MaxUint256.toString(),
      collectOptions: {
        expectedCurrencyOwed0: sdk_core_1.CurrencyAmount.fromRawAmount(token0, fee0.toString()),
        expectedCurrencyOwed1: sdk_core_1.CurrencyAmount.fromRawAmount(token1, fee1.toString()),
        recipient: await wallet.getAddress(),
      },
    });
    const tx = await wallet.sendTransaction({
      to: POSITIONS_ADDRESS,
      from: await wallet.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await utils_1.getFastGasPrice(),
      gasLimit: 600000,
    });
    await tx.wait();
  }
}
exports.ActivePosition = ActivePosition;
class NewPosition extends UniPosition {
  static fromPosition(position) {
    return new NewPosition({
      pool: position.pool,
      liquidity: position.liquidity,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
    });
  }
  static withRange(pool, rangePercentage, amount0) {
    const newPriceRange = calculatePriceRange(pool.token0Price, rangePercentage);
    const tickSpacing = pool.tickSpacing;
    const tickLower =
      v3_sdk_1.priceToClosestTick(newPriceRange.lower) -
      (v3_sdk_1.priceToClosestTick(newPriceRange.lower) % tickSpacing);
    const tickUpper =
      v3_sdk_1.priceToClosestTick(newPriceRange.upper) +
      (tickSpacing - (v3_sdk_1.priceToClosestTick(newPriceRange.upper) % tickSpacing));
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
  async mint(wallet) {
    const params = v3_sdk_1.NonfungiblePositionManager.addCallParameters(this, {
      slippageTolerance: new sdk_core_1.Percent(5, 100),
      deadline: ethers_1.ethers.constants.MaxUint256.toString(),
      recipient: await wallet.getAddress(),
      createPool: false,
      useNative: sdk_core_1.Ether.onChain((await wallet.provider.getNetwork()).chainId),
    });
    const tx = await wallet.sendTransaction({
      to: POSITIONS_ADDRESS,
      from: await wallet.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await utils_1.getFastGasPrice(),
      gasLimit: 600000,
    });
    await tx.wait();
  }
}
exports.NewPosition = NewPosition;
const fractionToPrice = (referencePrice, fraction) => {
  // uniswap price library is wacky and denom / numer are flipped
  return new sdk_core_1.Price(
    referencePrice.baseCurrency,
    referencePrice.quoteCurrency,
    fraction.denominator,
    fraction.numerator,
  );
};
function calculatePriceRange(currentPrice, priceWidthPercentage) {
  const diff = currentPrice.asFraction.multiply(new sdk_core_1.Fraction(priceWidthPercentage, 100));
  const lower = currentPrice.asFraction.subtract(diff);
  const upper = currentPrice.asFraction.add(diff);
  return {
    lower: fractionToPrice(currentPrice, lower),
    upper: fractionToPrice(currentPrice, upper),
  };
}
exports.calculatePriceRange = calculatePriceRange;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcG9zaXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNENBQWlHO0FBQ2pHLGdEQUEyRjtBQUMzRixtQ0FBbUQ7QUFFbkQsbUNBQTBDO0FBQzFDLDJDQUFpRDtBQUVqRCxNQUFNLFlBQVksR0FBRyw0Q0FBNEMsQ0FBQztBQUNsRSxNQUFNLGlCQUFpQixHQUFHLDRDQUE0QyxDQUFDO0FBQ3ZFLE1BQU0sV0FBVyxHQUFHLGtCQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFdEQsTUFBYSxXQUFZLFNBQVEsaUJBQVE7SUFDdkMsT0FBTztRQUNMLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDYixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNwQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELElBQUksV0FBVztRQUNiLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0Y7QUFoQkQsa0NBZ0JDO0FBRUQsTUFBYSxjQUFlLFNBQVEsV0FBVztJQUc3QyxZQUFZLElBQVUsRUFBRSxJQUFrQjtRQUN4QyxLQUFLLENBQUM7WUFDSixJQUFJO1lBQ0osU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO1lBQ3BDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsOEJBQWtCLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQ3JEO1lBQ0UsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQzNCLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDcEMsVUFBVSxFQUFFLFdBQVc7WUFDdkIsVUFBVSxFQUFFLFdBQVc7U0FDeEIsRUFDRCxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUNwQyxDQUFDO1FBRUYsTUFBTSxNQUFNLEdBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLFlBQVksQ0FBQyxXQUFXLEVBQUU7WUFDbkUsQ0FBQyxDQUFDLGdCQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQzdELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FDVixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEtBQUssWUFBWSxDQUFDLFdBQVcsRUFBRTtZQUNuRSxDQUFDLENBQUMsZ0JBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDN0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRXZCLE1BQU0sTUFBTSxHQUFHLG1DQUEwQixDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRTtZQUNuRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsbUJBQW1CLEVBQUUsSUFBSSxrQkFBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDMUMsaUJBQWlCLEVBQUUsSUFBSSxrQkFBTyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7WUFDdEMsUUFBUSxFQUFFLGVBQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtZQUNoRCxjQUFjLEVBQUU7Z0JBQ2QscUJBQXFCLEVBQUUseUJBQWMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDNUUscUJBQXFCLEVBQUUseUJBQWMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDNUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDLFVBQVUsRUFBRTthQUNyQztTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUN0QyxFQUFFLEVBQUUsaUJBQWlCO1lBQ3JCLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQyxVQUFVLEVBQUU7WUFDL0IsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3JCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztZQUNuQixRQUFRLEVBQUUsTUFBTSx1QkFBZSxFQUFFO1lBQ2pDLFFBQVEsRUFBRSxNQUFNO1NBQ2pCLENBQUMsQ0FBQztRQUNILE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2xCLENBQUM7Q0FDRjtBQXpERCx3Q0F5REM7QUFFRCxNQUFhLFdBQVksU0FBUSxXQUFXO0lBQzFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBa0I7UUFDcEMsT0FBTyxJQUFJLFdBQVcsQ0FBQztZQUNyQixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO1lBQzdCLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUztZQUM3QixTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBVSxFQUFFLGVBQXVCLEVBQUUsT0FBZTtRQUNuRSxNQUFNLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTdFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDckMsTUFBTSxTQUFTLEdBQUcsMkJBQWtCLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsMkJBQWtCLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3BILE1BQU0sU0FBUyxHQUNiLDJCQUFrQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxDQUFDLDJCQUFrQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRXBILE9BQU8sV0FBVyxDQUFDLFlBQVksQ0FDN0IsV0FBVyxDQUFDLFdBQVcsQ0FBQztZQUN0QixJQUFJO1lBQ0osU0FBUztZQUNULFNBQVM7WUFDVCxPQUFPO1lBQ1AsZ0JBQWdCLEVBQUUsSUFBSTtTQUN2QixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsbUNBQTBCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFO1lBQ2hFLGlCQUFpQixFQUFFLElBQUksa0JBQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1lBQ3RDLFFBQVEsRUFBRSxlQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDaEQsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUNwQyxVQUFVLEVBQUUsS0FBSztZQUNqQixTQUFTLEVBQUUsZ0JBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDdkUsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsZUFBZSxDQUFDO1lBQ3RDLEVBQUUsRUFBRSxpQkFBaUI7WUFDckIsSUFBSSxFQUFFLE1BQU0sTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUMvQixJQUFJLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDckIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO1lBQ25CLFFBQVEsRUFBRSxNQUFNLHVCQUFlLEVBQUU7WUFDakMsUUFBUSxFQUFFLE1BQU07U0FDakIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBaERELGtDQWdEQztBQU9ELE1BQU0sZUFBZSxHQUFHLENBQUMsY0FBbUMsRUFBRSxRQUFrQixFQUF1QixFQUFFO0lBQ3ZHLCtEQUErRDtJQUMvRCxPQUFPLElBQUksZ0JBQUssQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDeEgsQ0FBQyxDQUFDO0FBRUYsU0FBZ0IsbUJBQW1CLENBQUMsWUFBaUMsRUFBRSxvQkFBNEI7SUFDakcsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxtQkFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFdkYsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckQsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFaEQsT0FBTztRQUNMLEtBQUssRUFBRSxlQUFlLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQztRQUMzQyxLQUFLLEVBQUUsZUFBZSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUM7S0FDNUMsQ0FBQztBQUNKLENBQUM7QUFWRCxrREFVQyJ9

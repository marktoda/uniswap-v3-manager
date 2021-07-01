import { Config } from "./config";
import { BigNumber, ethers, providers, Signer } from "ethers";
import { SwapRouter, MethodParameters, Pool, Route, Trade } from "@uniswap/v3-sdk";
import { Ether, Percent, CurrencyAmount, TradeType, Token, Currency } from "@uniswap/sdk-core";
import { ERC20__factory, Router, Router__factory, Quoter__factory, Quoter } from "./typechain";
import { getFastGasPrice } from "./utils";
import { WETH_ADDRESS, QUOTER_ADDRESS, ROUTER_ADDRESS } from "./constants";

interface SplitBuyDefinition {
  buyToken: Currency;
  sellToken: Currency;
  buyAmount: CurrencyAmount<Currency>;
}

export class SwapManager {
  private buffer: CurrencyAmount<Token>;
  private provider: providers.Provider;
  private quoter: Quoter;
  private router: Router;
  private chainId: number;

  constructor(config: Config, private pool: Pool) {
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.chainId = config.chainId;
    this.buffer = CurrencyAmount.fromRawAmount(
      new Token(this.chainId, WETH_ADDRESS, 18),
      ethers.utils.parseEther(config.bufferEther.toString()).div(2).toString(),
    );
    this.quoter = Quoter__factory.connect(QUOTER_ADDRESS, this.provider);
    this.router = Router__factory.connect(ROUTER_ADDRESS, this.provider);
  }

  /**
   * Determine the asset to buy and to sell in what amounts in order to properly split the assets in half
   */
  private async calculateSplitPurchase(address: string): Promise<SplitBuyDefinition> {
    const balance0 = CurrencyAmount.fromRawAmount(
      this.pool.token0,
      (await this.getBalance(address, this.pool.token0.address)).toString(),
    );
    const balance1 = CurrencyAmount.fromRawAmount(
      this.pool.token1,
      (await this.getBalance(address, this.pool.token1.address)).toString(),
    );
    const totalValue0 = balance0.add(this.pool.token1Price.quote(balance1));
    const halfValue0 = totalValue0.divide(2);
    const token0IsWeth = this.pool.token0.address.toLowerCase() === WETH_ADDRESS.toLowerCase();
    const token1IsWeth = this.pool.token1.address.toLowerCase() === WETH_ADDRESS.toLowerCase();
    const token0 = token0IsWeth ? Ether.onChain(this.chainId) : this.pool.token0;
    const token1 = token1IsWeth ? Ether.onChain(this.chainId) : this.pool.token1;

    if (balance0.greaterThan(halfValue0)) {
      // then we need to buy some 1 with 0
      const halfValue1 = this.pool.token0Price.quote(halfValue0);
      let buy1Amount = halfValue1.subtract(balance1);

      if (token1IsWeth) {
        buy1Amount = buy1Amount.add(this.buffer);
      } else if (token0IsWeth) {
        buy1Amount = buy1Amount.subtract(this.pool.token0Price.quote(this.buffer));
      }

      return {
        buyToken: buy1Amount.greaterThan(0) ? token1 : token0,
        sellToken: buy1Amount.greaterThan(0) ? token0 : token1,
        buyAmount: buy1Amount.greaterThan(0) ? buy1Amount : buy1Amount.multiply(-1), // hacky absolute value
      };
    } else {
      // then we need to buy some 0 with 1
      let buy0Amount = halfValue0.subtract(balance0);

      if (token0IsWeth) {
        buy0Amount = buy0Amount.add(this.buffer);
      } else if (token1IsWeth) {
        buy0Amount = buy0Amount.subtract(this.pool.token1Price.quote(this.buffer));
      }

      return {
        buyToken: buy0Amount.greaterThan(0) ? token0 : token1,
        sellToken: buy0Amount.greaterThan(0) ? token1 : token0,
        buyAmount: buy0Amount.greaterThan(0) ? buy0Amount : buy0Amount.multiply(-1), // hacky absolute value
      };
    }
  }

  /**
   * Perform a swap such that the wallet's balances
   * are evenly split between the pair
   */
  async split(signer: Signer): Promise<void> {
    const address = await signer.getAddress();
    const { buyToken, sellToken, buyAmount } = await this.calculateSplitPurchase(address);

    if (buyAmount.lessThan(0) || buyAmount.equalTo(0)) {
      return;
    }

    console.log(`Buying ${buyAmount.toFixed()} ${buyToken.name} with ${sellToken.name}`);
    const route = new Route([this.pool], sellToken, buyToken);
    const amountIn = await this.quoter.callStatic.quoteExactOutputSingle(
      sellToken.isNative ? WETH_ADDRESS : sellToken.address,
      buyToken.isNative ? WETH_ADDRESS : buyToken.address,
      this.pool.fee,
      buyAmount.quotient.toString(10),
      0,
    );
    const trade = Trade.createUncheckedTrade({
      route,
      tradeType: TradeType.EXACT_OUTPUT,
      inputAmount: CurrencyAmount.fromRawAmount(sellToken, amountIn.toString()),
      outputAmount: CurrencyAmount.fromRawAmount(buyToken, buyAmount.quotient.toString(10)),
    });

    const params = SwapRouter.swapCallParameters([trade], {
      slippageTolerance: new Percent(5, 100),
      recipient: address,
      deadline: ethers.constants.MaxUint256.toString(),
    });

    await this.swap(signer, params);
  }

  async swap(signer: Signer, params: MethodParameters): Promise<void> {
    const tx = await signer.sendTransaction({
      to: this.router.address,
      from: await signer.getAddress(),
      data: params.calldata,
      value: params.value,
      gasPrice: await getFastGasPrice(),
      gasLimit: 300000,
    });
    await tx.wait(3);
  }

  async getBalance(address: string, token: string): Promise<BigNumber> {
    if (token.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
      return await this.provider.getBalance(address);
    } else {
      const tokenContract = ERC20__factory.connect(token, this.provider);
      return await tokenContract.balanceOf(address);
    }
  }
}

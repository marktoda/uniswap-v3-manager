import { Config } from "./config";
import { BigNumber, ethers, providers, Signer } from "ethers";
import { SwapRouter, MethodParameters, Pool, Route, Trade } from "@uniswap/v3-sdk";
import { Ether, Percent, CurrencyAmount, TradeType } from "@uniswap/sdk-core";
import { ERC20__factory, Router, Router__factory, Quoter__factory, Quoter } from "./typechain";
import { getFastGasPrice } from "./utils";
import { WETH_ADDRESS, QUOTER_ADDRESS, ROUTER_ADDRESS } from "./constants";

export class SwapManager {
  private buffer: BigNumber;
  private provider: providers.Provider;
  private quoter: Quoter;
  private router: Router;

  constructor(config: Config, private pool: Pool) {
    this.buffer = ethers.utils.parseEther(config.bufferEther.toString());
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.quoter = Quoter__factory.connect(QUOTER_ADDRESS, this.provider);
    this.router = Router__factory.connect(ROUTER_ADDRESS, this.provider);
  }

  /**
   * Perform a swap such that the wallet's balances
   * are evenly split between the pair
   */
  async split(signer: Signer): Promise<void> {
    const address = await signer.getAddress();
    const balance0 = CurrencyAmount.fromRawAmount(
      this.pool.token0,
      (await this.getBalance(address, this.pool.token0.address)).toString(),
    );
    const balance1 = CurrencyAmount.fromRawAmount(
      this.pool.token1,
      (await this.getBalance(address, this.pool.token1.address)).toString(),
    );
    const price1 = this.pool.token1Price;
    const totalValue0 = balance0.add(price1.quote(balance1));
    const halfValue0 = totalValue0.divide(2);

    const token0 =
      this.pool.token0.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? Ether.onChain((await this.provider.getNetwork()).chainId)
        : this.pool.token0;
    const token1 =
      this.pool.token1.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
        ? Ether.onChain((await this.provider.getNetwork()).chainId)
        : this.pool.token1;

    let trade;
    if (balance0.greaterThan(halfValue0)) {
      // then we need to sell some 0 for 1
      const sell0Amount = balance0.subtract(halfValue0);
      console.log(`Selling ${sell0Amount.toFixed()} of token0 for token1`);

      const route = new Route([this.pool], token0, token1);
      const amount1Out = await this.quoter.callStatic.quoteExactInputSingle(
        this.pool.token0.address,
        this.pool.token1.address,
        this.pool.fee,
        sell0Amount.quotient.toString(10),
        0,
      );
      trade = Trade.createUncheckedTrade({
        route,
        tradeType: TradeType.EXACT_INPUT,
        inputAmount: sell0Amount,
        outputAmount: CurrencyAmount.fromRawAmount(token1, amount1Out.toString()),
      });
    } else {
      // then we need to buy some 0 with 1
      const buy0Amount = halfValue0.subtract(balance0);
      console.log(`Buying ${buy0Amount.toFixed()} of token0 with token1`);
      const route = new Route([this.pool], token1, token0);
      const amount1In = await this.quoter.callStatic.quoteExactOutputSingle(
        this.pool.token1.address,
        this.pool.token0.address,
        this.pool.fee,
        buy0Amount.quotient.toString(10),
        0,
      );
      trade = Trade.createUncheckedTrade({
        route,
        tradeType: TradeType.EXACT_OUTPUT,
        inputAmount: CurrencyAmount.fromRawAmount(token1, amount1In.toString()),
        outputAmount: buy0Amount,
      });
    }

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
      const balance = (await this.provider.getBalance(address)).sub(this.buffer);
      return balance.lt(0) ? BigNumber.from(0) : balance;
    } else {
      const tokenContract = ERC20__factory.connect(token, this.provider);
      return await tokenContract.balanceOf(address);
    }
  }
}

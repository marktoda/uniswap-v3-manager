"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapManager = void 0;
const ethers_1 = require("ethers");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const typechain_1 = require("./typechain");
const utils_1 = require("./utils");
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const QUOTER_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const ROUTER_ADDRESS = "0xe592427a0aece92de3edee1f18e0157c05861564";
class SwapManager {
    constructor(config, pool) {
        this.pool = pool;
        this.buffer = ethers_1.ethers.utils.parseEther(config.bufferEther.toString());
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(config.rpcUrl);
        this.quoter = typechain_1.Quoter__factory.connect(QUOTER_ADDRESS, this.provider);
        this.router = typechain_1.Router__factory.connect(ROUTER_ADDRESS, this.provider);
    }
    /**
     * Perform a swap such that the wallet's balances
     * are evenly split between the pair
     */
    async split(signer) {
        const address = await signer.getAddress();
        const balance0 = sdk_core_1.CurrencyAmount.fromRawAmount(this.pool.token0, (await this.getBalance(address, this.pool.token0.address)).toString());
        const balance1 = sdk_core_1.CurrencyAmount.fromRawAmount(this.pool.token1, (await this.getBalance(address, this.pool.token1.address)).toString());
        const price1 = this.pool.token1Price;
        const totalValue0 = balance0.add(price1.quote(balance1));
        const halfValue0 = totalValue0.divide(2);
        console.log(`Balance 0: ${balance0.toFixed()}`);
        console.log(`Balance 1: ${balance1.toFixed()}`);
        console.log(`Total Value in 0: ${totalValue0.toFixed()}`);
        console.log(`Total Value in 1: ${this.pool.token0Price.quote(totalValue0).toFixed()}`);
        const token0 = this.pool.token0.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
            ? sdk_core_1.Ether.onChain((await this.provider.getNetwork()).chainId)
            : this.pool.token0;
        const token1 = this.pool.token1.address.toLowerCase() === WETH_ADDRESS.toLowerCase()
            ? sdk_core_1.Ether.onChain((await this.provider.getNetwork()).chainId)
            : this.pool.token1;
        let trade;
        if (balance0.greaterThan(halfValue0)) {
            // then we need to sell some 0 for 1
            const sell0Amount = balance0.subtract(halfValue0);
            console.log(`Selling ${sell0Amount.toFixed()} of token0 for token1`);
            const route = new v3_sdk_1.Route([this.pool], token0, token1);
            const amount1Out = await this.quoter.callStatic.quoteExactInputSingle(this.pool.token0.address, this.pool.token1.address, this.pool.fee, sell0Amount.quotient.toString(10), 0);
            trade = v3_sdk_1.Trade.createUncheckedTrade({
                route,
                tradeType: sdk_core_1.TradeType.EXACT_INPUT,
                inputAmount: sell0Amount,
                outputAmount: sdk_core_1.CurrencyAmount.fromRawAmount(token1, amount1Out.toString()),
            });
        }
        else {
            // then we need to buy some 0 with 1
            const buy0Amount = halfValue0.subtract(balance0);
            console.log(`Buying ${buy0Amount.toFixed()} of token0 with token1`);
            const route = new v3_sdk_1.Route([this.pool], token1, token0);
            const amount1In = await this.quoter.callStatic.quoteExactOutputSingle(this.pool.token1.address, this.pool.token0.address, this.pool.fee, buy0Amount.quotient.toString(10), 0);
            trade = v3_sdk_1.Trade.createUncheckedTrade({
                route,
                tradeType: sdk_core_1.TradeType.EXACT_OUTPUT,
                inputAmount: sdk_core_1.CurrencyAmount.fromRawAmount(token1, amount1In.toString()),
                outputAmount: buy0Amount,
            });
        }
        const params = v3_sdk_1.SwapRouter.swapCallParameters([trade], {
            slippageTolerance: new sdk_core_1.Percent(5, 100),
            recipient: address,
            deadline: ethers_1.ethers.constants.MaxUint256.toString(),
        });
        await this.swap(signer, params);
    }
    async swap(signer, params) {
        const tx = await signer.sendTransaction({
            to: this.router.address,
            from: await signer.getAddress(),
            data: params.calldata,
            value: params.value,
            gasPrice: await utils_1.getFastGasPrice(),
        });
        await tx.wait();
    }
    async getBalance(address, token) {
        if (token.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
            const balance = (await this.provider.getBalance(address)).sub(this.buffer);
            return balance.lt(0) ? ethers_1.BigNumber.from(0) : balance;
        }
        else {
            const tokenContract = typechain_1.ERC20__factory.connect(token, this.provider);
            return await tokenContract.balanceOf(address);
        }
    }
}
exports.SwapManager = SwapManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3dhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zd2FwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUE4RDtBQUM5RCw0Q0FBbUY7QUFDbkYsZ0RBQThFO0FBQzlFLDJDQUErRjtBQUMvRixtQ0FBMEM7QUFFMUMsTUFBTSxZQUFZLEdBQUcsNENBQTRDLENBQUM7QUFDbEUsTUFBTSxjQUFjLEdBQUcsNENBQTRDLENBQUM7QUFDcEUsTUFBTSxjQUFjLEdBQUcsNENBQTRDLENBQUM7QUFFcEUsTUFBYSxXQUFXO0lBTXRCLFlBQVksTUFBYyxFQUFVLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO1FBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxlQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLE1BQU0sR0FBRywyQkFBZSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxNQUFNLEdBQUcsMkJBQWUsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFjO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLE1BQU0sTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLHlCQUFjLENBQUMsYUFBYSxDQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFDaEIsQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElB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
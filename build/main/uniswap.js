"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniswapPositionFetcher = exports.getPool = void 0;
const ethers_1 = require("ethers");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const position_1 = require("./position");
const typechain_1 = require("./typechain");
async function getPool(pair, provider) {
  const chainId = (await provider.getNetwork()).chainId;
  const token0Contract = typechain_1.ERC20__factory.connect(pair.token0, provider);
  const token1Contract = typechain_1.ERC20__factory.connect(pair.token1, provider);
  const token0 = new sdk_core_1.Token(chainId, pair.token0, parseInt((await token0Contract.decimals()).toString()));
  const token1 = new sdk_core_1.Token(chainId, pair.token1, parseInt((await token1Contract.decimals()).toString()));
  const poolAddress = v3_sdk_1.Pool.getAddress(token0, token1, pair.fee);
  const poolContract = typechain_1.Pool__factory.connect(poolAddress, provider);
  const liquidity = await poolContract.liquidity();
  const slot0 = await poolContract.slot0();
  return new v3_sdk_1.Pool(token0, token1, pair.fee, slot0.sqrtPriceX96.toString(), liquidity.toString(), slot0.tick);
}
exports.getPool = getPool;
class UniswapPositionFetcher {
  constructor(config, pool) {
    this.pool = pool;
    const provider = new ethers_1.ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.positions = typechain_1.Positions__factory.connect(config.uniswap.positions, provider);
  }
  async getPositions(address) {
    const result = [];
    let exists = true;
    let i = 0;
    while (exists) {
      try {
        const token = await this.positions.tokenOfOwnerByIndex(address, i);
        const position = await this.positions.positions(token);
        result.push({
          id: token,
          token0: position.token0,
          token1: position.token1,
          liquidity: position.liquidity,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
        });
        i++;
      } catch (e) {
        exists = false;
      }
    }
    return result;
  }
  async getActivePositions(address) {
    return (await this.getPositions(address))
      .filter(p => p.liquidity.gt(0))
      .filter(p => {
        return (
          (p.token0.toLowerCase() === this.pool.token0.address.toLowerCase() &&
            p.token1.toLowerCase() === this.pool.token1.address.toLowerCase()) ||
          (p.token1.toLowerCase() === this.pool.token0.address.toLowerCase() &&
            p.token0.toLowerCase() === this.pool.token1.address.toLowerCase())
        );
      })
      .map(p => new position_1.ActivePosition(this.pool, p));
  }
}
exports.UniswapPositionFetcher = UniswapPositionFetcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pc3dhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91bmlzd2FwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFzRDtBQUV0RCw0Q0FBdUM7QUFDdkMsZ0RBQTBDO0FBQzFDLHlDQUE0QztBQUM1QywyQ0FBMkY7QUFXcEYsS0FBSyxVQUFVLE9BQU8sQ0FBQyxJQUFvQixFQUFFLFFBQTRCO0lBQzlFLE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDdEQsTUFBTSxjQUFjLEdBQUcsMEJBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRSxNQUFNLGNBQWMsR0FBRywwQkFBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JFLE1BQU0sTUFBTSxHQUFHLElBQUksZ0JBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2RyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFdkcsTUFBTSxXQUFXLEdBQUcsYUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5RCxNQUFNLFlBQVksR0FBRyx5QkFBYSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFbEUsTUFBTSxTQUFTLEdBQUcs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

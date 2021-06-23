"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivePosition = void 0;
const v3_sdk_1 = require("@uniswap/v3-sdk");
class ActivePosition extends v3_sdk_1.Position {
  constructor(pool, data) {
    super({
      pool,
      liquidity: data.liquidity.toString(),
      tickLower: data.tickLower,
      tickUpper: data.tickUpper,
    });
    this.id = data.id;
  }
  inRange() {
    const lower = this.token0PriceLower;
    const upper = this.token0PriceUpper;
    return this.pool.token0Price.greaterThan(lower) && this.pool.token0Price.lessThan(upper);
  }
}
exports.ActivePosition = ActivePosition;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZlUG9zaXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYWN0aXZlUG9zaXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsNENBQWlEO0FBRWpELE1BQWEsY0FBZSxTQUFRLGlCQUFRO0lBR3hDLFlBQVksSUFBVSxFQUFFLElBQWtCO1FBQ3RDLEtBQUssQ0FBQztZQUNGLElBQUk7WUFDSixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDcEMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztTQUM1QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELE9BQU87UUFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3RixDQUFDO0NBQ0o7QUFuQkQsd0NBbUJDIn0=

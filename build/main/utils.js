"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.getFastGasPrice = void 0;
const got_1 = __importDefault(require("got"));
const ethers_1 = require("ethers");
async function getFastGasPrice() {
  const gasPriceData = await got_1.default("https://www.etherchain.org/api/gasPriceOracle").json();
  return ethers_1.ethers.utils.parseUnits(gasPriceData.fastest.toString(), 9);
}
exports.getFastGasPrice = getFastGasPrice;
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsOENBQXNCO0FBQ3RCLG1DQUEyQztBQU1wQyxLQUFLLFVBQVUsZUFBZTtJQUNuQyxNQUFNLFlBQVksR0FBaUIsTUFBTSxhQUFHLENBQUMsK0NBQStDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNyRyxPQUFPLGVBQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQztBQUhELDBDQUdDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLEVBQVU7SUFDOUIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRkQsc0JBRUMifQ==

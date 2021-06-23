export interface Config {
  rpcUrl: string;
  privateKey: string;
  // price width of position in percentage terms
  priceWidthPercentage: number;
  bufferEther: number; // buffer of ETH to leave on wallet for fees etc.
  pair: {
    token0: string;
    token1: string;
    fee: number;
  };
  uniswap: {
    positions: string;
    factory: string;
    router: string;
  };
}

export function getConfig(): Config {
  return {
    rpcUrl: envOrThrow("RPC_URL"),
    privateKey: envOrThrow("PRIVATE_KEY"),
    priceWidthPercentage: parseInt(envOrDefault("PRICE_WIDTH", "2")),
    bufferEther: parseInt(envOrDefault("BUFFER_ETHER", "2")),
    pair: getPair(
      envOrDefault(
        "UNISWAP_PAIR",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48:3000",
      ),
    ),
    uniswap: {
      positions: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
      factory: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
      router: "0xe592427a0aece92de3edee1f18e0157c05861564",
    },
  };
}

function getPair(pair: string): Config["pair"] {
  const [token0, token1, fee] = pair.split(":");
  return {
    token0,
    token1,
    fee: parseInt(fee),
  };
}

function envOrDefault(key: string, _default: string): string {
  return process.env[key] || _default;
}

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} not found`);
  }
  return value;
}

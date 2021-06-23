export interface Config {
    rpcUrl: string;
    privateKey: string;
    priceWidthPercentage: number;
    bufferEther: number;
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
export declare function getConfig(): Config;

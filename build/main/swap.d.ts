import { Config } from "./config";
import { BigNumber, Signer } from "ethers";
import { MethodParameters, Pool } from "@uniswap/v3-sdk";
export declare class SwapManager {
    private pool;
    private buffer;
    private provider;
    private quoter;
    private router;
    constructor(config: Config, pool: Pool);
    /**
     * Perform a swap such that the wallet's balances
     * are evenly split between the pair
     */
    split(signer: Signer): Promise<void>;
    swap(signer: Signer, params: MethodParameters): Promise<void>;
    getBalance(address: string, token: string): Promise<BigNumber>;
}

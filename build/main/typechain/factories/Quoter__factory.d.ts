import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { Quoter, QuoterInterface } from "../Quoter";
export declare class Quoter__factory {
  static readonly abi: (
    | {
        inputs: {
          internalType: string;
          name: string;
          type: string;
        }[];
        stateMutability: string;
        type: string;
        name?: undefined;
        outputs?: undefined;
      }
    | {
        inputs: {
          internalType: string;
          name: string;
          type: string;
        }[];
        name: string;
        outputs: {
          internalType: string;
          name: string;
          type: string;
        }[];
        stateMutability: string;
        type: string;
      }
  )[];
  static createInterface(): QuoterInterface;
  static connect(address: string, signerOrProvider: Signer | Provider): Quoter;
}

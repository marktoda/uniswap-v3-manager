import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { ERC20, ERC20Interface } from "../ERC20";
export declare class ERC20__factory {
  static readonly abi: (
    | {
        constant: boolean;
        inputs: {
          name: string;
          type: string;
        }[];
        name: string;
        outputs: {
          name: string;
          type: string;
        }[];
        payable: boolean;
        type: string;
        anonymous?: undefined;
      }
    | {
        anonymous: boolean;
        inputs: {
          indexed: boolean;
          name: string;
          type: string;
        }[];
        name: string;
        type: string;
        constant?: undefined;
        outputs?: undefined;
        payable?: undefined;
      }
  )[];
  static createInterface(): ERC20Interface;
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20;
}

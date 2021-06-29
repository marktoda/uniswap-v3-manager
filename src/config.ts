import { Command, Option, program } from 'commander';
import { promisify } from 'util';
import { decrypt as _decrypt } from 'gpg';
import fs from 'fs';
const decrypt = promisify(_decrypt);

export interface Config {
  rpcUrl: string;
  privateKey: string;
  // price width of position in percentage terms
  priceWidthPercentage: number;
  bufferEther: number; // buffer of ETH to leave on wallet for fees etc.
  historyFile: string;
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

interface CliArgs {
    rpc: string;
    width: string;
    buffer: string;
    outFile: string;
    key?: string;
    keyFile?: string;
    encrypted?: boolean;
    scheme?: string;
}

function getProgramArgs(): Command {
    return program
        .requiredOption('-r, --rpc <url>', 'RPC URL to fetch data from the blockchain', envOrThrow("RPC_URL"))
        .requiredOption('-w, --width <percent>', 'Price width of LP positions in percentage terms', envOrDefault("PRICE_WIDTH", "3"))
        .requiredOption('-b, --buffer <eth>', 'Ether buffer to keep on wallet for fees', envOrDefault("BUFFER_ETHER", "2"))
        .requiredOption('-o, --outFile <fileName>', 'File to write position history in', envOrDefault("HISTORY_FILE", "./history.json"))
        .option('-k, --key <key>', 'Private key hex string', envOrDefault("PRIVATE_KEY", ""))
        .option('-kf, --keyFile <file>', 'Private key file', envOrDefault("PRIVATE_KEY_FILE", ""))
        .option('-e, --encrypted', 'Whether or not the private key file is encrypted', false)
        .addOption(new Option('-es, --scheme <scheme>', 'Encryption scheme for the encrypted private key file').choices(['gpg']).default('gpg'));
}

async function parsePrivateKey(args: CliArgs): Promise<string> {
    if (args.key) {
        return args.key;
    } else if (args.keyFile && !args.encrypted) {
        return fs.readFileSync(args.keyFile, 'utf-8').trim();
    } else if (args.keyFile && args.encrypted) {
        switch (args.scheme) {
            case 'gpg':
                console.log('Decrypting gpg encrypted private key file');
                const data = (await decrypt(fs.readFileSync(args.keyFile))).toString('utf-8');
                return data.split('\n')[0].trim();
            default:
                throw new Error(`Unsupported encryption scheme: ${args.scheme}`);
        }
    } else {
        throw new Error('Could not parse private key');
    }
}

export async function getConfig(): Promise<Config> {
  const args: CliArgs = getProgramArgs().parse().opts();

  return {
    rpcUrl: args.rpc,
    privateKey: await parsePrivateKey(args),
    priceWidthPercentage: parseInt(args.width),
    bufferEther: parseInt(args.buffer),
    historyFile: args.outFile,
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

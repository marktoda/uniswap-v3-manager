# Uniswap V3 Position Manager

A script to actively manage your Uniswap V3 Positions. Provide it a "range" percentage and a pool, and it will
create a position with that range in that pool. If the price moves your position out of range, it will withdraw
your position and create a new one based around the new current price.

## Installation

### Build from source

#### Prerequisites

```js
$ yarn install
```

## Configuration

The application is configured through CLI parameters:
```
Options:
  -r, --rpc <url>           RPC URL to fetch data from the blockchain (default: "https://mainnet.infura.io/v3/<PROJECT_ID>")
  -w, --width <percent>     Price width of LP positions in percentage terms (default: "2")
  -b, --buffer <eth>        Ether buffer to keep on wallet for fees (default: "2")
  -o, --outFile <fileName>  File to write position history in (default: "./history.json")
  -k, --key <key>           Private key hex string (default: "")
  -kf, --keyFile <file>     Private key file (default: "")
  -e, --encrypted           Whether or not the private key file is encrypted (default: false)
  -es, --scheme <scheme>    Encryption scheme for the encrypted private key file (choices: "gpg", default: "gpg")
  -h, --help                display help for command
```

Options can also be provided through environment variables:

#### Required configuration parameters

`RPC_URL`

The URL at which the application can talk to the blockchain through JSON RPC. Infura, or a fullnode instance work here.

`PRIVATE_KEY`

Hex encoded string private key for the wallet to manage positions with. 

Alternatively private key can be provided through an encrypted key file. GPG is the only encryption scheme supported currently.

#### Optional configuration parameters

`PRICE_WIDTH`

The percentage of the current price from which to set the range boundaries on either side.
For example, if `PRICE_WIDTH` is 5 and the current price is 1000, the lower boundary will be set to 5% below current price
or 950, and the upper boundary will be set to 5% above current price, or 1050 - rounded to the nearest tick.
Default: 3

`BUFFER_ETHER`

Your wallet needs some ETH to pay for gas of transactions. This configuration sets the amount of ETH to leave on your wallet
after creating a position as a buffer for gas.
Default: 2

`HISTORY_FILE`

The app stores a json history of all position changes. This configuration tells it which file to place this history in.
Default: ./history.json

`UNISWAP_PAIR`

The uniswapv3 pool configuration. This is encoded as `<token0address>:<token1address>:<fee>`
Default: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48:3000 (USDC:WETH 3%)

## Usage

```sh
❯ yarn start
    Address: 0x22cb6...b1453937d
    ********* Position *********
    range: 2150 - 2350
    Current Price 2275
    In Range: true
    Position total value USDC: 2275
    Position total value WETH: 1
    Position liquidity USDC 1100
    Position liquidity WETH 0.5
    ****************************
```

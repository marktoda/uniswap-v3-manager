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

The application is configured through environment variables. It is advised to use a `.env` file to keep these in one place.

#### Required configuration parameters

`RPC_URL`

The URL at which the application can talk to the blockchain through JSON RPC. Infura, or a fullnode instance work here.

`PRIVATE_KEY`

Hex encoded string private key for the wallet to manage positions with. Encrypted json key file is not yet supported.

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

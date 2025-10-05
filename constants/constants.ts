import { PublicKey } from "@solana/web3.js"
import { retrieveEnvVariable } from "../utils"

export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY')
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT')
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT')

export const DISTRIBUTE_INTERVAL_MAX = Number(retrieveEnvVariable('DISTRIBUTE_INTERVAL_MAX'))
export const DISTRIBUTE_INTERVAL_MIN = Number(retrieveEnvVariable('DISTRIBUTE_INTERVAL_MIN'))

export const BUY_UPPER_PERCENT = Number(retrieveEnvVariable('BUY_UPPER_PERCENT'))
export const BUY_LOWER_PERCENT = Number(retrieveEnvVariable('BUY_LOWER_PERCENT'))

export const BUY_INTERVAL_MIN = Number(retrieveEnvVariable('BUY_INTERVAL_MIN'))
export const BUY_INTERVAL_MAX = Number(retrieveEnvVariable('BUY_INTERVAL_MAX'))

export const SELL_INTERVAL_MIN = Number(retrieveEnvVariable('SELL_INTERVAL_MIN'))
export const SELL_INTERVAL_MAX = Number(retrieveEnvVariable('SELL_INTERVAL_MAX'))

export const DISTRIBUTE_WALLET_NUM = Number(retrieveEnvVariable('DISTRIBUTE_WALLET_NUM'))
export const SOL_AMOUNT_TO_DISTRIBUTE = Number(retrieveEnvVariable('SOL_AMOUNT_TO_DISTRIBUTE'))

export const JITO_MODE = retrieveEnvVariable('JITO_MODE') === 'true'
export const JITO_FEE = Number(retrieveEnvVariable('JITO_FEE'))

export const SLIPPAGE = Number(retrieveEnvVariable('SLIPPAGE'))

export const FEE_LEVEL = Number(retrieveEnvVariable('FEE_LEVEL'))

export const TOKEN_MINT = retrieveEnvVariable('TOKEN_MINT')
export const POOL_ID = retrieveEnvVariable('POOL_ID')


// airdrop part
// export const AIRDROP = retrieveEnvVariable('AIRDROP') === 'true'
// export const AIRDROP_AMOUNT = Number(retrieveEnvVariable('AIRDROP_AMOUNT'))
// export const AIRDROP_INTERVAL = Number(retrieveEnvVariable('AIRDROP_INTERVAL'))
// export const AIRDROP_RAND_PERCENT = Number(retrieveEnvVariable('AIRDROP_RAND_PERCENT'))
// export const AIRDROP_RANDOM = retrieveEnvVariable('AIRDROP_RANDOM') === 'true'
// export const AIRDROP_ADDRESS = retrieveEnvVariable('AIRDROP_ADDRESS')


// gather part
export const GATHER_TO_OTHER_ADDRESS = retrieveEnvVariable('GATHER_TO_OTHER_ADDRESS') === 'true'
export const GATHER_ADDRESS = retrieveEnvVariable('GATHER_ADDRESS')

export const FEE_RECIPIENT = new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV")
export const GLOBAL_CONFIG = new PublicKey("ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw")
export const GLOBAL_MINT = new PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump")


//  ========= Volume Bot =========
export const BONDING_CURVE_THRESHOLD_SOL = 30.114164095; // SOL
export const TOKEN_MINT_PUMPSWAP = retrieveEnvVariable('TOKEN_MINT_PUMPSWAP');
export const POOL_ID_PUMPSWAP = retrieveEnvVariable('POOL_ID_PUMPSWAP');

//  == Initialization
// Buy
export const TOTAL_PERIOD_MIN = 5;  // min
export const BUY_INTERVAL_PERIOD_UNIT_SEC = 30;  // sec
export const SOL_AMOUNT_TO_MARKET_MAKER_SOL = BONDING_CURVE_THRESHOLD_SOL - 30; // SOL
export const DISTRIBUTE_WALLET_NUM_MARKETMAKER = 2; // num
export const DISTRIBUTE_DELTA_PERFECTAGE = 5; // %
export const BUY_SELL_MOVE_TIME_MIN = 2; // min

// Sell
export const SELL_INTERVAL_PERIOD_UNIT_SEC = 30;  // sec
export const SELL_TOKEN_PERCENT = 10 // %
export const SELL_TOKEN_DELTA_PERFECTAGE = 5; // %
export const SELL_CONCURRENCY_PERCENT = 25; // %
export const SELL_CONCURRENCY_DELTA_PERFECTAGE = 10; // %
export const SELL_ITERATION_SLEEP_TIME_MIN = 1; // min
export const SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE = 5; // %



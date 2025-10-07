import { PublicKey } from "@solana/web3.js"
import { config } from "../utils/config-manager"

export const PRIVATE_KEY = config.PRIVATE_KEY
export const RPC_ENDPOINT = config.RPC_ENDPOINT
export const RPC_WEBSOCKET_ENDPOINT = config.RPC_WEBSOCKET_ENDPOINT

export const DISTRIBUTE_INTERVAL_MAX = config.DISTRIBUTE_INTERVAL_MAX
export const DISTRIBUTE_INTERVAL_MIN = config.DISTRIBUTE_INTERVAL_MIN

export const BUY_UPPER_PERCENT = config.BUY_UPPER_PERCENT
export const BUY_LOWER_PERCENT = config.BUY_LOWER_PERCENT

export const BUY_INTERVAL_MIN = config.BUY_INTERVAL_MIN
export const BUY_INTERVAL_MAX = config.BUY_INTERVAL_MAX

export const SELL_INTERVAL_MIN = config.SELL_INTERVAL_MIN
export const SELL_INTERVAL_MAX = config.SELL_INTERVAL_MAX

export const DISTRIBUTE_WALLET_NUM = config.DISTRIBUTE_WALLET_NUM
export const SOL_AMOUNT_TO_DISTRIBUTE = config.SOL_AMOUNT_TO_DISTRIBUTE

export const JITO_MODE = config.JITO_MODE
export const JITO_FEE = config.JITO_FEE

export const SLIPPAGE = config.SLIPPAGE

export const FEE_LEVEL = config.FEE_LEVEL

export const TOKEN_MINT = config.TOKEN_MINT
export const POOL_ID = config.POOL_ID


// gather part
export const GATHER_TO_OTHER_ADDRESS = config.GATHER_TO_OTHER_ADDRESS
export const GATHER_ADDRESS = config.GATHER_ADDRESS

export const FEE_RECIPIENT = new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV")
export const GLOBAL_CONFIG = new PublicKey("ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw")
export const GLOBAL_MINT = new PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump")


//  ========= Volume Bot =========
export const BONDING_CURVE_THRESHOLD_SOL = config.BONDING_CURVE_THRESHOLD_SOL;
export const TOKEN_MINT_PUMPSWAP = config.TOKEN_MINT_PUMPSWAP;
export const POOL_ID_PUMPSWAP = config.POOL_ID_PUMPSWAP;

//  == Market Maker Configuration (from CLI)
// Buy Configuration
export const TOTAL_PERIOD_MIN = config.TOTAL_PERIOD_MIN;
export const BUY_INTERVAL_PERIOD_UNIT_SEC = config.BUY_INTERVAL_PERIOD_UNIT_SEC;
export const DISTRIBUTE_WALLET_NUM_MARKETMAKER = config.DISTRIBUTE_WALLET_NUM_MARKETMAKER;
export const DISTRIBUTE_DELTA_PERFECTAGE = config.DISTRIBUTE_DELTA_PERFECTAGE;
export const ADDITIONAL_TIME_MIN = config.ADDITIONAL_TIME_MIN;

// Sell Configuration
export const SELL_TOKEN_PERCENT = config.SELL_TOKEN_PERCENT;
export const SELL_TOKEN_DELTA_PERFECTAGE = config.SELL_TOKEN_DELTA_PERFECTAGE;
export const SELL_CONCURRENCY_PERCENT = config.SELL_CONCURRENCY_PERCENT;
export const SELL_CONCURRENCY_DELTA_PERFECTAGE = config.SELL_CONCURRENCY_DELTA_PERFECTAGE;
export const SELL_ITERATION_SLEEP_TIME_MIN = config.SELL_ITERATION_SLEEP_TIME_MIN;
export const SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE = config.SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE;


// Constant
export const BONDING_CURVE_SEED = "bonding-curve";



import { BotConfig } from './cli-prompts';
import { saveConfiguration, loadConfiguration, SavedConfig } from './config-persistence';

// Global configuration instance
let globalConfig: BotConfig | null = null;

export function setGlobalConfig(config: BotConfig, saveToFile: boolean = true, preserveDistributionTimestamp: boolean = true): void {
  globalConfig = config;
  if (saveToFile) {
    saveConfiguration(config, preserveDistributionTimestamp);
  }
}

export function getGlobalConfig(): BotConfig {
  if (!globalConfig) {
    throw new Error('Configuration not initialized. Please run the CLI setup first.');
  }
  return globalConfig;
}

export function loadConfigFromFile(): SavedConfig | null {
  return loadConfiguration();
}

export function hasConfiguration(): boolean {
  return globalConfig !== null;
}

// Configuration getters that replace retrieveEnvVariable
export function getConfigValue<K extends keyof BotConfig>(key: K): BotConfig[K] {
  const config = getGlobalConfig();
  return config[key];
}

// Type-safe configuration getters
export const config = {
  // Core Configuration
  get PRIVATE_KEY(): string {
    return getConfigValue('PRIVATE_KEY');
  },
  get RPC_ENDPOINT(): string {
    return getConfigValue('RPC_ENDPOINT');
  },
  get RPC_WEBSOCKET_ENDPOINT(): string {
    return getConfigValue('RPC_WEBSOCKET_ENDPOINT');
  },
  
  // Trading Configuration
  get TOKEN_MINT(): string {
    return getConfigValue('TOKEN_MINT');
  },
  get POOL_ID(): string {
    return getConfigValue('POOL_ID');
  },
  get BUY_INTERVAL_MIN(): number {
    return getConfigValue('BUY_INTERVAL_MIN');
  },
  get BUY_INTERVAL_MAX(): number {
    return getConfigValue('BUY_INTERVAL_MAX');
  },
  get SELL_INTERVAL_MIN(): number {
    return getConfigValue('SELL_INTERVAL_MIN');
  },
  get SELL_INTERVAL_MAX(): number {
    return getConfigValue('SELL_INTERVAL_MAX');
  },
  get BUY_UPPER_PERCENT(): number {
    return getConfigValue('BUY_UPPER_PERCENT');
  },
  get BUY_LOWER_PERCENT(): number {
    return getConfigValue('BUY_LOWER_PERCENT');
  },
  
  // Distribution Configuration
  get DISTRIBUTE_WALLET_NUM(): number {
    return getConfigValue('DISTRIBUTE_WALLET_NUM');
  },
  get SOL_AMOUNT_TO_DISTRIBUTE(): number {
    return getConfigValue('SOL_AMOUNT_TO_DISTRIBUTE');
  },
  get DISTRIBUTE_INTERVAL_MIN(): number {
    return getConfigValue('DISTRIBUTE_INTERVAL_MIN');
  },
  get DISTRIBUTE_INTERVAL_MAX(): number {
    return getConfigValue('DISTRIBUTE_INTERVAL_MAX');
  },
  
  // Fee Configuration
  get FEE_LEVEL(): number {
    return getConfigValue('FEE_LEVEL');
  },
  get JITO_MODE(): boolean {
    return getConfigValue('JITO_MODE');
  },
  get JITO_FEE(): number {
    return getConfigValue('JITO_FEE');
  },
  get SLIPPAGE(): number {
    return getConfigValue('SLIPPAGE');
  },
  
  // Gathering Configuration
  get GATHER_TO_OTHER_ADDRESS(): boolean {
    return getConfigValue('GATHER_TO_OTHER_ADDRESS');
  },
  get GATHER_ADDRESS(): string {
    return getConfigValue('GATHER_ADDRESS');
  },
  
  // Market Making Configuration
  get TOKEN_MINT_PUMPSWAP(): string {
    return getConfigValue('TOKEN_MINT_PUMPSWAP');
  },
  get POOL_ID_PUMPSWAP(): string {
    return getConfigValue('POOL_ID_PUMPSWAP');
  },
  get BONDING_CURVE_THRESHOLD_SOL(): number {
    return getConfigValue('BONDING_CURVE_THRESHOLD_SOL');
  },
  
  // Market Maker - Buy Configuration
  get TOTAL_PERIOD_MIN(): number {
    return getConfigValue('TOTAL_PERIOD_MIN');
  },
  get BUY_INTERVAL_PERIOD_UNIT_SEC(): number {
    return getConfigValue('BUY_INTERVAL_PERIOD_UNIT_SEC');
  },
  get DISTRIBUTE_WALLET_NUM_MARKETMAKER(): number {
    return getConfigValue('DISTRIBUTE_WALLET_NUM_MARKETMAKER');
  },
  get DISTRIBUTE_DELTA_PERFECTAGE(): number {
    return getConfigValue('DISTRIBUTE_DELTA_PERFECTAGE');
  },
  get ADDITIONAL_TIME_MIN(): number {
    return getConfigValue('ADDITIONAL_TIME_MIN');
  },
  
  // Market Maker - Sell Configuration
  get SELL_TOKEN_PERCENT(): number {
    return getConfigValue('SELL_TOKEN_PERCENT');
  },
  get SELL_TOKEN_DELTA_PERFECTAGE(): number {
    return getConfigValue('SELL_TOKEN_DELTA_PERFECTAGE');
  },
  get SELL_CONCURRENCY_PERCENT(): number {
    return getConfigValue('SELL_CONCURRENCY_PERCENT');
  },
  get SELL_CONCURRENCY_DELTA_PERFECTAGE(): number {
    return getConfigValue('SELL_CONCURRENCY_DELTA_PERFECTAGE');
  },
  get SELL_ITERATION_SLEEP_TIME_MIN(): number {
    return getConfigValue('SELL_ITERATION_SLEEP_TIME_MIN');
  },
  get SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE(): number {
    return getConfigValue('SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE');
  }
};

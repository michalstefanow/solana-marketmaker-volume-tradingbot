import inquirer from 'inquirer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface BotConfig {
  // Core Configuration
  PRIVATE_KEY: string;
  RPC_ENDPOINT: string;
  RPC_WEBSOCKET_ENDPOINT: string;
  
  // Trading Configuration
  TOKEN_MINT: string;
  POOL_ID: string;
  BUY_INTERVAL_MIN: number;
  BUY_INTERVAL_MAX: number;
  SELL_INTERVAL_MIN: number;
  SELL_INTERVAL_MAX: number;
  BUY_UPPER_PERCENT: number;
  BUY_LOWER_PERCENT: number;
  
  // Distribution Configuration
  DISTRIBUTE_WALLET_NUM: number;
  SOL_AMOUNT_TO_DISTRIBUTE: number;
  DISTRIBUTE_INTERVAL_MIN: number;
  DISTRIBUTE_INTERVAL_MAX: number;
  
  // Fee Configuration
  FEE_LEVEL: number;
  JITO_MODE: boolean;
  JITO_FEE: number;
  SLIPPAGE: number;
  
  // Gathering Configuration
  GATHER_TO_OTHER_ADDRESS: boolean;
  GATHER_ADDRESS: string;
  
  // Market Making Configuration
  TOKEN_MINT_PUMPSWAP: string;
  POOL_ID_PUMPSWAP: string;
  
  // Market Maker - Buy Configuration
  TOTAL_PERIOD_MIN: number;
  BUY_INTERVAL_PERIOD_UNIT_SEC: number;
  SOL_AMOUNT_TO_MARKET_MAKER_SOL: number;
  DISTRIBUTE_WALLET_NUM_MARKETMAKER: number;
  DISTRIBUTE_DELTA_PERFECTAGE: number;
  BUY_SELL_MOVE_TIME_MIN: number;
  
  // Market Maker - Sell Configuration
  SELL_INTERVAL_PERIOD_UNIT_SEC: number;
  SELL_TOKEN_PERCENT: number;
  SELL_TOKEN_DELTA_PERFECTAGE: number;
  SELL_CONCURRENCY_PERCENT: number;
  SELL_CONCURRENCY_DELTA_PERFECTAGE: number;
  SELL_ITERATION_SLEEP_TIME_MIN: number;
  SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE: number;
}

function loadCoreConfigFromEnv(): { PRIVATE_KEY: string; RPC_ENDPOINT: string; RPC_WEBSOCKET_ENDPOINT: string } {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcEndpoint = process.env.RPC_ENDPOINT;
  const rpcWebSocketEndpoint = process.env.RPC_WEBSOCKET_ENDPOINT;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }
  if (!rpcEndpoint) {
    throw new Error('RPC_ENDPOINT environment variable is required');
  }
  if (!rpcWebSocketEndpoint) {
    throw new Error('RPC_WEBSOCKET_ENDPOINT environment variable is required');
  }

  return {
    PRIVATE_KEY: privateKey,
    RPC_ENDPOINT: rpcEndpoint,
    RPC_WEBSOCKET_ENDPOINT: rpcWebSocketEndpoint
  };
}

function loadAllEnvDefaults(): Partial<BotConfig> {
  return {
    // Core Configuration
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',
    RPC_ENDPOINT: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
    RPC_WEBSOCKET_ENDPOINT: process.env.RPC_WEBSOCKET_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
    
    // Trading Configuration
    TOKEN_MINT: process.env.TOKEN_MINT || '',
    POOL_ID: process.env.POOL_ID || '',
    
    // Buy Configuration
    BUY_INTERVAL_MIN: process.env.BUY_INTERVAL_MIN ? Number(process.env.BUY_INTERVAL_MIN) : 5,
    BUY_INTERVAL_MAX: process.env.BUY_INTERVAL_MAX ? Number(process.env.BUY_INTERVAL_MAX) : 15,
    BUY_LOWER_PERCENT: process.env.BUY_LOWER_PERCENT ? Number(process.env.BUY_LOWER_PERCENT) : 10,
    BUY_UPPER_PERCENT: process.env.BUY_UPPER_PERCENT ? Number(process.env.BUY_UPPER_PERCENT) : 30,
    
    // Sell Configuration
    SELL_INTERVAL_MIN: process.env.SELL_INTERVAL_MIN ? Number(process.env.SELL_INTERVAL_MIN) : 10,
    SELL_INTERVAL_MAX: process.env.SELL_INTERVAL_MAX ? Number(process.env.SELL_INTERVAL_MAX) : 30,
    
    // Distribution Configuration
    DISTRIBUTE_WALLET_NUM: process.env.DISTRIBUTE_WALLET_NUM ? Number(process.env.DISTRIBUTE_WALLET_NUM) : 5,
    SOL_AMOUNT_TO_DISTRIBUTE: process.env.SOL_AMOUNT_TO_DISTRIBUTE ? Number(process.env.SOL_AMOUNT_TO_DISTRIBUTE) : 0.1,
    DISTRIBUTE_INTERVAL_MIN: process.env.DISTRIBUTE_INTERVAL_MIN ? Number(process.env.DISTRIBUTE_INTERVAL_MIN) : 30,
    DISTRIBUTE_INTERVAL_MAX: process.env.DISTRIBUTE_INTERVAL_MAX ? Number(process.env.DISTRIBUTE_INTERVAL_MAX) : 60,
    
    // Fee Configuration
    FEE_LEVEL: process.env.FEE_LEVEL ? Number(process.env.FEE_LEVEL) : 1,
    JITO_MODE: process.env.JITO_MODE === 'true',
    JITO_FEE: process.env.JITO_FEE ? Number(process.env.JITO_FEE) : 1000000,
    SLIPPAGE: process.env.SLIPPAGE ? Number(process.env.SLIPPAGE) : 5,
    
    // Gathering Configuration
    GATHER_TO_OTHER_ADDRESS: process.env.GATHER_TO_OTHER_ADDRESS === 'true',
    GATHER_ADDRESS: process.env.GATHER_ADDRESS || '',
    
      // Market Making Configuration
      TOKEN_MINT_PUMPSWAP: process.env.TOKEN_MINT_PUMPSWAP || '',
      POOL_ID_PUMPSWAP: process.env.POOL_ID_PUMPSWAP || '',
      
      // Market Maker - Buy Configuration
      TOTAL_PERIOD_MIN: process.env.TOTAL_PERIOD_MIN ? Number(process.env.TOTAL_PERIOD_MIN) : 5,
      BUY_INTERVAL_PERIOD_UNIT_SEC: process.env.BUY_INTERVAL_PERIOD_UNIT_SEC ? Number(process.env.BUY_INTERVAL_PERIOD_UNIT_SEC) : 30,
      SOL_AMOUNT_TO_MARKET_MAKER_SOL: process.env.SOL_AMOUNT_TO_MARKET_MAKER_SOL ? Number(process.env.SOL_AMOUNT_TO_MARKET_MAKER_SOL) : 0.114164095,
      DISTRIBUTE_WALLET_NUM_MARKETMAKER: process.env.DISTRIBUTE_WALLET_NUM_MARKETMAKER ? Number(process.env.DISTRIBUTE_WALLET_NUM_MARKETMAKER) : 2,
      DISTRIBUTE_DELTA_PERFECTAGE: process.env.DISTRIBUTE_DELTA_PERFECTAGE ? Number(process.env.DISTRIBUTE_DELTA_PERFECTAGE) : 5,
      BUY_SELL_MOVE_TIME_MIN: process.env.BUY_SELL_MOVE_TIME_MIN ? Number(process.env.BUY_SELL_MOVE_TIME_MIN) : 2,
      
      // Market Maker - Sell Configuration
      SELL_INTERVAL_PERIOD_UNIT_SEC: process.env.SELL_INTERVAL_PERIOD_UNIT_SEC ? Number(process.env.SELL_INTERVAL_PERIOD_UNIT_SEC) : 30,
      SELL_TOKEN_PERCENT: process.env.SELL_TOKEN_PERCENT ? Number(process.env.SELL_TOKEN_PERCENT) : 10,
      SELL_TOKEN_DELTA_PERFECTAGE: process.env.SELL_TOKEN_DELTA_PERFECTAGE ? Number(process.env.SELL_TOKEN_DELTA_PERFECTAGE) : 5,
      SELL_CONCURRENCY_PERCENT: process.env.SELL_CONCURRENCY_PERCENT ? Number(process.env.SELL_CONCURRENCY_PERCENT) : 25,
      SELL_CONCURRENCY_DELTA_PERFECTAGE: process.env.SELL_CONCURRENCY_DELTA_PERFECTAGE ? Number(process.env.SELL_CONCURRENCY_DELTA_PERFECTAGE) : 10,
      SELL_ITERATION_SLEEP_TIME_MIN: process.env.SELL_ITERATION_SLEEP_TIME_MIN ? Number(process.env.SELL_ITERATION_SLEEP_TIME_MIN) : 1,
      SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE: process.env.SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE ? Number(process.env.SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE) : 5
    };
  }

export async function promptForConfiguration(): Promise<BotConfig> {
  console.log('🚀 Welcome to PumpFun Volume Bot Configuration!');
  console.log('Please provide the following configuration details:\n');

  // Load all environment defaults
  const envDefaults = loadAllEnvDefaults();
  
  console.log('📋 Environment variables loaded as defaults:');
  console.log(`   Private Key: ${envDefaults.PRIVATE_KEY?.substring(0, 8)}...`);
  console.log(`   RPC Endpoint: ${envDefaults.RPC_ENDPOINT}`);
  console.log(`   WebSocket Endpoint: ${envDefaults.RPC_WEBSOCKET_ENDPOINT}`);
  console.log(`   Token Mint: ${envDefaults.TOKEN_MINT || 'Not set'}`);
  console.log(`   Pool ID: ${envDefaults.POOL_ID || 'Not set'}`);
  console.log(`   Buy Intervals: ${envDefaults.BUY_INTERVAL_MIN}-${envDefaults.BUY_INTERVAL_MAX}s`);
  console.log(`   Sell Intervals: ${envDefaults.SELL_INTERVAL_MIN}-${envDefaults.SELL_INTERVAL_MAX}s`);
  console.log(`   Wallets: ${envDefaults.DISTRIBUTE_WALLET_NUM}`);
  console.log(`   SOL Amount: ${envDefaults.SOL_AMOUNT_TO_DISTRIBUTE}\n`);

  const answers = await inquirer.prompt([
    // Core Configuration (loaded from env)
    // PRIVATE_KEY, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT are loaded from env
    
    // Trading Configuration
    {
      type: 'input',
      name: 'TOKEN_MINT',
      message: 'Enter the token mint address to trade:',
      default: envDefaults.TOKEN_MINT,
      validate: (input: string) => {
        if (!input || input.length < 32) {
          return 'Please enter a valid token mint address';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'POOL_ID',
      message: 'Enter the pool ID:',
      default: envDefaults.POOL_ID,
      validate: (input: string) => {
        if (!input || input.length < 32) {
          return 'Please enter a valid pool ID';
        }
        return true;
      }
    },
    
    // Buy Configuration
    {
      type: 'number',
      name: 'BUY_INTERVAL_MIN',
      message: 'Minimum buy interval (seconds):',
      default: envDefaults.BUY_INTERVAL_MIN,
      validate: (input: number) => {
        if (input < 1) {
          return 'Buy interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'BUY_INTERVAL_MAX',
      message: 'Maximum buy interval (seconds):',
      default: envDefaults.BUY_INTERVAL_MAX,
      validate: (input: number) => {
        if (input < 1) {
          return 'Buy interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'BUY_LOWER_PERCENT',
      message: 'Buy lower percentage (0-100):',
      default: envDefaults.BUY_LOWER_PERCENT,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'BUY_UPPER_PERCENT',
      message: 'Buy upper percentage (0-100):',
      default: envDefaults.BUY_UPPER_PERCENT,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Percentage must be between 0 and 100';
        }
        return true;
      }
    },
    
    // Sell Configuration
    {
      type: 'number',
      name: 'SELL_INTERVAL_MIN',
      message: 'Minimum sell interval (seconds):',
      default: envDefaults.SELL_INTERVAL_MIN,
      validate: (input: number) => {
        if (input < 1) {
          return 'Sell interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_INTERVAL_MAX',
      message: 'Maximum sell interval (seconds):',
      default: envDefaults.SELL_INTERVAL_MAX,
      validate: (input: number) => {
        if (input < 1) {
          return 'Sell interval must be at least 1 second';
        }
        return true;
      }
    },
    
    // Distribution Configuration
    {
      type: 'number',
      name: 'DISTRIBUTE_WALLET_NUM',
      message: 'Number of wallets to distribute to:',
      default: envDefaults.DISTRIBUTE_WALLET_NUM,
      validate: (input: number) => {
        if (input < 1 || input > 20) {
          return 'Number of wallets must be between 1 and 20';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SOL_AMOUNT_TO_DISTRIBUTE',
      message: 'SOL amount to distribute (total):',
      default: envDefaults.SOL_AMOUNT_TO_DISTRIBUTE,
      validate: (input: number) => {
        if (input <= 0) {
          return 'SOL amount must be greater than 0';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_INTERVAL_MIN',
      message: 'Minimum distribution interval (seconds):',
      default: envDefaults.DISTRIBUTE_INTERVAL_MIN,
      validate: (input: number) => {
        if (input < 1) {
          return 'Distribution interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_INTERVAL_MAX',
      message: 'Maximum distribution interval (seconds):',
      default: envDefaults.DISTRIBUTE_INTERVAL_MAX,
      validate: (input: number) => {
        if (input < 1) {
          return 'Distribution interval must be at least 1 second';
        }
        return true;
      }
    },
    
    // Fee Configuration
    {
      type: 'number',
      name: 'FEE_LEVEL',
      message: 'Fee level (1-10):',
      default: envDefaults.FEE_LEVEL,
      validate: (input: number) => {
        if (input < 1 || input > 10) {
          return 'Fee level must be between 1 and 10';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'JITO_MODE',
      message: 'Enable JITO mode for faster transactions?',
      default: envDefaults.JITO_MODE
    },
    {
      type: 'number',
      name: 'JITO_FEE',
      message: 'JITO fee (in lamports):',
      default: envDefaults.JITO_FEE,
      when: (answers: any) => answers.JITO_MODE,
      validate: (input: number) => {
        if (input < 0) {
          return 'JITO fee must be non-negative';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SLIPPAGE',
      message: 'Slippage tolerance (0-100):',
      default: envDefaults.SLIPPAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Slippage must be between 0 and 100';
        }
        return true;
      }
    },
    
    // Gathering Configuration
    {
      type: 'confirm',
      name: 'GATHER_TO_OTHER_ADDRESS',
      message: 'Gather to a different address?',
      default: envDefaults.GATHER_TO_OTHER_ADDRESS
    },
    {
      type: 'input',
      name: 'GATHER_ADDRESS',
      message: 'Enter the gather address:',
      default: envDefaults.GATHER_ADDRESS,
      when: (answers: any) => answers.GATHER_TO_OTHER_ADDRESS,
      validate: (input: string) => {
        if (!input || input.length < 32) {
          return 'Please enter a valid address';
        }
        return true;
      }
    },
    
    // Market Making Configuration
    {
      type: 'input',
      name: 'TOKEN_MINT_PUMPSWAP',
      message: 'Enter the PumpSwap token mint address:',
      default: envDefaults.TOKEN_MINT_PUMPSWAP,
      validate: (input: string) => {
        if (!input || input.length < 32) {
          return 'Please enter a valid token mint address';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'POOL_ID_PUMPSWAP',
      message: 'Enter the PumpSwap pool ID:',
      default: envDefaults.POOL_ID_PUMPSWAP,
      validate: (input: string) => {
        if (!input || input.length < 32) {
          return 'Please enter a valid pool ID';
        }
        return true;
      }
    },
    
    // Market Maker - Buy Configuration
    {
      type: 'number',
      name: 'TOTAL_PERIOD_MIN',
      message: 'Total period for market maker (minutes):',
      default: envDefaults.TOTAL_PERIOD_MIN,
      validate: (input: number) => {
        if (input < 1) {
          return 'Total period must be at least 1 minute';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'BUY_INTERVAL_PERIOD_UNIT_SEC',
      message: 'Buy interval period unit (seconds):',
      default: envDefaults.BUY_INTERVAL_PERIOD_UNIT_SEC,
      validate: (input: number) => {
        if (input < 1) {
          return 'Buy interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SOL_AMOUNT_TO_MARKET_MAKER_SOL',
      message: 'SOL amount for market maker (SOL):',
      default: envDefaults.SOL_AMOUNT_TO_MARKET_MAKER_SOL,
      validate: (input: number) => {
        if (input < 0) {
          return 'SOL amount must be positive';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_WALLET_NUM_MARKETMAKER',
      message: 'Number of market maker wallets:',
      default: envDefaults.DISTRIBUTE_WALLET_NUM_MARKETMAKER,
      validate: (input: number) => {
        if (input < 1 || input > 20) {
          return 'Number of wallets must be between 1 and 20';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_DELTA_PERFECTAGE',
      message: 'Distribution delta percentage (%):',
      default: envDefaults.DISTRIBUTE_DELTA_PERFECTAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Delta percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'BUY_SELL_MOVE_TIME_MIN',
      message: 'Buy/sell move time (minutes):',
      default: envDefaults.BUY_SELL_MOVE_TIME_MIN,
      validate: (input: number) => {
        if (input < 0) {
          return 'Move time must be positive';
        }
        return true;
      }
    },
    
    // Market Maker - Sell Configuration
    {
      type: 'number',
      name: 'SELL_INTERVAL_PERIOD_UNIT_SEC',
      message: 'Sell interval period unit (seconds):',
      default: envDefaults.SELL_INTERVAL_PERIOD_UNIT_SEC,
      validate: (input: number) => {
        if (input < 1) {
          return 'Sell interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_TOKEN_PERCENT',
      message: 'Sell token percentage (%):',
      default: envDefaults.SELL_TOKEN_PERCENT,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Sell percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_TOKEN_DELTA_PERFECTAGE',
      message: 'Sell token delta percentage (%):',
      default: envDefaults.SELL_TOKEN_DELTA_PERFECTAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Delta percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_CONCURRENCY_PERCENT',
      message: 'Sell concurrency percentage (%):',
      default: envDefaults.SELL_CONCURRENCY_PERCENT,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Concurrency percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_CONCURRENCY_DELTA_PERFECTAGE',
      message: 'Sell concurrency delta percentage (%):',
      default: envDefaults.SELL_CONCURRENCY_DELTA_PERFECTAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Delta percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_ITERATION_SLEEP_TIME_MIN',
      message: 'Sell iteration sleep time (minutes):',
      default: envDefaults.SELL_ITERATION_SLEEP_TIME_MIN,
      validate: (input: number) => {
        if (input < 0) {
          return 'Sleep time must be positive';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE',
      message: 'Sell iteration sleep delta percentage (%):',
      default: envDefaults.SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Delta percentage must be between 0 and 100';
        }
        return true;
      }
    }
  ]);

  // Set default values for optional fields
  if (!answers.GATHER_ADDRESS) {
    answers.GATHER_ADDRESS = '';
  }

  // Merge core config from environment with CLI answers
  const finalConfig: BotConfig = {
    ...envDefaults,
    ...answers
  };

  return finalConfig;
}

export function displayConfiguration(config: BotConfig): void {
  console.log('\n📋 Configuration Summary:');
  console.log('========================');
  console.log(`Wallet: ${config.PRIVATE_KEY.substring(0, 8)}... (from env)`);
  console.log(`RPC: ${config.RPC_ENDPOINT} (from env)`);
  console.log(`WebSocket: ${config.RPC_WEBSOCKET_ENDPOINT} (from env)`);
  console.log(`Token Mint: ${config.TOKEN_MINT}`);
  console.log(`Pool ID: ${config.POOL_ID}`);
  console.log(`Buy Interval: ${config.BUY_INTERVAL_MIN}-${config.BUY_INTERVAL_MAX}s`);
  console.log(`Sell Interval: ${config.SELL_INTERVAL_MIN}-${config.SELL_INTERVAL_MAX}s`);
  console.log(`Buy Range: ${config.BUY_LOWER_PERCENT}%-${config.BUY_UPPER_PERCENT}%`);
  console.log(`Wallets: ${config.DISTRIBUTE_WALLET_NUM}`);
  console.log(`SOL to Distribute: ${config.SOL_AMOUNT_TO_DISTRIBUTE}`);
  console.log(`JITO Mode: ${config.JITO_MODE ? 'Enabled' : 'Disabled'}`);
  console.log(`Fee Level: ${config.FEE_LEVEL}`);
  console.log(`Gather to Other: ${config.GATHER_TO_OTHER_ADDRESS ? 'Yes' : 'No'}`);
  
  console.log('\n🤖 Market Maker Configuration:');
  console.log('==============================');
  console.log(`PumpSwap Token: ${config.TOKEN_MINT_PUMPSWAP}`);
  console.log(`PumpSwap Pool: ${config.POOL_ID_PUMPSWAP}`);
  console.log(`Total Period: ${config.TOTAL_PERIOD_MIN} min`);
  console.log(`Buy Interval Unit: ${config.BUY_INTERVAL_PERIOD_UNIT_SEC}s`);
  console.log(`SOL for Market Maker: ${config.SOL_AMOUNT_TO_MARKET_MAKER_SOL} SOL`);
  console.log(`Market Maker Wallets: ${config.DISTRIBUTE_WALLET_NUM_MARKETMAKER}`);
  console.log(`Distribution Delta: ${config.DISTRIBUTE_DELTA_PERFECTAGE}%`);
  console.log(`Move Time: ${config.BUY_SELL_MOVE_TIME_MIN} min`);
  console.log(`Sell Interval Unit: ${config.SELL_INTERVAL_PERIOD_UNIT_SEC}s`);
  console.log(`Sell Token %: ${config.SELL_TOKEN_PERCENT}%`);
  console.log(`Sell Token Delta: ${config.SELL_TOKEN_DELTA_PERFECTAGE}%`);
  console.log(`Sell Concurrency: ${config.SELL_CONCURRENCY_PERCENT}%`);
  console.log(`Sell Concurrency Delta: ${config.SELL_CONCURRENCY_DELTA_PERFECTAGE}%`);
  console.log(`Sell Sleep Time: ${config.SELL_ITERATION_SLEEP_TIME_MIN} min`);
  console.log(`Sell Sleep Delta: ${config.SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE}%`);
  console.log('========================\n');
}

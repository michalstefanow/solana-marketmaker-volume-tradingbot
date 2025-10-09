import fs from 'fs';
import path from 'path';
import { BotConfig } from './cli-prompts';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'bot-config.json');

export interface SavedConfig {
  config: BotConfig;
  timestamp: number;
  version: string;
  lastDistributionTimestamp?: number; // Timestamp of last SOL distribution
}

export function saveConfiguration(config: BotConfig, preserveDistributionTimestamp: boolean = false): void {
  try {
    // Load existing config to preserve distribution timestamp if needed
    let existingDistributionTimestamp: number | undefined = undefined;
    if (preserveDistributionTimestamp) {
      const existingConfig = loadConfiguration();
      if (existingConfig) {
        existingDistributionTimestamp = existingConfig.lastDistributionTimestamp;
      }
    }

    const savedConfig: SavedConfig = {
      config,
      timestamp: Date.now(),
      version: '1.0.0',
      lastDistributionTimestamp: existingDistributionTimestamp
    };

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(savedConfig, null, 2));
    console.log('✅ Configuration saved to bot-config.json');
  } catch (error) {
    console.error('❌ Error saving configuration:', error);
    throw error;
  }
}

export function loadConfiguration(): SavedConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      return null;
    }

    const fileContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const savedConfig: SavedConfig = JSON.parse(fileContent);
    
    // Validate the loaded configuration
    if (!savedConfig.config || !savedConfig.timestamp) {
      console.log('⚠️  Invalid configuration file format');
      return null;
    }

    return savedConfig;
  } catch (error) {
    console.error('❌ Error loading configuration:', error);
    return null;
  }
}

export function deleteConfiguration(): void {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      fs.unlinkSync(CONFIG_FILE_PATH);
      console.log('✅ Configuration file deleted');
    }
  } catch (error) {
    console.error('❌ Error deleting configuration:', error);
  }
}

export function getConfigAge(savedConfig: SavedConfig): string {
  const now = Date.now();
  const ageMs = now - savedConfig.timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays > 0) {
    return `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
  } else if (ageHours > 0) {
    return `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
  } else if (ageMinutes > 0) {
    return `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

export function displaySavedConfigInfo(savedConfig: SavedConfig): void {
  console.log('\n📁 Found existing configuration:');
  console.log('================================');
  console.log(`Saved: ${getConfigAge(savedConfig)}`);
  console.log(`Version: ${savedConfig.version}`);
  console.log(`Wallet: ${savedConfig.config.PRIVATE_KEY.substring(0, 8)}...`);
  console.log(`RPC: ${savedConfig.config.RPC_ENDPOINT}`);
  console.log(`Token: ${savedConfig.config.TOKEN_MINT}`);
  console.log(`Wallets: ${savedConfig.config.DISTRIBUTE_WALLET_NUM}`);
  console.log(`SOL Amount: ${savedConfig.config.SOL_AMOUNT_TO_DISTRIBUTE}`);
  console.log('================================\n');
}

export function updateDistributionTimestamp(): void {
  try {
    const existingConfig = loadConfiguration();
    if (!existingConfig) {
      console.error('❌ No configuration found to update');
      return;
    }

    const updatedConfig: SavedConfig = {
      ...existingConfig,
      lastDistributionTimestamp: Date.now()
    };

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updatedConfig, null, 2));
  } catch (error) {
    console.error('❌ Error updating distribution timestamp:', error);
  }
}

export function hasDistributionTimePassed(): boolean {
  try {
    const savedConfig = loadConfiguration();
    if (!savedConfig || !savedConfig.lastDistributionTimestamp) {
      // No distribution yet, so time has NOT passed (blocks bot operations)
      return false;
    }

    const now = Date.now();
    const elapsed = now - savedConfig.lastDistributionTimestamp;
    const delayMinutes = savedConfig.config.DISTRIBUTE_TO_RUN_DELAY_MIN || 5; // Default to 5 minutes
    const delayMs = delayMinutes * 60 * 1000; // Convert minutes to milliseconds

    return elapsed >= delayMs;
  } catch (error) {
    console.error('❌ Error checking distribution time:', error);
    return false; // Default to false on error to block operations for safety
  }
}

export function hasDistributionOccurred(): boolean {
  try {
    const savedConfig = loadConfiguration();
    return savedConfig ? savedConfig.lastDistributionTimestamp !== undefined : false;
  } catch (error) {
    console.error('❌ Error checking if distribution occurred:', error);
    return false;
  }
}

export function getTimeUntilNextDistribution(): string {
  try {
    const savedConfig = loadConfiguration();
    if (!savedConfig || !savedConfig.lastDistributionTimestamp) {
      return 'Distribution required first';
    }

    const now = Date.now();
    const elapsed = now - savedConfig.lastDistributionTimestamp;
    const delayMinutes = savedConfig.config.DISTRIBUTE_TO_RUN_DELAY_MIN || 5; // Default to 5 minutes
    const delayMs = delayMinutes * 60 * 1000; // Convert minutes to milliseconds
    const remaining = delayMs - elapsed;

    if (remaining <= 0) {
      return 'Available now';
    }

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

export function clearDistributionTimestamp(): void {
  try {
    const existingConfig = loadConfiguration();
    if (!existingConfig) {
      console.error('❌ No configuration found to update');
      return;
    }

    const updatedConfig: SavedConfig = {
      ...existingConfig,
      lastDistributionTimestamp: undefined
    };

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updatedConfig, null, 2));
    console.log('✅ Distribution timestamp cleared - SOL distribution required before launching bot');
  } catch (error) {
    console.error('❌ Error clearing distribution timestamp:', error);
  }
}

export function getDistributionDelayMinutes(): number {
  try {
    const savedConfig = loadConfiguration();
    return savedConfig?.config.DISTRIBUTE_TO_RUN_DELAY_MIN || 5;
  } catch (error) {
    return 5; // Default to 5 minutes
  }
}

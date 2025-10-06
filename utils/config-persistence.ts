import fs from 'fs';
import path from 'path';
import { BotConfig } from './cli-prompts';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'bot-config.json');

export interface SavedConfig {
  config: BotConfig;
  timestamp: number;
  version: string;
}

export function saveConfiguration(config: BotConfig): void {
  try {
    const savedConfig: SavedConfig = {
      config,
      timestamp: Date.now(),
      version: '1.0.0'
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

import { promptForConfiguration, displayConfiguration } from './utils/cli-prompts';
import { setGlobalConfig, getGlobalConfig, loadConfigFromFile, hasConfiguration } from './utils/config-manager';
import { displaySavedConfigInfo } from './utils/config-persistence';
import inquirer from 'inquirer';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import base58 from 'bs58';

// Global state
let isBotRunning = false;
let currentBotProcess: any = null;
let currentBotType: string = '';
let botAbortController: AbortController | null = null;

async function main() {
  console.log('🎯 PumpFun Volume Bot - Advanced CLI');
  console.log('====================================\n');

  // Always ensure configuration is loaded before proceeding
  let config = await ensureConfigurationLoaded();

  while (true) {
    await showMainMenu(config);
  }
}

async function ensureConfigurationLoaded(): Promise<any> {
  // Check for existing configuration
  const savedConfig = loadConfigFromFile();
  
  if (savedConfig) {
    displaySavedConfigInfo(savedConfig);
    
    const { useExisting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useExisting',
        message: 'Use this existing configuration?',
        default: true
      }
    ]);

    if (useExisting) {
      setGlobalConfig(savedConfig.config, false); // Don't save again
      console.log('✅ Using existing configuration');
      return savedConfig.config;
    } else {
      console.log('🔄 Starting fresh configuration...');
      return await initializeConfiguration();
    }
  } else {
    console.log('⚠️  No saved configuration found. Starting initialization...');
    return await initializeConfiguration();
  }
}

async function showMainMenu(config: any) {
  // Always validate configuration before showing menu
  const currentConfig = await validateConfiguration(config);
  
  const configStatus = currentConfig ? '✅ Configured' : '❌ Not Configured';
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `Select an action: (${configStatus})`,
      choices: [
        { name: '1️⃣  Initialize/Reload Configuration', value: 'init' },
        { name: '2️⃣  Manage Bot', value: 'manage', disabled: !currentConfig ? 'Please configure first' : false },
        { name: '3️⃣  Manage Timing & Speed', value: 'timing', disabled: !currentConfig ? 'Please configure first' : false },
        { name: '4️⃣  Statistics & Monitoring', value: 'stats', disabled: !currentConfig ? 'Please configure first' : false },
        { name: '5️⃣  Configuration Management', value: 'config-mgmt' },
        { name: '6️⃣  Exit', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'init':
      return await initializeConfiguration();
    case 'manage':
      await validateAndRunBotOperation(() => manageBot());
      break;
    case 'timing':
      await validateAndRunBotOperation(() => manageTiming());
      break;
    case 'stats':
      await validateAndRunBotOperation(() => showStatistics());
      break;
    case 'config-mgmt':
      await manageConfiguration();
      break;
    case 'exit':
      await handleExit();
      break;
  }
  
  return currentConfig;
}

async function validateConfiguration(config: any): Promise<any> {
  // Check if configuration file still exists
  const savedConfig = loadConfigFromFile();
  
  if (!savedConfig) {
    console.log('\n⚠️  Configuration file not found or corrupted.');
    console.log('Please initialize configuration first.\n');
    return null;
  }
  
  // Check if global config is loaded
  try {
    getGlobalConfig();
    return config;
  } catch (error) {
    console.log('\n⚠️  Configuration not loaded in memory.');
    console.log('Reloading configuration...\n');
    setGlobalConfig(savedConfig.config, false);
    return savedConfig.config;
  }
}

async function validateAndRunBotOperation(operation: () => Promise<void>): Promise<void> {
  // Always validate configuration before running any bot operation
  const savedConfig = loadConfigFromFile();
  
  if (!savedConfig) {
    console.log('\n❌ Configuration file not found!');
    console.log('Please initialize configuration first.\n');
    return;
  }
  
  // Ensure global config is loaded
  try {
    getGlobalConfig();
  } catch (error) {
    console.log('\n🔄 Loading configuration...');
    setGlobalConfig(savedConfig.config, false);
  }
  
  // Run the operation
  await operation();
}

async function initializeConfiguration() {
  console.log('\n🔧 Initializing Configuration');
  console.log('=============================\n');

  try {
    const config = await promptForConfiguration();
    displayConfiguration(config);
    
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Save this configuration?',
        default: true
      }
    ]);

    if (confirmed) {
      setGlobalConfig(config);
      console.log('✅ Configuration saved successfully!');
      return config;
    } else {
      console.log('❌ Configuration cancelled');
      return null;
    }
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    if (error instanceof Error && error.message.includes('environment variable')) {
      console.log('\n💡 Please create a .env file with the following variables:');
      console.log('   PRIVATE_KEY=your_private_key_here');
      console.log('   RPC_ENDPOINT=https://api.mainnet-beta.solana.com');
      console.log('   RPC_WEBSOCKET_ENDPOINT=wss://api.mainnet-beta.solana.com');
    }
    return null;
  }
}

async function manageConfiguration() {
  console.log('\n⚙️  Configuration Management');
  console.log('============================\n');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🔄 Reload Configuration', value: 'reload' },
        { name: '🗑️  Delete Saved Configuration', value: 'delete' },
        { name: '📋 View Current Configuration', value: 'view' },
        { name: '🔙 Back to Main Menu', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'reload':
      await reloadConfiguration();
      break;
    case 'delete':
      await deleteConfiguration();
      break;
    case 'view':
      await viewCurrentConfiguration();
      break;
    case 'back':
      return;
  }
}

async function reloadConfiguration() {
  console.log('\n🔄 Reloading Configuration...');
  try {
    const config = await initializeConfiguration();
    if (config) {
      console.log('✅ Configuration reloaded successfully!');
    }
  } catch (error) {
    console.error('❌ Error reloading configuration:', error);
  }
}

async function deleteConfiguration() {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to delete the saved configuration?',
      default: false
    }
  ]);

  if (confirmed) {
    const { deleteConfiguration } = await import('./utils/config-persistence');
    deleteConfiguration();
    console.log('✅ Configuration deleted. You will need to reconfigure on next startup.');
  } else {
    console.log('❌ Configuration deletion cancelled');
  }
}

async function viewCurrentConfiguration() {
  try {
    const config = getGlobalConfig();
    displayConfiguration(config);
  } catch (error) {
    console.log('❌ No configuration loaded. Please initialize first.');
  }
}

async function manageBot() {
  console.log('\n🤖 Bot Management');
  console.log('=================\n');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🚀 Launch Bot (Start buying and selling)', value: 'launch' },
        { name: '💰 Launch Sell Bot (Start selling only)', value: 'sell' },
        { name: '⏹️  Stop Bot', value: 'stop', disabled: !isBotRunning ? 'No bot running' : false },
        { name: '📊 Bot Status', value: 'status' },
        { name: '💸 Collect All SOL', value: 'collect' },
        { name: '🔙 Back to Main Menu', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'launch':
      await launchVolumeBot();
      break;
    case 'sell':
      await launchSellBot();
      break;
    case 'stop':
      await stopBot();
      break;
    case 'status':
      await showBotStatus();
      break;
    case 'collect':
      await collectAllSOL();
      break;
    case 'back':
      return;
  }
}

async function launchVolumeBot() {
  try {
    // Validate configuration before launching
    const savedConfig = loadConfigFromFile();
    if (!savedConfig) {
      console.log('\n❌ Configuration file not found!');
      console.log('Please initialize configuration first.\n');
      return;
    }
    
    // Ensure global config is loaded
    try {
      getGlobalConfig();
    } catch (error) {
      console.log('\n🔄 Loading configuration...');
      setGlobalConfig(savedConfig.config, false);
    }
    
    console.log('\n🚀 Launching Volume Bot...');
    console.log('This will start both VolumeBot and MarketMakerForBuy functions simultaneously.');
    console.log('VolumeBot: Creates volume by buying and selling tokens');
    console.log('MarketMakerForBuy: Market making operations for buying\n');
    
    // Create AbortController for stopping bots
    botAbortController = new AbortController();
    
    const { VolumeBot, MarketMakerForBuy } = await import('./index');
    isBotRunning = true;
    currentBotType = 'Volume Bot + Market Maker';
    
    // Run both functions in parallel with abort signal
    const volumeBotPromise = VolumeBot(botAbortController.signal);
    const marketMakerPromise = MarketMakerForBuy(botAbortController.signal);
    
    // Store both processes
    currentBotProcess = { volumeBot: volumeBotPromise, marketMaker: marketMakerPromise };
    
    console.log('✅ Volume Bot and Market Maker started successfully!');
    console.log('💡 Both functions are running in parallel');
    console.log('💡 Use "Stop Bot" to halt both processes when needed.\n');
  } catch (error) {
    console.error('❌ Error launching Volume Bot:', error);
    isBotRunning = false;
    currentBotType = '';
  }
}

async function launchSellBot() {
  try {
    // Validate configuration before launching
    const savedConfig = loadConfigFromFile();
    if (!savedConfig) {
      console.log('\n❌ Configuration file not found!');
      console.log('Please initialize configuration first.\n');
      return;
    }
    
    // Ensure global config is loaded
    try {
      getGlobalConfig();
    } catch (error) {
      console.log('\n🔄 Loading configuration...');
      setGlobalConfig(savedConfig.config, false);
    }
    
    console.log('\n💰 Launching Sell Bot...');
    console.log('This will start selling tokens from distributed wallets.\n');
    
    // Create AbortController for stopping bot
    botAbortController = new AbortController();
    
    const { MarketMakerForSell } = await import('./index');
    isBotRunning = true;
    currentBotType = 'Sell Bot';
    currentBotProcess = MarketMakerForSell(botAbortController.signal);
    
    console.log('✅ Sell Bot started successfully!');
    console.log('💡 Use "Stop Bot" to halt the bot when needed.\n');
  } catch (error) {
    console.error('❌ Error launching Sell Bot:', error);
    isBotRunning = false;
  }
}

async function stopBot() {
  if (isBotRunning && botAbortController) {
    console.log('\n⏹️  Stopping bot...');
    console.log(`Stopping: ${currentBotType}`);
    
    try {
      // Abort the bot processes
      botAbortController.abort();
      
      // Wait a moment for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset state
      isBotRunning = false;
      currentBotProcess = null;
      currentBotType = '';
      botAbortController = null;
      
      console.log('✅ Bot stopped successfully!');
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
      // Force reset state even if there was an error
      isBotRunning = false;
      currentBotProcess = null;
      currentBotType = '';
      botAbortController = null;
    }
  } else {
    console.log('❌ No bot is currently running');
  }
}

async function showBotStatus() {
  console.log('\n📊 Bot Status');
  console.log('==============');
  console.log(`Status: ${isBotRunning ? '🟢 Running' : '🔴 Stopped'}`);
  if (isBotRunning) {
    console.log(`Type: ${currentBotType}`);
    console.log('💡 Use "Stop Bot" to halt the bot');
  }
  console.log('');
}

async function collectAllSOL() {
  console.log('\n💰 Collect All SOL');
  console.log('==================\n');

  // Stop bot if running before collecting
  if (isBotRunning) {
    console.log('🛑 Bot is currently running. Stopping bot before collection...');
    await stopBot();
    console.log('✅ Bot stopped successfully. Proceeding with collection...\n');
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Choose collection method:',
      choices: [
        { name: '🔄 Collect with Sell (Sell tokens first, then collect SOL)', value: 'with-sell' },
        { name: '📦 Collect without Sell (Collect tokens and SOL directly)', value: 'without-sell' },
        { name: '🔙 Back to Bot Management', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'with-sell':
      await collectWithSell();
      break;
    case 'without-sell':
      await collectWithoutSell();
      break;
    case 'back':
      return;
  }
}

async function collectWithSell() {
  try {
    // Validate configuration before collecting
    const savedConfig = loadConfigFromFile();
    if (!savedConfig) {
      console.log('\n❌ Configuration file not found!');
      console.log('Please initialize configuration first.\n');
      return;
    }
    
    // Ensure global config is loaded
    try {
      getGlobalConfig();
    } catch (error) {
      console.log('\n🔄 Loading configuration...');
      setGlobalConfig(savedConfig.config, false);
    }
    
    console.log('\n🔄 Starting collection with sell...');
    console.log('This will sell all tokens first, then collect the SOL.\n');
    
    const { main: gatherMain } = await import('./gather');
    await gatherMain("market_maker_data.json");
    
    console.log('✅ Collection completed!');
  } catch (error) {
    console.error('❌ Error during collection:', error);
  }
}

async function collectWithoutSell() {
  try {
    // Validate configuration before collecting
    const savedConfig = loadConfigFromFile();
    if (!savedConfig) {
      console.log('\n❌ Configuration file not found!');
      console.log('Please initialize configuration first.\n');
      return;
    }
    
    // Ensure global config is loaded
    try {
      getGlobalConfig();
    } catch (error) {
      console.log('\n🔄 Loading configuration...');
      setGlobalConfig(savedConfig.config, false);
    }
    
    console.log('\n📦 Starting collection without sell...');
    console.log('This will collect tokens and SOL directly without selling.\n');
    
    const { main: gatherNoSellMain } = await import('./gather_without_sell');
    await gatherNoSellMain();
    
    console.log('✅ Collection completed!');
  } catch (error) {
    console.error('❌ Error during collection:', error);
  }
}

async function manageTiming() {
  console.log('\n⏱️  Timing & Speed Management');
  console.log('=============================\n');

  try {
    const config = getGlobalConfig();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to adjust?',
        choices: [
          { name: `🛒 Buy Intervals (Current: ${config.BUY_INTERVAL_MIN}-${config.BUY_INTERVAL_MAX}s)`, value: 'buy-intervals' },
          { name: `💰 Sell Intervals (Current: ${config.SELL_INTERVAL_MIN}-${config.SELL_INTERVAL_MAX}s)`, value: 'sell-intervals' },
          { name: `📊 Distribution Intervals (Current: ${config.DISTRIBUTE_INTERVAL_MIN}-${config.DISTRIBUTE_INTERVAL_MAX}s)`, value: 'dist-intervals' },
          { name: `⚡ Fee Level (Current: ${config.FEE_LEVEL})`, value: 'fee-level' },
          { name: `🎯 Slippage (Current: ${config.SLIPPAGE}%)`, value: 'slippage' },
          { name: '🔙 Back to Main Menu', value: 'back' }
        ]
      }
    ]);

    switch (action) {
      case 'buy-intervals':
        await adjustBuyIntervals();
        break;
      case 'sell-intervals':
        await adjustSellIntervals();
        break;
      case 'dist-intervals':
        await adjustDistributionIntervals();
        break;
      case 'fee-level':
        await adjustFeeLevel();
        break;
      case 'slippage':
        await adjustSlippage();
        break;
      case 'back':
        return;
    }
  } catch (error) {
    console.error('❌ Error accessing configuration:', error);
  }
}

async function adjustBuyIntervals() {
  try {
    const config = getGlobalConfig();
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'min',
        message: 'Minimum buy interval (seconds):',
        default: config.BUY_INTERVAL_MIN,
        validate: (input: number) => input > 0 ? true : 'Must be greater than 0'
      },
      {
        type: 'number',
        name: 'max',
        message: 'Maximum buy interval (seconds):',
        default: config.BUY_INTERVAL_MAX,
        validate: (input: number) => input > 0 ? true : 'Must be greater than 0'
      }
    ]);

    if (answers.min > answers.max) {
      console.log('❌ Minimum cannot be greater than maximum');
      return;
    }

    // Update configuration
    const newConfig = { ...config, BUY_INTERVAL_MIN: answers.min, BUY_INTERVAL_MAX: answers.max };
    setGlobalConfig(newConfig);
    console.log('✅ Buy intervals updated successfully!');
  } catch (error) {
    console.error('❌ Error updating buy intervals:', error);
  }
}

async function adjustSellIntervals() {
  try {
    const config = getGlobalConfig();
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'min',
        message: 'Minimum sell interval (seconds):',
        default: config.SELL_INTERVAL_MIN,
        validate: (input: number) => input > 0 ? true : 'Must be greater than 0'
      },
      {
        type: 'number',
        name: 'max',
        message: 'Maximum sell interval (seconds):',
        default: config.SELL_INTERVAL_MAX,
        validate: (input: number) => input > 0 ? true : 'Must be greater than 0'
      }
    ]);

    if (answers.min > answers.max) {
      console.log('❌ Minimum cannot be greater than maximum');
      return;
    }

    const newConfig = { ...config, SELL_INTERVAL_MIN: answers.min, SELL_INTERVAL_MAX: answers.max };
    setGlobalConfig(newConfig);
    console.log('✅ Sell intervals updated successfully!');
  } catch (error) {
    console.error('❌ Error updating sell intervals:', error);
  }
}

async function adjustDistributionIntervals() {
  try {
    const config = getGlobalConfig();
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'min',
        message: 'Minimum distribution interval (seconds):',
        default: config.DISTRIBUTE_INTERVAL_MIN,
        validate: (input: number) => input > 0 ? true : 'Must be greater than 0'
      },
      {
        type: 'number',
        name: 'max',
        message: 'Maximum distribution interval (seconds):',
        default: config.DISTRIBUTE_INTERVAL_MAX,
        validate: (input: number) => input > 0 ? true : 'Must be greater than 0'
      }
    ]);

    if (answers.min > answers.max) {
      console.log('❌ Minimum cannot be greater than maximum');
      return;
    }

    const newConfig = { ...config, DISTRIBUTE_INTERVAL_MIN: answers.min, DISTRIBUTE_INTERVAL_MAX: answers.max };
    setGlobalConfig(newConfig);
    console.log('✅ Distribution intervals updated successfully!');
  } catch (error) {
    console.error('❌ Error updating distribution intervals:', error);
  }
}

async function adjustFeeLevel() {
  try {
    const config = getGlobalConfig();
    const { level } = await inquirer.prompt([
      {
        type: 'number',
        name: 'level',
        message: 'Fee level (1-10, higher = faster transactions):',
        default: config.FEE_LEVEL,
        validate: (input: number) => input >= 1 && input <= 10 ? true : 'Must be between 1 and 10'
      }
    ]);

    const newConfig = { ...config, FEE_LEVEL: level };
    setGlobalConfig(newConfig);
    console.log('✅ Fee level updated successfully!');
  } catch (error) {
    console.error('❌ Error updating fee level:', error);
  }
}

async function adjustSlippage() {
  try {
    const config = getGlobalConfig();
    const { slippage } = await inquirer.prompt([
      {
        type: 'number',
        name: 'slippage',
        message: 'Slippage tolerance (0-100%):',
        default: config.SLIPPAGE,
        validate: (input: number) => input >= 0 && input <= 100 ? true : 'Must be between 0 and 100'
      }
    ]);

    const newConfig = { ...config, SLIPPAGE: slippage };
    setGlobalConfig(newConfig);
    console.log('✅ Slippage updated successfully!');
  } catch (error) {
    console.error('❌ Error updating slippage:', error);
  }
}

async function showStatistics() {
  console.log('\n📊 Statistics & Monitoring');
  console.log('===========================\n');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to view?',
      choices: [
        { name: '📋 View All Parameters', value: 'parameters' },
        { name: '💰 View Market Cap & Token Value', value: 'market' },
        { name: '💸 View Total SOL Spent', value: 'spent' },
        { name: '🔙 Back to Main Menu', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'parameters':
      await viewAllParameters();
      break;
    case 'market':
      await viewMarketInfo();
      break;
    case 'spent':
      await viewSOLSpent();
      break;
    case 'back':
      return;
  }
}

async function viewAllParameters() {
  try {
    const config = getGlobalConfig();
    console.log('\n📋 All Configuration Parameters');
    console.log('===============================');
    displayConfiguration(config);
  } catch (error) {
    console.error('❌ Error loading parameters:', error);
  }
}

async function viewMarketInfo() {
  try {
    const config = getGlobalConfig();
    console.log('\n💰 Market Information');
    console.log('=====================');
    
    const connection = new Connection(config.RPC_ENDPOINT, 'confirmed');
    const tokenMint = new PublicKey(config.TOKEN_MINT);
    
    console.log(`Token Mint: ${config.TOKEN_MINT}`);
    console.log(`Pool ID: ${config.POOL_ID}`);
    
    // Note: In a real implementation, you would fetch actual market data
    console.log('📈 Market Cap: Calculating...');
    console.log('💎 Token Value: Calculating...');
    console.log('💡 This feature requires integration with market data APIs');
  } catch (error) {
    console.error('❌ Error fetching market info:', error);
  }
}

async function viewSOLSpent() {
  try {
    const config = getGlobalConfig();
    console.log('\n💸 SOL Spending Information');
    console.log('============================');
    
    const connection = new Connection(config.RPC_ENDPOINT, 'confirmed');
    const mainWallet = new PublicKey(base58.decode(config.PRIVATE_KEY).slice(32));
    const balance = await connection.getBalance(mainWallet);
    
    console.log(`Main Wallet: ${mainWallet.toBase58()}`);
    console.log(`Current Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`SOL to Distribute: ${config.SOL_AMOUNT_TO_DISTRIBUTE} SOL`);
    console.log(`Number of Wallets: ${config.DISTRIBUTE_WALLET_NUM}`);
    console.log(`Estimated Total Needed: ${(config.SOL_AMOUNT_TO_DISTRIBUTE + 0.01).toFixed(4)} SOL`);
    
    if (balance < config.SOL_AMOUNT_TO_DISTRIBUTE * LAMPORTS_PER_SOL) {
      console.log('⚠️  Warning: Insufficient SOL balance for distribution');
    } else {
      console.log('✅ Sufficient SOL balance for distribution');
    }
  } catch (error) {
    console.error('❌ Error fetching SOL info:', error);
  }
}

async function handleExit() {
  console.log('\n👋 Exiting PumpFun Volume Bot...');
  
  if (isBotRunning) {
    console.log('🛑 Bot is currently running. Stopping bot...');
    await stopBot();
    console.log('✅ Bot stopped successfully.');
    
    // Ask if user wants to collect SOL before exiting
    const { collectSOL } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'collectSOL',
        message: 'Would you like to collect all SOL before exiting?',
        default: true
      }
    ]);
    
    if (collectSOL) {
      console.log('\n💰 Collecting all SOL before exit...');
      try {
        await collectWithSell();
        console.log('✅ SOL collection completed!');
      } catch (error) {
        console.error('❌ Error during SOL collection:', error);
        console.log('💡 You can manually collect SOL later using the bot management menu.');
      }
    }
  }
  
  console.log('\n👋 Goodbye!');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  if (isBotRunning) {
    console.log('⏹️  Stopping bot...');
    isBotRunning = false;
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  if (isBotRunning) {
    console.log('⏹️  Stopping bot...');
    isBotRunning = false;
  }
  process.exit(0);
});

main().catch(console.error);

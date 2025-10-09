import { promptForConfiguration, displayConfiguration } from './utils/cli-prompts';
import { setGlobalConfig, getGlobalConfig, loadConfigFromFile, hasConfiguration } from './utils/config-manager';
import { 
  displaySavedConfigInfo, 
  updateDistributionTimestamp, 
  hasDistributionTimePassed, 
  hasDistributionOccurred, 
  getTimeUntilNextDistribution, 
  clearDistributionTimestamp, 
  getDistributionDelayMinutes,
  updateVolumeBotDistributionTimestamp,
  updateMarketMakerDistributionTimestamp,
  hasVolumeBotDistributionTimePassed,
  hasMarketMakerDistributionTimePassed,
  hasVolumeBotDistributionOccurred,
  hasMarketMakerDistributionOccurred,
  getTimeUntilVolumeBotDistribution,
  getTimeUntilMarketMakerDistribution,
  clearVolumeBotDistributionTimestamp,
  clearMarketMakerDistributionTimestamp
} from './utils/config-persistence';
import inquirer from 'inquirer';
import { PublicKey } from '@solana/web3.js';
import { bondingCurveStatics, getBondingCurvePDA, getTokenMint } from './utils/pumpfun';
import { getPumpswapPoolId } from './utils/pumpswap';

// Global state
let isBotRunning = false;
let currentBotProcess: any = null;
let currentBotType: string = '';
let botAbortController: AbortController | null = null;
let botStartTime: Date | null = null;

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
        { name: '3️⃣  Statistics & Monitoring', value: 'stats', disabled: !currentConfig ? 'Please configure first' : false },
        { name: '4️⃣  Configuration Management', value: 'config-mgmt' },
        { name: '5️⃣  Exit', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'init':
      return await initializeConfiguration();
    case 'manage':
      await validateAndRunBotOperation(() => manageBot());
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
      // First save the config so it's available for lazy loading
      setGlobalConfig(config);

      try {
        // Now fetch the pool IDs (requires config to be initialized first)
        const bondingCurvePDA = await getBondingCurvePDA(new PublicKey(config.TOKEN_MINT));
        config.POOL_ID = bondingCurvePDA.toBase58();

        config.TOKEN_MINT_PUMPSWAP = config.TOKEN_MINT;
        config.POOL_ID_PUMPSWAP = await getPumpswapPoolId(new PublicKey(config.TOKEN_MINT));

        // Update config with the fetched pool IDs
        setGlobalConfig(config, true);
        console.log('\n✅ Configuration saved successfully!');
        console.log(`📍 Pool ID (Bonding Curve): ${config.POOL_ID}`);
        console.log(`📍 Pool ID (PumpSwap): ${config.POOL_ID_PUMPSWAP}`);
      } catch (error) {
        console.error('⚠️  Warning: Could not fetch pool IDs:', error);
        console.log('✅ Configuration saved with provided pool IDs');
      }

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

  // Check distribution status for both bots
  const hasVolumeBotDist = hasVolumeBotDistributionOccurred();
  const canLaunchVolumeBot = hasVolumeBotDistributionTimePassed();
  const hasMarketMakerDist = hasMarketMakerDistributionOccurred();
  const canLaunchMarketMaker = hasMarketMakerDistributionTimePassed();
  
  const delayMinutes = getDistributionDelayMinutes();
  
  let volumeBotStatus = '';
  if (!hasVolumeBotDist) {
    volumeBotStatus = ` (Distribute SOL first, then wait ${delayMinutes}min)`;
  } else if (!canLaunchVolumeBot) {
    volumeBotStatus = ` (${getTimeUntilVolumeBotDistribution()})`;
  }

  let marketMakerStatus = '';
  if (!hasMarketMakerDist) {
    marketMakerStatus = ` (Distribute SOL first, then wait ${delayMinutes}min)`;
  } else if (!canLaunchMarketMaker) {
    marketMakerStatus = ` (${getTimeUntilMarketMakerDistribution()})`;
  }

  const volumeBotTimeRemaining = getTimeUntilVolumeBotDistribution();
  const marketMakerTimeRemaining = getTimeUntilMarketMakerDistribution();
  
  // Check if distributions are synchronized (both exist and both can launch, or neither exist)
  const distributionsAreSynced = (hasVolumeBotDist && hasMarketMakerDist && canLaunchVolumeBot && canLaunchMarketMaker) || 
                                  (!hasVolumeBotDist && !hasMarketMakerDist);
  
  // Check if a single bot is currently running (blocks "both" option)
  const isSingleBotRunning = isBotRunning && (currentBotType === 'Volume Bot' || currentBotType === 'Market Maker');
  
  const canLaunchBoth = canLaunchVolumeBot && canLaunchMarketMaker && distributionsAreSynced && !isBotRunning;
  const canDistributeBoth = !hasVolumeBotDist && !hasMarketMakerDist; // Only when BOTH are not distributed
  
  let bothLaunchStatus = '';
  let bothDistributeStatus = '';
  
  if (!canLaunchBoth) {
    if (isSingleBotRunning) {
      bothLaunchStatus = ` (One bot already running - stop it first)`;
    } else if (!hasVolumeBotDist && !hasMarketMakerDist) {
      bothLaunchStatus = ` (Distribute both first, then wait ${delayMinutes}min)`;
    } else if (!distributionsAreSynced) {
      bothLaunchStatus = ` (Bots not synced - one already distributed separately)`;
    } else if (isBotRunning) {
      bothLaunchStatus = ` (Bot already running)`;
    } else {
      bothLaunchStatus = ` (Wait for both: VB ${volumeBotTimeRemaining}, MM ${marketMakerTimeRemaining})`;
    }
  }
  
  // Disable "Distribute Both" if either one is already distributed
  if (!canDistributeBoth) {
    if (hasVolumeBotDist && hasMarketMakerDist) {
      bothDistributeStatus = ` (Already distributed for both)`;
    } else if (hasVolumeBotDist && !hasMarketMakerDist) {
      bothDistributeStatus = ` (Volume Bot already distributed - use individual options)`;
    } else if (!hasVolumeBotDist && hasMarketMakerDist) {
      bothDistributeStatus = ` (Market Maker already distributed - use individual options)`;
    }
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📤 Distribute SOL for Volume Bot', value: 'distribute-volume' },
        { name: '📤 Distribute SOL for Market Maker', value: 'distribute-market' },
        { name: '📤 Distribute SOL for Both (Volume Bot + Market Maker)', value: 'distribute-both', disabled: !canDistributeBoth ? bothDistributeStatus : false },
        { name: '🔵 Launch Volume Bot Only', value: 'launch-volume', disabled: !canLaunchVolumeBot ? volumeBotStatus : false },
        { name: '🟠 Launch Market Maker Only', value: 'launch-market', disabled: !canLaunchMarketMaker ? marketMakerStatus : false },
        { name: '🚀 Launch Both (Volume Bot + Market Maker)', value: 'launch-both', disabled: !canLaunchBoth ? bothLaunchStatus : false },
        { name: '💰 Launch Sell Bot', value: 'sell', disabled: !canLaunchMarketMaker ? marketMakerStatus : false },
        { name: '⏹️  Stop Bot', value: 'stop', disabled: !isBotRunning ? 'No bot running' : false },
        { name: '⏰ Extend Bot Runtime', value: 'extend', disabled: !isBotRunning ? 'No bot running' : false },
        { name: '📊 Bot Status', value: 'status' },
        { name: '💸 Collect All SOL', value: 'collect' },
        { name: '🔙 Back to Main Menu', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'distribute-volume':
      await distributeSolForVolumeBot();
      break;
    case 'distribute-market':
      await distributeSolForMarketMaker();
      break;
    case 'distribute-both':
      await distributeSolForBoth();
      break;
    case 'launch-volume':
      await launchVolumeBotOnly();
      break;
    case 'launch-market':
      await launchMarketMakerOnly();
      break;
    case 'launch-both':
      await launchBoth();
      break;
    case 'sell':
      await launchSellBot();
      break;
    case 'stop':
      await stopBot();
      break;
    case 'extend':
      await extendBotRuntime();
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

async function distributeSolForVolumeBot() {
  console.log('\n🔵 Distribute SOL for Volume Bot');
  console.log('==================================\n');

  try {
    // Validate configuration
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

    const config = getGlobalConfig();

    // Show distribution summary
    console.log('📊 Distribution Summary:');
    console.log('========================');
    console.log(`Volume Bot Wallets: ${config.DISTRIBUTE_WALLET_NUM}`);
    console.log(`SOL to Distribute: ${config.SOL_AMOUNT_TO_DISTRIBUTE} SOL\n`);

    const { confirmDistribution } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDistribution',
        message: 'Proceed with Volume Bot SOL distribution?',
        default: true
      }
    ]);

    if (!confirmDistribution) {
      console.log('❌ Distribution cancelled.\n');
      return;
    }

    console.log('\n🚀 Starting Volume Bot SOL distribution...\n');

    // Import the distribution function from index.ts
    const indexModule = await import('./index');
    const { solanaConnection, mainKp, distributeSol } = indexModule;

    const volumeBotData = await distributeSol(solanaConnection, mainKp, config.DISTRIBUTE_WALLET_NUM);
    
    if (!volumeBotData || volumeBotData.length === 0) {
      console.log('❌ Volume Bot distribution failed.\n');
      return;
    }
    
    console.log('✅ Volume Bot distribution successful!\n');

    // Update the Volume Bot distribution timestamp
    updateVolumeBotDistributionTimestamp();
    
    console.log('✅ Volume Bot SOL Distribution Complete!');
    console.log('=========================================');
    console.log(`Volume Bot wallets: ${volumeBotData.length}`);
    const delayMinutes = getDistributionDelayMinutes();
    console.log(`\n⏰ Volume Bot launch will be available in ${delayMinutes} minutes.\n`);

  } catch (error) {
    console.error('❌ Error during Volume Bot SOL distribution:', error);
  }
}

async function distributeSolForMarketMaker() {
  console.log('\n🟠 Distribute SOL for Market Maker');
  console.log('===================================\n');

  try {
    // Validate configuration
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

    const config = getGlobalConfig();

    // Show distribution summary
    console.log('📊 Distribution Summary:');
    console.log('========================');
    console.log(`Market Maker Wallets: ${config.DISTRIBUTE_WALLET_NUM_MARKETMAKER}`);
    console.log(`SOL to Distribute: ${config.SOL_AMOUNT_TO_DISTRIBUTE_FOR_MARKETMAKER} SOL\n`);

    const { confirmDistribution } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDistribution',
        message: 'Proceed with Market Maker SOL distribution?',
        default: true
      }
    ]);

    if (!confirmDistribution) {
      console.log('❌ Distribution cancelled.\n');
      return;
    }

    console.log('\n🚀 Starting Market Maker SOL distribution...\n');

    // Import the distribution function from index.ts
    const indexModule = await import('./index');
    const { solanaConnection, mainKp, distributeSolForMarketMaker } = indexModule;
    
    const marketMakerData = await distributeSolForMarketMaker(
      solanaConnection,
      mainKp,
      config.DISTRIBUTE_WALLET_NUM_MARKETMAKER
    );
    
    if (!marketMakerData || marketMakerData.length === 0) {
      console.log('❌ Market Maker distribution failed.\n');
      return;
    }
    
    console.log('✅ Market Maker distribution successful!\n');

    // Update the Market Maker distribution timestamp
    updateMarketMakerDistributionTimestamp();
    
    console.log('✅ Market Maker SOL Distribution Complete!');
    console.log('===========================================');
    console.log(`Market Maker wallets: ${marketMakerData.length}`);
    const delayMinutes = getDistributionDelayMinutes();
    console.log(`\n⏰ Market Maker launch will be available in ${delayMinutes} minutes.\n`);

  } catch (error) {
    console.error('❌ Error during Market Maker SOL distribution:', error);
  }
}

async function distributeSolForBoth() {
  console.log('\n🚀 Distribute SOL for Both (Volume Bot + Market Maker)');
  console.log('=======================================================\n');

  try {
    // Validate configuration
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

    const config = getGlobalConfig();

    // Show distribution summary
    console.log('📊 Distribution Summary:');
    console.log('========================');
    console.log(`Volume Bot Wallets: ${config.DISTRIBUTE_WALLET_NUM}`);
    console.log(`Market Maker Wallets: ${config.DISTRIBUTE_WALLET_NUM_MARKETMAKER}`);
    console.log(`SOL to Distribute (Volume Bot): ${config.SOL_AMOUNT_TO_DISTRIBUTE} SOL`);
    console.log(`SOL to Distribute (Market Maker): ${config.SOL_AMOUNT_TO_DISTRIBUTE_FOR_MARKETMAKER} SOL`);
    console.log(`Total Wallets: ${config.DISTRIBUTE_WALLET_NUM + config.DISTRIBUTE_WALLET_NUM_MARKETMAKER}\n`);

    const { confirmDistribution } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDistribution',
        message: 'Proceed with SOL distribution for both?',
        default: true
      }
    ]);

    if (!confirmDistribution) {
      console.log('❌ Distribution cancelled.\n');
      return;
    }

    console.log('\n🚀 Starting SOL distribution for both...\n');

    // Import the distribution functions from index.ts
    const indexModule = await import('./index');
    const { solanaConnection, mainKp } = indexModule;

    // Distribute for Volume Bot
    console.log('📤 Distributing SOL for Volume Bot...');
    const { distributeSol } = await import('./index');
    const volumeBotData = await distributeSol(solanaConnection, mainKp, config.DISTRIBUTE_WALLET_NUM);
    
    if (!volumeBotData || volumeBotData.length === 0) {
      console.log('❌ Volume Bot distribution failed.\n');
      return;
    }
    
    console.log('✅ Volume Bot distribution successful!\n');

    // Wait a bit before next distribution
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Distribute for Market Maker
    console.log('📤 Distributing SOL for Market Maker...');
    const { distributeSolForMarketMaker } = await import('./index');
    
    const marketMakerData = await distributeSolForMarketMaker(
      solanaConnection,
      mainKp,
      config.DISTRIBUTE_WALLET_NUM_MARKETMAKER,
    );
    
    if (!marketMakerData || marketMakerData.length === 0) {
      console.log('❌ Market Maker distribution failed.\n');
      return;
    }
    
    console.log('✅ Market Maker distribution successful!\n');

    // Update both distribution timestamps
    updateVolumeBotDistributionTimestamp();
    updateMarketMakerDistributionTimestamp();
    
    console.log('✅ SOL Distribution Complete for Both!');
    console.log('======================================');
    console.log(`Volume Bot wallets: ${volumeBotData.length}`);
    console.log(`Market Maker wallets: ${marketMakerData.length}`);
    const delayMinutes = getDistributionDelayMinutes();
    console.log(`\n⏰ Both bots will be available to launch in ${delayMinutes} minutes.\n`);

  } catch (error) {
    console.error('❌ Error during SOL distribution:', error);
  }
}

async function launchVolumeBotOnly() {
  try {
    // Check if Volume Bot distribution has occurred and configured delay has passed
    const hasDistribution = hasVolumeBotDistributionOccurred();
    const canLaunch = hasVolumeBotDistributionTimePassed();
    const delayMinutes = getDistributionDelayMinutes();
    
    if (!hasDistribution) {
      console.log(`\n❌ Volume Bot launch is not available yet. Distribute SOL for Volume Bot first, then wait ${delayMinutes} minutes.\n`);
      return;
    }
    
    if (!canLaunch) {
      const timeRemaining = getTimeUntilVolumeBotDistribution();
      console.log(`\n❌ Volume Bot launch is not available yet. ${timeRemaining} until launch is available.\n`);
      return;
    }

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

    // Ask if user wants to update parameters before launching
    const { updateParams } = await inquirer.prompt([
      {
        type: 'list',
        name: 'updateParams',
        message: 'Would you like to update Volume Bot parameters before launching?',
        choices: [
          { name: '🔵 Update Volume Bot parameters', value: 'volume' },
          { name: '▶️ Launch with current parameters', value: 'launch' },
          { name: '⬅️ Back to previous menu', value: 'back' }
        ]
      }
    ]);

    if (updateParams === 'volume') {
      await updateVolumeBotConfiguration();
      return;
    } else if (updateParams === 'back') {
      await manageBot();
      return;
    }

    console.log('\n🔵 Launching Volume Bot...');
    console.log('VolumeBot: Creates volume by buying and selling tokens\n');

    // Create AbortController for stopping bot
    botAbortController = new AbortController();

    const { VolumeBot } = await import('./index');
    isBotRunning = true;
    currentBotType = 'Volume Bot';
    botStartTime = new Date();

    // Run Volume Bot with abort signal
    currentBotProcess = VolumeBot(botAbortController.signal);

    console.log('✅ Volume Bot started successfully!');
    console.log('💡 Use "Stop Bot" to halt the bot when needed.\n');
  } catch (error) {
    console.error('❌ Error launching Volume Bot:', error);
    isBotRunning = false;
    currentBotType = '';
  }
}

async function launchMarketMakerOnly() {
  try {
    // Check if Market Maker distribution has occurred and configured delay has passed
    const hasDistribution = hasMarketMakerDistributionOccurred();
    const canLaunch = hasMarketMakerDistributionTimePassed();
    const delayMinutes = getDistributionDelayMinutes();
    
    if (!hasDistribution) {
      console.log(`\n❌ Market Maker launch is not available yet. Distribute SOL for Market Maker first, then wait ${delayMinutes} minutes.\n`);
      return;
    }
    
    if (!canLaunch) {
      const timeRemaining = getTimeUntilMarketMakerDistribution();
      console.log(`\n❌ Market Maker launch is not available yet. ${timeRemaining} until launch is available.\n`);
      return;
    }

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

    // Ask if user wants to update parameters before launching
    const { updateParams } = await inquirer.prompt([
      {
        type: 'list',
        name: 'updateParams',
        message: 'Would you like to update Market Maker parameters before launching?',
        choices: [
          { name: '🟠 Update Market Maker parameters', value: 'marketmaker' },
          { name: '▶️ Launch with current parameters', value: 'launch' },
          { name: '⬅️ Back to previous menu', value: 'back' }
        ]
      }
    ]);

    if (updateParams === 'marketmaker') {
      await updateMarketMakerConfiguration();
      return;
    } else if (updateParams === 'back') {
      await manageBot();
      return;
    }

    console.log('\n🟠 Launching Market Maker...');
    console.log('MarketMakerForBuy: Market making operations for buying\n');

    // Create AbortController for stopping bot
    botAbortController = new AbortController();

    const { MarketMakerForBuy } = await import('./index');
    isBotRunning = true;
    currentBotType = 'Market Maker';
    botStartTime = new Date();

    // Run Market Maker with abort signal
    currentBotProcess = MarketMakerForBuy(botAbortController.signal);

    console.log('✅ Market Maker started successfully!');
    console.log('💡 Use "Stop Bot" to halt the bot when needed.\n');
  } catch (error) {
    console.error('❌ Error launching Market Maker:', error);
    isBotRunning = false;
    currentBotType = '';
  }
}

async function launchBoth() {
  try {
    // Check if both distributions have occurred and configured delay has passed
    const hasVolumeBotDist = hasVolumeBotDistributionOccurred();
    const canLaunchVolumeBot = hasVolumeBotDistributionTimePassed();
    const hasMarketMakerDist = hasMarketMakerDistributionOccurred();
    const canLaunchMarketMaker = hasMarketMakerDistributionTimePassed();
    const delayMinutes = getDistributionDelayMinutes();
    
    if (!hasVolumeBotDist || !hasMarketMakerDist) {
      console.log(`\n❌ Both bots launch is not available yet. Distribute SOL for both first, then wait ${delayMinutes} minutes.\n`);
      return;
    }
    
    if (!canLaunchVolumeBot || !canLaunchMarketMaker) {
      let message = '\n❌ Both bots launch is not available yet.\n';
      if (!canLaunchVolumeBot) {
        message += `   Volume Bot: ${getTimeUntilVolumeBotDistribution()}\n`;
      }
      if (!canLaunchMarketMaker) {
        message += `   Market Maker: ${getTimeUntilMarketMakerDistribution()}\n`;
      }
      console.log(message);
      return;
    }

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

    // Ask if user wants to update parameters before launching
    const { updateParams } = await inquirer.prompt([
      {
        type: 'list',
        name: 'updateParams',
        message: 'Would you like to update parameters before launching?',
        choices: [
          { name: '🔵 Update Volume Bot parameters', value: 'volume' },
          { name: '🟠 Update Market Maker parameters', value: 'marketmaker' },
          { name: '🔄 Update both parameters', value: 'both' },
          { name: '▶️ Launch with current parameters', value: 'launch' },
          { name: '⬅️ Back to previous menu', value: 'back' }
        ]
      }
    ]);

    if (updateParams === 'volume') {
      await updateVolumeBotConfiguration();
      return;
    } else if (updateParams === 'marketmaker') {
      await updateMarketMakerConfiguration();
      return;
    } else if (updateParams === 'both') {
      await updateVolumeBotConfiguration();
      return;
    } else if (updateParams === 'back') {
      await manageBot();
      return;
    }

    console.log('\n🚀 Launching Both (Volume Bot + Market Maker)...');
    console.log('VolumeBot: Creates volume by buying and selling tokens');
    console.log('MarketMakerForBuy: Market making operations for buying\n');

    // Create AbortController for stopping bots
    botAbortController = new AbortController();

    const { VolumeBot, MarketMakerForBuy } = await import('./index');
    isBotRunning = true;
    currentBotType = 'Volume Bot + Market Maker';
    botStartTime = new Date();

    // Run both functions in parallel with abort signal
    const volumeBotPromise = VolumeBot(botAbortController.signal);
    const marketMakerPromise = MarketMakerForBuy(botAbortController.signal);

    // Store both processes
    currentBotProcess = { volumeBot: volumeBotPromise, marketMaker: marketMakerPromise };

    console.log('✅ Both bots started successfully!');
    console.log('💡 Volume Bot and Market Maker are running in parallel');
    console.log('💡 Use "Stop Bot" to halt both processes when needed.\n');
  } catch (error) {
    console.error('❌ Error launching both bots:', error);
    isBotRunning = false;
    currentBotType = '';
  }
}

async function launchSellBot() {
  try {
    // Check if Market Maker distribution has occurred and configured delay has passed
    const hasDistribution = hasMarketMakerDistributionOccurred();
    const canLaunch = hasMarketMakerDistributionTimePassed();
    const delayMinutes = getDistributionDelayMinutes();
    
    if (!hasDistribution) {
      console.log(`\n❌ Sell bot launch is not available yet. Distribute SOL for Market Maker first, then wait ${delayMinutes} minutes.\n`);
      return;
    }
    
    if (!canLaunch) {
      const timeRemaining = getTimeUntilMarketMakerDistribution();
      console.log(`\n❌ Sell bot launch is not available yet. ${timeRemaining} until launch is available.\n`);
      return;
    }

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

    // Check if PumpSwap configuration is available
    const currentConfig = getGlobalConfig();
    if (!currentConfig.TOKEN_MINT_PUMPSWAP || !currentConfig.POOL_ID_PUMPSWAP) {
      console.log('\n⚠️  PumpSwap configuration is required for Sell Bot!');
      console.log('Missing: TOKEN_MINT_PUMPSWAP or POOL_ID_PUMPSWAP');

      const { updateConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'updateConfig',
          message: 'Would you like to update the sell bot configuration now?',
          default: true
        }
      ]);

      if (updateConfig) {
        await updateSellBotConfiguration();
        return; // Restart the function after updating config
      } else {
        console.log('❌ Cannot launch Sell Bot without PumpSwap configuration.\n');
        return;
      }
    }

    // Ask if user wants to update sell parameters
    const { updateParams } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'updateParams',
        message: 'Would you like to update sell bot parameters before launching?',
        default: false
      }
    ]);

    if (updateParams) {
      await updateSellBotConfiguration();
      return; // Restart the function after updating config
    }

    console.log('\n💰 Launching Sell Bot...');
    console.log('This will start selling tokens from distributed wallets.\n');

    // Create AbortController for stopping bot
    botAbortController = new AbortController();

    const { MarketMakerForSell } = await import('./index');
    isBotRunning = true;
    currentBotType = 'Sell Bot';
    botStartTime = new Date();
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
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Reset state
      isBotRunning = false;
      currentBotProcess = null;
      currentBotType = '';
      botAbortController = null;
      botStartTime = null;

      console.log('✅ Bot will be stopped on next iteration...');
    } catch (error) {
      console.error('❌ Error stopping bot:', error);
      // Force reset state even if there was an error
      isBotRunning = false;
      currentBotProcess = null;
      currentBotType = '';
      botAbortController = null;
      botStartTime = null;
    }
  } else {
    console.log('❌ No bot is currently running');
  }
}

async function showBotStatus() {
  console.log('\n📊 Bot Status');
  console.log('==============');
  console.log(`Status: ${isBotRunning ? '🟢 Running' : '🔴 Stopped'}`);
  
  // Show distribution status for both bots
  const hasVolumeBotDist = hasVolumeBotDistributionOccurred();
  const canLaunchVolumeBot = hasVolumeBotDistributionTimePassed();
  const volumeBotTimeRemaining = getTimeUntilVolumeBotDistribution();
  
  const hasMarketMakerDist = hasMarketMakerDistributionOccurred();
  const canLaunchMarketMaker = hasMarketMakerDistributionTimePassed();
  const marketMakerTimeRemaining = getTimeUntilMarketMakerDistribution();
  
  console.log('\n🔵 Volume Bot:');
  if (!hasVolumeBotDist) {
    console.log('  Distribution: ❌ Required first');
  } else if (canLaunchVolumeBot) {
    console.log('  Distribution: ✅ Launch available');
  } else {
    console.log(`  Distribution: ⏰ ${volumeBotTimeRemaining}`);
  }
  
  console.log('\n🟠 Market Maker:');
  if (!hasMarketMakerDist) {
    console.log('  Distribution: ❌ Required first');
  } else if (canLaunchMarketMaker) {
    console.log('  Distribution: ✅ Launch available');
  } else {
    console.log(`  Distribution: ⏰ ${marketMakerTimeRemaining}`);
  }
  
  if (isBotRunning) {
    console.log(`\nCurrent Bot Type: ${currentBotType}`);

    if (botStartTime) {
      const now = new Date();
      const diffMs = now.getTime() - botStartTime.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffSeconds = Math.floor((diffMs % 60000) / 1000);
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;

      if (diffHours > 0) {
        console.log(`Running Time: ${diffHours}h ${remainingMinutes}m ${diffSeconds}s`);
      } else if (diffMinutes > 0) {
        console.log(`Running Time: ${diffMinutes}m ${diffSeconds}s`);
      } else {
        console.log(`Running Time: ${diffSeconds}s`);
      }
    }

    console.log('💡 Use "Stop Bot" to halt the bot');
  }
  
  const delayMinutes = getDistributionDelayMinutes();
  console.log(`\n💡 Each bot requires distribution + ${delayMinutes} min wait before launching`);
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
        { name: '🔙 Back to Bot Management', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'with-sell':
      await collectWithSell();
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
    await gatherMain("data.json");

    console.log("Collect with Sell is completed..");
    console.log("============================================================================ \n")
    console.log("============================================================================ \n")

    console.log('✅ Collection completed!');
    
    // Clear distribution timestamps to block bot launch until SOL is redistributed
    clearVolumeBotDistributionTimestamp();
    clearMarketMakerDistributionTimestamp();
    
    console.log('\n⚠️  IMPORTANT: All SOL has been collected from wallets!');
    console.log('📌 Both Volume Bot and Market Maker launch are now BLOCKED until you distribute SOL.\n');

    // Ask if user wants to distribute SOL now
    const { distributeChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'distributeChoice',
        message: '💰 Do you want to distribute SOL now?',
        choices: [
          { name: '🔵 Distribute for Volume Bot', value: 'volume' },
          { name: '🟠 Distribute for Market Maker', value: 'market' },
          { name: '🔄 Distribute for both', value: 'both' },
          { name: '⬅️ Skip distribution', value: 'skip' }
        ]
      }
    ]);

    if (distributeChoice === 'volume') {
      await distributeSolForVolumeBot();
    } else if (distributeChoice === 'market') {
      await distributeSolForMarketMaker();
    } else if (distributeChoice === 'both') {
      await distributeSolForVolumeBot();
      await distributeSolForMarketMaker();
    } else {
      console.log('\n📝 Remember: Bot launches are BLOCKED until you distribute SOL!');
      console.log('   Go to "🤖 Bot Management" → Distribution options\n');
    }
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
        { name: '💰 View Market Cap & Token Value', value: 'market' },
        { name: '🔙 Back to Main Menu', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'market':
      await viewMarketInfo();
      break;
    case 'back':
      return;
  }
}

async function viewMarketInfo() {
  try {
    const config = getGlobalConfig();
    console.log('\n💰 Market Information');
    console.log('=====================');

    console.log(`Token Mint: ${config.TOKEN_MINT}`);
    console.log(`Pool ID: ${config.POOL_ID}`);

    const tokenMint = await getTokenMint(new PublicKey(config.TOKEN_MINT));

    // Note: In a real implementation, you would fetch actual market data
    const bondingCurveAccount = await bondingCurveStatics("pumpfun");
    if (!bondingCurveAccount) {
      console.log('❌ Error fetching bonding curve account');
      return;
    }

    console.log(`Bonding Curve Balance: ${Number(bondingCurveAccount.virtualSolReserves) / 10 ** 9} SOL`);
    console.log(`Bonding Curve Market Cap: ${Number(bondingCurveAccount.getMarketCapSOL()) / 10 ** 9} SOL`);
    console.log(`Token Price: ${(Number(bondingCurveAccount.virtualSolReserves) / (Number(bondingCurveAccount.virtualTokenReserves) * (10 ** (9 - tokenMint.decimals))))} SOL`);
  } catch (error) {
    console.error('❌ Error fetching market info:', error);
  }
}

async function extendBotRuntime() {
  console.log('\n⏰ Extend Bot Runtime');
  console.log('====================\n');

  if (!isBotRunning) {
    console.log('❌ No bot is currently running. Please start a bot first.\n');
    return;
  }

  // Note: Extension is only applicable for Market Maker
  if (currentBotType !== 'Market Maker') {
    console.log('⚠️  Runtime extension is only available for Market Maker.\n');
    console.log(`Current bot type: ${currentBotType}\n`);
    return;
  }

  // Check if distribution has occurred and configured delay has passed
  const hasDistribution = hasMarketMakerDistributionOccurred();
  const canExtend = hasMarketMakerDistributionTimePassed();
  const delayMinutes = getDistributionDelayMinutes();
  
  if (!hasDistribution) {
    console.log(`❌ Bot extension is not available yet. Distribute SOL for Market Maker first, then wait ${delayMinutes} minutes.\n`);
    return;
  }
  
  if (!canExtend) {
    const timeRemaining = getTimeUntilMarketMakerDistribution();
    console.log(`❌ Bot extension is not available yet. ${timeRemaining} until extension is available.\n`);
    return;
  }

  const currentConfig = getGlobalConfig();

  const { additionalMinutes } = await inquirer.prompt([
    {
      type: 'number',
      name: 'additionalMinutes',
      message: '⏰ How many additional minutes would you like to add?',
      default: 0,
      validate: (input: number) => {
        if (input < 0) {
          return 'Additional minutes must be 0 or positive';
        }
        if (input > 1440) { // 24 hours max
          return 'Additional minutes cannot exceed 1440 (24 hours)';
        }
        return true;
      }
    }
  ]);

  if (additionalMinutes <= 0) {
    console.log('❌ No additional time specified. Operation cancelled.\n');
    return;
  }

  // Update the configuration with additional time
  const updatedConfig = {
    ...currentConfig,
    ADDITIONAL_TIME_MIN: additionalMinutes
  };

  setGlobalConfig(updatedConfig, true);

  const currentConfigAfterUpdate = getGlobalConfig();

  console.log("\n[MARKET MAKER] currentConfigAfterUpdate ==> ", currentConfigAfterUpdate);
  console.log(`\n✅ Bot runtime extended by ${additionalMinutes} minutes!`);
  console.log(`💡 The additional time will be applied during the next bot iteration check.`);
  console.log(`💡 If bot is running, it will be extended automatically within 5 iterations.\n`);
}

async function updateVolumeBotConfiguration() {
  console.log('\n🔵 Updating Volume Bot Configuration');
  console.log('====================================\n');

  const currentConfig = getGlobalConfig();

  const answers = await inquirer.prompt([
    // Volume Bot Configuration
    {
      type: 'input',
      name: 'TOKEN_MINT',
      message: '🔵 [VOLUME BOT] Enter the token mint address to trade:',
      default: currentConfig.TOKEN_MINT,
      validate: (input: string) => {
        if (!input || input.length < 32) {
          return 'Please enter a valid token mint address';
        }
        return true;
      }
    },
    // {
    //   type: 'input',
    //   name: 'POOL_ID',
    //   message: '🔵 [VOLUME BOT] Enter the pool ID:',
    //   default: currentConfig.POOL_ID,
    //   validate: (input: string) => {
    //     if (!input || input.length < 32) {
    //       return 'Please enter a valid pool ID';
    //     }
    //     return true;
    //   }
    // },
    {
      type: 'number',
      name: 'BUY_INTERVAL_MIN',
      message: '🔵 [VOLUME BOT] Minimum buy interval (seconds):',
      default: currentConfig.BUY_INTERVAL_MIN,
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
      message: '🔵 [VOLUME BOT] Maximum buy interval (seconds):',
      default: currentConfig.BUY_INTERVAL_MAX,
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
      message: '🔵 [VOLUME BOT] Buy lower percentage (0-100):',
      default: currentConfig.BUY_LOWER_PERCENT,
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
      message: '🔵 [VOLUME BOT] Buy upper percentage (0-100):',
      default: currentConfig.BUY_UPPER_PERCENT,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SELL_INTERVAL_MIN',
      message: '🔵 [VOLUME BOT] Minimum sell interval (seconds):',
      default: currentConfig.SELL_INTERVAL_MIN,
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
      message: '🔵 [VOLUME BOT] Maximum sell interval (seconds):',
      default: currentConfig.SELL_INTERVAL_MAX,
      validate: (input: number) => {
        if (input < 1) {
          return 'Sell interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_WALLET_NUM',
      message: '🔵 [VOLUME BOT] Number of wallets to distribute to:',
      default: currentConfig.DISTRIBUTE_WALLET_NUM,
      validate: (input: number) => {
        if (input < 1 || input > 300) {
          return 'Number of wallets must be between 1 and 300';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SOL_AMOUNT_TO_DISTRIBUTE',
      message: '🔵 [VOLUME BOT] SOL amount to distribute (total):',
      default: currentConfig.SOL_AMOUNT_TO_DISTRIBUTE,
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
      message: '🔵 [VOLUME BOT] Minimum distribution interval (seconds):',
      default: currentConfig.DISTRIBUTE_INTERVAL_MIN,
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
      message: '🔵 [VOLUME BOT] Maximum distribution interval (seconds):',
      default: currentConfig.DISTRIBUTE_INTERVAL_MAX,
      validate: (input: number) => {
        if (input < 1) {
          return 'Distribution interval must be at least 1 second';
        }
        return true;
      }
    }
  ]);

  // Update the configuration
  const updatedConfig = {
    ...currentConfig,
    ...answers
  };

  setGlobalConfig(updatedConfig, true);
  console.log('\n✅ Volume Bot configuration updated successfully!');

  // Restart the volume bot launch process
  await launchVolumeBotOnly();
}

async function updateMarketMakerConfiguration() {
  console.log('\n🟠 Updating Market Maker Configuration');
  console.log('======================================\n');

  const currentConfig = getGlobalConfig();

  const answers = await inquirer.prompt([
    // Market Maker Configuration
    {
      type: 'number',
      name: 'BONDING_CURVE_THRESHOLD_SOL',
      message: '🟠 [MARKET MAKER] Enter the bonding curve threshold (SOL):',
      default: currentConfig.BONDING_CURVE_THRESHOLD_SOL,
      validate: (input: number) => {
        if (input <= 0) {
          return 'Bonding curve threshold must be greater than 0';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'TOTAL_PERIOD_MIN',
      message: '🟠 [MARKET MAKER] Total period for market maker (minutes):',
      default: currentConfig.TOTAL_PERIOD_MIN,
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
      message: '🟠 [MARKET MAKER] Buy interval period unit (seconds):',
      default: currentConfig.BUY_INTERVAL_PERIOD_UNIT_SEC,
      validate: (input: number) => {
        if (input < 1) {
          return 'Buy interval must be at least 1 second';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_WALLET_NUM_MARKETMAKER',
      message: '🟠 [MARKET MAKER] Number of market maker wallets:',
      default: currentConfig.DISTRIBUTE_WALLET_NUM_MARKETMAKER,
      validate: (input: number) => {
        if (input < 1 || input > 300) {
          return 'Number of wallets must be between 1 and 300';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'DISTRIBUTE_DELTA_PERFECTAGE',
      message: '🟠 [MARKET MAKER] Distribution delta percentage (%):',
      default: currentConfig.DISTRIBUTE_DELTA_PERFECTAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Delta percentage must be between 0 and 100';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'ADDITIONAL_TIME_MIN',
      message: '🟠 [MARKET MAKER] Additional time for extension (minutes, 0 = disabled):',
      default: currentConfig.ADDITIONAL_TIME_MIN,
      validate: (input: number) => {
        if (input < 0) {
          return 'Additional time must be 0 or positive';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'SOL_AMOUNT_TO_DISTRIBUTE_FOR_MARKETMAKER',
      message: '🟠 [MARKET MAKER] SOL amount to distribute for market maker (total):',
      default: currentConfig.SOL_AMOUNT_TO_DISTRIBUTE_FOR_MARKETMAKER,
      validate: (input: number) => {
        if (input <= 0) {
          return 'SOL amount must be greater than 0';
        }
        return true;
      }
    }
  ]);

  // Update the configuration
  const updatedConfig = {
    ...currentConfig,
    ...answers
  };

  setGlobalConfig(updatedConfig, true);
  console.log('\n✅ Market Maker configuration updated successfully!');

  // Restart the market maker launch process
  await launchMarketMakerOnly();
}

async function updateSellBotConfiguration() {
  console.log('\n🟠 Updating Sell Bot Configuration');
  console.log('==================================\n');

  const currentConfig = getGlobalConfig();

  const answers = await inquirer.prompt([
    // PumpSwap Configuration (Required for Sell Bot)
    // {
    //   type: 'input',
    //   name: 'TOKEN_MINT_PUMPSWAP',
    //   message: '🟠 [MARKET MAKER] Enter the PumpSwap token mint address:',
    //   default: currentConfig.TOKEN_MINT_PUMPSWAP,
    //   validate: (input: string) => {
    //     if (!input || input.length < 32) {
    //       return 'Please enter a valid token mint address';
    //     }
    //     return true;
    //   }
    // },
    // {
    //   type: 'input',
    //   name: 'POOL_ID_PUMPSWAP',
    //   message: '🟠 [MARKET MAKER] Enter the PumpSwap pool ID:',
    //   default: currentConfig.POOL_ID_PUMPSWAP,
    //   validate: (input: string) => {
    //     if (!input || input.length < 32) {
    //       return 'Please enter a valid pool ID';
    //     }
    //     return true;
    //   }
    // },
    {
      type: 'number',
      name: 'SELL_TOKEN_PERCENT',
      message: '🟠 [MARKET MAKER] Sell token percentage (%):',
      default: currentConfig.SELL_TOKEN_PERCENT,
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
      message: '🟠 [MARKET MAKER] Sell token delta percentage (%):',
      default: currentConfig.SELL_TOKEN_DELTA_PERFECTAGE,
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
      message: '🟠 [MARKET MAKER] Sell concurrency percentage (%):',
      default: currentConfig.SELL_CONCURRENCY_PERCENT,
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
      message: '🟠 [MARKET MAKER] Sell concurrency delta percentage (%):',
      default: currentConfig.SELL_CONCURRENCY_DELTA_PERFECTAGE,
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
      message: '🟠 [MARKET MAKER] Sell iteration sleep time (minutes):',
      default: currentConfig.SELL_ITERATION_SLEEP_TIME_MIN,
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
      message: '🟠 [MARKET MAKER] Sell iteration sleep delta percentage (%):',
      default: currentConfig.SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE,
      validate: (input: number) => {
        if (input < 0 || input > 100) {
          return 'Delta percentage must be between 0 and 100';
        }
        return true;
      }
    }
  ]);

  // Update the configuration
  const updatedConfig = {
    ...currentConfig,
    ...answers
  };

  setGlobalConfig(updatedConfig, true);
  console.log('\n✅ Sell Bot configuration updated successfully!');

  // Restart the sell bot launch process
  await launchSellBot();
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

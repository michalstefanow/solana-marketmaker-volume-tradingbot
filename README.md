# Solana PumpFun Volume Bot & Market Maker

A sophisticated automated trading bot for Solana blockchain that creates volume and provides market making services for PumpFun tokens. The bot supports multiple trading strategies including volume generation, buy-side market making, and sell-side market making.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [CLI Commands Structure](#cli-commands-structure)
- [Configuration Parameters](#configuration-parameters)
- [Bot Types & Strategies](#bot-types--strategies)
- [Usage Examples](#usage-examples)
- [File Structure](#file-structure)
- [Important Notes](#important-notes)

---

## 🎯 Overview

This bot provides three main functionalities:

1. **Volume Bot**: Creates trading volume by buying and selling tokens across multiple distributed wallets
2. **Market Maker for Buy**: Automated buy-side market making operations
3. **Sell Bot**: Automated sell-side operations using PumpSwap

The bot uses an interactive CLI interface for easy configuration and management.

---

## ✨ Features

- 🔄 Automated volume generation with customizable intervals
- 💹 Market making operations (buy and sell sides)
- 🎲 Randomized trading patterns for natural-looking volume
- 💰 SOL distribution across multiple wallets
- 📊 Real-time statistics and monitoring
- ⚙️ Persistent configuration management
- 🛑 Graceful stop and restart capabilities
- ⏰ Runtime extension support
- 💸 Automated SOL collection from distributed wallets
- 🔐 Support for both standard and Jito transactions

---

## 📦 Prerequisites

- Node.js (v16 or higher)
- TypeScript
- Solana wallet with SOL balance
- RPC endpoint (Helius, QuickNode, or similar)
- Basic understanding of Solana blockchain

---

## 🚀 Installation

### 1. Clone the repository and install dependencies:

```bash
cd solana-marketmaker-volume-tradingbot
npm install
# or
yarn install
```

### 2. Set up environment variables:

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_base58_encoded_private_key
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
RPC_WEBSOCKET_ENDPOINT=wss://api.mainnet-beta.solana.com
```

---

## 🔧 Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PRIVATE_KEY` | Base58 encoded Solana private key | `5j7s8...` |
| `RPC_ENDPOINT` | HTTP RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `RPC_WEBSOCKET_ENDPOINT` | WebSocket RPC endpoint | `wss://api.mainnet-beta.solana.com` |

### Recommended RPC Providers

- **Helius**: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`
- **QuickNode**: Your QuickNode endpoint
- **Public**: `https://api.mainnet-beta.solana.com` (rate limited)

---

## 💻 CLI Commands Structure

### Main Commands

#### 1. Start the CLI Interface
```bash
npm run bot
# or
yarn bot
# or
ts-node cli.ts
```

**Description**: Launches the interactive CLI menu system for bot configuration and management.

**What it does**:
- Checks for existing configuration
- Displays main menu with available options
- Provides interactive prompts for all operations

---

## 📊 CLI Menu Structure

### Main Menu Options

When you run `npm run bot`, you'll see:

```
🎯 PumpFun Volume Bot - Advanced CLI
====================================

Select an action:
1️⃣  Initialize/Reload Configuration
2️⃣  Manage Bot
3️⃣  Statistics & Monitoring
4️⃣  Configuration Management
5️⃣  Exit
```

---

### 1️⃣ Initialize/Reload Configuration

**Purpose**: Set up or update bot configuration parameters.

**Sub-options**:
- Enter token mint address
- Configure RPC endpoints
- Set buy/sell intervals
- Configure wallet distribution
- Set trading parameters

**Configuration Prompts**:

| Prompt | Description | Example |
|--------|-------------|---------|
| Token Mint Address | The SPL token to trade | `2qmdeAv4ZXf7...` |
| Buy Interval Min/Max | Time between buys (seconds) | Min: 100, Max: 200 |
| Sell Interval Min/Max | Time between sells (seconds) | Min: 100, Max: 150 |
| Buy Lower/Upper Percent | Buy amount as % of wallet balance | Lower: 30%, Upper: 50% |
| Distribution Wallet Number | Number of wallets for volume bot | 2-300 wallets |
| SOL Amount to Distribute | Total SOL to distribute | 0.02 SOL |
| Fee Level | Transaction priority (1-10) | 5 |
| Slippage | Max slippage tolerance | 50% |
| Jito Mode | Use Jito bundles | true/false |

**Market Maker Specific**:

| Parameter | Description | Default |
|-----------|-------------|---------|
| Bonding Curve Threshold | Target market cap in SOL | 30.14 SOL |
| Total Period | Market maker run duration | 1440 minutes |
| Buy Interval Period Unit | Time between MM buys | 30 seconds |
| Distribution Wallet Number | MM wallet count | 5 wallets |
| Distribution Delta | Randomization percentage | 5% |

Pumpfun Pool Id, Pumpswap Pool Id wil be from Token Mint automatically, you don't need to add it manually.

---

### 2️⃣ Manage Bot

**Purpose**: Start, stop, and manage bot operations.

**Options**:

#### 🚀 Launch Bot (Volume Bot + Market Maker)
```
What it does:
- Starts VolumeBot() function
- Starts MarketMakerForBuy() function
- Both run in parallel
- Creates trading volume through buy/sell cycles
- Performs market making operations
```

**Before Launch Options**:
- 🔵 Update Volume Bot parameters only
- 🟠 Update Market Maker parameters only
- 🔄 Update both
- ▶️ Launch with current parameters
- ⬅️ Back to previous menu

**Volume Bot Process**:
1. Distributes SOL to N wallets
2. Each wallet performs:
   - First buy (% of balance)
   - Wait (random interval)
   - Second buy (remaining balance)
   - Wait (random interval)
   - Sell all tokens
   - Transfer SOL back to main wallet
3. Repeat cycle

**Market Maker Process**:
1. Distributes SOL to MM wallets
2. Each iteration:
   - Calculate buy amount based on remaining time
   - Execute buys across all wallets
   - Wait for next interval
3. Continue until time period expires

---

#### 💰 Launch Sell Bot
```
What it does:
- Starts MarketMakerForSell() function
- Sells tokens from market maker wallets
- Uses PumpSwap for selling
- Randomized sell amounts and timing
```

**Sell Bot Process**:
1. Loads wallets from `market_maker_data.json`
2. Each iteration:
   - Filters wallets with token balances
   - Selects random subset (concurrency %)
   - Sells % of tokens from each
   - Waits for next iteration
3. Continues until all tokens sold

**Sell Bot Parameters**:

| Parameter | Description | Default |
|-----------|-------------|---------|
| Sell Token Percent | % of tokens to sell per iteration | 10% |
| Sell Token Delta | Randomization for sell amount | ±5% |
| Sell Concurrency Percent | % of wallets to use per iteration | 25% |
| Sell Concurrency Delta | Randomization for wallet selection | ±10% |
| Sell Iteration Sleep Time | Minutes between iterations | 1 minute |

---

#### ⏹️ Stop Bot
```
What it does:
- Sends abort signal to running bots
- Waits for graceful shutdown (10 seconds)
- Resets bot state
- Preserves wallet states
```

**Safe Stopping**:
- Allows current transactions to complete
- Does not interrupt mid-transaction
- Wallet balances remain intact
- Can restart later

---

#### ⏰ Extend Bot Runtime
```
What it does:
- Adds additional minutes to market maker runtime
- Updates ADDITIONAL_TIME_MIN in config
- Applied automatically within 5 iterations
- Bot continues running seamlessly
```

**Usage**:
```
Current runtime: 60 minutes
Add additional: 30 minutes
New total: 90 minutes
```

---

#### 📊 Bot Status
```
Displays:
- Running/Stopped status
- Bot type (Volume Bot, Market Maker, Sell Bot)
- Running time (hours, minutes, seconds)
- Start timestamp
```

---

#### 💸 Collect All SOL
```
What it does:
- Stops bot if running
- Sells all tokens from wallets
- Closes token accounts
- Transfers SOL to main wallet
- Processes both data files
```

**Collection Methods**:
- 🔄 Collect with Sell: Sells tokens first, then gathers SOL

**Files Processed**:
1. `market_maker_data.json` - Market maker wallets
2. `data.json` - Volume bot wallets

---

### 3️⃣ Statistics & Monitoring

**Options**:

#### 💰 View Market Cap & Token Value
```
Displays:
- Token mint address
- Pool ID
- Bonding curve balance
- Market cap in SOL
- Current token price
```

---

### 4️⃣ Configuration Management

**Options**:

#### 🔄 Reload Configuration
```
What it does:
- Re-runs configuration wizard
- Updates bot-config.json
- Fetches new pool IDs
- Validates settings
```

#### 🗑️ Delete Saved Configuration
```
What it does:
- Removes bot-config.json
- Clears global config from memory
- Requires reconfiguration on next start
```

#### 📋 View Current Configuration
```
What it does:
- Displays all current settings
- Shows Volume Bot parameters
- Shows Market Maker parameters
- Shows Sell Bot parameters
```

---

## ⚙️ Configuration Parameters

### Volume Bot Parameters

| Parameter | Description | Type | Default | Range |
|-----------|-------------|------|---------|-------|
| `TOKEN_MINT` | Token to trade | string | - | Valid Solana address |
| `POOL_ID` | Bonding curve PDA | string | Auto-fetched | - |
| `BUY_INTERVAL_MIN` | Min seconds between buys | number | 5 | 1-∞ |
| `BUY_INTERVAL_MAX` | Max seconds between buys | number | 15 | 1-∞ |
| `BUY_LOWER_PERCENT` | Min % of balance to buy | number | 10 | 0-100 |
| `BUY_UPPER_PERCENT` | Max % of balance to buy | number | 30 | 0-100 |
| `SELL_INTERVAL_MIN` | Min seconds before sell | number | 10 | 1-∞ |
| `SELL_INTERVAL_MAX` | Max seconds before sell | number | 30 | 1-∞ |
| `DISTRIBUTE_WALLET_NUM` | Number of wallets | number | 1 | 1-300 |
| `SOL_AMOUNT_TO_DISTRIBUTE` | Total SOL to distribute | number | 1 | >0 |
| `DISTRIBUTE_INTERVAL_MIN` | Min seconds between distributions | number | 30 | 1-∞ |
| `DISTRIBUTE_INTERVAL_MAX` | Max seconds between distributions | number | 60 | 1-∞ |
| `FEE_LEVEL` | Transaction priority fee | number | 1 | 1-10 |
| `SLIPPAGE` | Max slippage % | number | 5 | 0-100 |

### Market Maker Parameters

| Parameter | Description | Type | Default | Range |
|-----------|-------------|------|---------|-------|
| `BONDING_CURVE_THRESHOLD_SOL` | Target market cap | number | 80 | >0 |
| `TOTAL_PERIOD_MIN` | Runtime in minutes | number | 25 | 1-∞ |
| `BUY_INTERVAL_PERIOD_UNIT_SEC` | Seconds between buys | number | 30 | 1-∞ |
| `DISTRIBUTE_WALLET_NUM_MARKETMAKER` | MM wallet count | number | 200 | 1-300 |
| `DISTRIBUTE_DELTA_PERFECTAGE` | Amount randomization % | number | 5 | 0-100 |
| `ADDITIONAL_TIME_MIN` | Extension time | number | 0 | 0-∞ |

### Sell Bot Parameters

| Parameter | Description | Type | Default | Range |
|-----------|-------------|------|---------|-------|
| `TOKEN_MINT_PUMPSWAP` | PumpSwap token mint | string | Auto-set | Valid address |
| `POOL_ID_PUMPSWAP` | PumpSwap pool ID | string | Auto-fetched | - |
| `SELL_TOKEN_PERCENT` | % to sell per iteration | number | 10 | 0-100 |
| `SELL_TOKEN_DELTA_PERFECTAGE` | Sell amount variation % | number | 5 | 0-100 |
| `SELL_CONCURRENCY_PERCENT` | % of wallets per iteration | number | 25 | 0-100 |
| `SELL_CONCURRENCY_DELTA_PERFECTAGE` | Wallet selection variation % | number | 10 | 0-100 |
| `SELL_ITERATION_SLEEP_TIME_MIN` | Minutes between iterations | number | 10 | 0-∞ |
| `SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE` | Sleep time variation % | number | 5 | 0-100 |

### Global Parameters

| Parameter | Description | Type | Default |
|-----------|-------------|------|---------|
| `JITO_MODE` | Enable Jito bundles | boolean | false |
| `JITO_FEE` | Jito tip amount (lamports) | number | 1000000 |
| `GATHER_TO_OTHER_ADDRESS` | Send gathered SOL to another wallet | boolean | false |
| `GATHER_ADDRESS` | Destination for gathered SOL | string | "" |

---

## 🤖 Bot Types & Strategies

### 1. Volume Bot Strategy

**Purpose**: Generate trading volume to create market activity.

**How it Works**:

```
┌─────────────────────────────────────────┐
│  Main Wallet (SOL Balance)              │
└───────────────┬─────────────────────────┘
                │
                ▼ Distribute SOL
    ┌──────┬────────┬────────┬──────┐
    │ W1   │ W2     │ W3     │ WN   │
    └──┬───┴───┬────┴───┬────┴───┬──┘
       │       │        │        │
       ▼       ▼        ▼        ▼
    Buy 1   Buy 1    Buy 1    Buy 1
    (30%)   (35%)    (42%)    (38%)
       │       │        │        │
       ▼       ▼        ▼        ▼
    Wait    Wait     Wait     Wait
    (120s)  (150s)   (180s)   (165s)
       │       │        │        │
       ▼       ▼        ▼        ▼
    Buy 2   Buy 2    Buy 2    Buy 2
    (All)   (All)    (All)    (All)
       │       │        │        │
       ▼       ▼        ▼        ▼
    Wait    Wait     Wait     Wait
    (110s)  (135s)   (125s)   (140s)
       │       │        │        │
       ▼       ▼        ▼        ▼
    Sell    Sell     Sell     Sell
    (100%)  (100%)   (100%)   (100%)
       │       │        │        │
       └───────┴────────┴────────┘
                │
                ▼ Gather SOL
┌─────────────────────────────────────────┐
│  Main Wallet (SOL + Fees)                │
└─────────────────────────────────────────┘
```

**Key Features**:
- Randomized buy amounts (within configured range)
- Randomized wait times (natural trading pattern)
- Two-stage buying (accumulation pattern)
- Automatic SOL recovery
- Configurable wallet count (1-300)

---

### 2. Market Maker for Buy Strategy

**Purpose**: Provide continuous buy-side liquidity over extended period.

**How it Works**:

```
Timeline: 0 ──────────────────────────────────► Total Period
          │                                      │
          ├──────┬──────┬──────┬─────────────┬──┤
          Buy    Buy    Buy    Buy    ...    Buy
          (Iter  (Iter  (Iter  (Iter         (Iter
           N)     N-1)   N-2)   N-3)          1)

Buy Amount Calculation:
- Iteration N:   Small amount (distributed over time)
- Iteration N-1: Slightly more
- Iteration 2:   Moderate amount
- Iteration 1:   All remaining balance
```

**Buy Amount Formula**:
```javascript
buyAmount = calculateAmountForIteration(currentIteration)
            * (1 ± randomPercent)
```

**Key Features**:
- Time-based distribution of buys
- Larger buys as period progresses
- Configurable iteration intervals
- Runtime extension support
- Graceful handling of low balances

---

### 3. Sell Bot Strategy

**Purpose**: Gradually sell accumulated tokens to maintain price stability.

**How it Works**:

```
Iteration 1:
  Select 25% of wallets (with tokens)
  Sell 10% (±5%) of tokens from each

  Wait 1 minute (±5%)

Iteration 2:
  Select 25% of wallets (different subset)
  Sell 10% (±5%) of tokens from each

  Wait 1 minute (±5%)

Continue until all tokens sold...
```

**Key Features**:
- Random wallet selection per iteration
- Variable sell percentages
- Configurable concurrency
- Continues until tokens exhausted
- Uses PumpSwap for execution

---

## 📖 Usage Examples

### Example 1: Basic Volume Bot Setup

```bash
# Step 1: Start CLI
npm run bot

# Step 2: Initialize Configuration
# Select: 1️⃣ Initialize/Reload Configuration
# Enter token mint: 2qmdeAv4ZXf7tSJA8n7UvSLbXw6CmtazH4TmET5Cpump
# Buy interval min: 5 seconds (default)
# Buy interval max: 15 seconds (default)
# Buy lower percent: 10% (default)
# Buy upper percent: 30% (default)
# Sell interval min: 10 seconds (default)
# Sell interval max: 30 seconds (default)
# Distribute wallet num: 1 wallet (default)
# SOL amount to distribute: 1 SOL (default)
# Fee level: 1 (default)
# Slippage: 5% (default)

# Step 3: Launch Bot
# Select: 2️⃣ Manage Bot
# Select: 🚀 Launch Bot
# Select: ▶️ Launch with current parameters

# Bot starts running...
# [VOLUME BOT] Volume bot is running
# [VOLUME BOT] Wallet address: ...
# [MARKET MAKER] Market maker is running
```

---

### Example 2: Market Maker Only

```bash
# Configure for market making
npm run bot

# Initialize with MM parameters
# Bonding curve threshold: 80 SOL (default)
# Total period: 25 minutes (default)
# Buy interval: 30 seconds (default)
# MM wallets: 200 (default)
# Delta percentage: 5% (default)

# Launch Volume Bot (includes MM)
# The bot will:
# - Run volume bot in parallel
# - Execute MM buys every 30 seconds
# - Continue for 24 hours
# - Gradually increase buy amounts
```

---

### Example 3: Sell Bot Operation

```bash
# Prerequisites: Already ran Volume Bot + Market Maker
# Tokens accumulated in market_maker_data.json wallets

npm run bot

# Select: 2️⃣ Manage Bot
# Select: 💰 Launch Sell Bot

# Configure sell parameters (or use defaults)
# Sell token percent: 10%
# Concurrency percent: 25%
# Sleep time: 1 minute

# Bot starts selling
# [SELL BOT] Market maker for sell is running
# [SELL BOT] 10 length of wallets list loaded
# [SELL BOT] Filtering wallets that have tokens
# [SELL BOT] concurrenyNum => 2
# Selling from 2 wallets...
```

---

### Example 4: Emergency Stop and Collect

```bash
# Bot is running...

# Select: 2️⃣ Manage Bot
# Select: ⏹️ Stop Bot

# ✅ Bot will be stopped on next iteration

# Now collect all SOL
# Select: 💸 Collect All SOL
# Select: 🔄 Collect with Sell

# Sells all tokens and gathers SOL
# Process complete!
```

---

### Example 5: Extend Runtime

```bash
# Market Maker is running (60 minutes configured)
# 30 minutes elapsed, need more time

# Select: 2️⃣ Manage Bot
# Select: ⏰ Extend Bot Runtime
# Enter additional minutes: 30

# ✅ Bot runtime extended by 30 minutes!
# New total: 90 minutes
# Bot continues seamlessly
```

---

## 📁 File Structure

```
solana-marketmaker-volume-tradingbot/
│
├── cli.ts                      # Main CLI interface
├── index.ts                    # Core bot logic (VolumeBot, MarketMaker)
├── gather.ts                   # SOL collection script
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .env                       # Environment variables (create this)
│
├── bot-config.json            # Saved bot configuration (auto-generated)
├── data.json                  # Volume bot wallet data (auto-generated)
├── market_maker_data.json     # Market maker wallet data (auto-generated)
│
├── constants/                 # Configuration constants
│   └── ...
│
├── utils/                     # Utility functions
│   ├── cli-prompts.ts         # CLI prompt definitions
│   ├── config-manager.ts      # Configuration management
│   ├── config-persistence.ts  # Config file operations
│   ├── pumpfun.ts            # PumpFun integration
│   ├── pumpswap.ts           # PumpSwap integration
│   └── ...
│
├── executor/                  # Transaction executors
│   ├── legacy.ts             # Standard transaction execution
│   └── jito.ts               # Jito bundle execution
│
└── contract/                  # Smart contract interactions
    └── pump-fun.ts           # PumpFun contract interface
```

---

## 📝 Important Notes

### ⚠️ Safety & Best Practices

1. **Start Small**: Test with small amounts first (0.01-0.05 SOL)
2. **Monitor Closely**: Watch the first few iterations carefully
3. **RPC Limits**: Use paid RPC endpoints for better reliability
4. **Fee Levels**: Higher fee levels = faster confirmation but higher costs
5. **Slippage**: High slippage protects against failed txs but worse prices

### 💡 Tips for Success

1. **Volume Bot**:
   - Use 2-5 wallets for testing
   - Increase to 10-200 for production
   - Balance interval times with gas costs
   - Monitor main wallet SOL balance

2. **Market Maker**:
   - Ensure sufficient SOL for full period
   - Use realistic time periods (don't over-extend)
   - Monitor bonding curve threshold
   - Consider market conditions

3. **Sell Bot**:
   - Start with low sell percentages (5-10%)
   - Use lower concurrency (10-25%)
   - Allow adequate sleep time between iterations
   - Monitor token prices during selling

## 🎓 Advanced Usage

### Custom Configuration Files

You can manually edit `bot-config.json` for advanced customization:

```json
{
  "config": {
    "PRIVATE_KEY": "your_key",
    "TOKEN_MINT": "token_address",
    "BUY_INTERVAL_MIN": 100,
    "CUSTOM_PARAMETER": "value"
  },
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```


import {
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionInstruction,
  TransactionMessage,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction,
  Commitment
} from '@solana/web3.js'
import {
  BUY_INTERVAL_MAX,
  BUY_INTERVAL_MIN,
  SELL_INTERVAL_MAX,
  SELL_INTERVAL_MIN,
  BUY_LOWER_PERCENT,
  BUY_UPPER_PERCENT,
  DISTRIBUTE_WALLET_NUM,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  TOKEN_MINT,
  JITO_MODE,
  SOL_AMOUNT_TO_DISTRIBUTE,
  DISTRIBUTE_INTERVAL_MIN,
  DISTRIBUTE_INTERVAL_MAX,
  FEE_LEVEL,
  DISTRIBUTE_WALLET_NUM_MARKETMAKER,
  DISTRIBUTE_DELTA_PERFECTAGE,
  BUY_INTERVAL_PERIOD_UNIT_SEC,
  TOTAL_PERIOD_MIN,
  SELL_CONCURRENCY_PERCENT,
  SELL_CONCURRENCY_DELTA_PERFECTAGE,
  SELL_TOKEN_PERCENT,
  SELL_TOKEN_DELTA_PERFECTAGE,
  SELL_ITERATION_SLEEP_TIME_MIN,
  SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE,
} from './constants'
import { config, Data, readJson, saveDataToFile, saveNewFile, sleep } from './utils'
import base58 from 'bs58'
import { execute } from './executor/legacy'
import { executeJitoTx } from './executor/jito'
import { makeBuyPumpfunTokenTx, makeSellPumpfunTokenTx, makeSellPumpswapTokenTxMarketMaker, setBuyAmount } from './utils/pumpfun'

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
})

export const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const baseMint = new PublicKey(TOKEN_MINT);
const baseMintPumpswap = new PublicKey(config.TOKEN_MINT_PUMPSWAP);
const distritbutionNum = DISTRIBUTE_WALLET_NUM;
const jitoCommitment: Commitment = "confirmed"

const totalProcesses: Set<string> = new Set()

// Common Function
const buy = async (newWallet: Keypair, baseMint: PublicKey, buyAmount: number, isVolumeBot: boolean = true) => {
  let solBalance: number = 0
  try {
    solBalance = await solanaConnection.getBalance(newWallet.publicKey)
  } catch (error) {
    console.log("Error getting balance of wallet")
    return null
  }
  if (solBalance == 0) {
    return null
  }
  try {
    let buyTx = await makeBuyPumpfunTokenTx(newWallet, baseMint, buyAmount)
    if (buyTx == null) {
      console.log(`Error getting buy transaction`)
      return null
    }
    // console.log(await solanaConnection.simulateTransaction(buyTx))
    let txSig
    if (JITO_MODE) {
      txSig = await executeJitoTx([buyTx], mainKp, jitoCommitment)
    } else {
      const latestBlockhash = await solanaConnection.getLatestBlockhash()
      txSig = await execute(buyTx, latestBlockhash, 1, isVolumeBot)
    }
    if (txSig) {
      const tokenBuyTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
      console.log(isVolumeBot ? "[VOLUME BOT]" : "[MARKET MAKER]", ": Success in buy transaction: ", tokenBuyTx)
      return tokenBuyTx
    } else {
      return null
    }
  } catch (error) {
    // console.log("Buy transaction error", error);
    await sleep(1000)
    return null
  }
}

const sell = async (baseMint: PublicKey, wallet: Keypair) => {
  try {
    const data: Data[] = readJson()
    if (data.length == 0) {
      await sleep(1000)
      return null
    }

    const tokenAta = await getAssociatedTokenAddress(baseMint, wallet.publicKey)
    const tokenBalInfo = await solanaConnection.getTokenAccountBalance(tokenAta)
    if (!tokenBalInfo) {
      console.log("Balance incorrect")
      return null
    }

    try {
      // let sellTx = await getSellTxWithJupiter(wallet, baseMint, tokenBalance)
      // let sellTx = await getSellTx(solanaConnection, wallet, baseMint, NATIVE_MINT, POOL_ID, undefined)
      let sellTx = await makeSellPumpfunTokenTx(wallet, baseMint)

      if (sellTx == null) {
        console.log(`Error getting buy transaction`)
        return null
      }

      // console.log(await solanaConnection.simulateTransaction(sellTx))
      let txSig
      if (JITO_MODE) {
        txSig = await executeJitoTx([sellTx], mainKp, jitoCommitment)
      } else {
        const latestBlockhash = await solanaConnection.getLatestBlockhash()
        txSig = await execute(sellTx, latestBlockhash, 1, true);
      }
      if (txSig) {
        const tokenSellTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
        console.log("Success in sell transaction: ", tokenSellTx)
        return tokenSellTx
      } else {
        return null
      }
    } catch (error) {
      await sleep(1000)
      console.log("Sell transaction error")
      return null
    }
  } catch (error) {
    return null
  }
}

const sellMarketMaker = async (baseMint: PublicKey, wallet: Keypair, sellPercent: number) => {
  try {
    const data: Data[] = readJson("market_maker_data.json");
    if (data.length == 0) {
      await sleep(1000)
      return null
    }

    const tokenAta = await getAssociatedTokenAddress(baseMint, wallet.publicKey)
    const tokenBalInfo = await solanaConnection.getTokenAccountBalance(tokenAta)
    if (!tokenBalInfo) {
      console.log("Balance incorrect")
      return null
    }

    try {
      let sellTx = await makeSellPumpswapTokenTxMarketMaker(wallet, baseMint, sellPercent);

      if (sellTx == null) {
        console.log(`Error getting buy transaction`)
        return null
      }

      // console.log("simulateTransaction ==> ", await solanaConnection.simulateTransaction(sellTx))
      let txSig
      if (JITO_MODE) {
        txSig = await executeJitoTx([sellTx], mainKp, jitoCommitment)
      } else {
        const latestBlockhash = await solanaConnection.getLatestBlockhash()
        txSig = await execute(sellTx, latestBlockhash, 1, false)
      }
      if (txSig) {
        const tokenSellTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
        console.log("Success in sell transaction: ", tokenSellTx)
        return tokenSellTx
      } else {
        return null
      }
    } catch (error) {
      await sleep(1000)
      console.log("Sell transaction error", error);
      return null
    }
  } catch (error) {
    return null
  }
}

// Volume bot
const VolumeBot = async (abortSignal?: AbortSignal) => {
  const solBalance = await solanaConnection.getBalance(mainKp.publicKey)
  console.log(`[VOLUME BOT] Volume bot is running`)
  console.log(`[VOLUME BOT] Wallet address: ${mainKp.publicKey.toBase58()}`)
  console.log(`[VOLUME BOT] Pool token mint: ${baseMint.toBase58()}`)
  console.log(`[VOLUME BOT] Wallet SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(3)}SOL`)
  console.log(`[VOLUME BOT] Buying wait time max: ${BUY_INTERVAL_MAX}s`)
  console.log(`[VOLUME BOT] Buying wait time min: ${BUY_INTERVAL_MIN}s`)
  console.log(`[VOLUME BOT] Selling wait time max: ${SELL_INTERVAL_MAX}s`)
  console.log(`[VOLUME BOT] Selling wait time min: ${SELL_INTERVAL_MIN}s`)
  console.log(`[VOLUME BOT] Buy upper limit percent: ${BUY_UPPER_PERCENT}%`)
  console.log(`[VOLUME BOT] Buy lower limit percent: ${BUY_LOWER_PERCENT}%`)
  console.log(`[VOLUME BOT] Distribute SOL to ${distritbutionNum} wallets`)

  if (solBalance < (BUY_LOWER_PERCENT + 0.002) * distritbutionNum) {
    console.log("[VOLUME BOT] Sol balance is not enough for distribution")
  }

  // main part
  for (; ;) {
    // Check if bot should stop
    if (abortSignal?.aborted) {
      console.log("[VOLUME BOT] Bot stopped by user request");
      break;
    }

    try {
      console.log("[VOLUME BOT] ---- New round of distribution ---- \n")

      let data: {
        kp: Keypair;
        buyAmount: number;
      }[] | null = null

      data = (await readJsonAndConvertData(true));
      if (data == null || data.length == 0) {
        console.log("[VOLUME BOT] Failed to fetch data from data.json")
        await sleep(30000)
        continue
      }
      const interval = Math.floor((DISTRIBUTE_INTERVAL_MIN + Math.random() * (DISTRIBUTE_INTERVAL_MAX - DISTRIBUTE_INTERVAL_MIN)) * 1000)

      data = data.splice(data.length - distritbutionNum, distritbutionNum);
      console.log("[VOLUME BOT] data ==> ", data);

      data.map(async ({ kp }, n) => {

        if (abortSignal?.aborted) {
          console.log("[VOLUME BOT] Bot stopped by user request during distribution");
          return
        }
        // test case
        totalProcesses.add(kp.publicKey.toBase58())

        await sleep(Math.round(n * BUY_INTERVAL_MAX / DISTRIBUTE_WALLET_NUM * 1000))
        let srcKp = kp
        // buy part with random percent
        const BUY_WAIT_INTERVAL = Math.round(Math.random() * (BUY_INTERVAL_MAX - BUY_INTERVAL_MIN) + BUY_INTERVAL_MIN)
        const SELL_WAIT_INTERVAL = Math.round(Math.random() * (SELL_INTERVAL_MAX - SELL_INTERVAL_MIN) + SELL_INTERVAL_MIN)
        const solBalance = await solanaConnection.getBalance(srcKp.publicKey)

        let buyAmountInPercent = Number((Math.random() * (BUY_UPPER_PERCENT - BUY_LOWER_PERCENT) + BUY_LOWER_PERCENT).toFixed(3))

        if (solBalance < 5 * 10 ** 6) {
          console.log("[VOLUME BOT] Sol balance is not enough in one of wallets")
          return
        }

        let buyAmountFirst = Math.floor((solBalance - 5 * 10 ** 6) / 100 * buyAmountInPercent)
        let buyAmountSecond = Math.floor(solBalance - buyAmountFirst - 5 * 10 ** 6)

        console.log(`[VOLUME BOT] balance: ${solBalance / 10 ** 9} first: ${buyAmountFirst / 10 ** 9} second: ${buyAmountSecond / 10 ** 9}`)
        // try buying until success
        let i = 0
        while (true) {
          try {
            if (abortSignal?.aborted) {
              console.log("[VOLUME BOT] Bot stopped by user request");
              break;
            }
            if (i > 50) {
              console.log("[VOLUME BOT] Error in buy transaction")
              break
            }
            const result = await buy(srcKp, baseMint, buyAmountFirst)
            if (result) {
              break
            } else {
              i++
              await sleep(2000)
            }
          } catch (error) {
            i++
          }
        }

        await sleep(BUY_WAIT_INTERVAL * 1000)

        let l = 0
        while (true) {
          try {
            if (abortSignal?.aborted) {
              console.log("[VOLUME BOT] Bot stopped by user request");
              break;
            }
            if (l > 50) {
              console.log("[VOLUME BOT] Error in second buy transaction")
              break
            }
            const result = await buy(srcKp, baseMint, buyAmountSecond)
            if (result) {
              break
            } else {
              l++
              await sleep(2000)
            }
          } catch (error) {
            l++
          }
        }

        await sleep(SELL_WAIT_INTERVAL * 1000)

        // try selling until success
        let j = 0
        while (true) {
          if (abortSignal?.aborted) {
            console.log("[VOLUME BOT] Bot stopped by user request");
            break;
          }
          if (j > 50) {
            console.log("[VOLUME BOT] Error in sell transaction")
            return
          }
          const result = await sell(baseMint, srcKp)
          if (result) {
            break
          } else {
            j++
            await sleep(2000)
          }
        }

      })

      // Check for abort signal during sleep
      if (abortSignal?.aborted) {
        console.log("[VOLUME BOT] Bot stopped by user request during sleep");
        break;
      }

      console.log("[VOLUME BOT] Sleep for the next iteration, ", interval, "ms")
      console.log("[VOLUME BOT] ============================================================================ \n")
      await sleep(interval);
    } catch (error) {
      console.log("[VOLUME BOT] Error in one of the steps")
    }
  }
}

const distributeSol = async (connection: Connection, mainKp: Keypair, distritbutionNum: number) => {
  const data: Data[] = []
  const wallets = []
  try {
    const sendSolTx: TransactionInstruction[] = []
    sendSolTx.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 * FEE_LEVEL }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 12_000 })
    )
    const mainSolBal = await connection.getBalance(mainKp.publicKey)
    console.log("[VOLUME BOT] Main wallet", mainKp.publicKey.toBase58(), "balance: ", mainSolBal / 10 ** 9, "SOL")
    if (mainSolBal <= 5 * 10 ** 7) {
      console.log("Main wallet balance is not enough")
      return []
    }

    let solAmount = Math.floor(SOL_AMOUNT_TO_DISTRIBUTE * 10 ** 9 / distritbutionNum);

    if (mainSolBal < solAmount) {
      console.log("Main wallet balance is not enough for distribution")
      return []
    }

    for (let i = 0; i < distritbutionNum; i++) {
      const wallet = Keypair.generate()
      let lamports = Math.floor(solAmount * (1 - (Math.random() * 0.2)))
      console.log("[VOLUME BOT] Wallet", wallet.publicKey.toBase58(), "balance: ", lamports / 10 ** 9, "SOL")

      wallets.push({ kp: wallet, buyAmount: lamports })
      sendSolTx.push(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wallet.publicKey,
          lamports
        })
      )
    }

    wallets.map((wallet) => {
      data.push({
        privateKey: base58.encode(wallet.kp.secretKey),
        pubkey: wallet.kp.publicKey.toBase58(),
      })
    })

    try {
      saveDataToFile(data)
    } catch (error) {
      console.log("[VOLUME BOT] DistributeSol tx error")
    }
    try {
      const siTx = new Transaction().add(...sendSolTx)
      const latestBlockhash = await solanaConnection.getLatestBlockhash()
      siTx.feePayer = mainKp.publicKey
      siTx.recentBlockhash = latestBlockhash.blockhash
      const messageV0 = new TransactionMessage({
        payerKey: mainKp.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: sendSolTx,
      }).compileToV0Message()
      const transaction = new VersionedTransaction(messageV0)
      transaction.sign([mainKp])

      const simulateResult = await solanaConnection.simulateTransaction(transaction, { sigVerify: true })
      if (simulateResult.value.err) {
        console.log("[VOLUME BOT] Simulation failed in distributeSol")
        console.log("Error : ", simulateResult)
        return null
      }

      let txSig
      if (JITO_MODE) {
        txSig = await executeJitoTx([transaction], mainKp, jitoCommitment)
      } else {
        txSig = await execute(transaction, latestBlockhash, 1, true)
      }
      if (txSig) {
        const distibuteTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
        console.log("[VOLUME BOT] SOL distributed ", distibuteTx)
      }
    } catch (error) {
      console.log("[VOLUME BOT] Distribution error")
      console.log(error)
      return null
    }

    console.log("[VOLUME BOT] Success in distribution")
    return wallets
  } catch (error) {
    console.log(`[VOLUME BOT] Failed to transfer SOL`)
    return null
  }
}
// End Volumn Bot.

// Start Market Maker
const MarketMakerForBuy = async (abortSignal?: AbortSignal) => {
  const solBalance = await solanaConnection.getBalance(mainKp.publicKey)
  console.log(`[MARKET MAKER] Market maker is running`)
  console.log(`[MARKET MAKER] Wallet address: ${mainKp.publicKey.toBase58()}`)
  console.log(`[MARKET MAKER] Pool token mint: ${baseMint.toBase58()}`)
  console.log(`[MARKET MAKER] Wallet SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(3)}SOL`)
  console.log(`[MARKET MAKER] Distribute SOL to ${DISTRIBUTE_WALLET_NUM_MARKETMAKER} wallets`)
  console.log("\n[MARKET MAKER] ============================================= \n");

  let data: {
    kp: Keypair;
    buyAmount: number;
  }[] | null = null

  // main part

  if (abortSignal?.aborted) {
    console.log("[MARKET MAKER] Bot stopped by user request during distribution");
    return;
  }
  // data = await distributeSolForMarketMaker(solanaConnection, mainKp, DISTRIBUTE_WALLET_NUM_MARKETMAKER, txFeeLamports);
  data = await readJsonAndConvertData(false);
  if (data == null || data.length == 0) {
    console.log("[MARKET MAKER] The market_maker_data.json is not found, try again in 30 seconds...")
    return;
  }

  // Main Iterate Part
  const totalPeriod = TOTAL_PERIOD_MIN * 60;  // ms
  console.log("[MARKET MAKER] totalPeriod ==> ", totalPeriod);
  console.log("[MARKET MAKER] BUY_INTERVAL_PERIOD_UNIT_SEC ==> ", BUY_INTERVAL_PERIOD_UNIT_SEC);
  let iterationNum = Math.ceil(totalPeriod / BUY_INTERVAL_PERIOD_UNIT_SEC);

  // Function to check and apply additional time dynamically
  const checkAndApplyAdditionalTime = () => {
    try {
      const { getGlobalConfig, setGlobalConfig } = require('./utils/config-manager');
      const currentConfig = getGlobalConfig();
      const additionalTime = currentConfig.ADDITIONAL_TIME_MIN || 0;

      if (additionalTime > 0) {
        const additionalIterations = Math.ceil(additionalTime * 60 / BUY_INTERVAL_PERIOD_UNIT_SEC);
        console.log(`\n[MARKET MAKER] Additional time detected: ${additionalTime} min (${additionalIterations} iterations)`);
        console.log(`[MARKET MAKER] Extending runtime by ${additionalIterations} iterations`);

        // Reset additional time in configuration to avoid applying twice
        const updatedConfig = {
          ...currentConfig,
          ADDITIONAL_TIME_MIN: 0
        };
        setGlobalConfig(updatedConfig, true);
        console.log(`[MARKET MAKER] Additional time applied and reset to 0 in configuration`);

        return additionalIterations;
      }
      return 0;
    } catch (error) {
      console.log(`[MARKET MAKER] Warning: Could not check additional time: ${error}`);
      return 0;
    }
  };

  // Check for additional time at startup
  const additionalIterations = checkAndApplyAdditionalTime();
  iterationNum += additionalIterations;

  console.log("\n[MARKET MAKER] iterationNum ==> ", iterationNum);
  console.log("\n[MARKET MAKER] Buying for market maker...\n");
  let iterator = iterationNum;

  // Buy part
  while (true) {
    // Check if bot should stop
    if (abortSignal?.aborted) {
      console.log("[MARKET MAKER] Bot stopped by user request");
      break;
    }

    // Check for additional time during execution (every 5 iterations)
    const newAdditionalIterations = checkAndApplyAdditionalTime();
    if (newAdditionalIterations > 0) {
      iterationNum += newAdditionalIterations;
      iterator += newAdditionalIterations;
      console.log(`[MARKET MAKER] Runtime extended during execution! New total: ${iterationNum} iterations`);
    }

    console.log("[MARKET MAKER] ---- Market maker Buy iteration ", iterator, " ---- \n")
    let shouldBreak = false;
    let runOutOfWallets = 0;
    try {
      // buy part per wallet
      await Promise.all(data.map(async ({ kp }, n) => {
        const randomDelayTime = Math.max(Math.round(Math.random() * 3), 1) * 1000;
        console.log(`[MARKET MAKER] Random delay time: ${randomDelayTime}ms for wallet ${kp.publicKey.toBase58()}`)
        await sleep(randomDelayTime);

        let srcKp = kp
        const solBalance = await solanaConnection.getBalance(srcKp.publicKey);
        console.log(`[MARKET MAKER] solBalance ==> ${solBalance / 10 ** 9} SOL`)

        // let calbuyAmount = iterator == 1 ? solBalance - 5 * 10 ** 6 : await setBuyAmount(iterator); // lamports
        let buyAmount =  solBalance / iterationNum * (1 - (Math.random() * DISTRIBUTE_DELTA_PERFECTAGE / 100))// lamports
        // console.log(`[MARKET MAKER] calbuyAmount ==> ${Number(calbuyAmount) / 10 ** 9} SOL`)
        // let buyAmount = Math.round(Math.min(Number(calbuyAmount), solBalance) * (1 - (Math.random() * DISTRIBUTE_DELTA_PERFECTAGE / 100)));
        console.log(`[MARKET MAKER] buyAmount in Market Maker ==> ${buyAmount / 10 ** 9} SOL`)

        const minRentAmount = await getMinimumBalanceForRentExemptMint(solanaConnection, "finalized");
        console.log("[MARKET MAKER] getMinimumBalanceForRentExemptMint ==> ", minRentAmount);

        if (buyAmount <= minRentAmount) {
          console.log("[MARKET MAKER] Buy amount is not enough, skip this iteration");
          runOutOfWallets++;
          if (runOutOfWallets >= data.length) {
            console.log("[MARKET MAKER] All Wallets are out of balance, break iteration")
            shouldBreak = true;
          }
          return;
        }

        // try buying until success
        let i = 0
        while (true) {
          try {
            if (i > 50) {
              console.log("[MARKET MAKER] Error in buy transaction")
              break
            }
            const srcWalletBalance = await solanaConnection.getBalance(srcKp.publicKey);
            if (srcWalletBalance < buyAmount) {
              console.log("[MARKET MAKER] srcWalletBalance ==> ", srcWalletBalance / 10 ** 9)
              console.log("[MARKET MAKER] buyAmount ==> ", buyAmount / 10 ** 9)
              console.log("[MARKET MAKER] Wallet balance is not enough, skip this iteration")
              shouldBreak = true;
              return
            }
            const result = await buy(srcKp, baseMint, buyAmount, false);
            if (result) {
              break
            } else {
              i++
              await sleep(2000)
            }
          } catch (error) {
            i++
          }
        }
      }))
      if (shouldBreak) {
        console.log("[MARKET MAKER] Buy amount is not enough for any wallet, breaking iteration")
        break;
      }
      // Check for abort signal before sleep
      if (abortSignal?.aborted) {
        console.log("[MARKET MAKER] Bot stopped by user request before sleep");
        break;
      }

      const sleepTimeMin = Math.round(BUY_INTERVAL_PERIOD_UNIT_SEC * 1000 * (1 + (-1) ** Math.floor(Math.random() * 10) * Math.round(30 * Math.random()) / 100));

      // sleep for the next iteration
      console.log("\n[MARKET MAKER] Sleep for the next iteration, ", sleepTimeMin, "ms");
      console.log("[MARKET MAKER] ============================================================================ \n")
      iterator--;
      if (iterator == 0) {
        console.log("[MARKET MAKER] Iterator is 0, Time is Up, break iteration");
        shouldBreak = true;
        return;
      }
      await sleep(sleepTimeMin);  // ms
      // checkMissing()
    } catch (error) {
      console.log("[MARKET MAKER] Error in one of the steps");
    }
  }

  console.log("[MARKET MAKER] ============================================================================ \n")
  console.log("[MARKET MAKER] ============================================================================ \n")
  console.log("[MARKET MAKER] Market maker iteration ended")
}

const MarketMakerForSell = async (abortSignal?: AbortSignal) => {
  console.log(`[SELL BOT] Market maker for sell is running`)
  console.log(`[SELL BOT] Pool token mint: ${baseMintPumpswap.toBase58()}`)

  console.log("\n[SELL BOT] ============================================= \n");

  console.log("\n[SELL BOT] Selling for market maker for sell...\n");
  let sellIterator = 0;
  const walletList = readJson("market_maker_data.json");
  console.log(`[SELL BOT] ${walletList.length} length of wallets list is loaded from market_maker_data.json`);
  while (true) {
    // Check if bot should stop
    if (abortSignal?.aborted) {
      console.log("[SELL BOT] Bot stopped by user request");
      break;
    }

    console.log("[SELL BOT] ---- Market maker for sell iteration ", sellIterator, " ---- \n");
    const totalWalletNum = walletList.length;
    const concurrenyNum = Math.max(1, Math.floor(totalWalletNum * (SELL_CONCURRENCY_PERCENT + (-1) ** Math.floor(Math.random() * 10) * Math.round(SELL_CONCURRENCY_DELTA_PERFECTAGE * Math.random())) / 100));
    console.log(`[SELL BOT] concurrenyNum ==> ${concurrenyNum}`);

    // Filter wallets that have tokens, then shuffle and pick concurrenyNum wallets
    console.log("[SELL BOT] Filtering wallets that have tokens");
    const walletsWithTokens = [];
    for (const wallet of walletList) {
      const kp = Keypair.fromSecretKey(base58.decode(wallet.privateKey));
      const tokenAta = getAssociatedTokenAddressSync(baseMintPumpswap, kp.publicKey);
      try {
        const tokenBalance = await solanaConnection.getTokenAccountBalance(tokenAta);
        if (tokenBalance && Number(tokenBalance.value.amount) > 0) {
          walletsWithTokens.push(wallet);
        }
        console.log("[SELL BOT] tokenBalance ==> ", tokenBalance);
      } catch (error) {
        // Token account doesn't exist or has no balance
        console.log(`[SELL BOT] Token account doesn't exist or has no balance for ${kp.publicKey.toBase58()}`);
        continue;
      }
    }
    const shuffledData = [...walletsWithTokens].sort(() => Math.random() - 0.5);
    const filteredWalletList = shuffledData.slice(0, concurrenyNum);
    console.log(`[SELL BOT] ${filteredWalletList.length} length of filtered wallets with tokens is loaded from market_maker_data.json`);

    if (filteredWalletList.length == 0) {
      console.log("[SELL BOT] No wallet to sell, break iteration")
      break;
    }

    try {
      // sell part per wallet
      console.log("[SELL BOT] Selling for market maker for sell per wallet");
      await Promise.all(filteredWalletList.map(async ({ privateKey }, n) => {
        let kp = Keypair.fromSecretKey(base58.decode(privateKey));
        let srcKp = kp
        const solBalance = await solanaConnection.getBalance(srcKp.publicKey);
        console.log(`[SELL BOT] solBalance in selling wallet for sell ${kp.publicKey.toBase58()} ==> ${solBalance / 10 ** 9} SOL`)

        const minRentAmount = await getMinimumBalanceForRentExemptMint(solanaConnection, "finalized");

        if (solBalance <= minRentAmount * 2) {
          console.log(`[SELL BOT] SOL balance is not enough in selling wallet for sell ${kp.publicKey.toBase58()}, skip this iteration`);
          return;
        }

        let sellPercent = SELL_TOKEN_PERCENT + (-1) ** Math.floor(Math.random() * 10) * Math.round(SELL_TOKEN_DELTA_PERFECTAGE * Math.random());
        console.log(`[SELL BOT] sellPercent in selling wallet for sell ${kp.publicKey.toBase58()} ==> ${sellPercent}`);

        // try selling until success
        let j = 0
        while (true) {
          if (j > 50) {
            console.log(`[SELL BOT] Error in sell transaction in selling wallet for sell ${kp.publicKey.toBase58()}`);
            return
          }
          const result = await sellMarketMaker(baseMintPumpswap, srcKp, sellPercent);
          if (result) {
            break
          } else {
            j++
            await sleep(2000)
          }
        }

        // await sleep(BUY_WAIT_INTERVAL * 1000);
      }));

      // Check for abort signal before sleep
      if (abortSignal?.aborted) {
        console.log("[SELL BOT] Bot stopped by user request before sleep");
        break;
      }

      // sleep for the next iteration
      const sleepTimeMin = Math.round(SELL_ITERATION_SLEEP_TIME_MIN * (1 + (-1) ** Math.floor(Math.random() * 10) * Math.round(SELL_ITERATION_SLEEP_TIME_DELTA_PERFECTAGE * Math.random()) / 100) * 60 * 1000);
      console.log("\n[SELL BOT] Sleep for the next iteration, ", sleepTimeMin, "ms");
      console.log("[SELL BOT] ============================================================================ \n")
      await sleep(sleepTimeMin);  // ms
      sellIterator++;
      // checkMissing()
    } catch (error) {
      console.log("[SELL BOT] Error in one of the steps");
    }
  }

  console.log("[SELL BOT] ============================================================================ \n")
  console.log("[SELL BOT] ============================================================================ \n")
  console.log("[SELL BOT] ============================================================================ \n")
  console.log("[SELL BOT] Market maker iteration ended")
}

const distributeSolForMarketMaker = async (connection: Connection, mainKp: Keypair, distritbutionNum: number, txFeeLamports: number) => {
  console.log("[MARKET MAKER] === Begin Distributing SOL for market maker ===")
  await sleep(3000);
  const data: Data[] = [];
  const wallets = []
  try {
    const sendSolTx: TransactionInstruction[] = []
    sendSolTx.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 * FEE_LEVEL }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 12_000 * FEE_LEVEL })
    );
    // const rentExemptAmount = await getMinimumBalanceForRentExemptAccount(connection, "confirmed");
    // console.log("[MARKET MAKER] rentExemptAmount ==> ", rentExemptAmount)

    const mainSolBal = await connection.getBalance(mainKp.publicKey);
    const requiredSolAmount = config.SOL_AMOUNT_TO_DISTRIBUTE_FOR_MARKETMAKER * 10 ** 9 + txFeeLamports * distritbutionNum;
    let minInitialAmountLamports = await setBuyAmount(1);
    console.log("[MARKET MAKER] minInitialAmountLamports ==> ", minInitialAmountLamports);

    if (requiredSolAmount + txFeeLamports > mainSolBal) {
      console.log("[MARKET MAKER] Your main wallet balance is not enough. You should input at least ", requiredSolAmount + txFeeLamports / 10 ** 9, "SOL but you only input", mainSolBal / 10 ** 9, "SOL.");
      return []
    } else if (requiredSolAmount <= (txFeeLamports + minInitialAmountLamports) * distritbutionNum) {
      console.log("[MARKET MAKER - Warning] To reach bonding curve. You can input at least ", (txFeeLamports + minInitialAmountLamports) * distritbutionNum / 10 ** 9 - requiredSolAmount / 10 ** 9, "more SOL later.");
    } else {
      console.log("[MARKET MAKER] Main wallet balance is enough. ", mainSolBal)
    }

    let distrubutedSolAmount = 0;

    for (let i = 0; i < distritbutionNum; i++) {
      const wallet = Keypair.generate()
      let lamports = i == distritbutionNum - 1
        ? requiredSolAmount - distrubutedSolAmount - txFeeLamports
        : requiredSolAmount / distritbutionNum + (-1) ** Math.floor(Math.random() * 10) * Math.round(DISTRIBUTE_DELTA_PERFECTAGE * Math.random()) * 10 ** 9;

      if (lamports <= txFeeLamports) {
        console.log("[MARKET MAKER] Lamports is not enough")
        return []
      }

      console.log("[MARKET MAKER] lamports ==> ", lamports)

      distrubutedSolAmount += lamports;

      wallets.push({ kp: wallet, buyAmount: lamports })
      sendSolTx.push(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wallet.publicKey,
          lamports
        })
      )
    }

    wallets.map((wallet) => {
      data.push({
        privateKey: base58.encode(wallet.kp.secretKey),
        pubkey: wallet.kp.publicKey.toBase58()
      })
    })

    try {
      saveDataToFile(data, "market_maker_data.json")
    } catch (error) {
      console.log("[MARKET MAKER] DistributeSol tx error")
    }
    try {
      const siTx = new Transaction().add(...sendSolTx)
      const latestBlockhash = await solanaConnection.getLatestBlockhash()
      siTx.feePayer = mainKp.publicKey
      siTx.recentBlockhash = latestBlockhash.blockhash

      const messageV0 = new TransactionMessage({
        payerKey: mainKp.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: sendSolTx,
      }).compileToV0Message()
      const transaction = new VersionedTransaction(messageV0)
      transaction.sign([mainKp])

      const simulateResult = await connection.simulateTransaction(transaction)
      if (simulateResult.value.err) {
        console.log("[MARKET MAKER] Simulation failed")
        console.log("Error : ", simulateResult)
        return null
      }

      let txSig
      if (JITO_MODE) {
        txSig = await executeJitoTx([transaction], mainKp, jitoCommitment)
      } else {
        txSig = await execute(transaction, latestBlockhash, 1, false)
      }
      if (txSig) {
        const distibuteTx = txSig ? `https://solscan.io/tx/${txSig}` : '';
        console.log("[MARKET MAKER] SOL distributed ", distibuteTx);
        console.log("[MARKET MAKER] Success in distribution")
        return wallets
      }
      console.log("[MARKET MAKER] Failed to distribute SOL")
      return null
    } catch (error) {
      console.log("[MARKET MAKER] Distribution error")
      console.log(error)
      return null
    }
  } catch (error) {
    console.log(error)
    console.log(`[MARKET MAKER] Failed to transfer SOL`)
    return null
  }
}

const readJsonAndConvertData = async (isVolumeBot: boolean) => {
  const data: Data[] = readJson(isVolumeBot ? "data.json" : "market_maker_data.json");
  const wallets = [];
  try {

    for (let i = 0; i < data.length; i++) {
      const wallet = Keypair.fromSecretKey(base58.decode(data[i].privateKey));
      const solBalance = await solanaConnection.getBalance(wallet.publicKey);
      let lamports = Math.floor(solBalance * (1 - (Math.random() * 0.2)));

      wallets.push({ kp: wallet, buyAmount: lamports })
    }

    console.log(isVolumeBot ? "[VOLUME BOT]" : "[MARKET MAKER]", ": Success fetching data from ", isVolumeBot ? "data.json" : "market_maker_data.json", data.length, "wallets")
    return wallets
  } catch (error) {
    console.log(isVolumeBot ? "[VOLUME BOT]" : "[MARKET MAKER]", ": Failed to fetch data from ", isVolumeBot ? "data.json" : "market_maker_data.json")
    return null
  }
}
// End Market Maker.

// Export functions for CLI usage
export { VolumeBot, MarketMakerForBuy, MarketMakerForSell };

// Export distribution functions
export { distributeSol, distributeSolForMarketMaker };

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  VolumeBot();
  // MarketMakerForBuy();
  // MarketMakerForSell();
}

import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddress, getAssociatedTokenAddressSync, getMint, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import PumpfunIDL from '../contract/pumpfun-idl.json'
import { Pump } from '../contract/pumpfun-types'
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { BondingCurveAccount } from "./bondingCurveAccount";
import { PumpAmm } from "../contract/pumpswap-types";
import PumpswapIDL from '../contract/pumpswap-idl.json'
import { Metaplex } from "@metaplex-foundation/js";

// Lazy initialization to avoid config errors on import
let _solanaConnection: Connection | null = null;
let _PumpfunProgram: Program<Pump> | null = null;
let _PumpswapProgram: Program<PumpAmm> | null = null;
let _pool: PublicKey | null = null;
let _poolPumpswap: PublicKey | null = null;
let _constants: any = null;

function getConstants() {
  if (!_constants) {
    _constants = require("../constants");
  }
  return _constants;
}

function getSolanaConnection() {
  if (!_solanaConnection) {
    const { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } = getConstants();
    _solanaConnection = new Connection(RPC_ENDPOINT, {
      wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
    });
  }
  return _solanaConnection;
}

function getPumpfunProgram() {
  if (!_PumpfunProgram) {
    const solanaConnection = getSolanaConnection();
    const provider = new AnchorProvider(solanaConnection, new NodeWallet(Keypair.generate()));
    _PumpfunProgram = new Program<Pump>(PumpfunIDL as Pump, provider);
  }
  return _PumpfunProgram;
}

function getPumpswapProgram() {
  if (!_PumpswapProgram) {
    const solanaConnection = getSolanaConnection();
    const provider = new AnchorProvider(solanaConnection, new NodeWallet(Keypair.generate()));
    _PumpswapProgram = new Program<PumpAmm>(PumpswapIDL as PumpAmm, provider);
  }
  return _PumpswapProgram;
}

function getPool() {
  if (!_pool) {
    const { POOL_ID } = getConstants();
    _pool = new PublicKey(POOL_ID);
    console.log("pool ==> ", _pool);
  }
  return _pool;
}

function getPoolPumpswap() {
  if (!_poolPumpswap) {
    const { POOL_ID_PUMPSWAP } = getConstants();
    _poolPumpswap = new PublicKey(POOL_ID_PUMPSWAP);
  }
  return _poolPumpswap;
}

// Export for backward compatibility
export const PumpfunProgram = new Proxy({} as Program<Pump>, {
  get: (target, prop) => getPumpfunProgram()[prop as keyof Program<Pump>]
});
export const PumpswapProgram = new Proxy({} as Program<PumpAmm>, {
  get: (target, prop) => getPumpswapProgram()[prop as keyof Program<PumpAmm>]
});

export const makeBuyPumpfunTokenTx = async (mainKp: Keypair, mint: PublicKey, amount: number) => {
  try {
    const solanaConnection = getSolanaConnection();
    const { TOKEN_MINT, FEE_RECIPIENT } = getConstants();
    const PumpfunProgramInstance = getPumpfunProgram();
    
    const bondingCurveAccount = await getBondingCurveAccount(solanaConnection, new PublicKey(TOKEN_MINT));
    if (!bondingCurveAccount)
      return
    const buyAmount = bondingCurveAccount.getBuyPrice(BigInt(amount)) / BigInt(2);
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey)
    const buyIx = await PumpfunProgramInstance.methods
      .buy(new BN(buyAmount.toString()), new BN(amount), { "0": true })
      .accounts({
        associatedUser,
        feeRecipient: FEE_RECIPIENT,
        mint,
        user: mainKp.publicKey
      })
      .instruction()

    const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

    const msg = new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
        createAssociatedTokenAccountIdempotentInstruction(mainKp.publicKey, associatedUser, mainKp.publicKey, mint),
        buyIx
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()

    const buyVTx = new VersionedTransaction(msg)
    buyVTx.sign([mainKp])

    // console.log(await solanaConnection.simulateTransaction(buyVTx, { sigVerify: true }))
    return buyVTx
  } catch (error) {
    console.log("Error while making buy transaction in pumpfun", error);
    return null
  }
}

export const makeSellPumpfunTokenTx = async (mainKp: Keypair, mint: PublicKey) => {
  try {
    const solanaConnection = getSolanaConnection();
    const { FEE_RECIPIENT } = getConstants();
    const PumpfunProgramInstance = getPumpfunProgram();
    
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey)
    const balance = await solanaConnection.getTokenAccountBalance(associatedUser)

    const buyIx = await PumpfunProgramInstance.methods
      .sell(new BN(balance.value.amount), new BN(0))
      .accounts({
        associatedUser,
        feeRecipient: FEE_RECIPIENT,
        mint,
        user: mainKp.publicKey
      })
      .instruction()

    const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

    const msg = new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        createAssociatedTokenAccountIdempotentInstruction(mainKp.publicKey, associatedUser, mainKp.publicKey, mint),
        buyIx
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()

    const buyVTx = new VersionedTransaction(msg)
    buyVTx.sign([mainKp])

    const simulateResult = await solanaConnection.simulateTransaction(buyVTx, { sigVerify: true })
    if (simulateResult.value.err) {
      console.log("Simulation failed")
      console.log("Error : ", simulateResult)
      return null
    }
    return buyVTx
  } catch (error) {
    console.log("Error while making buy transaction in pumpfun")
    return null
  }
}

export const makeSellPumpswapTokenTxMarketMaker = async (mainKp: Keypair, mint: PublicKey, sellPercent: number) => {
  try {
    const solanaConnection = getSolanaConnection();
    const { GLOBAL_CONFIG } = getConstants();
    const PumpswapProgramInstance = getPumpswapProgram();
    const poolPumpswap = getPoolPumpswap();
    
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey);
    const associatedUserSol = getAssociatedTokenAddressSync(NATIVE_MINT, mainKp.publicKey);
    const balance = await solanaConnection.getTokenAccountBalance(associatedUser);

    const keypair = mainKp;
    const userQuoteTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, keypair.publicKey);
    const userBaseTokenAccount = await getAssociatedTokenAddress(mint, keypair.publicKey);

    const PROTOCOL_FEE_RECIPIENT = new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV")

    const sellIx = await PumpswapProgramInstance.methods
      .sell(new BN(Math.round(Number(balance.value.amount) * (sellPercent / 100))), new BN(0))
      .accounts({
        user: mainKp.publicKey,
        userBaseTokenAccount,
        userQuoteTokenAccount,
        baseTokenProgram: TOKEN_PROGRAM_ID,
        quoteTokenProgram: TOKEN_PROGRAM_ID,
        globalConfig: GLOBAL_CONFIG,
        pool: poolPumpswap,
        protocolFeeRecipient: PROTOCOL_FEE_RECIPIENT,
      })
      .instruction()

    const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

    const msg = new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1000_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000_000 }),
        createAssociatedTokenAccountIdempotentInstruction(mainKp.publicKey, associatedUserSol, mainKp.publicKey, NATIVE_MINT),
        sellIx
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()

    const buyVTx = new VersionedTransaction(msg)
    buyVTx.sign([mainKp])

    return buyVTx
  } catch (error) {
    console.log("Error while making buy transaction in pumpfun")
    return null
  }
}

export const makeMigrateTx = async (mainKp: Keypair, mint: PublicKey) => {
  try {
    const solanaConnection = getSolanaConnection();
    const PumpfunProgramInstance = getPumpfunProgram();
    
    const migrateIx = await PumpfunProgramInstance.methods
      .migrate()
      .accounts({
        mint,
        program: TOKEN_PROGRAM_ID,
        user: mainKp.publicKey
      })
      .instruction()

    const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

    const msg = new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        migrateIx
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()

    const migrateTx = new VersionedTransaction(msg)
    migrateTx.sign([mainKp])

    // console.log(await solanaConnection.simulateTransaction(migrateTx, { sigVerify: true }))
    return migrateTx
  } catch (error) {
    console.log("Error while making migration transaction in pumpfun")
    return null
  }
}

const getBondingCurveAccount = async (
  connection: Connection,
  mint: PublicKey
) => {
  const PumpfunProgramInstance = getPumpfunProgram();
  
  const pool = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PumpfunProgramInstance.programId
  )[0]
  const tokenAccount = await connection.getAccountInfo(
    pool,
    "confirmed"
  );
  if (!tokenAccount) {
    return null;
  }
  return BondingCurveAccount.fromBuffer(tokenAccount!.data);
}

const getBondingCurveBalance = async (dexId: string) => {
  const solanaConnection = getSolanaConnection();
  const { TOKEN_MINT, TOKEN_MINT_PUMPSWAP } = getConstants();
  
  const bondingCurveAccount = await getBondingCurveAccount(solanaConnection, new PublicKey(dexId == "pumpfun" ? TOKEN_MINT : TOKEN_MINT_PUMPSWAP));
  if (!bondingCurveAccount)
    return null
  const balance = bondingCurveAccount.virtualSolReserves;
  return balance;
}

export const setBuyAmount = async (divideAmount: number) => { //
  console.log("setBuyAmount function called ==> ", divideAmount)
  const { BONDING_CURVE_THRESHOLD_SOL, DISTRIBUTE_WALLET_NUM_MARKETMAKER } = getConstants();
  
  const bondingCurveBalance = await getBondingCurveBalance("pumpfun");
  if (!bondingCurveBalance)
    return 0;
  const buyAmount = (BigInt(BONDING_CURVE_THRESHOLD_SOL * 10 ** 9) - bondingCurveBalance) / BigInt(divideAmount * DISTRIBUTE_WALLET_NUM_MARKETMAKER);
  return Number(buyAmount); // lamports
}

export const bondingCurveStatics = async (dexId: string) => {
  const solanaConnection = getSolanaConnection();
  const { TOKEN_MINT, TOKEN_MINT_PUMPSWAP } = getConstants();
  
  const bondingCurveAccount = await getBondingCurveAccount(solanaConnection, new PublicKey(dexId == "pumpfun" ? TOKEN_MINT : TOKEN_MINT_PUMPSWAP));
  if (!bondingCurveAccount)
    return null
  return bondingCurveAccount;
}

export const getBondingCurvePDA = async (mint: PublicKey) => {
  const { BONDING_CURVE_SEED } = getConstants();
  const PumpfunProgramInstance = getPumpfunProgram();
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
    PumpfunProgramInstance.programId
  )[0];
}

export const getTokenMint = async (mint: PublicKey) => {
  const solanaConnection = getSolanaConnection();
  const tokenMintAccount = await getMint(solanaConnection, mint);
  return tokenMintAccount;
}

export const getTokenSymbol = async (mintAddress: PublicKey) => {
  const solanaConnection = getSolanaConnection();
  const metaplex = new Metaplex(solanaConnection);
  try {
    const nft = await metaplex.nfts().findByMint({ mintAddress });
    return nft.creators[0].address.toBase58() || '';
  } catch (error) {
    console.error(':x: Error fetching token symbol:', error);
    return '';
  }
}
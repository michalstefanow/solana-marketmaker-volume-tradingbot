import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddress, getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import PumpfunIDL from '../contract/pumpfun-idl.json'
import { Pump } from '../contract/pumpfun-types'
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { FEE_RECIPIENT, TOKEN_MINT, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, BONDING_CURVE_THRESHOLD_SOL, DISTRIBUTE_WALLET_NUM_MARKETMAKER, POOL_ID_PUMPSWAP, GLOBAL_CONFIG, POOL_ID, TOKEN_MINT_PUMPSWAP } from "../constants";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { BondingCurveAccount } from "./bondingCurveAccount";
import { PumpAmm } from "../contract/pumpswap-types";
import PumpswapIDL from '../contract/pumpswap-idl.json'

const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
})
const provider = new AnchorProvider(solanaConnection, new NodeWallet(Keypair.generate()))
export const PumpfunProgram = new Program<Pump>(PumpfunIDL as Pump, provider);
export const PumpswapProgram = new Program<PumpAmm>(PumpswapIDL as PumpAmm, provider);

const pool = new PublicKey(POOL_ID);
const poolPumpswap = new PublicKey(POOL_ID_PUMPSWAP);
console.log("pool ==> ", pool);

export const makeBuyPumpfunTokenTx = async (mainKp: Keypair, mint: PublicKey, amount: number) => {
  try {
    const bondingCurveAccount = await getBondingCurveAccount(solanaConnection, new PublicKey(TOKEN_MINT));
    if (!bondingCurveAccount)
      return
    const buyAmount = bondingCurveAccount.getBuyPrice(BigInt(amount)) / BigInt(2);
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey)
    const buyIx = await PumpfunProgram.methods
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
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey)
    const balance = await solanaConnection.getTokenAccountBalance(associatedUser)

    const buyIx = await PumpfunProgram.methods
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

    console.log(await solanaConnection.simulateTransaction(buyVTx, { sigVerify: true }))
    return buyVTx
  } catch (error) {
    console.log("Error while making buy transaction in pumpfun")
    return null
  }
}

export const makeSellPumpswapTokenTxMarketMaker = async (mainKp: Keypair, mint: PublicKey, sellPercent: number) => {
  try {
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey);
    const associatedUserSol = getAssociatedTokenAddressSync(NATIVE_MINT, mainKp.publicKey);
    const balance = await solanaConnection.getTokenAccountBalance(associatedUser);

    const keypair = mainKp;
    const userQuoteTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, keypair.publicKey);
    const userBaseTokenAccount = await getAssociatedTokenAddress(mint, keypair.publicKey);

    const PROTOCOL_FEE_RECIPIENT = new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV")

    const sellIx = await PumpswapProgram.methods
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
    const migrateIx = await PumpfunProgram.methods
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
  const pool = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PumpfunProgram.programId
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
  const bondingCurveAccount = await getBondingCurveAccount(solanaConnection, new PublicKey(dexId == "pumpfun" ? TOKEN_MINT : TOKEN_MINT_PUMPSWAP));
  if (!bondingCurveAccount)
    return null
  const balance = bondingCurveAccount.virtualSolReserves;
  return balance;
}

export const setBuyAmount = async (divideAmount: number) => { //
  console.log("setBuyAmount function called ==> ", divideAmount)
  const bondingCurveBalance = await getBondingCurveBalance("pumpfun");
  if (!bondingCurveBalance)
    return 0;
  const buyAmount = (BigInt(BONDING_CURVE_THRESHOLD_SOL * 10 ** 9) - bondingCurveBalance) / BigInt(divideAmount * DISTRIBUTE_WALLET_NUM_MARKETMAKER);
  return Number(buyAmount); // lamports
}
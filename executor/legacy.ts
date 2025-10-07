import { Connection, VersionedTransaction } from "@solana/web3.js";

interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export const execute = async (transaction: VersionedTransaction, latestBlockhash: Blockhash, isBuy: boolean | 1 = true, isVolumeBot: boolean = true) => {
  // Import constants inside function to avoid initialization errors
  const { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } = require("../constants");
  
  const solanaConnection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  })

  const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), { skipPreflight: true })
  console.log(isVolumeBot ? "🚀 ~ execute ~ signature (Volume Bot):" : "🚀 ~ execute ~ signature (Market Maker):", signature)
  const confirmation = await solanaConnection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    }
  );

  if (confirmation.value.err) {
    console.log(isVolumeBot ? "Confirmtaion error (Volume Bot):" : "Confirmtaion error (Market Maker):", confirmation.value.err);
    return ""
  } else {
    if(isBuy === 1){
      return signature
    } else if (isBuy)
      console.log(`Success in buy transaction: https://solscan.io/tx/${signature}`)
    else
      console.log(`Success in Sell transaction: https://solscan.io/tx/${signature}`)
  }
  return signature
}

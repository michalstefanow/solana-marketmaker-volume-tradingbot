import { Keypair, PublicKey } from "@solana/web3.js";
import { getTokenMint, getTokenSymbol, PumpswapProgram } from "./pumpfun";
import { BN } from "bn.js";
import { NATIVE_MINT } from "@solana/spl-token";

export const getPumpswapPoolId = async (mint: PublicKey) => {
    const creatorAddress = await getTokenSymbol(mint);
    const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), new BN(0).toArrayLike(Buffer, "le", 2), new PublicKey(creatorAddress).toBuffer(), mint.toBuffer(), NATIVE_MINT.toBuffer()],
        PumpswapProgram.programId
    );
    console.log("getPumpswapPoolId pool address ==> ", pool);
    return pool.toBase58();
}
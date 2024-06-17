import {getKeypairFromFile} from '@solana-developers/helpers'
import {Connection, Keypair, LAMPORTS_PER_SOL} from "@solana/web3.js";
import {config} from 'dotenv'
import {join} from 'path';
import {GeneratedAccount} from "./generate-accounts";

import generated from './generated.json'
import {ProfileService} from "./profile.service";

config()

// SOLANA_RPC_ENDPOINT

async function main() {
    const endpoint = process.env['SOLANA_RPC_ENDPOINT']
    if (!endpoint) {
        console.log('Set SOLANA_RPC_ENDPOINT env var')
        process.exit(1)
    }

    const connection = new Connection(endpoint, 'confirmed')
    const feePayer = await getKeypairFromFile(join(process.cwd(),'keypairs/fee-payer.json'))

    console.log(`endpoint:`, endpoint)
    console.log(`feePayer:`, feePayer.publicKey.toString())
    const balance = await connection.getBalance(feePayer.publicKey).then(res => res / LAMPORTS_PER_SOL)
    console.log(`balance :`, balance, 'SOL')
    const accounts: GeneratedAccount[] = generated
    console.log('accounts:', accounts.length, 'generated accounts')

    const service = new ProfileService({ connection, feePayer })

    for (const account of accounts) {
        const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(account.secretKey)))
        if (keypair.publicKey.toString() !== account.publicKey) {
            throw new Error(`Keypair mismatch for ${account.username}`)
        }
        try {
            console.log(`Username : ${account.username}`)
            const tx = await service.createUserProfile(account)
            console.log(`Signing  : ${keypair.publicKey}`)
            tx.sign([keypair])

            console.log(`Confirming...`)
            await service.signAndConfirmTransaction(tx)
            console.log(`Done!`)

        } catch (e) {
            console.log(`Error: ${e}`)
        }

    }
}

main()
    .catch(err => {
        console.log(`An error occurred: ${err}`)
        process.exit(1)
    })

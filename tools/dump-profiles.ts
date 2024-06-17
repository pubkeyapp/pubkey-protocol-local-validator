import {getKeypairFromFile} from '@solana-developers/helpers'
import {Connection} from "@solana/web3.js";
import {config} from 'dotenv'
import {join} from 'path';
import {ProfileService} from "./profile.service";

config()


async function main() {
    const endpoint = process.env['SOLANA_RPC_ENDPOINT']
    if (!endpoint) {
        console.log('Set SOLANA_RPC_ENDPOINT env var')
        process.exit(1)
    }

    const connection = new Connection(endpoint, 'confirmed')
    const feePayer = await getKeypairFromFile(join(process.cwd(),'keypairs/fee-payer.json'))

    console.log(`# endpoint:`, endpoint)
    console.log(`# feePayer:`, feePayer.publicKey.toString())

    const service = new ProfileService({ connection, feePayer })

    const profiles = await service.getUserProfiles()
    console.log('# profiles:', profiles.length)
    for (const profile of profiles) {
        console.log(`solana account --url localhost ${profile.publicKey} --output json  > ./accounts/profile-${profile.username}.json`)
    }
}


main()
    .catch(err => {
        console.log(`An error occurred: ${err}`)
        process.exit(1)
    })

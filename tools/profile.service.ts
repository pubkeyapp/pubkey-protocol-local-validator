import {AnchorProvider} from '@coral-xyz/anchor'
import {PUBKEY_PROFILE_PROGRAM_ID, PubKeyIdentityProvider, PubKeyProfile} from '@pubkey-program-library/anchor'
import {AnchorKeypairWallet, PubKeyProfileSdk} from '@pubkey-program-library/sdk'
import {
  BlockhashWithExpiryBlockHeight,
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction
} from '@solana/web3.js'
import {LRUCache} from "lru-cache";
import {GeneratedAccount} from "./generate-accounts";


export interface ProfileServiceConfig {
  connection: Connection
  feePayer: Keypair
}

export class ProfileService {
  private readonly cacheLatestBlockhash = new LRUCache<string, BlockhashWithExpiryBlockHeight>({
    max: 1000,
    ttl: 30_000,
    fetchMethod: async (commitment = 'confirmed') => {
      console.log(`Caching latest blockhash`)
      return this.config.connection.getLatestBlockhash(commitment as Commitment)
    },
  })

  private readonly sdk: PubKeyProfileSdk
  private readonly feePayer: Keypair
  private readonly validProviders: PubKeyIdentityProvider[] = [
    // Add more providers here once the protocol supports them
    PubKeyIdentityProvider.Discord,
    PubKeyIdentityProvider.Github,
    PubKeyIdentityProvider.Google,
    PubKeyIdentityProvider.Solana,
    PubKeyIdentityProvider.Twitter,
  ]

  constructor(private readonly config: ProfileServiceConfig) {
    this.feePayer = this.config.feePayer
    this.sdk = new PubKeyProfileSdk({
      connection: this.config.connection,
      provider: this.getAnchorProvider(),
      programId: PUBKEY_PROFILE_PROGRAM_ID,
    })
  }

  async createUserProfile(user: GeneratedAccount) {
    const authority = ensureAuthority(user.publicKey)

    return await this.sdk.createProfile({
      username: user.username,
      avatarUrl: user.avatarUrl ?? '',
      feePayer: this.feePayer.publicKey,
      authority,
    })
  }



  getProviders() {
    return this.validProviders
  }

  async getUserProfileByUsername(username: string): Promise<PubKeyProfile | null> {
    this.ensureValidUsername(username)

    try {
      return await this.sdk.getProfileByUsernameNullable({ username })
    } catch (e) {
      throw new Error(`User profile not found for username ${username}`)
    }
  }

  async getUserProfileByProvider(provider: PubKeyIdentityProvider, providerId: string): Promise<PubKeyProfile | null> {
    try {
      this.ensureValidProvider(provider)
    } catch (e) {
      throw new Error(`Invalid provider, must be one of ${this.validProviders.join(', ')}`)
    }

    try {
      this.ensureValidProviderId(provider, providerId)
    } catch (e) {
      throw new Error(`Invalid provider ID for provider ${provider}`)
    }
    try {
      return await this.sdk.getProfileByProviderNullable({ provider, providerId })
    } catch (e) {
      throw new Error(`User profile not found for provider ${provider} and providerId ${providerId}`)
    }
  }

  async getUserProfiles(): Promise<PubKeyProfile[]> {
    return this.sdk.getProfiles().then((res) => res.sort((a, b) => a.username.localeCompare(b.username)))
  }

  async signAndConfirmTransaction(transaction: VersionedTransaction, commitment: Commitment = 'confirmed') {
    console.log(' - signAndConfirmTransaction sign with fee payer ')
    transaction.sign([this.config.feePayer])

    const bh = await this.cacheLatestBlockhash.fetch(commitment)
    if (!bh) {
      throw new Error(`Error fetching latest blockhash`)
    }
    const { blockhash, lastValidBlockHeight } = bh
    return this.sendAndConfirmTransaction({
      transaction,
      blockhash,
      lastValidBlockHeight,
      commitment,
    })
  }

  async sendAndConfirmTransaction({
                                    transaction,
                                    blockhash,
                                    lastValidBlockHeight,
      commitment = 'confirmed'
                                  }: {
    transaction: VersionedTransaction
    blockhash: string
    lastValidBlockHeight: number
    commitment: Commitment
  }): Promise<string> {
    const signature = await this.config.connection.sendTransaction(transaction, { skipPreflight: true })
    console.log(`Signature: ${this.getExplorerUrl(`tx/${signature}`)}`)
    await this.config.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitment)
    console.log(`Confirmed: ${signature}`)
    return signature
  }

  private getExplorerUrl(path: string) {
    const endpoint = this.config.connection.rpcEndpoint;
    const cluster = endpoint.includes('devnet') ? `?cluster=devnet` : endpoint.includes('localhost') ? `?cluster=custom` : ''

    return `https://explorer.solana.com/${path}${cluster}`
  }

  private async ensureUserProfile(username: string) {
    const profile = await this.sdk.getProfileByUsernameNullable({ username })
    if (!profile) {
      throw new Error('User profile not found')
    }

    return { username, profile }
  }

  private ensureValidProvider(provider: PubKeyIdentityProvider) {
    if (!this.validProviders.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }
  }

  private ensureValidProviderId(provider: PubKeyIdentityProvider, providerId: string) {
    if (provider === PubKeyIdentityProvider.Solana && !isSolanaPublicKey(providerId)) {
      throw new Error(`Invalid provider ID for ${provider}.`)
    }
    if (provider !== PubKeyIdentityProvider.Solana && !isNumericString(providerId)) {
      throw new Error(`Invalid provider ID for ${provider}.`)
    }
  }

  private ensureValidUsername(username: string) {
    if (!isValidUsername(username)) {
      throw new Error(`Invalid username: ${username}`)
    }
  }


  private getAnchorProvider() {
    return new AnchorProvider(this.config.connection, new AnchorKeypairWallet(this.config.feePayer), AnchorProvider.defaultOptions())
  }
}

function isNumericString(str: string): boolean {
  return /^\d+$/.test(str)
}

function isSolanaPublicKey(str: string): boolean {
  return !!parseSolanaPublicKey(str)
}
function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 20) {
    return false
  }

  if (!username.split('').every((c) => /^[a-z0-9_]$/.test(c))) {
    return false
  }

  return true
}
function parseSolanaPublicKey(publicKey: string): PublicKey | null {
  try {
    return new PublicKey(publicKey)
  } catch (e) {
    return null
  }
}

function ensureAuthority(publicKey: string) {
  const authority = parseSolanaPublicKey(publicKey)
  if (!authority) {
    throw new Error('Invalid Solana public key')
  }

  return authority
}


function diffProfileIdentities(
  userIdentities: Array<{ provider: string; providerId: string }>,
  profileIdentities: Array<{ provider: string; providerId: string }>,
): Array<{ provider: string; providerId: string }> {
  return userIdentities.filter(
    (i) => !profileIdentities.some((p) => p.provider === i.provider && p.providerId === i.providerId),
  )
}


import {faker} from '@faker-js/faker';
import {Keypair} from '@solana/web3.js';

const amount = 1000;

export interface GeneratedAccount {
    username: string
    name: string
    avatarUrl: string
    publicKey: string
    secretKey: string
}


function generateAccounts(amount: number): GeneratedAccount[] {
    const accounts = []
    for (let i = 0; i < amount; i++) {
        accounts.push(generateAccount(i))
    }
    return accounts
}

function generateAccount(index: number, offset = 1000): GeneratedAccount {
    const seed = offset + index
    faker.seed(seed);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const keypair = Keypair.generate()

    return {
        username: faker.internet.userName({ firstName, lastName }).toLowerCase().replace('.', '_').replace('-', '_').substring(0, 19),
        name: `${firstName} ${lastName}`,
        avatarUrl: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}`,
        publicKey: keypair.publicKey.toString(),
        secretKey: `[${Array.from(keypair.secretKey).join(',')}]`
    };
}

const accounts: GeneratedAccount[] = generateAccounts(amount);

console.log(JSON.stringify(accounts, null, 2))
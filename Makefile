# Dump the accounts with the program while running the localnet validator
dump-program:
	solana program dump --url localhost PPLxwat1miBwyQHq5afxLzdXyAMG4jPp6981yQA5hyb ./program/pubkey_profile.so

# Utility to get the fee payer address
fee-payer-address:
	solana address -k ./keypairs/fee-payer.json

# Utility to get the fee payer balance
fee-payer-balance:
	solana balance -k ./keypairs/fee-payer.json --config ./config.yml

# Run the local validator
run-validator:
	solana-test-validator \
	    --account-dir ./accounts \
	    --config ./config.yml \
	    --ledger ./test-ledger \
	    --bpf-program PPLxwat1miBwyQHq5afxLzdXyAMG4jPp6981yQA5hyb ./program/pubkey_profile.so \
	    --reset

# Create profiles in tools/generated.json
create-profiles:
	ts-node ./tools/create-profiles.ts


# Generate Accounts
generate-accounts:
	ts-node ./tools/generate-accounts.ts > tools/generated.json

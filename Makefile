# Dump the accounts with the program while running the localnet validator
dump-accounts:
	solana account --url localhost PPLxwat1miBwyQHq5afxLzdXyAMG4jPp6981yQA5hyb --output json  > ./accounts/PPLxwat1miBwyQHq5afxLzdXyAMG4jPp6981yQA5hyb.json
	solana account --url localhost GhLoYioKnbZ1T2DGXtNwu6ZzBFe11LfHDYV6scs8Tkry --output json  > ./accounts/GhLoYioKnbZ1T2DGXtNwu6ZzBFe11LfHDYV6scs8Tkry.json

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
	    --reset

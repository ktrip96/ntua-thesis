# NFT Barter Marketplace on Sui

Diploma thesis, School of Electrical and Computer Engineering, National Technical University of Athens.

## Running locally

Everything runs against a local Sui network. Nothing is deployed on a public network.

### 1. Prerequisites

- Sui CLI 1.67 or newer
- Node.js 22 or newer

On macOS or Linux with Homebrew:

```bash
brew install sui node
```

### 2. Clone

```bash
git clone git@github.com:ktrip96/ntua-thesis.git
cd ntua-thesis
```

### 3. Start the local network

In a terminal that stays open:

```bash
sui start --force-regenesis --with-faucet
```

### 4. Configure the CLI, fund the account, publish the package

In a second terminal, from the repository root:

```bash
sui client -y envs              # creates the CLI config without prompts
sui client switch --env local   # the first run leaves testnet active
sui client faucet
bash scripts/deploy.sh          # publishes and writes the package ID to app/.env
```

`scripts/deploy.sh` re-pins the localnet chain ID in `Move.toml` on every run, so a fresh `--force-regenesis` is not a problem.

### 5. Start the frontend

```bash
cd app
npm ci
npm run seed    # two demo accounts with six NFTs each, so there is something to bid on
npm run dev
```

### 6. Use the app

Open http://localhost:5173. No wallet extension is needed: in development mode the connect dialog offers a **Burner Wallet**. Press **Faucet** in the header to get test SUI, mint NFTs on the **Mint** page, then place bids on the seeded NFTs from the **Marketplace**. Open a second burner wallet to accept a bid from the other side.

`scripts/dev.sh` runs steps 3 to 5 in a single terminal, but still needs the CLI configuration from step 4 and does not seed.

## Checks

```bash
sui move test                   # Move unit tests
cd app && npm run verify:contract   # end-to-end scenarios against the running localnet
cd app && npm run gas           # gas measurements used in the thesis
```

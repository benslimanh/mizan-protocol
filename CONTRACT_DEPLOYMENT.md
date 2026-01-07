# Soroban Contract Deployment Guide for Mizan

This guide explains how to deploy the Murabaha smart contract to Stellar's Futurenet and integrate it with your Mizan React application.

## Prerequisites

- Install Rust (https://www.rust-lang.org/tools/install)
- Add the WebAssembly target:
  ```
  rustup target add wasm32-unknown-unknown
  ```

## 1. Install the Soroban CLI

```bash
cargo install --locked soroban-cli
```

## 2. Configure the Futurenet Network

```bash
soroban config network add --global futurenet \
  --rpc-url https://rpc-futurenet.stellar.org:443 \
  --network-passphrase "Test SDF Future Network ; October 2022"
```

## 3. Create a Deployment Account

```bash
soroban config identity generate --global deployer
```

This command will output a public key. Save it, as you'll need it for funding and deployment.

## 4. Fund Your Account Using Friendbot

```bash
curl "https://friendbot-futurenet.stellar.org/?addr=$(soroban config identity address deployer)"
```

## 5. Build the Contract

Navigate to the contract directory:

```bash
cd murabaha_contract
cargo build --target wasm32-unknown-unknown --release
```

This will create a WebAssembly file at `target/wasm32-unknown-unknown/release/murabaha_contract.wasm`.

## 6. Deploy the Contract

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/murabaha_contract.wasm \
  --source deployer \
  --network futurenet
```

This command will output a contract ID like: `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM`. 

**Save this contract ID!** You'll need it for the React integration.

## 7. Configure Your React Application

1. Create a `.env` file in your Vite project root:

```
VITE_SOROBAN_CONTRACT_ID=your_contract_id_here
```

2. Access the contract ID in your code with:

```javascript
const contractId = import.meta.env.VITE_SOROBAN_CONTRACT_ID;
```

## 8. Testing Your Contract

You can test the contract functions directly with the Soroban CLI:

### Get a test account

```bash
soroban config identity generate --global user
curl "https://friendbot-futurenet.stellar.org/?addr=$(soroban config identity address user)"
```

### Invoke the create_deal function

```bash
soroban contract invoke \
  --id <your_contract_id> \
  --source user \
  --network futurenet \
  -- \
  create_deal \
  --client $(soroban config identity address user) \
  --price 5000 \
  --profit 500
```

### Get deal details

```bash
soroban contract invoke \
  --id <your_contract_id> \
  --source user \
  --network futurenet \
  -- \
  get_deal \
  --deal_id 1
```

## Troubleshooting

1. **Contract deployment fails**: Ensure your deployer account has enough funds. Check the account balance with:
   ```bash
   soroban config identity show deployer
   ```

2. **Transaction errors**: Check that you're using the correct contract ID and that the function arguments match the expected types.

3. **Wallet connection issues**: Make sure the Freighter wallet extension is installed and configured for Futurenet:
   - In Freighter settings, go to "Experimental"
   - Enable "Soroban RPC" and "Allow unsafe contract installations"
   - Add Futurenet network in the Networks section

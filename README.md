# ⚖️ Mizan: Decentralized Islamic Finance (DeFi) on Stellar

[![Stellar Futurenet](https://img.shields.io/badge/Network-Stellar%20Futurenet-purple)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban%20(Rust)-orange)](https://soroban.stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Digitizing Murabaha Financing: Transparent, Automated, and Sharia-Compliant.**

## 🌍 The Problem
Over **1.7 billion people** are unbanked globally. A significant portion of this demographic avoids conventional financial systems due to religious prohibitions on interest (**Riba**). Existing DeFi protocols are largely interest-based, effectively excluding millions of Muslims from the Web3 economy.

## 💡 The Solution: Mizan
**Mizan** is a dApp built on **Stellar Soroban** that automates **Murabaha** (Cost-Plus Financing) contracts.
Unlike traditional loans, Mizan facilitates an asset sale where the profit margin is fixed and transparent, ensuring full compliance with Islamic finance principles while leveraging blockchain for immutability and trust.

### Key Features
* **Asset-Backed Financing:** The smart contract validates the asset price and profit margin before execution.
* **Automated Debt Recording:** Uses Soroban Rust contracts to immutably store debt obligations on the ledger.
* **Amortization Engine:** Real-time calculation of monthly installments without compound interest.
* **Hybrid Architecture:** React Frontend for user experience + Soroban Backend for settlement.

---

## 📸 Demo

<img width="1902" height="940" alt="mizan_dashboard" src="https://github.com/user-attachments/assets/df9e1454-2caa-4e5a-9414-37d1dc444356" />

---

## 🛠️ Tech Stack
* **Blockchain:** Stellar Futurenet (Soroban)
* **Smart Contracts:** Rust
* **Frontend:** React.js + Vite + TailwindCSS
* **Wallet Integration:** Freighter Wallet
* **Backend Logic:** Node.js (Middleware)

---

## 🚀 Getting Started

Follow these steps to run Mizan locally.

### Prerequisites
* Node.js (v18+)
* Rust & Soroban CLI
* Freighter Wallet Extension

### 1. Installation
Clone the repository and install dependencies:

```bash
git clone [https://github.com/YourUsername/mizan-project.git](https://github.com/YourUsername/mizan-project.git)
cd mizan-project
npm install
```
2. Smart Contract Setup
Compile the Soroban contract:

```Bash

cd mizan_contract
cargo build --target wasm32-unknown-unknown --release
```
Deploy to Futurenet (ensure you have funded your identity):

```Bash

soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/mizan_contract.wasm \
    --source mizan_admin \
    --network futurenet
```
Copy the resulting Contract ID and update your .env file.

3. Run the Frontend
Start the application:

```Bash

npm run dev
```
Open http://localhost:5173 in your browser.

📜 How it Works (The Workflow)
Request: User inputs the asset price and desired duration.

Calculation: The engine calculates the fixed profit (Markup) and total debt.

Execution: User signs the transaction via Freighter.

Settlement: The Soroban Contract (create_deal) creates an on-chain record of the Murabaha deal.

🔮 Roadmap
[x] MVP: Murabaha Calculator & Smart Contract Integration.

[ ] Phase 2: Monthly repayment automated tracking.

[ ] Phase 3: Stablecoin (USDC) integration for payments.

[ ] Phase 4: Mainnet Launch.

🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.

📄 License
This project is licensed under the MIT License.

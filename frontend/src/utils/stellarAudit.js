// Named imports for Vite compatibility
import {
    Networks,
    Keypair,
    Asset,
    Operation,
    TransactionBuilder,
    Memo,
    BASE_FEE,
    Horizon
} from '@stellar/stellar-sdk';

// Stellar Testnet Configuration
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const SERVER = new Horizon.Server(HORIZON_URL);

// Treasury Secret Key - MUST be set for transactions
const TREASURY_SECRET_KEY = import.meta.env.VITE_SOROBAN_SECRET_KEY || 'YOUR_SECRET_KEY_HERE';

/**
 * Records an audit transaction on Stellar Testnet
 * @param {string|number} contractId - The contract ID to record
 * @param {number|string} amount - The contract amount to record
 * @returns {Promise<{transactionHash: string, explorerLink: string}>}
 */
export async function recordAuditTransaction(contractId, amount) {
    try {
        // Validate treasury secret key is configured
        if (!TREASURY_SECRET_KEY || TREASURY_SECRET_KEY.trim() === '' || TREASURY_SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
            throw new Error(
                'Secret key is not configured. ' +
                'Please set the VITE_SOROBAN_SECRET_KEY in your .env file'
            );
        }

        // Load treasury keypair from secret key
        let treasuryKeypair;
        try {
            treasuryKeypair = Keypair.fromSecret(TREASURY_SECRET_KEY);
        } catch (error) {
            throw new Error(
                `Invalid secret key format in VITE_SOROBAN_SECRET_KEY. Please check your .env file. ` +
                `Error: ${error.message}`
            );
        }

        const treasuryPublicKey = treasuryKeypair.publicKey();
        console.log(`Using treasury account: ${treasuryPublicKey}`);

        // Load treasury account from Stellar network
        let account;
        try {
            account = await SERVER.loadAccount(treasuryPublicKey);
            console.log('Treasury account loaded. Balance:', account.balances);
        } catch (error) {
            // Account doesn't exist or not funded
            if (error.status === 404 || error.response?.status === 404) {
                throw new Error(
                    `Treasury account ${treasuryPublicKey} needs to be funded. ` +
                    `Visit https://friendbot.stellar.org/?addr=${treasuryPublicKey} to fund it for testnet. ` +
                    `After funding, try again.`
                );
            }
            throw new Error(`Failed to load treasury account: ${error.message}`);
        }

        // Check if account has enough XLM (minimum balance + fee)
        const nativeBalance = account.balances.find(b => b.asset_type === 'native');
        const balance = parseFloat(nativeBalance?.balance || '0');
        const minBalance = 1; // Minimum balance for account
        const fee = 0.0001; // Stellar transaction fee

        if (balance < minBalance + fee) {
            throw new Error(
                `Treasury account has insufficient balance. Needs at least ${minBalance + fee} XLM. ` +
                `Current balance: ${balance} XLM. ` +
                `Fund via: https://friendbot.stellar.org/?addr=${treasuryPublicKey}`
            );
        }

        // Create memo with contract ID and amount
        // Stellar memo text has a maximum length of 28 bytes
        const fullMemoText = `Murabaha-${contractId}-${amount}`;
        const memoText = fullMemoText.substring(0, 28);
        
        // Log if truncation occurred for debugging
        if (fullMemoText.length > 28) {
            console.warn(`Memo text truncated from ${fullMemoText.length} to 28 characters. Original: "${fullMemoText}"`);
        }
        
        // Create a loopback transaction (sending 0.00001 XLM to itself)
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE
        })
            .addOperation(
                Operation.payment({
                    destination: treasuryPublicKey, // Sending to itself (loopback)
                    asset: Asset.native(),
                    amount: '0.00001' // Minimal amount for audit trail
                })
            )
            .addMemo(
                Memo.text(memoText)
            )
            .setTimeout(30)
            .build();

        // Sign the transaction with treasury keypair
        transaction.sign(treasuryKeypair);

        // Submit to the network
        const result = await SERVER.submitTransaction(transaction);
        
        const transactionHash = result.hash;
        const explorerLink = `https://stellar.expert/explorer/testnet/tx/${transactionHash}`;

        console.log(`Audit transaction successful! Hash: ${transactionHash}`);
        console.log(`View on explorer: ${explorerLink}`);

        return {
            transactionHash,
            explorerLink,
            publicKey: treasuryPublicKey,
            memo: memoText
        };
    } catch (error) {
        console.error('Stellar audit transaction error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('needs to be funded') || error.message.includes('insufficient balance')) {
            throw error; // Re-throw funding errors as-is
        }
        
        if (error.response) {
            // Horizon API error
            const errorDetails = error.response.data;
            throw new Error(
                `Stellar transaction failed: ${errorDetails?.detail || errorDetails?.extras?.result_codes || error.message || 'Unknown error'}`
            );
        }
        
        // Re-throw our custom errors as-is
        if (error.message.includes('Secret key is not configured')) {
            throw error;
        }
        
        throw new Error(`Failed to record audit transaction: ${error.message}`);
    }
}

/**
 * Fetches transaction details from Stellar Horizon
 * @param {string} transactionHash - The transaction hash to look up
 * @returns {Promise<Object>} Transaction details
 */
export async function getTransactionDetails(transactionHash) {
    try {
        const transaction = await SERVER.transactions().transaction(transactionHash).call();
        return transaction;
    } catch (error) {
        console.error('Error fetching transaction:', error);
        throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
}

/**
 * Fetches recent audit transactions for an account
 * @param {string} accountId - The Stellar account public key
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} Array of transactions
 */
export async function getAuditTransactions(accountId, limit = 20) {
    try {
        const transactions = await SERVER
            .transactions()
            .forAccount(accountId)
            .order('desc')
            .limit(limit)
            .call();
        
        return transactions.records.map(tx => ({
            hash: tx.hash,
            timestamp: tx.created_at,
            memo: tx.memo,
            memoType: tx.memo_type,
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${tx.hash}`
        }));
    } catch (error) {
        console.error('Error fetching audit transactions:', error);
        throw new Error(`Failed to fetch audit transactions: ${error.message}`);
    }
}


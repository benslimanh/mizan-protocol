import { isConnected, isAllowed, getUserInfo, signTransaction } from '@stellar/freighter-api';
import { Contract, Server, TransactionBuilder, Networks, xdr, SorobanRpc, Address } from 'soroban-client';
import { Buffer } from 'buffer';

// Network configuration for Futurenet
const FUTURENET_RPC_URL = 'https://rpc-futurenet.stellar.org:443';
const NETWORK_PASSPHRASE = Networks.FUTURENET;

// Contract details - using the deployed contract ID
const DEFAULT_CONTRACT_ID = 'CB5ISE275IGRH7YYDBFZNPW2QJV6FFRQAIYONKT4RYHMKJIHQQNGJMAG';
let contractId = import.meta.env.VITE_SOROBAN_CONTRACT_ID || DEFAULT_CONTRACT_ID; // Use env var if available, otherwise use default

/**
 * Initializes the Soroban integration with a specific contract
 * @param {string} deployedContractId - The ID of the deployed Murabaha contract
 */
export const initializeSorobanContract = (deployedContractId) => {
  contractId = deployedContractId;
};

/**
 * Check if Freighter wallet extension is installed
 * @returns {boolean} Whether Freighter is available
 */
export const isFreighterInstalled = () => {
  return typeof window !== 'undefined' && !!window.freighterApi;
};

/**
 * Check if the wallet is connected
 * @returns {Promise<boolean>} Whether the wallet is connected
 */
export const checkWalletConnection = async () => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter wallet extension is not installed');
  }
  
  return await isConnected();
};

/**
 * Connect to the user's Freighter wallet
 * @returns {Promise<string>} The user's public key
 */
export const connectWallet = async () => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter wallet extension is not installed');
  }

  const connected = await isConnected();
  if (!connected) {
    throw new Error('Please connect your Freighter wallet first');
  }

  const allowed = await isAllowed();
  if (!allowed) {
    // This will prompt the user to give permission to the site
    await window.freighterApi.setAllowed();
  }

  const userInfo = await getUserInfo();
  return userInfo.publicKey;
};

/**
 * Execute a Soroban smart contract to create a Murabaha deal
 * @param {number} price - The asset price
 * @param {number} profit - The profit margin
 * @returns {Promise<object>} Transaction result details
 */
export const executeSorobanDeal = async (price, profit) => {
  try {
    if (!contractId) {
      throw new Error('Contract ID not set. Please call initializeSorobanContract first');
    }

    // Check wallet connection
    if (!await checkWalletConnection()) {
      throw new Error('Please connect your Freighter wallet first');
    }
    
    // Get user's public key
    const publicKey = await connectWallet();
    
    // Set up the Soroban RPC server
    const server = new SorobanRpc.Server(FUTURENET_RPC_URL, { allowHttp: true });
    
    // Convert price and profit to the format expected by the contract (i128)
    // Convert to BigInt first to handle large numbers properly
    const priceBigInt = BigInt(price);
    const profitBigInt = BigInt(profit);
    
    // Handle positive and negative values correctly
    const priceXdr = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(priceBigInt >= 0n ? priceBigInt.toString() : (-priceBigInt).toString()),
        hi: priceBigInt >= 0n ? xdr.Int64.fromString('0') : xdr.Int64.fromString('-1')
      })
    );

    const profitXdr = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(profitBigInt >= 0n ? profitBigInt.toString() : (-profitBigInt).toString()),
        hi: profitBigInt >= 0n ? xdr.Int64.fromString('0') : xdr.Int64.fromString('-1')
      })
    );

    // Create a client account Address from the public key
    const clientAddressXdr = Address.fromString(publicKey).toScVal();
    
    // Create a contract instance
    const contract = new Contract(contractId);
    
    // Create a deal ID - using current timestamp for uniqueness
    const dealIdNumber = Math.floor(Date.now() / 1000) % 1000000;
    const dealIdBigInt = BigInt(dealIdNumber);
    const dealIdXdr = xdr.ScVal.scvU64(xdr.Uint64.fromString(dealIdBigInt.toString()));
    
    // Build the transaction to call the create_deal function
    const operation = contract.call(
      'create_deal', 
      dealIdXdr,        // deal_id parameter
      clientAddressXdr, // client parameter
      priceXdr,         // price parameter
      profitXdr         // profit parameter
    );
    
    // Get the user's account
    const account = await server.getAccount(publicKey);
    
    // Prepare the transaction
    let transaction = new TransactionBuilder(account, {
      fee: '100000', // Adjust fee as needed
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30) // 30 seconds timeout
      .build();
    
    // Simulate the transaction first to estimate fees
    const simulationResponse = await server.simulateTransaction(transaction);
    
    if (simulationResponse.error) {
      throw new Error(`Simulation error: ${simulationResponse.error}`);
    }
    
    // Use the simulation results to prepare the real transaction
    if (simulationResponse.results && simulationResponse.results.length > 0) {
      const simulationResult = simulationResponse.results[0];
      const authEntry = simulationResult.auth;
      if (authEntry) {
        // If the simulation returned auth, we need to rebuild the transaction
        // with the auth entries from the simulation result
        transaction = new TransactionBuilder(account, {
          fee: '100000',
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(operation)
          .setTimeout(30)
          .build();
        transaction.setSorobanData(simulationResult.auth);
      }
    }
    
    // Sign the transaction using Freighter
    const signedXDR = await signTransaction(
      transaction.toXDR(),
      { 
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    );
    
    // Convert the signed XDR back to a transaction
    const signedTransaction = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    
    // Submit the transaction
    const transactionResult = await server.sendTransaction(signedTransaction);
    
    // Process the result
    if (transactionResult.status === 'PENDING') {
      // Wait for the transaction to be confirmed
      let txResponse;
      let attempts = 10;
      
      while (attempts > 0) {
        try {
          txResponse = await server.getTransaction(transactionResult.hash);
          
          if (txResponse && txResponse.status !== 'PENDING') {
            break;
          }
        } catch (e) {
          // Transaction might not be available yet
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        attempts--;
      }
      
      if (txResponse && txResponse.status === 'SUCCESS') {
        // Parse the result to get the deal ID
        const dealId = Number(txResponse.returnValue.decoded.toString());
        
        return {
          status: 'success',
          transactionHash: transactionResult.hash,
          dealId: dealId
        };
      } else {
        throw new Error('Transaction failed or timed out');
      }
    } else {
      throw new Error(`Transaction submission failed: ${transactionResult.status}`);
    }
    
  } catch (error) {
    console.error('Error executing Soroban deal:', error);
    throw error;
  }
};

/**
 * Get the details of a specific Murabaha deal
 * @param {number} dealId - The ID of the deal to retrieve
 * @returns {Promise<object>} Deal details
 */
export const getMurabahaDeal = async (dealId) => {
  try {
    if (!contractId) {
      throw new Error('Contract ID not set. Please call initializeSorobanContract first');
    }

    // Check wallet connection
    await checkWalletConnection();
    
    // Set up the Soroban RPC server
    const server = new SorobanRpc.Server(FUTURENET_RPC_URL, { allowHttp: true });
    
    // Get user's public key
    const publicKey = await connectWallet();
    
    // Create a contract instance
    const contract = new Contract(contractId);
    
    // Convert dealId to u64 XDR format (since deal IDs are unsigned integers)
    const dealIdBigInt = BigInt(dealId);
    const dealIdXdr = xdr.ScVal.scvU64(xdr.Uint64.fromString(dealIdBigInt.toString()));
    
    // Build the operation
    const operation = contract.call('get_deal', dealIdXdr);
    
    // Get the user's account
    const account = await server.getAccount(publicKey);
    
    // Create the transaction
    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    // Simulate the transaction to get the result without submitting
    const simulationResponse = await server.simulateTransaction(transaction);
    
    if (simulationResponse.error) {
      throw new Error(`Simulation error: ${simulationResponse.error}`);
    }
    
    // Parse the result from the simulation
    if (simulationResponse.results && simulationResponse.results.length > 0) {
      const result = simulationResponse.results[0];
      
      if (result.xdr) {
        // Parse the XDR result to get the MurabahaDeal struct
        const resultXdr = xdr.ScVal.fromXDR(Buffer.from(result.xdr, 'base64'));
        
        // Extract struct fields
        const extractedDeal = {};
        
        // Parse the result based on the expected format from the contract
        // This is a simplified version and might need adjustments based on the actual XDR structure
        if (resultXdr.switch().name === 'scvMap') {
          const entries = resultXdr.map();
          
          for (let i = 0; i < entries.length; i++) {
            const key = entries[i].key().str().toString();
            const value = entries[i].val();
            
            if (key === 'client_address') {
              extractedDeal.clientAddress = value.str().toString();
            } else if (key === 'asset_price') {
              extractedDeal.assetPrice = Number(value.i128().toString());
            } else if (key === 'profit_margin') {
              extractedDeal.profitMargin = Number(value.i128().toString());
            } else if (key === 'total_debt') {
              extractedDeal.totalDebt = Number(value.i128().toString());
            } else if (key === 'is_paid') {
              extractedDeal.isPaid = value.b();
            }
          }
        }
        
        return extractedDeal;
      }
    }
    
    throw new Error('Failed to retrieve deal details');
    
  } catch (error) {
    console.error('Error getting Murabaha deal:', error);
    throw error;
  }
};

/**
 * Mark a deal as paid
 * @param {number} dealId - The ID of the deal to mark as paid
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export const markDealAsPaid = async (dealId) => {
  try {
    if (!contractId) {
      throw new Error('Contract ID not set. Please call initializeSorobanContract first');
    }

    // Check wallet connection
    await checkWalletConnection();
    
    // Get user's public key
    const publicKey = await connectWallet();
    
    // Set up the Soroban RPC server
    const server = new SorobanRpc.Server(FUTURENET_RPC_URL, { allowHttp: true });
    
    // Convert dealId to u64 XDR format (since deal IDs are unsigned integers)
    const dealIdBigInt = BigInt(dealId);
    const dealIdXdr = xdr.ScVal.scvU64(xdr.Uint64.fromString(dealIdBigInt.toString()));
    
    // Create a contract instance
    const contract = new Contract(contractId);
    
    // Build the transaction to call the mark_as_paid function
    const operation = contract.call('mark_as_paid', dealIdXdr);
    
    // Get the user's account
    const account = await server.getAccount(publicKey);
    
    // Prepare the transaction
    let transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    // Simulate the transaction first
    const simulationResponse = await server.simulateTransaction(transaction);
    
    if (simulationResponse.error) {
      throw new Error(`Simulation error: ${simulationResponse.error}`);
    }
    
    // Use the simulation results to prepare the real transaction
    if (simulationResponse.results && simulationResponse.results.length > 0) {
      const simulationResult = simulationResponse.results[0];
      const authEntry = simulationResult.auth;
      if (authEntry) {
        transaction = new TransactionBuilder(account, {
          fee: '100000',
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(operation)
          .setTimeout(30)
          .build();
        transaction.setSorobanData(simulationResult.auth);
      }
    }
    
    // Sign the transaction using Freighter
    const signedXDR = await signTransaction(
      transaction.toXDR(),
      { 
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    );
    
    // Convert the signed XDR back to a transaction
    const signedTransaction = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    
    // Submit the transaction
    const transactionResult = await server.sendTransaction(signedTransaction);
    
    // Process the result
    if (transactionResult.status === 'PENDING') {
      // Wait for confirmation
      let txResponse;
      let attempts = 10;
      
      while (attempts > 0) {
        try {
          txResponse = await server.getTransaction(transactionResult.hash);
          
          if (txResponse && txResponse.status !== 'PENDING') {
            break;
          }
        } catch (e) {
          // Transaction might not be available yet
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts--;
      }
      
      if (txResponse && txResponse.status === 'SUCCESS') {
        return true;
      } else {
        throw new Error('Transaction failed or timed out');
      }
    } else {
      throw new Error(`Transaction submission failed: ${transactionResult.status}`);
    }
    
  } catch (error) {
    console.error('Error marking deal as paid:', error);
    throw error;
  }
};

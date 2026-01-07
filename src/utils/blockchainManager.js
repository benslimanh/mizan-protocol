import { 
  initializeSorobanContract, 
  executeSorobanDeal, 
  getMurabahaDeal, 
  markDealAsPaid, 
  isFreighterInstalled,
  connectWallet
} from './sorobanIntegration';

// The existing memo-based audit function
import { recordAuditTransaction } from './stellarAudit'; // Assume this is your existing audit function

class BlockchainManager {
  constructor() {
    this.contractId = '';
    this.isContractInitialized = false;
    this.isSorobanAvailable = false;
  }

  // Initialize the blockchain manager
  async initialize(contractId) {
    // Check if Freighter wallet is installed
    try {
      this.isSorobanAvailable = isFreighterInstalled();
      
      if (this.isSorobanAvailable && contractId) {
        initializeSorobanContract(contractId);
        this.contractId = contractId;
        this.isContractInitialized = true;
        console.log('Soroban contract initialized with ID:', contractId);
      } else {
        console.log('Soroban not available or no contract ID provided, falling back to memo auditing');
      }
    } catch (error) {
      console.error('Error initializing blockchain manager:', error);
      this.isSorobanAvailable = false;
    }
  }

  // Record a Murabaha deal on the blockchain
  async recordMurabahaDeal(dealReference, clientAddress, price, profit) {
    try {
      // If Soroban is available and contract is initialized, use smart contract
      if (this.isSorobanAvailable && this.isContractInitialized) {
        const result = await executeSorobanDeal(price, profit);
        console.log('Deal recorded with Soroban, deal ID:', result.dealId);
        return {
          type: 'soroban',
          success: true,
          dealId: result.dealId,
          transactionHash: result.transactionHash
        };
      } else {
        // Fall back to the old memo-based method
        const result = await recordAuditTransaction(dealReference, price + profit);
        console.log('Deal recorded with memo audit:', result);
        return {
          type: 'memo',
          success: true,
          transactionHash: result.transactionHash
        };
      }
    } catch (error) {
      console.error('Error recording Murabaha deal:', error);
      throw error;
    }
  }

  // Get a Murabaha deal from the blockchain
  async getMurabahaDeal(dealId) {
    if (!this.isSorobanAvailable || !this.isContractInitialized) {
      throw new Error('Soroban contract not available');
    }

    try {
      return await getMurabahaDeal(dealId);
    } catch (error) {
      console.error('Error getting Murabaha deal:', error);
      throw error;
    }
  }

  // Mark a Murabaha deal as paid
  async markDealAsPaid(dealId) {
    if (!this.isSorobanAvailable || !this.isContractInitialized) {
      throw new Error('Soroban contract not available');
    }

    try {
      return await markDealAsPaid(dealId);
    } catch (error) {
      console.error('Error marking deal as paid:', error);
      throw error;
    }
  }

  // Check if wallet is connected
  async isWalletConnected() {
    if (!this.isSorobanAvailable) {
      return false;
    }

    try {
      const publicKey = await connectWallet();
      return !!publicKey;
    } catch (error) {
      return false;
    }
  }
}

// Create a singleton instance
const blockchainManager = new BlockchainManager();
export default blockchainManager;

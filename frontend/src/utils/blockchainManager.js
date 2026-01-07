import { 
  initializeSorobanContract, 
  executeSorobanDeal, 
  getMurabahaDeal, 
  markDealAsPaid, 
  isFreighterInstalled,
  connectWallet,
  checkWalletConnection
} from './sorobanIntegration';

/**
 * BlockchainManager - Facade for blockchain operations
 * Acts as a wrapper around Soroban smart contract interactions
 */
class BlockchainManager {
  constructor() {
    this.contractId = '';
    this.isContractInitialized = false;
    this.isSorobanAvailable = false;
  }

  /**
   * Initialize the blockchain manager with contract ID
   * @param {string} contractId - The ID of the deployed contract
   */
  async initialize(contractId) {
    try {
      this.isSorobanAvailable = isFreighterInstalled();
      
      if (this.isSorobanAvailable && contractId) {
        initializeSorobanContract(contractId);
        this.contractId = contractId;
        this.isContractInitialized = true;
        console.log('Soroban contract initialized with ID:', contractId);
      } else {
        console.log('Soroban not available or no contract ID provided');
      }
    } catch (error) {
      console.error('Error initializing blockchain manager:', error);
      this.isSorobanAvailable = false;
    }
  }

  /**
   * Execute a deal on the blockchain
   * @param {number} price - The asset price
   * @param {number} profit - The profit margin
   * @returns {Promise<object>} Transaction result
   */
  async executeDeal(price, profit) {
    try {
      if (!this.isSorobanAvailable || !this.isContractInitialized) {
        throw new Error('Soroban contract not available or initialized');
      }

      const result = await executeSorobanDeal(price, profit);
      console.log('Deal executed with Soroban:', result);
      return result;
    } catch (error) {
      console.error('Error executing deal:', error);
      throw error;
    }
  }

  /**
   * Record a Murabaha deal on the blockchain
   * @param {string} dealReference - Reference ID for the deal
   * @param {string} clientAddress - Client's address
   * @param {number} price - The asset price
   * @param {number} profit - The profit margin
   * @returns {Promise<object>} Transaction result details
   */
  async recordMurabahaDeal(dealReference, clientAddress, price, profit) {
    try {
      if (!this.isSorobanAvailable || !this.isContractInitialized) {
        throw new Error('Soroban contract not available or initialized');
      }

      const result = await executeSorobanDeal(price, profit);
      console.log('Deal recorded with Soroban, deal ID:', result.dealId);
      return {
        type: 'soroban',
        success: true,
        dealId: result.dealId,
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error('Error recording Murabaha deal:', error);
      throw error;
    }
  }

  /**
   * Get a Murabaha deal from the blockchain
   * @param {number} dealId - The ID of the deal to retrieve
   */
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

  /**
   * Mark a Murabaha deal as paid
   * @param {number} dealId - The ID of the deal to mark as paid
   */
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

  /**
   * Check if wallet is connected
   * @returns {Promise<boolean>}
   */
  async isWalletConnected() {
    if (!this.isSorobanAvailable) {
      return false;
    }

    try {
      return await checkWalletConnection();
    } catch (error) {
      return false;
    }
  }
}

// Create a singleton instance
const blockchainManager = new BlockchainManager();

// Named export
export { blockchainManager };

// Default export
export default blockchainManager;

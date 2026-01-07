import React, { useState, useEffect } from 'react';
import blockchainManager from '../utils/blockchainManager';

const MurabahaDealForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [formData, setFormData] = useState({
    clientAddress: '',
    assetPrice: '',
    profitMargin: '',
  });

  // Check if wallet is connected on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Initialize blockchain manager with your deployed contract ID
        // This should be stored in your environment variables or config
        const contractId = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';
        await blockchainManager.initialize(contractId);
        
        const isConnected = await blockchainManager.isWalletConnected();
        setWalletConnected(isConnected);
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setWalletConnected(false);
      }
    };

    checkWalletConnection();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate a unique deal reference (you might want to replace this with your own logic)
      const dealReference = `Mizan:${Date.now().toString().slice(-6)}-${formData.assetPrice}`;
      
      // Parse the numeric values
      const price = parseInt(formData.assetPrice, 10);
      const profit = parseInt(formData.profitMargin, 10);
      
      if (isNaN(price) || isNaN(profit)) {
        throw new Error('Asset price and profit margin must be valid numbers');
      }
      
      // Record the deal on the blockchain
      const result = await blockchainManager.recordMurabahaDeal(
        dealReference,
        formData.clientAddress,
        price,
        profit
      );
      
      // Handle the successful result
      if (result.type === 'soroban') {
        setSuccess(`Deal successfully recorded with Soroban smart contract! Deal ID: ${result.dealId}`);
      } else {
        setSuccess(`Deal successfully recorded with memo auditing! Transaction Hash: ${result.transactionHash}`);
      }
      
      // Clear the form
      setFormData({
        clientAddress: '',
        assetPrice: '',
        profitMargin: '',
      });
    } catch (error) {
      console.error('Error submitting deal:', error);
      setError(`Failed to record deal: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Create Murabaha Deal</h2>
      
      {!walletConnected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
          <p>Freighter wallet is not connected. Smart contract features may not be available.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
          <p>{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">Client Stellar Address</label>
          <input
            type="text"
            id="clientAddress"
            name="clientAddress"
            value={formData.clientAddress}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="G..."
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="assetPrice" className="block text-sm font-medium text-gray-700">Asset Price</label>
          <input
            type="number"
            id="assetPrice"
            name="assetPrice"
            value={formData.assetPrice}
            onChange={handleInputChange}
            required
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="5000"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="profitMargin" className="block text-sm font-medium text-gray-700">Profit Margin</label>
          <input
            type="number"
            id="profitMargin"
            name="profitMargin"
            value={formData.profitMargin}
            onChange={handleInputChange}
            required
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <span>Create Murabaha Deal</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MurabahaDealForm;

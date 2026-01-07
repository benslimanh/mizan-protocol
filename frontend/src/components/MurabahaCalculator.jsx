import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import blockchainManager from '../utils/blockchainManager';

const MurabahaCalculator = () => {
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient, setSelectedClient] = useState(null); // Full client object with debt info
    const [saveLoading, setSaveLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);

    // Initial Params (Input) - will be hydrated from localStorage
    const [formData, setFormData] = useState({
        asset_name: '',
        asset_price: 100000,
        annual_profit_rate: 0.05,
        duration_months: 12,
        down_payment_percentage: 0.20,
        security_deposit: 0 // Optional user input
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Active Contract State (Persistent)
    const [activeContract, setActiveContract] = useState(null);
    
    // Track highest step reached for navigation
    const [maxStepReached, setMaxStepReached] = useState(0);
    
    // Manual step navigation state (for clickable stepper)
    const [manualActiveStep, setManualActiveStep] = useState(null);

    // Load clients on mount
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/clients`)
            .then(res => res.json())
            .then(data => {
                setClients(data);
                // After clients load, try to restore selectedClient from localStorage
                try {
                    const savedClient = localStorage.getItem('mizan_murabaha_client');
                    if (savedClient) {
                        const parsedClient = JSON.parse(savedClient);
                        setSelectedClient(parsedClient);
                        // Also set the ID to keep them in sync
                        if (parsedClient.id) {
                            setSelectedClientId(parsedClient.id.toString());
                        }
                    }
                } catch (error) {
                    console.error('Failed to restore client:', error);
                }
            })
            .catch(err => console.error("Failed to load clients", err));
    }, []);

    // Load saved form data from localStorage on mount
    useEffect(() => {
        try {
            const savedForm = localStorage.getItem('mizan_murabaha_form');
            if (savedForm) {
                const parsed = JSON.parse(savedForm);
                if (parsed.formData) setFormData(parsed.formData);
                if (parsed.selectedClientId) setSelectedClientId(parsed.selectedClientId);
                if (parsed.result) setResult(parsed.result);
                if (parsed.activeContract) setActiveContract(parsed.activeContract);
                if (parsed.maxStepReached !== undefined) setMaxStepReached(parsed.maxStepReached);
                console.log('Restored form state from localStorage');
            }
        } catch (error) {
            console.error('Failed to load saved form state:', error);
        }
    }, []);

    // Auto-save formData to localStorage whenever it changes
    useEffect(() => {
        try {
            const formStateToSave = {
                formData,
                selectedClientId,
                result,
                activeContract,
                maxStepReached,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('mizan_murabaha_form', JSON.stringify(formStateToSave));
        } catch (error) {
            console.error('Failed to save form state:', error);
        }
    }, [formData, selectedClientId, result, activeContract, maxStepReached]);

    // Auto-save selectedClient to localStorage whenever it changes
    useEffect(() => {
        if (selectedClient) {
            try {
                localStorage.setItem('mizan_murabaha_client', JSON.stringify(selectedClient));
            } catch (error) {
                console.error('Failed to save client state:', error);
            }
        }
    }, [selectedClient]);

    // Reset form function - clears both localStorage keys
    const handleResetForm = () => {
        if (window.confirm('Are you sure you want to reset the form? All unsaved data will be lost.')) {
            localStorage.removeItem('mizan_murabaha_form');
            localStorage.removeItem('mizan_murabaha_client');
            setFormData({
                asset_name: '',
                asset_price: 100000,
                annual_profit_rate: 0.05,
                duration_months: 12,
                down_payment_percentage: 0.20,
                security_deposit: 0
            });
            setSelectedClientId('');
            setSelectedClient(null);
            setResult(null);
            setActiveContract(null);
            setMaxStepReached(0);
            setManualActiveStep(null);
            setError(null);
        }
    };

    // Helper function to get client total debt safely
    const getClientTotalDebt = () => {
        if (selectedClient) {
            return selectedClient.total_debt ?? selectedClient.totalDebt ?? 0;
        }
        return 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // For numeric fields, parse as float/int; for text fields (like asset_name), keep as string
        const numericFields = ['asset_price', 'annual_profit_rate', 'duration_months', 'down_payment_percentage', 'security_deposit'];
        setFormData({
            ...formData,
            [name]: numericFields.includes(name) ? (parseFloat(value) || (value === '' ? '' : 0)) : value
        });
    };

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);
        setActiveContract(null); // Reset on new calc
        setMaxStepReached(0); // Reset step tracking

        // DEBUGGING BLOCK
        console.log("Attempting to connect to Backend at Port 8000...");

        try {
            const payload = {
                asset_price: parseFloat(formData.asset_price),
                annual_profit_rate: parseFloat(formData.annual_profit_rate),
                duration_months: parseInt(formData.duration_months),
                down_payment_percentage: parseFloat(formData.down_payment_percentage),
                security_deposit: parseFloat(formData.security_deposit) || 0
            };

            const response = await fetch('http://127.0.0.1:8000/api/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Success:", data);
            setResult(data);
            setMaxStepReached(0); // Update to DRAFT step after calculation

        } catch (error) {
            console.error("Connection Failed:", error);
            setError("Connection Error: Make sure backend is running on Port 8000. Check Console for details.");
            alert("Connection Error: Make sure backend is running on Port 8000. Check Console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePromise = async () => {
        if (!selectedClientId || !selectedClient) {
            setError("Please select a client to save the contract.");
            return;
        }
        setSaveLoading(true);
        
        // Validate asset_name is provided
        if (!formData.asset_name || formData.asset_name.trim() === '') {
            setError("Please enter an Asset Name before generating the promise.");
            setSaveLoading(false);
            return;
        }
        
        try {
            // Recalculate implicitly to ensure fresh data? Or use result?
            // Using formData ensures latest inputs are used.
            const payload = {
                client_id: parseInt(selectedClientId),
                asset_name: formData.asset_name.trim(),
                asset_price: parseFloat(formData.asset_price),
                annual_profit_rate: parseFloat(formData.annual_profit_rate),
                duration_months: parseInt(formData.duration_months),
                down_payment_percentage: parseFloat(formData.down_payment_percentage),
                security_deposit: parseFloat(formData.security_deposit) || 0,
                financed_amount: result?.summary?.financed_amount || null,
                total_profit: result?.summary?.total_profit || null,
                total_cost: result?.summary?.total_cost || null,
                schedule: result?.schedule || []
            };

            const response = await fetch(`${API_BASE_URL}/api/contracts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate promise');
            }
            const data = await response.json();

            // Set active contract with status
            setActiveContract(data);
            setMaxStepReached(1); // Update to PROMISE step
            alert("Success: Promise to Purchase (Wa'd) Generated!");

        } catch (err) {
            setError(err.message);
        } finally {
            setSaveLoading(false);
        }
    };

    const updateStatus = async (newStatus) => {
        if (!activeContract) return;
        setSaveLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/update_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contract_id: activeContract.id, status: newStatus }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Status update failed");
            }
            const data = await response.json();
            setActiveContract(prev => ({ ...prev, status: data.status }));
            
            // Update max step reached based on status
            const statusIndex = steps.findIndex(s => s.id === data.status);
            if (statusIndex !== -1 && statusIndex > maxStepReached) {
                setMaxStepReached(statusIndex);
            }
            
            alert(`Status updated to: ${data.status}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaveLoading(false);
        }
    };

    // Handle stepper click navigation
    const handleStepClick = (stepId, stepIndex) => {
        // Allow navigation to any step that has been reached or is the current step
        if (stepIndex <= maxStepReached || stepId === currentStatus) {
            console.log(`Navigating to step: ${stepId}`);
            setManualActiveStep(stepIndex);
            
            // Scroll to top of form on step change for better UX
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDownloadContract = async () => {
        if (!result) return;
        setDownloadLoading(true);
        try {
            const client = selectedClient || clients.find(c => c.id == selectedClientId);
            const clientName = client ? client.name : "Valued Client";

            // Calculate totals from summary or result
            const cost = result.summary.asset_price || 0;
            const totalProfit = result.summary.total_profit || 0;
            const totalAmount = result.summary.total_cost || result.summary.total_selling_price || 0;

            const payload = {
                clientName: clientName,
                assetName: formData.asset_name || "Murabaha Asset (General)",
                cost: cost,
                profit: totalProfit,
                total: totalAmount,
                installments: result.schedule
            };

            const response = await fetch('http://127.0.0.1:8000/api/generate-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to generate PDF");

            // Handle Blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mizan_Contract_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (err) {
            console.error(err);
            alert("Error downloading contract: " + err.message);
        } finally {
            setDownloadLoading(false);
        }
    };

    // Stepper Helper
    const steps = [
        { id: 'DRAFT', label: '1. Draft & Calc' },
        { id: 'PROMISE', label: '2. Promise (Wa\'d)' },
        { id: 'ASSET_OWNED', label: '3. Asset Acquisition' },
        { id: 'SALE_SIGNED', label: '4. Murabaha Sale' }
    ];

    const currentStatus = activeContract ? activeContract.status : 'DRAFT';
    const currentStepIndex = steps.findIndex(s => s.id === currentStatus);
    
    // Use manual step if set, otherwise use currentStepIndex
    const displayStepIndex = manualActiveStep !== null ? manualActiveStep : currentStepIndex;
    
    // Update maxStepReached when currentStatus changes (only if it increases)
    useEffect(() => {
        if (currentStepIndex !== -1 && currentStepIndex > maxStepReached) {
            setMaxStepReached(currentStepIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStatus, currentStepIndex]);

    // PDF Handlers
    const handlePrintPromise = () => {
        if (!result || !selectedClientId) return;
        const client = selectedClient || clients.find(c => c.id == selectedClientId);
        if (!client) {
            alert('Client information not found. Please select a client again.');
            return;
        }
        import('../utils/pdfGenerator').then(mod => {
            mod.generatePromiseToPurchase(activeContract || { ...result, summary: result.summary }, client);
        });
    };

    const handlePrintContract = () => {
        if (!activeContract || !selectedClientId) return;
        const client = selectedClient || clients.find(c => c.id == selectedClientId);
        if (!client) {
            alert('Client information not found. Please select a client again.');
            return;
        }
        import('../utils/pdfGenerator').then(mod => {
            const contractData = {
                ...activeContract,
                // Merge summary if missing (activeContract from DB might need join, but for now we have result state usually)
                summary: result?.summary || activeContract.summary || {
                    asset_price: activeContract.asset_price,
                    financed_amount: activeContract.financed_amount,
                    total_profit: activeContract.total_profit,
                    total_cost: activeContract.total_cost,
                    total_down_payment: activeContract.down_payment, // Check mapping
                    security_deposit: activeContract.security_deposit
                },
                schedule: JSON.parse(activeContract.schedule_json || "[]")
            };
            mod.generateMurabahaContract(contractData, client);
        });
    };

    return (
        <div className="p-6">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Murabaha Financing Engine</h2>
                    <p className="text-gray-500 text-sm mt-1">AAOIFI Sharia Compliant Workflow</p>
                </div>
                {activeContract && (
                    <div className="flex gap-2">
                        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-sm font-bold flex items-center">
                            Contract #{activeContract.id}
                        </div>
                        {currentStatus === 'PROMISE' && (
                            <button onClick={handlePrintPromise} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
                                Print Wa'd
                            </button>
                        )}
                        {currentStatus === 'SALE_SIGNED' && (
                            <button onClick={handlePrintContract} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
                                Print Contract
                            </button>
                        )}
                    </div>
                )}
            </header>

            {/* Stepper */}
            <div className="mb-8">
                <div className="flex items-center w-full">
                    {steps.map((step, index) => {
                        const isActive = index <= displayStepIndex;
                        const isCurrent = index === displayStepIndex;
                        const isClickable = index <= maxStepReached || step.id === currentStatus;

                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center relative">
                                    <div 
                                        onClick={() => handleStepClick(step.id, index)}
                                        className={`rounded-full transition-all duration-500 py-2 px-4 border-2 flex items-center justify-center ${
                                            isActive ? 'border-orange-600 bg-orange-50 text-orange-700 font-bold' : 'border-gray-200 text-gray-400'
                                        } ${
                                            isCurrent ? 'ring-2 ring-orange-200 shadow-lg scale-105' : ''
                                        } ${
                                            isClickable ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-not-allowed opacity-50'
                                        }`}
                                        title={isClickable ? `Click to navigate to ${step.label}` : 'Complete previous steps first'}
                                    >
                                        {step.label}
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-auto border-t-2 transition-all duration-500 mx-2 ${
                                        index < displayStepIndex ? 'border-orange-600' : 'border-gray-200'
                                    }`}></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Left Column: Inputs */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Deal Parameters</h3>

                    <div className="space-y-4">
                        <div className={`${activeContract ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Select Client</label>
                            <select
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                value={selectedClientId}
                                onChange={(e) => {
                                    const clientId = e.target.value;
                                    setSelectedClientId(clientId);
                                    // Find and set the full client object
                                    const client = clients.find(c => c.id.toString() === clientId);
                                    if (client) {
                                        setSelectedClient(client);
                                    } else {
                                        setSelectedClient(null);
                                    }
                                }}
                            >
                                <option value="">-- Choose Client --</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} (Credit: {c.credit_score || 0})</option>
                                ))}
                            </select>
                        </div>

                        <div className={`${activeContract ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Asset Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="asset_name"
                                value={formData.asset_name}
                                onChange={handleChange}
                                placeholder="e.g., Commercial Vehicle, Machinery, Real Estate Property"
                                disabled={activeContract}
                                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Description of the item being financed</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Asset Price</label>
                                <input
                                    type="number"
                                    name="asset_price"
                                    value={formData.asset_price}
                                    onChange={handleChange}
                                    disabled={activeContract}
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Profit Rate (0.05)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="annual_profit_rate"
                                    value={formData.annual_profit_rate}
                                    onChange={handleChange}
                                    disabled={activeContract}
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none bg-gray-50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Duration (Mos)</label>
                                <input
                                    type="number"
                                    name="duration_months"
                                    value={formData.duration_months}
                                    onChange={handleChange}
                                    disabled={activeContract}
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Down Payment %</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="down_payment_percentage"
                                    value={formData.down_payment_percentage}
                                    onChange={handleChange}
                                    disabled={activeContract}
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none bg-gray-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Security Deposit (Hamish Jiddiyyah)</label>
                            <input
                                type="number"
                                name="security_deposit"
                                value={formData.security_deposit}
                                onChange={handleChange}
                                placeholder="Leave 0 for default 2.5%"
                                disabled={activeContract}
                                className="w-full p-3 border border-gray-200 rounded-lg outline-none bg-gray-50"
                            />
                        </div>

                        {/* Workflow Actions */}
                        <div className="pt-4 space-y-3">
                            {/* Reset Form Button */}
                            {(formData.asset_name || selectedClientId || result || activeContract) && (
                                <button
                                    onClick={handleResetForm}
                                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex justify-center items-center gap-2"
                                >
                                    <span>🔄</span>
                                    <span>Reset Form / New Deal</span>
                                </button>
                            )}
                            
                            {/* Step 1: Calculate */}
                            {!activeContract && (
                                <button
                                    onClick={handleCalculate}
                                    disabled={loading || !formData.asset_name.trim()}
                                    className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-colors flex justify-center items-center ${
                                        loading || !formData.asset_name.trim()
                                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                            : 'bg-gray-800 hover:bg-gray-900 text-white'
                                    }`}
                                >
                                    {loading ? "Calculating..." : "1. Calculate & Preview"}
                                </button>
                            )}
                            {!activeContract && !formData.asset_name.trim() && (
                                <p className="text-xs text-red-500 text-center">
                                    * Please enter an Asset Name to proceed
                                </p>
                            )}

                            {/* Step 2: Generate Promise */}
                            {result && !activeContract && (
                                <button
                                    onClick={handleGeneratePromise}
                                    disabled={saveLoading}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors flex justify-center items-center"
                                >
                                    {saveLoading ? "Saving..." : "2. Generate Promise (Wa'd)"}
                                </button>
                            )}

                            {activeContract && currentStatus === 'PROMISE' && (
                                <button onClick={handlePrintPromise} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg border border-gray-300 transition-colors">
                                    🖨️ Print Promise to Purchase
                                </button>
                            )}

                            {/* Step 3: Asset Owned */}
                            {activeContract && currentStatus === 'PROMISE' && (
                                <button
                                    onClick={() => updateStatus('ASSET_OWNED')}
                                    disabled={saveLoading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors flex justify-center items-center"
                                >
                                    3. Confirm Asset Purchased (Bank Ownership)
                                </button>
                            )}

                            {/* Step 4: Murabaha Sale with Soroban Integration */}
                            {activeContract && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 shadow-sm">
                                        <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                            <span>⛓️</span>
                                            <span>Blockchain Execution (Soroban)</span>
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs mb-3 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                            <span>Network: Stellar Futurenet</span>
                                        </div>

                                        {/* Display transaction hash if available */}
                                        {activeContract.transactionHash && (
                                            <div className="bg-green-50 border border-green-100 p-3 rounded-md mb-3">
                                                <p className="text-xs text-green-600 font-medium mb-1">Transaction Recorded</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-600 truncate">{activeContract.transactionHash}</span>
                                                    <a 
                                                        href={`https://stellar.expert/explorer/futurenet/tx/${activeContract.transactionHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-500 hover:text-blue-700"
                                                    >
                                                        View on Explorer
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {/* Soroban Smart Contract Button */}
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setSaveLoading(true);
                                                    setError(null);
                                                    
                                                    // Call blockchain manager to execute Soroban deal
                                                    const result = await blockchainManager.recordMurabahaDeal(
                                                        `Mizan:${activeContract.id}`,
                                                        selectedClient?.address || '',
                                                        parseInt(formData.asset_price),
                                                        parseInt(result?.summary?.total_profit || 0)
                                                    );
                                                    
                                                    // Add transaction hash to activeContract
                                                    setActiveContract(prev => ({ 
                                                        ...prev, 
                                                        transactionHash: result.transactionHash,
                                                        sorobanDealId: result.dealId
                                                    }));
                                                    
                                                    // Also update status to SALE_SIGNED
                                                    await updateStatus('SALE_SIGNED');
                                                    
                                                    setSuccess('Smart contract executed successfully!');
                                                } catch (err) {
                                                    console.error('Smart contract error:', err);
                                                    setError(`Smart contract error: ${err.message}`);
                                                } finally {
                                                    setSaveLoading(false);
                                                }
                                            }}
                                            disabled={saveLoading || currentStatus !== 'ASSET_OWNED' || currentStatus === 'SALE_SIGNED'}
                                            className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all flex justify-center items-center ${currentStatus === 'ASSET_OWNED'
                                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transform hover:scale-[1.02]'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            {saveLoading ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Waiting for wallet...</span>
                                                </div>
                                            ) : currentStatus === 'SALE_SIGNED' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>✅</span>
                                                    <span>Smart Contract Executed</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>✍️</span>
                                                    <span>Sign & Execute Smart Contract</span>
                                                </div>
                                            )}
                                        </button>

                                        {/* Traditional contract signing button as fallback */}
                                        {currentStatus === 'ASSET_OWNED' && (
                                            <div className="mt-2 text-center">
                                                <p className="text-xs text-gray-500 mb-2">-- OR --</p>
                                                <button
                                                    onClick={() => updateStatus('SALE_SIGNED')}
                                                    disabled={saveLoading}
                                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                                >
                                                    Continue with traditional contract signing
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeContract && currentStatus === 'SALE_SIGNED' && (
                                <button onClick={handlePrintContract} className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold py-3 px-6 rounded-lg border border-orange-200 transition-colors">
                                    🖨️ Print Murabaha Contract
                                </button>
                            )}

                            {currentStatus !== 'ASSET_OWNED' && activeContract && currentStatus !== 'SALE_SIGNED' && (
                                <p className="text-xs text-red-500 text-center">
                                    * You cannot sign the contract until the Asset is Owned by the Bank.
                                </p>
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Financial Summary {result && result.summary.security_deposit > 0 && "(Includes Hamish)"}</h3>

                    {result ? (
                        <div className="space-y-6">
                            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <p className="text-sm text-gray-500 uppercase">Monthly Installment</p>
                                <p className="text-4xl font-extrabold text-orange-600">
                                    ${result.summary.monthly_installment.toLocaleString()}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Total Profit</p>
                                    <p className="text-xl font-bold text-gray-800">
                                        ${result.summary.total_profit.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                                    <p className="text-xl font-bold text-gray-800">
                                        ${(result.summary.total_cost || result.summary.total_selling_price || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Financed Amt</p>
                                    <p className="text-lg font-semibold text-gray-700">
                                        ${(result.summary.financed_amount || result.summary.principal_financed || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Total Down Payment</p>
                                    <p className="text-lg font-semibold text-gray-700">
                                        ${(result.summary.total_down_payment || result.summary.down_payment || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        (Hamish: ${(result.summary.security_deposit || 0).toLocaleString()})
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <p>Enter parameters and calculate to see results</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Table */}
            {result && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Amortization Schedule</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Month</th>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium text-right">Beginning Bal</th>
                                    <th className="px-6 py-3 font-medium text-right">Principal</th>
                                    <th className="px-6 py-3 font-medium text-right">Profit</th>
                                    <th className="px-6 py-3 font-medium text-right">Payment</th>
                                    <th className="px-6 py-3 font-medium text-right">Remaining</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {result.schedule && result.schedule.length > 0 ? (
                                    result.schedule.map((row, index) => {
                                        // Adapter for new FinancialEngine keys
                                        const month = row.month || row.month_no;
                                        const date = row.date || row.due_date;
                                        const payment = row.monthly_installment || row.installment || 0;
                                        const principal = row.principal_paid || row.principal_component || 0;
                                        const profit = row.profit_portion || row.profit_component || 0;
                                        const remaining = row.remaining_balance || 0;

                                        // Calculate beginning balance if missing (Back-calc from remaining + payment - profit? No, Rem + Principal)
                                        // Or just approximate: Remaining + Principal
                                        const beginning = row.beginning_balance || (remaining + principal);

                                        return (
                                            <tr key={month || index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-gray-900">{month}</td>
                                                <td className="px-6 py-3 text-gray-600">{date}</td>
                                                <td className="px-6 py-3 text-right text-gray-600">${beginning.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-3 text-right text-indigo-600">${principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-3 text-right text-green-600">${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-3 text-right font-medium text-gray-900">${payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-3 text-right text-gray-600">${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                            No schedule data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Download Button */}
            {result && result.schedule && result.schedule.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={handleDownloadContract}
                        disabled={downloadLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.01] flex justify-center items-center gap-2"
                        style={{ backgroundColor: '#28a745' }}
                    >
                        {downloadLoading ? (
                            <span>Generating PDF...</span>
                        ) : (
                            <>
                                <span>📄</span>
                                <span>DOWNLOAD OFFICIAL CONTRACT (PDF)</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MurabahaCalculator;

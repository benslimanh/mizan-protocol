import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Plus, Search, User } from 'lucide-react';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [newClient, setNewClient] = useState({
        name: '',
        credit_score: 700,
        total_debt: 0
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/clients`);
            if (response.ok) {
                const data = await response.json();
                // Ensure all clients have required fields with defaults
                const normalizedClients = (Array.isArray(data) ? data : []).map(client => ({
                    id: client.id,
                    name: client.name ?? 'Unnamed Client',
                    email: client.email ?? null,
                    credit_score: client.credit_score ?? 0,
                    total_debt: client.total_debt ?? 0 // Backend doesn't provide this, default to 0
                }));
                setClients(normalizedClients);
            } else {
                console.error('Failed to fetch clients: HTTP', response.status);
                setClients([]); // Set empty array on error
            }
        } catch (error) {
            console.error('Failed to fetch clients', error);
            setClients([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (!newClient.name || newClient.name.trim() === '') {
            setFormError('Client name is required');
            return false;
        }
        
        if (isNaN(newClient.credit_score) || newClient.credit_score < 300 || newClient.credit_score > 850) {
            setFormError('Credit score must be between 300 and 850');
            return false;
        }
        
        if (isNaN(newClient.total_debt) || newClient.total_debt < 0) {
            setFormError('Total debt must be a positive number');
            return false;
        }
        
        setFormError('');
        return true;
    };
    
    const handleCreateClient = async () => {
        if (!validateForm()) return;
        
        try {
            setIsSubmitting(true);
            setFormError('');
            
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClient)
            });
            
            if (response.ok) {
                const created = await response.json();
                // Normalize the created client to ensure all fields exist
                const normalizedClient = {
                    id: created.id,
                    name: created.name ?? newClient.name,
                    email: created.email ?? null,
                    credit_score: created.credit_score ?? newClient.credit_score ?? 700,
                    total_debt: created.total_debt ?? newClient.total_debt ?? 0
                };
                setClients([...clients, normalizedClient]);
                setShowModal(false);
                setNewClient({ name: '', credit_score: 700, total_debt: 0 }); // Reset
            } else {
                const errorData = await response.json().catch(() => ({}));
                setFormError(`Failed to create client: ${errorData.error || 'Unknown error'}`);
                console.error('Failed to create client:', errorData);
            }
        } catch (error) {
            setFormError(`Network error: ${error.message || 'Could not connect to server'}`);
            console.error('Failed to create client', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
    );

    return (
        <div className="p-8 h-full flex flex-col">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
                    <p className="text-gray-500">Corporate & Retail Profiles</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#ea580c] hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    <span>Add New Client</span>
                </button>
            </header>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center">
                <Search className="text-gray-400 mr-3" size={20} />
                <input
                    type="text"
                    placeholder="Search clients by Name or ID..."
                    className="flex-1 outline-none text-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Clients List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="enterprise-table">
                        <thead>
                            <tr>
                                <th>Client ID</th>
                                <th>Name</th>
                                <th>Credit Score</th>
                                <th className="text-right">Total Debt</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8">Loading clients...</td></tr>
                            ) : filteredClients.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No clients found.</td></tr>
                            ) : (
                                filteredClients.map(client => {
                                    // Safely get values with fallbacks
                                    const creditScore = client.credit_score ?? 0;
                                    const totalDebt = client.total_debt ?? 0;
                                    const clientName = client.name ?? 'Unnamed Client';
                                    const clientId = client.id ?? 'N/A';
                                    
                                    return (
                                        <tr key={client.id}>
                                            <td className="font-medium text-gray-900">{clientId}</td>
                                            <td className="flex items-center gap-3">
                                                <div className="bg-gray-100 p-2 rounded-full">
                                                    <User size={16} className="text-gray-500" />
                                                </div>
                                                {clientName}
                                            </td>
                                            <td>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    creditScore >= 750 ? 'bg-green-100 text-green-700' :
                                                    creditScore >= 650 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {creditScore}
                                                </span>
                                            </td>
                                            <td className="text-right font-medium">
                                                ${(typeof totalDebt === 'number' ? totalDebt.toLocaleString() : '0')}
                                            </td>
                                            <td>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button className="text-indigo-600 hover:text-indigo-900 font-medium">View</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Client</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleCreateClient();
                        }}>
                        {formError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                                {formError}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={newClient.name}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    placeholder="Enter client name..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={newClient.credit_score}
                                        onChange={(e) => setNewClient({ ...newClient, credit_score: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Debt ($)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={newClient.total_debt}
                                        onChange={(e) => setNewClient({ ...newClient, total_debt: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-4 py-2 text-white rounded font-medium flex items-center justify-center ${isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating...
                                    </>
                                ) : 'Create Client'}
                            </button>
                        </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;

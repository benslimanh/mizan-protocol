import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Clock, Hash, ExternalLink, Loader2 } from 'lucide-react';
import { recordAuditTransaction } from '../utils/stellarAudit';

const BlockchainAudit = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [auditing, setAuditing] = useState(false);

    // Load initial audit logs from local storage or API
    useEffect(() => {
        // Load saved audit logs from localStorage
        const savedLogs = localStorage.getItem('stellarAuditLogs');
        if (savedLogs) {
            try {
                const parsedLogs = JSON.parse(savedLogs);
                setLogs(parsedLogs);
            } catch (e) {
                console.error('Failed to parse saved audit logs:', e);
            }
        }
    }, []);

    const handleAuditTransaction = async () => {
        setAuditing(true);
        setError(null);
        setLoading(true);

        try {
            // Generate a test contract ID and amount for demonstration
            // In production, these would come from the actual contract
            const contractId = `CONTRACT-${Date.now()}`;
            const amount = 100000; // Example amount

            const result = await recordAuditTransaction(contractId, amount);
            
            // Create new log entry
            const newLog = {
                id: Date.now(),
                hash: result.transactionHash,
                explorerLink: result.explorerLink,
                timestamp: new Date().toISOString(),
                action: 'Murabaha_Contract_Audit',
                status: 'Verified',
                contractId: contractId,
                amount: amount,
                memo: result.memo
            };

            // Add to logs and save to localStorage
            const updatedLogs = [newLog, ...logs.slice(0, 19)];
            setLogs(updatedLogs);
            localStorage.setItem('stellarAuditLogs', JSON.stringify(updatedLogs));

            // Show success message
            alert(`Audit transaction recorded!\nHash: ${result.transactionHash}\nView on explorer: ${result.explorerLink}`);
        } catch (err) {
            console.error('Audit transaction error:', err);
            setError(err.message);
            alert(`Failed to record audit: ${err.message}`);
        } finally {
            setLoading(false);
            setAuditing(false);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-[#0f172a] text-gray-300"> {/* Dark Mode for Audit */}
            <header className="mb-6 border-b border-gray-800 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="text-green-500" size={32} />
                        <div>
                            <h1 className="text-2xl font-bold text-white">Immutable Ledger Audit</h1>
                            <p className="text-gray-500 text-sm font-mono">Network: Stellar Public Ledger (Testnet)</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAuditTransaction}
                        disabled={auditing || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                        {auditing || loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Recording...</span>
                            </>
                        ) : (
                            <>
                                <Shield size={18} />
                                <span>Audit Transaction</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    <p className="font-semibold">Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="flex-1 overflow-hidden bg-gray-900 rounded-xl border border-gray-800 shadow-2xl flex flex-col">
                <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center px-4">
                    <span className={`font-mono text-xs ${loading ? 'text-yellow-400' : 'text-green-400'}`}>
                        {loading ? '● PROCESSING...' : '● CONNECTED'}
                    </span>
                    <span className="font-mono text-xs text-gray-500">Stellar Testnet Horizon</span>
                </div>

                <div className="overflow-auto flex-1 p-2 font-mono text-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-800 text-gray-400">
                            <tr>
                                <th className="p-3">Status</th>
                                <th className="p-3">Tx Hash</th>
                                <th className="p-3">Action</th>
                                <th className="p-3">Contract ID</th>
                                <th className="p-3 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        <p>No audit transactions recorded yet.</p>
                                        <p className="text-xs mt-2">Click "Audit Transaction" to record your first transaction on Stellar Testnet.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="p-3">
                                            {log.status === 'Verified' ? (
                                                <span className="flex items-center gap-2 text-green-400">
                                                    <CheckCircle size={14} /> Verified
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-yellow-500">
                                                    <Clock size={14} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {log.explorerLink ? (
                                                <a
                                                    href={log.explorerLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2 group"
                                                    title={log.hash}
                                                >
                                                    <Hash size={12} />
                                                    <span className="truncate max-w-xs font-mono">
                                                        {log.hash.substring(0, 10)}...{log.hash.substring(log.hash.length - 8)}
                                                    </span>
                                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </a>
                                            ) : (
                                                <div className="text-gray-500 flex items-center gap-2 truncate max-w-xs" title={log.hash}>
                                                    <Hash size={12} />
                                                    {log.hash?.substring(0, 10)}...{log.hash?.substring(log.hash.length - 8)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-white">{log.action || 'Murabaha_Contract_Audit'}</td>
                                        <td className="p-3 text-gray-400 text-sm font-mono">
                                            {log.contractId || 'N/A'}
                                        </td>
                                        <td className="p-3 text-right text-gray-500">
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BlockchainAudit;

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Mock Data for Charts (keep for visual impact until we have history)
const portfolioData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 5500 },
    { name: 'Mar', value: 7000 },
    { name: 'Apr', value: 12000 },
    { name: 'May', value: 18000 },
    { name: 'Jun', value: 24000 },
];

const distributionData = [
    { name: 'Murabaha', value: 65, color: '#ea580c' },
    { name: 'Ijara', value: 25, color: '#f97316' },
    { name: 'Musharaka', value: 10, color: '#fdba74' },
];

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalAssets: 0,
        activeClients: 0,
        pendingClients: 0,
        systemHealth: 'Checking...',
        loading: true
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Parallel fetch
            const [clientsRes, contractsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/clients`),
                fetch(`${API_BASE_URL}/api/contracts`)
            ]);

            if (!clientsRes.ok || !contractsRes.ok) throw new Error("API Error");

            const clients = await clientsRes.json();
            const contracts = await contractsRes.json();

            // Calculate Stats
            const totalAssets = contracts.reduce((sum, c) => sum + (c.asset_price || 0), 0);
            const active = clients.filter(c => c.status === 'Active').length;
            const pending = clients.length - active; // Or explicit 'Pending' check

            setStats({
                totalAssets,
                activeClients: active,
                pendingClients: pending,
                systemHealth: 'Operational',
                loading: false
            });

        } catch (error) {
            console.error("Dashboard fetch error:", error);
            setStats(prev => ({
                ...prev,
                loading: false,
                systemHealth: 'Offline'
            }));
        }
    };

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Enterprise Dashboard</h1>
                <p className="text-gray-500">Mizan Software Overview</p>
            </header>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Active Assets</h3>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-4xl font-extrabold text-[#ea580c]">
                            {stats.loading ? "..." : `$${stats.totalAssets.toLocaleString()}`}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-green-600 font-medium">Real-time Data</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Clients</h3>
                    <div className="mt-2 flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                            {stats.loading ? "..." : stats.activeClients}
                        </span>
                        {stats.pendingClients > 0 && (
                            <span className="ml-2 text-sm text-orange-500">({stats.pendingClients} Pending)</span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Registered Profiles</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">System Health</h3>
                    <div className="flex items-center mt-3 gap-2">
                        <span className="relative flex h-3 w-3">
                            {stats.systemHealth === 'Operational' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.systemHealth === 'Operational' ? 'bg-green-500' : 'bg-red-500'
                                }`}></span>
                        </span>
                        <span className={`text-lg font-semibold ${stats.systemHealth === 'Operational' ? 'text-gray-700' : 'text-red-600'
                            }`}>
                            {stats.systemHealth}
                        </span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Area Chart: Portfolio Growth */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Portfolio Growth</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={portfolioData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart: Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Contract Types</h3>
                    <div className="h-64 flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {distributionData.map(d => (
                            <div key={d.name} className="flex items-center gap-1 text-xs text-gray-500">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                {d.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;

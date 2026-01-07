const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const path = require('path');
const StellarSdk = require('@stellar/stellar-sdk');

// 1. Initialize App
const app = express();
app.use(cors()); // Allow all
app.use(express.json());

// 1.5. Stellar Configuration
// Load from .env file or use a default placeholder for development
const BANK_SECRET_KEY = process.env.VITE_STELLAR_BANK_SECRET_KEY || 'YOUR_STELLAR_SECRET_KEY_HERE';
const stellarServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET;

// 2. Database Setup (Handle errors gracefully)
const dbPath = path.resolve(__dirname, 'mizan.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('DB Connection Error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initTables();
    }
});

function initTables() {
    db.serialize(() => {
        // Audit Logs
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_action TEXT NOT NULL,
            details TEXT,
            ip_hash TEXT
        )`);

        // Clients
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            credit_score INTEGER DEFAULT 0
        )`);

        // Contracts
        db.run(`CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            client_name TEXT,
            asset_name TEXT,
            total_amount REAL,
            contract_date TEXT,
            status TEXT DEFAULT 'DRAFT',
            stellar_hash TEXT,
            asset_price REAL,
            annual_profit_rate REAL,
            duration_months INTEGER,
            down_payment_percentage REAL,
            security_deposit REAL,
            financed_amount REAL,
            total_profit REAL,
            total_cost REAL,
            schedule_json TEXT
        )`);
        
        // Add new columns to existing contracts table if they don't exist
        db.run(`ALTER TABLE contracts ADD COLUMN status TEXT DEFAULT 'DRAFT'`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN stellar_hash TEXT`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN client_id INTEGER`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN asset_price REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN annual_profit_rate REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN duration_months INTEGER`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN down_payment_percentage REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN security_deposit REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN financed_amount REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN total_profit REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN total_cost REAL`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE contracts ADD COLUMN schedule_json TEXT`, (err) => {
            // Ignore error if column already exists
        });
    });
}

// 2.5. Stellar Blockchain Helper Function
async function logContractToBlockchain(contractId, assetName, amount) {
    try {
        // Validate secret key is configured
        if (!BANK_SECRET_KEY || BANK_SECRET_KEY === 'YOUR_STELLAR_SECRET_KEY_HERE') {
            throw new Error('Stellar secret key not configured. Please set VITE_STELLAR_BANK_SECRET_KEY in your .env file');
        }

        // Load the bank account
        const bankKeypair = StellarSdk.Keypair.fromSecret(BANK_SECRET_KEY);
        const bankAccount = await stellarServer.loadAccount(bankKeypair.publicKey());

        // Create a loopback transaction (sending 1 XLM to itself)
        const transaction = new StellarSdk.TransactionBuilder(bankAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: networkPassphrase
        })
            .addOperation(
                StellarSdk.Operation.payment({
                    destination: bankKeypair.publicKey(), // Sending to itself
                    asset: StellarSdk.Asset.native(),
                    amount: '1' // 1 XLM
                })
            )
            .addMemo(
                StellarSdk.Memo.text(`Murabaha-${contractId}-${assetName}`)
            )
            .setTimeout(30)
            .build();

        // Sign the transaction
        transaction.sign(bankKeypair);

        // Submit to the network
        const result = await stellarServer.submitTransaction(transaction);
        
        console.log(`Contract ${contractId} logged to Stellar. Hash: ${result.hash}`);
        return result.hash;
    } catch (error) {
        console.error('Stellar transaction error:', error);
        throw error;
    }
}

// 3. API Routes

// Health Check
app.get('/', (req, res) => res.json({ status: 'Mizan Node.js Backend Running' }));

// 3.1. Clients API Endpoints

// GET /api/clients - Retrieve all clients
app.get('/api/clients', (req, res) => {
    db.all('SELECT * FROM clients ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching clients:', err);
            return res.status(500).json({ error: 'Failed to fetch clients' });
        }
        res.json(rows || []);
    });
});

// POST /api/clients - Create a new client
app.post('/api/clients', (req, res) => {
    const { name, email, credit_score } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Client name is required' });
    }

    db.run(
        'INSERT INTO clients (name, email, credit_score) VALUES (?, ?, ?)',
        [name, email || null, credit_score || 0],
        function(err) {
            if (err) {
                console.error('Error creating client:', err);
                return res.status(500).json({ error: 'Failed to create client' });
            }
            
            // Return the created client
            db.get('SELECT * FROM clients WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                    console.error('Error fetching created client:', err);
                    return res.status(500).json({ error: 'Client created but failed to retrieve' });
                }
                res.status(201).json(row);
            });
        }
    );
});

// 3.2. Contracts API Endpoints

// GET /api/contracts - Retrieve all contracts
app.get('/api/contracts', (req, res) => {
    db.all('SELECT * FROM contracts ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching contracts:', err);
            return res.status(500).json({ error: 'Failed to fetch contracts' });
        }
        
        // Parse schedule_json if it exists
        const contracts = (rows || []).map(contract => {
            if (contract.schedule_json) {
                try {
                    contract.schedule = JSON.parse(contract.schedule_json);
                } catch (e) {
                    console.error('Error parsing schedule_json:', e);
                }
            }
            return contract;
        });
        
        res.json(contracts);
    });
});

// POST /api/contracts - Create a new contract and log to blockchain
app.post('/api/contracts', async (req, res) => {
    try {
        const {
            client_id,
            asset_price,
            annual_profit_rate,
            duration_months,
            down_payment_percentage,
            security_deposit,
            asset_name,
            financed_amount,
            total_profit,
            total_cost,
            schedule
        } = req.body;

        // Validate required fields
        if (!client_id || !asset_price || !asset_name) {
            return res.status(400).json({ 
                error: 'Missing required fields: client_id, asset_price, and asset_name are required' 
            });
        }

        // Get client name from database
        let clientName = null;
        db.get('SELECT name FROM clients WHERE id = ?', [client_id], async (err, clientRow) => {
            if (err) {
                console.error('Error fetching client:', err);
                return res.status(500).json({ error: 'Failed to fetch client information' });
            }

            if (!clientRow) {
                return res.status(404).json({ error: 'Client not found' });
            }

            clientName = clientRow.name;

            // Calculate contract date
            const contractDate = new Date().toISOString().split('T')[0];

            // Prepare schedule JSON
            const scheduleJson = schedule ? JSON.stringify(schedule) : null;

            // Insert contract into database (initially without stellar_hash)
            db.run(
                `INSERT INTO contracts (
                    client_id, client_name, asset_name, asset_price,
                    annual_profit_rate, duration_months, down_payment_percentage,
                    security_deposit, financed_amount, total_profit, total_cost,
                    total_amount, contract_date, status, schedule_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
                [
                    client_id,
                    clientName,
                    asset_name,
                    asset_price,
                    annual_profit_rate || null,
                    duration_months || null,
                    down_payment_percentage || null,
                    security_deposit || 0,
                    financed_amount || null,
                    total_profit || null,
                    total_cost || null,
                    total_cost || null,
                    contractDate,
                    scheduleJson
                ],
                async function(insertErr) {
                    if (insertErr) {
                        console.error('Error creating contract:', insertErr);
                        return res.status(500).json({ error: 'Failed to create contract in database' });
                    }

                    const contractId = this.lastID;
                    let stellarHash = null;
                    let blockchainError = null;

                    // Attempt to log to blockchain
                    try {
                        stellarHash = await logContractToBlockchain(contractId, asset_name, total_cost || asset_price);
                        
                        // Update contract with stellar_hash
                        db.run(
                            'UPDATE contracts SET stellar_hash = ? WHERE id = ?',
                            [stellarHash, contractId],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error('Error updating contract with stellar hash:', updateErr);
                                }
                            }
                        );
                    } catch (blockchainErr) {
                        console.error('Blockchain logging failed for contract', contractId, ':', blockchainErr);
                        blockchainError = blockchainErr.message;
                        // Contract is still saved locally, we just log the error
                    }

                    // Retrieve the complete contract record
                    db.get('SELECT * FROM contracts WHERE id = ?', [contractId], (fetchErr, contract) => {
                        if (fetchErr) {
                            console.error('Error fetching created contract:', fetchErr);
                            return res.status(500).json({ 
                                error: 'Contract created but failed to retrieve',
                                contractId: contractId,
                                stellarHash: stellarHash,
                                blockchainError: blockchainError
                            });
                        }

                        // Parse schedule_json if it exists
                        if (contract.schedule_json) {
                            try {
                                contract.schedule = JSON.parse(contract.schedule_json);
                            } catch (e) {
                                console.error('Error parsing schedule_json:', e);
                            }
                        }

                        // Return response with blockchain status
                        if (blockchainError) {
                            res.status(201).json({
                                ...contract,
                                contractId: contract.id,
                                stellarHash: stellarHash,
                                blockchainWarning: `Contract saved locally. Blockchain logging failed: ${blockchainError}`
                            });
                        } else {
                            res.status(201).json({
                                ...contract,
                                contractId: contract.id,
                                stellarHash: stellarHash,
                                message: 'Contract created and logged to Stellar blockchain successfully'
                            });
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Unexpected error in POST /api/contracts:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// POST /api/update_status - Update contract status
app.post('/api/update_status', (req, res) => {
    const { contract_id, status } = req.body;

    if (!contract_id || !status) {
        return res.status(400).json({ error: 'contract_id and status are required' });
    }

    // Validate status values
    const validStatuses = ['DRAFT', 'PROMISE', 'ASSET_OWNED', 'SALE_SIGNED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
    }

    db.run(
        'UPDATE contracts SET status = ? WHERE id = ?',
        [status, contract_id],
        function(err) {
            if (err) {
                console.error('Error updating contract status:', err);
                return res.status(500).json({ error: 'Failed to update contract status' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            // Return updated contract
            db.get('SELECT * FROM contracts WHERE id = ?', [contract_id], (fetchErr, contract) => {
                if (fetchErr) {
                    console.error('Error fetching updated contract:', fetchErr);
                    return res.status(500).json({ error: 'Status updated but failed to retrieve contract' });
                }

                // Parse schedule_json if it exists
                if (contract.schedule_json) {
                    try {
                        contract.schedule = JSON.parse(contract.schedule_json);
                    } catch (e) {
                        console.error('Error parsing schedule_json:', e);
                    }
                }

                res.json({ 
                    message: 'Contract status updated successfully',
                    status: contract.status,
                    contract: contract
                });
            });
        }
    );
});

app.post('/api/calculate', (req, res) => {
    try {
        // Normalize logic from Python/Frontend
        const { asset_price, annual_profit_rate, duration_months, down_payment_percentage, security_deposit } = req.body;

        const price = parseFloat(asset_price || req.body.cost_price || 0);
        const rate = parseFloat(annual_profit_rate || req.body.margin_rate || 0);
        const months = parseInt(duration_months || req.body.months || 12);
        const downPct = parseFloat(down_payment_percentage || 0);
        const deposit = parseFloat(security_deposit || req.body.deposit || 0);

        // Calc
        const downPayment = (price * downPct) + deposit;
        const financed = price - downPayment;

        // Handle Rate (5 vs 0.05)
        const rateDecimal = rate > 1 ? rate / 100 : rate;

        const totalProfit = financed * rateDecimal * (months / 12);
        const totalCost = financed + totalProfit;
        const monthly = totalCost / months;

        // Schedule
        const schedule = [];
        let remaining = totalCost;
        const monthlyPrincipal = financed / months;
        const monthlyProfit = totalProfit / months;
        const date = new Date();
        date.setMonth(date.getMonth() + 1);

        for (let i = 1; i <= months; i++) {
            const dateStr = date.toISOString().split('T')[0];

            let payment = monthly;
            if (i === months) payment = remaining; // Adjust last

            remaining -= payment;
            if (remaining < 0) remaining = 0;

            const beginning = remaining + payment;

            schedule.push({
                month: i,
                date: dateStr,
                beginning_balance: beginning,
                principal_paid: monthlyPrincipal,
                profit_portion: monthlyProfit,
                monthly_installment: payment,
                remaining_balance: remaining
            });

            date.setMonth(date.getMonth() + 1);
        }

        res.json({
            summary: {
                asset_price: price,
                total_down_payment: downPayment,
                financed_amount: financed,
                total_profit: totalProfit,
                total_cost: totalCost,
                monthly_installment: monthly,
                security_deposit: deposit
            },
            schedule: schedule
        });
    } catch (err) {
        console.error("Calculation Error:", err);
        res.status(500).json({ error: "Calculation failed internally" });
    }
});

app.get('/api/dashboard', (req, res) => {
    res.json({
        kpi: {
            volume: 500000,
            active_deals: 5,
            profit_ytd: 25000
        },
        chart_data: [
            { name: 'Jan', value: 4000 },
            { name: 'Feb', value: 3000 },
            { name: 'Mar', value: 2000 },
            { name: 'Apr', value: 2780 },
            { name: 'May', value: 1890 },
            { name: 'Jun', value: 2390 },
        ]
    });
});

app.post('/api/generate-contract', (req, res) => {
    try {
        const { clientName, assetName, cost, profit, total, installments } = req.body;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=contract.pdf');
        doc.pipe(res);

        // Styles
        const primaryColor = '#ea580c';
        const darkColor = '#000000';

        // Watermark
        doc.save();
        doc.rotate(-45, { origin: [300, 400] });
        doc.fontSize(60).fillColor('#f3f4f6').opacity(0.5).text('OFFICIAL DOCUMENT', 100, 400, { align: 'center' });
        doc.restore();

        // Header
        doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('MIZAN ISLAMIC BANK', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('Excellence in Sharia Compliant Finance', { align: 'center' });
        doc.moveDown(2);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').fillColor(darkColor).text('MURABAHA FINANCING AGREEMENT', { align: 'center', underline: true });
        doc.moveDown();

        const contractId = 'MZN-' + Math.floor(Math.random() * 1000000);
        doc.fontSize(10).font('Helvetica').fillColor(darkColor).text(`Contract Reference: ${contractId}`, { align: 'right' });
        doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown(2);

        // Parties
        doc.font('Helvetica-Bold').text('BETWEEN:');
        doc.font('Helvetica').text('1. MIZAN ISLAMIC BANK (The "Seller")');
        doc.text(`2. ${clientName || 'Valued Client'} (The "Buyer")`);
        doc.moveDown();

        // Subject
        doc.font('Helvetica-Bold').text('SUBJECT MATTER:');
        doc.font('Helvetica').text(`The Seller agrees to sell and the Buyer agrees to purchase the following asset: ${assetName || 'Unspecified Asset'}`);
        doc.moveDown();

        // Financials Box
        doc.rect(50, doc.y, 495, 80).fillAndStroke('#f9fafb', '#e5e7eb');
        doc.fillColor(darkColor).moveDown(0.5);

        const startY = doc.y;
        doc.text(`Cost Price: $${(cost || 0).toLocaleString()}`, 70, startY + 10);
        doc.text(`Profit Margin: $${(profit || 0).toLocaleString()}`, 70, startY + 30);
        doc.font('Helvetica-Bold').text(`Total Selling Price: $${(total || 0).toLocaleString()}`, 70, startY + 50);
        doc.moveDown(4);

        // Schedule Preview
        doc.font('Helvetica-Bold').text('PAYMENT SCHEDULE (First 5 Months):', 50, doc.y);
        doc.moveDown();

        let y = doc.y;
        doc.rect(50, y, 495, 20).fill('#e5e7eb');
        doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9);
        doc.text('Month', 60, y + 5);
        doc.text('Date', 120, y + 5);
        doc.text('Installment', 250, y + 5);
        doc.text('Balance', 400, y + 5);

        y += 25;
        doc.font('Helvetica').fontSize(9);

        if (installments && Array.isArray(installments)) {
            installments.slice(0, 5).forEach((row) => {
                doc.text(`${row.month}`, 60, y);
                doc.text(`${row.date}`, 120, y);
                doc.text(`$${(row.monthly_installment || 0).toLocaleString()}`, 250, y);
                doc.text(`$${(row.remaining_balance || 0).toLocaleString()}`, 400, y);
                y += 20;
            });
            if (installments.length > 5) {
                doc.font('Helvetica-Oblique').text(`... and ${installments.length - 5} more installments`, 60, y);
                y += 20;
            }
        }

        doc.moveDown(4);

        // Signatures
        y = 700;
        doc.lineWidth(1).strokeColor(darkColor);
        doc.moveTo(70, y).lineTo(250, y).stroke();
        doc.text('For and on behalf of Mizan Bank', 70, y + 10);
        doc.moveTo(350, y).lineTo(530, y).stroke();
        doc.text('Buyer Signature', 350, y + 10);

        doc.end();
    } catch (e) {
        console.error("PDF Error:", e);
        res.status(500).send("Error generating PDF");
    }
});

// 4. THE FIX: FORCE KEEP-ALIVE
const PORT = 8000;
const server = app.listen(PORT, () => {
    console.log(`>>> SERVER LOCKED ON PORT ${PORT} <<<`);
});

// PREVENT EXIT: Ping itself every 5 seconds to keep Event Loop active
setInterval(() => {
    // This empty interval prevents Node from thinking "I have nothing to do"
}, 5000);

// Global Error Handlers (Don't crash)
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

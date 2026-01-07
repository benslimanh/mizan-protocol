#![no_std]
use soroban_sdk::{contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol};

// Define the MurabahaDeal struct with required fields
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MurabahaDeal {
    pub client_address: Address,
    pub asset_price: i128,
    pub profit_margin: i128,
    pub total_debt: i128,
    pub is_paid: bool,
}

// Define the contract
pub struct MurabahaContract;

// Storage keys for the contract
const DEALS: Symbol = symbol_short!("DEALS");
const DEAL_COUNTER: Symbol = symbol_short!("COUNTER");

#[contractimpl]
impl MurabahaContract {
    // Create a new Murabaha deal
    pub fn create_deal(env: Env, client: Address, price: i128, profit: i128) -> i128 {
        // Validate inputs
        if price <= 0 || profit < 0 {
            panic!("Invalid price or profit values");
        }
        
        // Calculate total debt (price + profit)
        let total_debt = price + profit;
        
        // Create a new MurabahaDeal instance
        let deal = MurabahaDeal {
            client_address: client,
            asset_price: price,
            profit_margin: profit,
            total_debt,
            is_paid: false,
        };
        
        // Get the current deal counter or initialize if it doesn't exist
        let mut counter: i128 = env.storage().instance().get(&DEAL_COUNTER).unwrap_or(0);
        
        // Increment counter for new deal ID
        counter += 1;
        
        // Store the deal in the contract storage with the counter as the key
        let mut deals: Map<i128, MurabahaDeal> = env.storage().instance().get(&DEALS).unwrap_or(Map::new(&env));
        deals.set(counter, deal);
        
        // Update storage
        env.storage().instance().set(&DEALS, &deals);
        env.storage().instance().set(&DEAL_COUNTER, &counter);
        
        // Return the deal ID (counter)
        counter
    }
    
    // Get a deal by ID
    pub fn get_deal(env: Env, deal_id: i128) -> MurabahaDeal {
        // Get the deals map from storage
        let deals: Map<i128, MurabahaDeal> = env.storage().instance().get(&DEALS).unwrap_or_else(|| {
            panic!("No deals found");
        });
        
        // Get the specific deal
        deals.get(deal_id).unwrap_or_else(|| {
            panic!("Deal not found");
        })
    }
    
    // Mark a deal as paid
    pub fn mark_as_paid(env: Env, deal_id: i128) -> bool {
        // Get the deals map from storage
        let mut deals: Map<i128, MurabahaDeal> = env.storage().instance().get(&DEALS).unwrap_or_else(|| {
            panic!("No deals found");
        });
        
        // Get the specific deal
        let mut deal = deals.get(deal_id).unwrap_or_else(|| {
            panic!("Deal not found");
        });
        
        // Update deal status
        deal.is_paid = true;
        
        // Update storage
        deals.set(deal_id, deal);
        env.storage().instance().set(&DEALS, &deals);
        
        true
    }
    
    // Get all deal IDs for a client
    pub fn get_client_deals(env: Env, client: Address) -> Vec<i128> {
        // Get the deals map from storage
        let deals: Map<i128, MurabahaDeal> = env.storage().instance().get(&DEALS).unwrap_or_else(|| {
            return Vec::new(&env);
        });
        
        // Filter deals by client address
        let mut client_deals = Vec::new(&env);
        let keys = deals.keys();
        
        for deal_id in keys.iter() {
            let deal = deals.get(deal_id).unwrap();
            if deal.client_address == client {
                client_deals.push_back(deal_id);
            }
        }
        
        client_deals
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};
    
    #[test]
    fn test_create_deal() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MurabahaContract);
        let client = Address::random(&env);
        
        let price = 5000;
        let profit = 500;
        
        let deal_id = MurabahaContract::client(&env, &contract_id).create_deal(&client, &price, &profit);
        assert_eq!(deal_id, 1);
        
        let deal = MurabahaContract::client(&env, &contract_id).get_deal(&deal_id);
        assert_eq!(deal.client_address, client);
        assert_eq!(deal.asset_price, price);
        assert_eq!(deal.profit_margin, profit);
        assert_eq!(deal.total_debt, price + profit);
        assert_eq!(deal.is_paid, false);
    }
    
    #[test]
    fn test_mark_as_paid() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MurabahaContract);
        let client = Address::random(&env);
        
        let deal_id = MurabahaContract::client(&env, &contract_id).create_deal(&client, &5000, &500);
        
        let result = MurabahaContract::client(&env, &contract_id).mark_as_paid(&deal_id);
        assert_eq!(result, true);
        
        let deal = MurabahaContract::client(&env, &contract_id).get_deal(&deal_id);
        assert_eq!(deal.is_paid, true);
    }
    
    #[test]
    fn test_get_client_deals() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MurabahaContract);
        let client1 = Address::random(&env);
        let client2 = Address::random(&env);
        
        let deal_id1 = MurabahaContract::client(&env, &contract_id).create_deal(&client1, &5000, &500);
        let deal_id2 = MurabahaContract::client(&env, &contract_id).create_deal(&client1, &3000, &300);
        let _deal_id3 = MurabahaContract::client(&env, &contract_id).create_deal(&client2, &2000, &200);
        
        let client1_deals = MurabahaContract::client(&env, &contract_id).get_client_deals(&client1);
        assert_eq!(client1_deals.len(), 2);
        assert!(client1_deals.contains(&deal_id1));
        assert!(client1_deals.contains(&deal_id2));
    }
}

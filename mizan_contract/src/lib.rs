#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct MurabahaDeal {
    pub client: Address,
    pub asset_price: i128,
    pub profit: i128,
    pub total_debt: i128,
    pub is_paid: bool,
}

#[contract]
pub struct MurabahaContract;

#[contractimpl]
impl MurabahaContract {
    // Create a new deal and store it
    pub fn create_deal(env: Env, deal_id: u64, client: Address, price: i128, profit: i128) {
        let total = price + profit;
        let deal = MurabahaDeal {
            client,
            asset_price: price,
            profit,
            total_debt: total,
            is_paid: false,
        };
        env.storage().instance().set(&deal_id, &deal);
    }

    // Retrieve deal details
    pub fn get_deal(env: Env, deal_id: u64) -> Option<MurabahaDeal> {
        env.storage().instance().get(&deal_id)
    }
}

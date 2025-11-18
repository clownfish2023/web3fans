// Copyright (c) Web3Fans
// SPDX-License-Identifier: MIT

#[test_only]
module web3fans::group_tests;

use web3fans::group::{Self, Group, GroupAdminCap, Subscription};
use sui::test_scenario::{Self as ts, Scenario};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use std::string;

const ADMIN: address = @0xAD;
const USER1: address = @0x1;
const USER2: address = @0x2;

fun setup_test(): (Scenario, Clock) {
    let mut scenario = ts::begin(ADMIN);
    let clock = clock::create_for_testing(scenario.ctx());
    
    // Initialize the module
    {
        group::init_for_testing(scenario.ctx());
    };
    
    (scenario, clock)
}

#[test]
fun test_create_group() {
    let (mut scenario, clock) = setup_test();
    
    // Create group
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        
        let (name, desc, fee, period, members, max) = group::get_group_info(&group);
        assert!(name == string::utf8(b"Test Group"), 0);
        assert!(fee == 1000000000, 1);
        assert!(members == 0, 2);
        
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}

#[test]
fun test_subscribe_to_group() {
    let (mut scenario, mut clock) = setup_test();
    
    // Create group
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    // User subscribes
    ts::next_tx(&mut scenario, USER1);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let payment = coin::mint_for_testing<SUI>(1000000000, scenario.ctx());
        
        let subscription = group::subscribe(
            &mut group,
            payment,
            string::utf8(b"telegram_user_1"),
            &clock,
            scenario.ctx()
        );
        
        let (group_id, subscriber, telegram_id, subscribed_at, expires_at) = 
            group::get_subscription_info(&subscription);
        
        assert!(subscriber == USER1, 0);
        assert!(telegram_id == string::utf8(b"telegram_user_1"), 1);
        assert!(subscribed_at == 0, 2);
        assert!(expires_at == 86400000, 3); // 1 day later
        
        transfer::public_transfer(subscription, USER1);
        ts::return_shared(group);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}

#[test]
fun test_subscription_expiry() {
    let (mut scenario, mut clock) = setup_test();
    
    // Create group
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    // User subscribes
    ts::next_tx(&mut scenario, USER1);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let payment = coin::mint_for_testing<SUI>(1000000000, scenario.ctx());
        
        let subscription = group::subscribe(
            &mut group,
            payment,
            string::utf8(b"telegram_user_1"),
            &clock,
            scenario.ctx()
        );
        
        // Check subscription is valid at time 0
        assert!(group::is_subscription_valid(&subscription, &group, &clock), 0);
        
        transfer::public_transfer(subscription, USER1);
        ts::return_shared(group);
    };
    
    // Check after 1 day (still valid, just before expiry)
    ts::next_tx(&mut scenario, USER1);
    {
        let group = ts::take_shared<Group>(&scenario);
        let subscription = ts::take_from_sender<Subscription>(&scenario);
        
        clock.increment_for_testing(86399999); // 1 day - 1 ms
        assert!(group::is_subscription_valid(&subscription, &group, &clock), 1);
        
        ts::return_to_sender(&scenario, subscription);
        ts::return_shared(group);
    };
    
    // Check after expiry
    ts::next_tx(&mut scenario, USER1);
    {
        let group = ts::take_shared<Group>(&scenario);
        let subscription = ts::take_from_sender<Subscription>(&scenario);
        
        clock.increment_for_testing(2); // Now expired
        assert!(!group::is_subscription_valid(&subscription, &group, &clock), 2);
        
        ts::return_to_sender(&scenario, subscription);
        ts::return_shared(group);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = group::EInvalidFee)]
fun test_subscribe_with_wrong_payment() {
    let (mut scenario, clock) = setup_test();
    
    // Create group
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    // User tries to subscribe with wrong amount
    ts::next_tx(&mut scenario, USER1);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let payment = coin::mint_for_testing<SUI>(500000000, scenario.ctx()); // Wrong amount
        
        let subscription = group::subscribe(
            &mut group,
            payment,
            string::utf8(b"telegram_user_1"),
            &clock,
            scenario.ctx()
        );
        
        transfer::public_transfer(subscription, USER1);
        ts::return_shared(group);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}


// Copyright (c) Web3Fans
// SPDX-License-Identifier: MIT

#[test_only]
module web3fans::seal_tests;

use web3fans::group::{Self, Group, GroupAdminCap};
use web3fans::seal_access::{Self, AccessKey};
use sui::test_scenario::{Self as ts, Scenario};
use sui::clock::{Self, Clock};
use sui::coin;
use sui::sui::SUI;
use std::string;

const ADMIN: address = @0xAD;
const USER1: address = @0x1;

fun setup_test(): (Scenario, Clock) {
    let mut scenario = ts::begin(ADMIN);
    let clock = clock::create_for_testing(scenario.ctx());
    
    group::init_for_testing(scenario.ctx());
    
    (scenario, clock)
}

#[test]
fun test_subscribe_with_access_key() {
    let (mut scenario, clock) = setup_test();
    
    // Admin creates group
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    // User subscribes and gets AccessKey
    ts::next_tx(&mut scenario, USER1);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let payment = coin::mint_for_testing<SUI>(1000000000, scenario.ctx());
        
        let (subscription, access_key) = group::subscribe_with_access_key(
            &mut group,
            payment,
            string::utf8(b"@user1"),
            &clock,
            scenario.ctx()
        );
        
        // Verify AccessKey is valid
        assert!(seal_access::is_access_key_valid(&access_key, &clock), 0);
        
        let (group_id, sub_id, created_at, expires_at) = 
            seal_access::get_access_key_info(&access_key);
        
        assert!(created_at == 0, 1);
        assert!(expires_at == 86400000, 2); // 1 day later
        
        transfer::public_transfer(subscription, USER1);
        transfer::public_transfer(access_key, USER1);
        ts::return_shared(group);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}

#[test]
fun test_request_report_access() {
    let (mut scenario, mut clock) = setup_test();
    
    // Admin creates group
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    // User subscribes with AccessKey
    ts::next_tx(&mut scenario, USER1);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let payment = coin::mint_for_testing<SUI>(1000000000, scenario.ctx());
        
        let (subscription, access_key) = group::subscribe_with_access_key(
            &mut group,
            payment,
            string::utf8(b"@user1"),
            &clock,
            scenario.ctx()
        );
        
        transfer::public_transfer(subscription, USER1);
        transfer::public_transfer(access_key, USER1);
        ts::return_shared(group);
    };
    
    // Admin publishes report
    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let admin_cap = ts::take_from_sender<GroupAdminCap>(&scenario);
        
        // Generate seal key ID (group_id + report_id prefix)
        let group_id_bytes = object::id_to_bytes(&object::id(&group));
        let mut seal_key_id = vector::empty<u8>();
        let mut i = 0;
        while (i < group_id_bytes.length()) {
            seal_key_id.push_back(group_id_bytes[i]);
            i = i + 1;
        };
        // Add some extra bytes for report_id
        seal_key_id.push_back(1);
        seal_key_id.push_back(2);
        seal_key_id.push_back(3);
        
        let report = group::publish_report(
            &mut group,
            &admin_cap,
            string::utf8(b"Test Report"),
            string::utf8(b"Summary"),
            string::utf8(b"walrus_blob_123"),
            seal_key_id,
            &clock,
            scenario.ctx()
        );
        
        transfer::public_share_object(report);
        ts::return_to_sender(&scenario, admin_cap);
        ts::return_shared(group);
    };
    
    // User requests access to report using AccessKey
    ts::next_tx(&mut scenario, USER1);
    {
        let group = ts::take_shared<Group>(&scenario);
        let report = ts::take_shared(&scenario);
        let access_key = ts::take_from_sender<AccessKey>(&scenario);
        
        // Request access - this should succeed
        let decryption_cap = group::request_report_access(
            &access_key,
            &report,
            &group,
            &clock
        );
        
        // Verify decryption capability
        let (report_id, key_id) = seal_access::get_decryption_capability_info(&decryption_cap);
        assert!(report_id == object::id(&report), 0);
        
        seal_access::destroy_for_testing(decryption_cap);
        ts::return_to_sender(&scenario, access_key);
        ts::return_shared(report);
        ts::return_shared(group);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = seal_access::ESubscriptionExpired)]
fun test_expired_access_key() {
    let (mut scenario, mut clock) = setup_test();
    
    // Setup group and subscription
    ts::next_tx(&mut scenario, ADMIN);
    {
        let (group, admin_cap) = group::create_test_group(scenario.ctx(), &clock);
        transfer::public_share_object(group);
        transfer::public_transfer(admin_cap, ADMIN);
    };
    
    ts::next_tx(&mut scenario, USER1);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let payment = coin::mint_for_testing<SUI>(1000000000, scenario.ctx());
        
        let (subscription, access_key) = group::subscribe_with_access_key(
            &mut group,
            payment,
            string::utf8(b"@user1"),
            &clock,
            scenario.ctx()
        );
        
        transfer::public_transfer(subscription, USER1);
        transfer::public_transfer(access_key, USER1);
        ts::return_shared(group);
    };
    
    // Publish report
    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut group = ts::take_shared<Group>(&scenario);
        let admin_cap = ts::take_from_sender<GroupAdminCap>(&scenario);
        
        let group_id_bytes = object::id_to_bytes(&object::id(&group));
        let mut seal_key_id = vector::empty<u8>();
        let mut i = 0;
        while (i < group_id_bytes.length()) {
            seal_key_id.push_back(group_id_bytes[i]);
            i = i + 1;
        };
        
        let report = group::publish_report(
            &mut group,
            &admin_cap,
            string::utf8(b"Test"),
            string::utf8(b"Summary"),
            string::utf8(b"blob_123"),
            seal_key_id,
            &clock,
            scenario.ctx()
        );
        
        transfer::public_share_object(report);
        ts::return_to_sender(&scenario, admin_cap);
        ts::return_shared(group);
    };
    
    // Advance time past expiration
    clock.increment_for_testing(86400001); // 1 day + 1 ms
    
    // Try to access with expired key - should fail
    ts::next_tx(&mut scenario, USER1);
    {
        let group = ts::take_shared<Group>(&scenario);
        let report = ts::take_shared(&scenario);
        let access_key = ts::take_from_sender<AccessKey>(&scenario);
        
        // This should abort with ESubscriptionExpired
        let decryption_cap = group::request_report_access(
            &access_key,
            &report,
            &group,
            &clock
        );
        
        seal_access::destroy_for_testing(decryption_cap);
        ts::return_to_sender(&scenario, access_key);
        ts::return_shared(report);
        ts::return_shared(group);
    };
    
    clock.destroy_for_testing();
    ts::end(scenario);
}


// Copyright (c) Web3Fans
// SPDX-License-Identifier: MIT

/// Seal-based access control module
/// Based on Sui Seal subscription pattern
/// Reference: https://github.com/MystenLabs/seal/blob/main/move/patterns/sources/subscription.move

module web3fans::seal_access;

use sui::clock::Clock;

// ====== Error codes ======
const ESubscriptionExpired: u64 = 1;
const EInvalidKeyNamespace: u64 = 2;
const EUnauthorized: u64 = 3;

// ====== Structs ======

/// AccessKey - Access Key Capability
/// Similar to access token in Seal
public struct AccessKey has key, store {
    id: UID,
    /// Associated group ID
    group_id: ID,
    /// Subscription ID
    subscription_id: ID,
    /// Key namespace (for verification)
    namespace: vector<u8>,
    /// Creation time
    created_at: u64,
    /// Expiration time
    expires_at: u64,
}

/// DecryptionCapability - Decryption Capability
/// Can only be obtained with valid AccessKey
public struct DecryptionCapability {
    /// Associated report ID
    report_id: ID,
    /// Key ID
    key_id: vector<u8>,
    /// Verification timestamp
    verified_at: u64,
}

// ====== Public Functions ======

/// Create access key
/// Created when user subscribes
public fun create_access_key(
    group_id: ID,
    subscription_id: ID,
    expires_at: u64,
    clock: &Clock,
    ctx: &mut TxContext
): AccessKey {
    // Generate namespace (using group_id as prefix)
    let namespace = object::id_to_bytes(&group_id);
    
    AccessKey {
        id: object::new(ctx),
        group_id,
        subscription_id,
        namespace,
        created_at: clock.timestamp_ms(),
        expires_at,
    }
}

/// Verify access key and generate decryption capability
/// Core of Seal pattern - verify access permissions
public fun verify_and_grant_access(
    access_key: &AccessKey,
    report_id: ID,
    report_group_id: ID,
    key_id: vector<u8>,
    clock: &Clock,
): DecryptionCapability {
    let current_time = clock.timestamp_ms();
    
    // 1. Check if access key is expired
    assert!(current_time <= access_key.expires_at, ESubscriptionExpired);
    
    // 2. Verify report belongs to this group
    assert!(access_key.group_id == report_group_id, EUnauthorized);
    
    // 3. Verify key namespace
    verify_key_namespace(&access_key.namespace, &key_id);
    
    // 4. Create decryption capability
    DecryptionCapability {
        report_id,
        key_id,
        verified_at: current_time,
    }
}

/// Verify key namespace
/// Ensure key_id starts with correct namespace
fun verify_key_namespace(namespace: &vector<u8>, key_id: &vector<u8>) {
    let ns_len = namespace.length();
    let key_len = key_id.length();
    
    // key_id must contain at least the namespace
    assert!(key_len >= ns_len, EInvalidKeyNamespace);
    
    // Verify prefix match
    let mut i = 0;
    while (i < ns_len) {
        assert!(namespace[i] == key_id[i], EInvalidKeyNamespace);
        i = i + 1;
    };
}

/// Consume decryption capability (after use)
public fun consume_decryption_capability(cap: DecryptionCapability): (ID, vector<u8>) {
    let DecryptionCapability { report_id, key_id, verified_at: _ } = cap;
    (report_id, key_id)
}

// ====== View Functions ======

/// Check if access key is valid
public fun is_access_key_valid(
    access_key: &AccessKey,
    clock: &Clock,
): bool {
    let current_time = clock.timestamp_ms();
    current_time <= access_key.expires_at
}

/// Get access key info
public fun get_access_key_info(access_key: &AccessKey): (ID, ID, u64, u64) {
    (
        access_key.group_id,
        access_key.subscription_id,
        access_key.created_at,
        access_key.expires_at
    )
}

/// Get decryption capability info (for off-chain verification)
public fun get_decryption_capability_info(cap: &DecryptionCapability): (ID, vector<u8>) {
    (cap.report_id, cap.key_id)
}

// ====== Test Helper Functions ======

#[test_only]
public fun create_test_access_key(
    group_id: ID,
    subscription_id: ID,
    ctx: &mut TxContext,
    clock: &Clock
): AccessKey {
    let expires_at = clock.timestamp_ms() + 86400000; // 1 day
    create_access_key(group_id, subscription_id, expires_at, clock, ctx)
}

#[test_only]
public fun destroy_for_testing(cap: DecryptionCapability) {
    let DecryptionCapability { report_id: _, key_id: _, verified_at: _ } = cap;
}


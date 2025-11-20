// Copyright (c) Web3Fans
// SPDX-License-Identifier: MIT

/// Group management module for Web3 investment research subscription platform
/// Allows creation and management of research groups with subscription-based access
module web3fans::group;

use std::string::String;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::clock::Clock;
use sui::event;
use web3fans::seal_access::{Self, AccessKey, DecryptionCapability};

// ====== Error codes ======
const ENotGroupOwner: u64 = 1;
const EGroupFull: u64 = 2;
const EInvalidFee: u64 = 3;
const ESubscriptionExpired: u64 = 4;
const EInvalidSubscription: u64 = 6;

// ====== Version Management ======
const VERSION: u64 = 1;

/// Package version for upgrade management
public struct PackageVersion has key {
    id: UID,
    version: u64,
}

public struct PackageVersionCap has key {
    id: UID,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(PackageVersion {
        id: object::new(ctx),
        version: VERSION,
    });
    transfer::transfer(
        PackageVersionCap { id: object::new(ctx) },
        ctx.sender()
    );
}

// ====== Core Structs ======

/// Research Group - shared object
public struct Group has key, store {
    id: UID,
    /// Group name
    name: String,
    /// Group description
    description: String,
    /// Group owner address
    owner: address,
    /// Subscription fee in SUI (MIST)
    subscription_fee: u64,
    /// Subscription period in milliseconds
    subscription_period: u64,
    /// Maximum number of members (0 = unlimited)
    max_members: u64,
    /// Current number of members
    current_members: u64,
    /// Telegram group ID
    telegram_group_id: String,
    /// Telegram invite link
    telegram_invite_link: String,
    /// Reports published in this group
    report_count: u64,
    /// Group creation timestamp
    created_at: u64,
}

/// Subscription NFT - owned by subscriber
public struct Subscription has key, store {
    id: UID,
    /// Associated group ID
    group_id: ID,
    /// Subscriber address
    subscriber: address,
    /// Telegram user ID
    telegram_id: String,
    /// Subscription start time
    subscribed_at: u64,
    /// Subscription expiry time
    expires_at: u64,
}

/// Report metadata
public struct Report has key, store {
    id: UID,
    /// Associated group ID
    group_id: ID,
    /// Report title
    title: String,
    /// Free summary
    summary: String,
    /// Walrus blob ID for encrypted content
    walrus_blob_id: String,
    /// Seal key ID for access control
    seal_key_id: vector<u8>,
    /// Publisher address
    publisher: address,
    /// Publication timestamp
    published_at: u64,
}

/// Admin capability for group management
public struct GroupAdminCap has key, store {
    id: UID,
    group_id: ID,
}

// ====== Events ======

public struct GroupCreated has copy, drop {
    group_id: ID,
    name: String,
    owner: address,
    subscription_fee: u64,
    subscription_period: u64,
    telegram_group_id: String,
}

public struct UserSubscribed has copy, drop {
    group_id: ID,
    subscription_id: ID,
    subscriber: address,
    telegram_id: String,
    expires_at: u64,
}

public struct ReportPublished has copy, drop {
    report_id: ID,
    group_id: ID,
    title: String,
    walrus_blob_id: String,
    publisher: address,
}

// ====== Public Functions ======

/// Create a new research group
public fun create_group(
    name: String,
    description: String,
    subscription_fee: u64,
    subscription_period: u64,
    max_members: u64,
    telegram_group_id: String,
    telegram_invite_link: String,
    clock: &Clock,
    ctx: &mut TxContext
): (Group, GroupAdminCap) {
    let group_uid = object::new(ctx);
    let group_id = object::uid_to_inner(&group_uid);
    
    let group = Group {
        id: group_uid,
        name,
        description,
        owner: ctx.sender(),
        subscription_fee,
        subscription_period,
        max_members,
        current_members: 0,
        telegram_group_id,
        telegram_invite_link,
        report_count: 0,
        created_at: clock.timestamp_ms(),
    };
    
    let admin_cap = GroupAdminCap {
        id: object::new(ctx),
        group_id,
    };
    
    event::emit(GroupCreated {
        group_id,
        name: group.name,
        owner: group.owner,
        subscription_fee: group.subscription_fee,
        subscription_period: group.subscription_period,
        telegram_group_id: group.telegram_group_id,
    });
    
    (group, admin_cap)
}

/// Entry function to create and share a group
#[allow(lint(share_owned))]
entry fun create_group_entry(
    name: String,
    description: String,
    subscription_fee: u64,
    subscription_period: u64,
    max_members: u64,
    telegram_group_id: String,
    telegram_invite_link: String,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let (group, admin_cap) = create_group(
        name,
        description,
        subscription_fee,
        subscription_period,
        max_members,
        telegram_group_id,
        telegram_invite_link,
        clock,
        ctx
    );
    transfer::share_object(group);
    transfer::transfer(admin_cap, ctx.sender());
}

/// Subscribe to a group
public fun subscribe(
    group: &mut Group,
    payment: Coin<SUI>,
    telegram_id: String,
    clock: &Clock,
    ctx: &mut TxContext
): Subscription {
    // Check payment amount
    assert!(coin::value(&payment) == group.subscription_fee, EInvalidFee);
    
    // Check member limit
    if (group.max_members > 0) {
        assert!(group.current_members < group.max_members, EGroupFull);
    };
    
    // Transfer payment to group owner
    transfer::public_transfer(payment, group.owner);
    
    // Update member count
    group.current_members = group.current_members + 1;
    
    let subscription_uid = object::new(ctx);
    let subscription_id = object::uid_to_inner(&subscription_uid);
    let current_time = clock.timestamp_ms();
    let expires_at = current_time + group.subscription_period;
    
    let subscription = Subscription {
        id: subscription_uid,
        group_id: object::id(group),
        subscriber: ctx.sender(),
        telegram_id,
        subscribed_at: current_time,
        expires_at,
    };
    
    event::emit(UserSubscribed {
        group_id: object::id(group),
        subscription_id,
        subscriber: ctx.sender(),
        telegram_id,
        expires_at,
    });
    
    subscription
}

/// Entry function to subscribe and receive subscription NFT
entry fun subscribe_entry(
    group: &mut Group,
    payment: Coin<SUI>,
    telegram_id: String,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let subscription = subscribe(group, payment, telegram_id, clock, ctx);
    transfer::transfer(subscription, ctx.sender());
}

/// Subscribe and get AccessKey (Seal pattern)
public fun subscribe_with_access_key(
    group: &mut Group,
    payment: Coin<SUI>,
    telegram_id: String,
    clock: &Clock,
    ctx: &mut TxContext
): (Subscription, AccessKey) {
    let subscription = subscribe(group, payment, telegram_id, clock, ctx);
    
    // Create Seal AccessKey
    let access_key = seal_access::create_access_key(
        object::id(group),
        object::id(&subscription),
        subscription.expires_at,
        clock,
        ctx
    );
    
    (subscription, access_key)
}

/// Entry function with access key
entry fun subscribe_with_access_key_entry(
    group: &mut Group,
    payment: Coin<SUI>,
    telegram_id: String,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let (subscription, access_key) = subscribe_with_access_key(
        group,
        payment,
        telegram_id,
        clock,
        ctx
    );
    transfer::transfer(subscription, ctx.sender());
    transfer::public_transfer(access_key, ctx.sender());
}

/// Publish a report to the group
public fun publish_report(
    group: &mut Group,
    _admin_cap: &GroupAdminCap,
    title: String,
    summary: String,
    walrus_blob_id: String,
    seal_key_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
): Report {
    // Verify admin cap matches group
    assert!(_admin_cap.group_id == object::id(group), ENotGroupOwner);
    
    group.report_count = group.report_count + 1;
    
    let report_uid = object::new(ctx);
    let report_id = object::uid_to_inner(&report_uid);
    
    let report = Report {
        id: report_uid,
        group_id: object::id(group),
        title,
        summary,
        walrus_blob_id,
        seal_key_id,
        publisher: ctx.sender(),
        published_at: clock.timestamp_ms(),
    };
    
    event::emit(ReportPublished {
        report_id,
        group_id: object::id(group),
        title: report.title,
        walrus_blob_id: report.walrus_blob_id,
        publisher: ctx.sender(),
    });
    
    report
}

/// Entry function to publish and share a report
#[allow(lint(share_owned))]
entry fun publish_report_entry(
    group: &mut Group,
    admin_cap: &GroupAdminCap,
    title: String,
    summary: String,
    walrus_blob_id: String,
    seal_key_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let report = publish_report(
        group,
        admin_cap,
        title,
        summary,
        walrus_blob_id,
        seal_key_id,
        clock,
        ctx
    );
    transfer::share_object(report);
}

// ====== Access Control Functions ======

/// Check if subscription is valid for accessing content
fun check_subscription_valid(
    subscription: &Subscription,
    group: &Group,
    clock: &Clock,
): bool {
    // Check if subscription belongs to this group
    if (subscription.group_id != object::id(group)) {
        return false
    };
    
    // Check if subscription has expired
    let current_time = clock.timestamp_ms();
    if (current_time > subscription.expires_at) {
        return false
    };
    
    true
}

/// Request access to report - using Seal AccessKey
public fun request_report_access(
    access_key: &AccessKey,
    report: &Report,
    group: &Group,
    clock: &Clock,
): DecryptionCapability {
    // Verify and generate decryption capability
    seal_access::verify_and_grant_access(
        access_key,
        object::id(report),
        object::id(group),
        report.seal_key_id,
        clock
    )
}

/// Legacy seal approve function (for backward compatibility)
entry fun seal_approve(
    key_id: vector<u8>,
    subscription: &Subscription,
    group: &Group,
    clock: &Clock,
    pkg_version: &PackageVersion,
) {
    // Check package version
    assert!(pkg_version.version == VERSION, 999);
    
    // Check subscription is valid
    assert!(check_subscription_valid(subscription, group, clock), ESubscriptionExpired);
    
    // Check if key_id matches the group's namespace
    // Key format: [group_id][report_id][nonce]
    let group_id_bytes = object::id_to_bytes(&object::id(group));
    let mut i = 0;
    
    if (group_id_bytes.length() > key_id.length()) {
        abort EInvalidSubscription
    };
    
    while (i < group_id_bytes.length()) {
        if (group_id_bytes[i] != key_id[i]) {
            abort EInvalidSubscription
        };
        i = i + 1;
    };
}

// ====== View Functions ======

/// Get group information
public fun get_group_info(group: &Group): (String, String, u64, u64, u64, u64) {
    (
        group.name,
        group.description,
        group.subscription_fee,
        group.subscription_period,
        group.current_members,
        group.max_members
    )
}

/// Get subscription information
public fun get_subscription_info(subscription: &Subscription): (ID, address, String, u64, u64) {
    (
        subscription.group_id,
        subscription.subscriber,
        subscription.telegram_id,
        subscription.subscribed_at,
        subscription.expires_at
    )
}

/// Get report information
public fun get_report_info(report: &Report): (ID, String, String, String) {
    (
        report.group_id,
        report.title,
        report.summary,
        report.walrus_blob_id
    )
}

/// Check if subscription is currently valid
public fun is_subscription_valid(
    subscription: &Subscription,
    group: &Group,
    clock: &Clock,
): bool {
    check_subscription_valid(subscription, group, clock)
}

// ====== Admin Functions ======

/// Update group description
entry fun update_group_description(
    group: &mut Group,
    _admin_cap: &GroupAdminCap,
    new_description: String,
    _ctx: &mut TxContext
) {
    assert!(_admin_cap.group_id == object::id(group), ENotGroupOwner);
    group.description = new_description;
}

/// Update subscription fee
entry fun update_subscription_fee(
    group: &mut Group,
    _admin_cap: &GroupAdminCap,
    new_fee: u64,
    _ctx: &mut TxContext
) {
    assert!(_admin_cap.group_id == object::id(group), ENotGroupOwner);
    group.subscription_fee = new_fee;
}

// ====== Test Helper Functions ======

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test_only]
public fun create_test_group(ctx: &mut TxContext, clock: &Clock): (Group, GroupAdminCap) {
    create_group(
        b"Test Group".to_string(),
        b"Test Description".to_string(),
        1000000000, // 1 SUI
        86400000,   // 1 day in ms
        100,
        b"test_telegram_id".to_string(),
        b"https://t.me/+test_invite_link".to_string(),
        clock,
        ctx
    )
}


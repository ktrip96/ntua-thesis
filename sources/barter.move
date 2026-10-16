/// Escrowed NFT-for-NFT barter. A bid locks the offered assets inside a shared
/// `Bid`; accepting it swaps both sides in one transaction, so nobody sends first.
module nft_barter::barter;

use std::{ascii::String, type_name};
use sui::{balance::Balance, coin::Coin, dynamic_object_field as dof, event, sui::SUI};

// === Errors ===

#[error(code = 0)]
const ENotBidder: vector<u8> = b"Only the bidder can cancel this bid.";
#[error(code = 1)]
const EInvalidCounterCount: vector<u8> = b"The counter offer must hold exactly the requested number of NFTs.";
#[error(code = 2)]
const ETargetNftNotProvided: vector<u8> = b"The counter offer must include the targeted NFT.";
#[error(code = 3)]
const EEmptyBid: vector<u8> = b"A bid must offer at least one NFT or some SUI.";
#[error(code = 4)]
const EInvalidRequestedCount: vector<u8> = b"A bid must request at least one NFT.";
#[error(code = 5)]
const EBidNotTargeted: vector<u8> = b"Only a targeted bid can be rejected.";
#[error(code = 6)]
const ENotTargetNftOwner: vector<u8> = b"Only the owner of the targeted NFT can reject this bid.";

// === Public Structs ===

/// An open offer of `offered_count` NFTs of type `Offered` plus `offered_sui`,
/// escrowed as dynamic object fields, for `requested_count` NFTs of type `Requested`.
public struct Bid<phantom Offered: key + store, phantom Requested: key + store> has key {
    id: UID,
    bidder: address,
    offered_count: u64,
    offered_sui: Balance<SUI>,
    requested_count: u64,
    /// When set, the counter offer must include this NFT and only its owner may reject.
    target_nft_id: Option<ID>,
}

/// Dynamic object field key of the `n`-th escrowed NFT.
public struct EscrowKey(u64) has copy, drop, store;

/// A bid opened. The type names identify the bartered domains after the `Bid` is deleted.
public struct BidPlaced has copy, drop {
    bid_id: ID,
    offered_type: String,
    requested_type: String,
    offered_count: u64,
    offered_sui: u64,
    requested_count: u64,
    target_nft_id: Option<ID>,
}

/// The escrow went to the sender and the counter NFTs to the bidder.
public struct BidAccepted has copy, drop {
    bid_id: ID,
}

/// The bidder reclaimed the escrow.
public struct BidCancelled has copy, drop {
    bid_id: ID,
}

/// The targeted NFT's owner declined; the escrow returned to the bidder.
public struct BidRejected has copy, drop {
    bid_id: ID,
}

// === Public Functions ===

/// Escrows `offered` and `offered_coin` in a new shared `Bid` owned by the sender.
public fun place_bid<Offered: key + store, Requested: key + store>(
    offered: vector<Offered>,
    offered_coin: Coin<SUI>,
    requested_count: u64,
    target_nft_id: Option<ID>,
    ctx: &mut TxContext,
) {
    assert!(!offered.is_empty() || offered_coin.value() > 0, EEmptyBid);
    assert!(requested_count > 0, EInvalidRequestedCount);

    let mut bid = Bid<Offered, Requested> {
        id: object::new(ctx),
        bidder: ctx.sender(),
        offered_count: offered.length(),
        offered_sui: offered_coin.into_balance(),
        requested_count,
        target_nft_id,
    };
    bid.escrow(offered);

    event::emit(BidPlaced {
        bid_id: bid.id.to_inner(),
        offered_type: type_name::with_defining_ids<Offered>().into_string(),
        requested_type: type_name::with_defining_ids<Requested>().into_string(),
        offered_count: bid.offered_count,
        offered_sui: bid.offered_sui.value(),
        requested_count,
        target_nft_id,
    });

    transfer::share_object(bid);
}

/// Settles the swap: the escrow goes to the sender and `counter_nfts` go to the bidder.
public fun accept_bid<Offered: key + store, Requested: key + store>(
    mut self: Bid<Offered, Requested>,
    counter_nfts: vector<Requested>,
    ctx: &mut TxContext,
) {
    self.assert_counter_offer(&counter_nfts);

    let bid_id = self.id.to_inner();
    let bidder = self.bidder;
    let acceptor = ctx.sender();
    self.release_escrow(acceptor);
    counter_nfts.do!(|nft| transfer::public_transfer(nft, bidder));
    self.destroy(acceptor, ctx);

    event::emit(BidAccepted { bid_id });
}

/// Returns the escrow to the bidder. Only the bidder may cancel.
public fun cancel_bid<Offered: key + store, Requested: key + store>(
    mut self: Bid<Offered, Requested>,
    ctx: &mut TxContext,
) {
    assert!(self.bidder == ctx.sender(), ENotBidder);

    let bid_id = self.id.to_inner();
    let bidder = self.bidder;
    self.release_escrow(bidder);
    self.destroy(bidder, ctx);

    event::emit(BidCancelled { bid_id });
}

/// Declines a targeted bid and returns the escrow to the bidder.
/// Presenting `target_nft` proves the sender owns it.
public fun reject_bid<Offered: key + store, Requested: key + store>(
    mut self: Bid<Offered, Requested>,
    target_nft: &Requested,
    ctx: &mut TxContext,
) {
    assert!(self.target_nft_id.is_some(), EBidNotTargeted);
    assert!(self.target_nft_id.contains(&object::id(target_nft)), ENotTargetNftOwner);

    let bid_id = self.id.to_inner();
    let bidder = self.bidder;
    self.release_escrow(bidder);
    self.destroy(bidder, ctx);

    event::emit(BidRejected { bid_id });
}

// === Private Functions ===

fun assert_counter_offer<Offered: key + store, Requested: key + store>(
    self: &Bid<Offered, Requested>,
    counter_nfts: &vector<Requested>,
) {
    assert!(counter_nfts.length() == self.requested_count, EInvalidCounterCount);
    if (self.target_nft_id.is_none()) return;

    let target_nft_id = *self.target_nft_id.borrow();
    assert!(counter_nfts.any!(|nft| object::id(nft) == target_nft_id), ETargetNftNotProvided);
}

/// Attaches each offered NFT under `EscrowKey(n)`, in offer order.
fun escrow<Offered: key + store, Requested: key + store>(
    self: &mut Bid<Offered, Requested>,
    offered: vector<Offered>,
) {
    let mut index = 0;
    offered.do!(|nft| {
        dof::add(&mut self.id, EscrowKey(index), nft);
        index = index + 1;
    });
}

/// Detaches every escrowed NFT and transfers it to `recipient`.
fun release_escrow<Offered: key + store, Requested: key + store>(
    self: &mut Bid<Offered, Requested>,
    recipient: address,
) {
    self.offered_count.do!(|index| {
        let nft = dof::remove<EscrowKey, Offered>(&mut self.id, EscrowKey(index));
        transfer::public_transfer(nft, recipient);
    });
}

/// Deletes the emptied bid and pays its SUI, if any, to `recipient`.
fun destroy<Offered: key + store, Requested: key + store>(
    self: Bid<Offered, Requested>,
    recipient: address,
    ctx: &mut TxContext,
) {
    let Bid { id, offered_sui, .. } = self;
    id.delete();

    if (offered_sui.value() > 0) {
        transfer::public_transfer(offered_sui.into_coin(ctx), recipient);
    } else {
        offered_sui.destroy_zero();
    }
}

// === Test-Only Functions ===

#[test_only]
/// The object ID of the `n`-th escrowed NFT, for custody assertions.
public fun escrowed_nft_id<Offered: key + store, Requested: key + store>(
    self: &Bid<Offered, Requested>,
    index: u64,
): ID {
    dof::id(&self.id, EscrowKey(index)).destroy_some()
}

#[test_only]
public fun bid_placed_fields(e: &BidPlaced): (ID, String, String, u64, u64, u64, Option<ID>) {
    (
        e.bid_id,
        e.offered_type,
        e.requested_type,
        e.offered_count,
        e.offered_sui,
        e.requested_count,
        e.target_nft_id,
    )
}

#[test_only]
public fun bid_accepted_id(e: &BidAccepted): ID { e.bid_id }

#[test_only]
public fun bid_cancelled_id(e: &BidCancelled): ID { e.bid_id }

#[test_only]
public fun bid_rejected_id(e: &BidRejected): ID { e.bid_id }

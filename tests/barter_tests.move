#[test_only]
module nft_barter::barter_tests;

use std::unit_test::{assert_eq, destroy};
use sui::{event, test_scenario::{return_shared, return_to_sender}};
use nft_barter::barter::{Self, BidPlaced, BidAccepted, BidCancelled, BidRejected};
use nft_barter::barter_fixture::{Self as fixture, Sword, Shield, alice, bob};

// === Placing ===

#[test]
fun place_bid_escrows_the_offer_in_a_shared_bid() {
    let mut f = fixture::start(alice());
    let swords = f.swords(2);
    let first_sword_id = object::id(&swords[0]);
    let second_sword_id = object::id(&swords[1]);

    barter::place_bid<Sword, Shield>(swords, f.sui(0), 1, option::none(), f.ctx!());

    f.next_tx!(alice(), |f| {
        assert_eq!(f.sword_count(), 0);
        let bid = f.take_bid();
        assert_eq!(bid.escrowed_nft_id(0), first_sword_id);
        assert_eq!(bid.escrowed_nft_id(1), second_sword_id);
        return_shared(bid);
    });
    f.end();
}

#[test]
fun place_bid_emits_the_full_offer() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());

    barter::place_bid<Sword, Shield>(f.swords(3), f.sui(50), 2, option::some(shield_id), f.ctx!());

    let placed = event::events_by_type<BidPlaced>();
    assert_eq!(placed.length(), 1);
    let (bid_id, offered_type, requested_type, offered_count, offered_sui, requested_count, target) =
        placed[0].bid_placed_fields();
    f.next_tx!(alice(), |f| {
        let bid = f.take_bid();
        assert_eq!(object::id(&bid), bid_id);
        return_shared(bid);
    });
    assert_eq!(offered_type, std::type_name::with_defining_ids<Sword>().into_string());
    assert_eq!(requested_type, std::type_name::with_defining_ids<Shield>().into_string());
    assert_eq!(offered_count, 3);
    assert_eq!(offered_sui, 50);
    assert_eq!(requested_count, 2);
    assert_eq!(target, option::some(shield_id));
    f.end();
}

#[test, expected_failure(abort_code = barter::EEmptyBid, location = barter)]
fun place_bid_rejects_an_empty_offer() {
    let mut f = fixture::start(alice());

    barter::place_bid<Sword, Shield>(vector[], f.sui(0), 1, option::none(), f.ctx!());

    f.end();
}

#[test, expected_failure(abort_code = barter::EInvalidRequestedCount, location = barter)]
fun place_bid_rejects_a_zero_requested_count() {
    let mut f = fixture::start(alice());

    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 0, option::none(), f.ctx!());

    f.end();
}

#[test, expected_failure(abort_code = barter::EEmptyBid, location = barter)]
fun place_bid_checks_the_offer_before_the_requested_count() {
    let mut f = fixture::start(alice());

    barter::place_bid<Sword, Shield>(vector[], f.sui(0), 0, option::none(), f.ctx!());

    f.end();
}

// === Accepting ===

#[test]
fun accept_bid_swaps_the_escrow_for_the_counter_nfts() {
    let mut f = fixture::start(alice());
    barter::place_bid<Sword, Shield>(f.swords(3), f.sui(0), 1, option::none(), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let bid_id = object::id(&bid);
        let shield = f.new_shield();
        bid.accept_bid(vector[shield], f.ctx!());
        assert_eq!(event::events_by_type<BidAccepted>().map!(|e| e.bid_accepted_id()), vector[bid_id]);
    });

    f.next_tx!(bob(), |f| {
        assert_eq!(f.sword_count(), 3);
        assert!(!f.has_sui());
    });
    f.next_tx!(alice(), |f| assert_eq!(f.shield_count(), 1));
    assert!(!f.has_bid());
    f.end();
}

#[test]
fun accept_bid_pays_the_escrowed_sui_to_the_acceptor() {
    let mut f = fixture::start(alice());
    barter::place_bid<Sword, Shield>(f.swords(2), f.sui(50), 1, option::none(), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let shield = f.new_shield();
        bid.accept_bid(vector[shield], f.ctx!());
    });

    f.next_tx!(bob(), |f| {
        assert_eq!(f.sword_count(), 2);
        assert_eq!(f.sui_received(), 50);
    });
    f.end();
}

#[test]
fun accept_bid_works_for_a_sui_only_offer() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(vector[], f.sui(10), 1, option::some(shield_id), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let shield = f.take_shield();
        bid.accept_bid(vector[shield], f.ctx!());
    });

    f.next_tx!(bob(), |f| assert_eq!(f.sui_received(), 10));
    f.next_tx!(alice(), |f| assert_eq!(f.shield_count(), 1));
    f.end();
}

#[test]
fun accept_bid_delivers_every_requested_nft_to_the_bidder() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 2, option::some(shield_id), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let target = f.take_shield();
        let extra = f.new_shield();
        bid.accept_bid(vector[extra, target], f.ctx!());
    });

    f.next_tx!(alice(), |f| assert_eq!(f.shield_count(), 2));
    f.end();
}

#[test, expected_failure(abort_code = barter::EInvalidCounterCount, location = barter)]
fun accept_bid_rejects_the_wrong_number_of_counter_nfts() {
    let mut f = fixture::start(alice());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::none(), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let first = f.new_shield();
        let second = f.new_shield();
        bid.accept_bid(vector[first, second], f.ctx!());
    });
    f.end();
}

#[test, expected_failure(abort_code = barter::ETargetNftNotProvided, location = barter)]
fun accept_bid_rejects_a_counter_offer_without_the_target() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::some(shield_id), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let other_shield = f.new_shield();
        bid.accept_bid(vector[other_shield], f.ctx!());
    });
    f.end();
}

#[test, expected_failure(abort_code = barter::EInvalidCounterCount, location = barter)]
fun accept_bid_checks_the_count_before_the_target() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::some(shield_id), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        bid.accept_bid(vector[], f.ctx!());
    });
    f.end();
}

// === Cancelling ===

#[test]
fun cancel_bid_returns_the_escrow_and_sui_to_the_bidder() {
    let mut f = fixture::start(alice());
    barter::place_bid<Sword, Shield>(f.swords(2), f.sui(30), 1, option::none(), f.ctx!());

    f.next_tx!(alice(), |f| {
        let bid = f.take_bid();
        let bid_id = object::id(&bid);
        bid.cancel_bid(f.ctx!());
        assert_eq!(event::events_by_type<BidCancelled>().map!(|e| e.bid_cancelled_id()), vector[bid_id]);
    });

    f.next_tx!(alice(), |f| {
        assert_eq!(f.sword_count(), 2);
        assert_eq!(f.sui_received(), 30);
    });
    assert!(!f.has_bid());
    f.end();
}

#[test, expected_failure(abort_code = barter::ENotBidder, location = barter)]
fun cancel_bid_rejects_anyone_but_the_bidder() {
    let mut f = fixture::start(alice());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::none(), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        bid.cancel_bid(f.ctx!());
    });
    f.end();
}

// === Rejecting ===

#[test]
fun reject_bid_returns_the_escrow_to_the_bidder() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(f.swords(3), f.sui(5), 1, option::some(shield_id), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let bid_id = object::id(&bid);
        let shield = f.take_shield();
        bid.reject_bid(&shield, f.ctx!());
        return_to_sender(f.scenario_mut(), shield);
        assert_eq!(event::events_by_type<BidRejected>().map!(|e| e.bid_rejected_id()), vector[bid_id]);
    });

    f.next_tx!(alice(), |f| {
        assert_eq!(f.sword_count(), 3);
        assert_eq!(f.sui_received(), 5);
    });
    f.next_tx!(bob(), |f| assert_eq!(f.shield_count(), 1));
    assert!(!f.has_bid());
    f.end();
}

#[test, expected_failure(abort_code = barter::EBidNotTargeted, location = barter)]
fun reject_bid_rejects_an_untargeted_bid() {
    let mut f = fixture::start(alice());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::none(), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let shield = f.new_shield();
        bid.reject_bid(&shield, f.ctx!());
        destroy(shield);
    });
    f.end();
}

#[test, expected_failure(abort_code = barter::ENotTargetNftOwner, location = barter)]
fun reject_bid_rejects_a_different_nft_than_the_target() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::some(shield_id), f.ctx!());

    f.next_tx!(bob(), |f| {
        let bid = f.take_bid();
        let other_shield = f.new_shield();
        bid.reject_bid(&other_shield, f.ctx!());
        destroy(other_shield);
    });
    f.end();
}

// === Lifecycle Across Owners ===

#[test]
fun a_bid_follows_the_target_nft_to_its_new_owner() {
    let mut f = fixture::start(alice());
    let shield_id = f.shield_owned_by(bob());
    barter::place_bid<Sword, Shield>(f.swords(1), f.sui(0), 1, option::some(shield_id), f.ctx!());

    // Bob gives the shield away; Carol, its new owner, can accept the bid.
    let carol = @0xCA201;
    f.next_tx!(bob(), |f| transfer::public_transfer(f.take_shield(), carol));
    f.next_tx!(carol, |f| {
        let bid = f.take_bid();
        let shield = f.take_shield();
        bid.accept_bid(vector[shield], f.ctx!());
    });

    f.next_tx!(carol, |f| assert_eq!(f.sword_count(), 1));
    f.next_tx!(alice(), |f| assert_eq!(f.shield_count(), 1));
    f.end();
}

/// Shared `test_scenario` fixture: two mock asset types plus wallet helpers,
/// so each test states only its own delta.
#[test_only]
module nft_barter::barter_fixture;

use std::unit_test::destroy;
use sui::{coin::{Self, Coin}, sui::SUI, test_scenario::{Self as ts, Scenario}};
use nft_barter::barter::Bid;

// === Constants ===

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;

public fun alice(): address { ALICE }

public fun bob(): address { BOB }

// === Test-Only Types ===

/// A `key + store` asset offered in bids.
public struct Sword has key, store { id: UID }

/// A `key + store` asset requested by bids.
public struct Shield has key, store { id: UID }

/// Hot-potato fixture; `end` is the only way to drop it.
public struct BarterFixture { scenario: Scenario }

// === Test-Only Functions ===

public fun start(sender: address): BarterFixture {
    BarterFixture { scenario: ts::begin(sender) }
}

public fun end(self: BarterFixture) {
    let BarterFixture { scenario } = self;
    scenario.end();
}

/// Advances to a transaction from `sender` and runs `body` inside it.
public macro fun next_tx($self: &mut BarterFixture, $sender: address, $body: |&mut BarterFixture|) {
    let fixture = $self;
    fixture.scenario_mut().next_tx($sender);
    $body(fixture);
}

public macro fun ctx($self: &mut BarterFixture): &mut TxContext {
    let fixture = $self;
    fixture.scenario_mut().ctx()
}

public fun scenario_mut(self: &mut BarterFixture): &mut Scenario {
    &mut self.scenario
}

public fun sender(self: &BarterFixture): address {
    self.scenario.sender()
}

public fun new_sword(self: &mut BarterFixture): Sword {
    Sword { id: object::new(self.scenario.ctx()) }
}

public fun new_shield(self: &mut BarterFixture): Shield {
    Shield { id: object::new(self.scenario.ctx()) }
}

public fun swords(self: &mut BarterFixture, count: u64): vector<Sword> {
    vector::tabulate!(count, |_| self.new_sword())
}

/// Mints a shield into `owner`'s wallet and returns its ID.
public fun shield_owned_by(self: &mut BarterFixture, owner: address): ID {
    let shield = self.new_shield();
    let shield_id = shield.id.to_inner();
    transfer::public_transfer(shield, owner);

    shield_id
}

public fun sui(self: &mut BarterFixture, amount: u64): Coin<SUI> {
    coin::mint_for_testing(amount, self.scenario.ctx())
}

public fun take_bid(self: &BarterFixture): Bid<Sword, Shield> {
    self.scenario.take_shared()
}

public fun take_shield(self: &BarterFixture): Shield {
    self.scenario.take_from_sender()
}

/// Number of swords in the current sender's wallet.
public fun sword_count(self: &BarterFixture): u64 {
    self.scenario.ids_for_sender<Sword>().length()
}

public fun shield_count(self: &BarterFixture): u64 {
    self.scenario.ids_for_sender<Shield>().length()
}

public fun has_bid(_self: &BarterFixture): bool {
    ts::has_most_recent_shared<Bid<Sword, Shield>>()
}

/// Takes the sender's SUI coin, returns its value and destroys it.
public fun sui_received(self: &BarterFixture): u64 {
    let received: Coin<SUI> = self.scenario.take_from_sender();
    let amount = received.value();
    destroy(received);

    amount
}

public fun has_sui(self: &BarterFixture): bool {
    self.scenario.has_most_recent_for_sender<Coin<SUI>>()
}

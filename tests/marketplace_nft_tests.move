#[test_only]
module nft_barter::marketplace_nft_tests;

use std::unit_test::{assert_eq, destroy};
use sui::{display::Display, event, package::Publisher, test_scenario as ts};
use nft_barter::barter;
use nft_barter::marketplace_nft::{Self, MarketplaceNFT, NftMinted};

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;

// === Minting ===

#[test]
fun mint_returns_an_nft_with_the_given_metadata() {
    let mut scenario = ts::begin(ALICE);
    let nft = mint(b"Rare Supercar", b"car", b"rare", scenario.ctx());

    let (name, description, image_url, collection, rarity) = nft.metadata();
    assert_eq!(name, b"Rare Supercar".to_string());
    assert_eq!(description, b"Rare Supercar description".to_string());
    assert_eq!(image_url, b"https://example.com/Rare Supercar.png".to_string());
    assert_eq!(collection, b"car".to_string());
    assert_eq!(rarity, b"rare".to_string());
    assert_eq!(event::events_by_type<NftMinted>().length(), 1);

    destroy(nft);
    scenario.end();
}

#[test]
fun init_hands_the_publisher_and_display_to_the_deployer() {
    let mut scenario = ts::begin(ALICE);
    marketplace_nft::init_for_testing(scenario.ctx());

    scenario.next_tx(ALICE);
    assert!(scenario.has_most_recent_for_sender<Publisher>());
    assert!(scenario.has_most_recent_for_sender<Display<MarketplaceNFT>>());

    scenario.end();
}

// === Bartering Marketplace NFTs ===

#[test]
fun two_minted_nfts_can_be_bartered_for_one_in_a_single_ptb_style_flow() {
    let mut scenario = ts::begin(BOB);
    let cottage = mint(b"Common Cottage", b"house", b"common", scenario.ctx());
    transfer::public_transfer(cottage, BOB);

    // Alice mints and bids in one transaction, as a PTB would.
    scenario.next_tx(ALICE);
    let ctx = scenario.ctx();
    let offered = vector[
        marketplace_nft::mint(b"Common Sedan".to_string(), b"".to_string(), b"".to_string(), b"car".to_string(), b"common".to_string(), ctx),
        marketplace_nft::mint(b"Uncommon Coupe".to_string(), b"".to_string(), b"".to_string(), b"car".to_string(), b"uncommon".to_string(), ctx),
    ];
    barter::place_bid<MarketplaceNFT, MarketplaceNFT>(offered, sui::coin::zero(ctx), 1, option::none(), ctx);

    scenario.next_tx(BOB);
    let bid: barter::Bid<MarketplaceNFT, MarketplaceNFT> = scenario.take_shared();
    let cottage: MarketplaceNFT = scenario.take_from_sender();
    bid.accept_bid(vector[cottage], scenario.ctx());

    scenario.next_tx(BOB);
    assert_eq!(scenario.ids_for_sender<MarketplaceNFT>().length(), 2);
    scenario.next_tx(ALICE);
    assert_eq!(scenario.ids_for_sender<MarketplaceNFT>().length(), 1);
    scenario.end();
}

// === Test-Only Functions ===

fun mint(name: vector<u8>, collection: vector<u8>, rarity: vector<u8>, ctx: &mut TxContext): MarketplaceNFT {
    let mut description = name;
    description.append(b" description");
    let mut image_url = b"https://example.com/";
    image_url.append(name);
    image_url.append(b".png");

    marketplace_nft::mint(
        name.to_string(),
        description.to_string(),
        image_url.to_string(),
        collection.to_string(),
        rarity.to_string(),
        ctx,
    )
}

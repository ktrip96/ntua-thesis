/// Freely mintable demo collectible with wallet `Display`. Metadata is caller
/// supplied and deliberately unvalidated: the dApp curates collections.
module nft_barter::marketplace_nft;

use std::string::String;
use sui::{display, event, package};

// === Public Structs ===

/// One-time witness; claims the `Publisher` that owns the `Display`.
public struct MARKETPLACE_NFT has drop {}

/// A tradeable collectible. Any `key + store` type can be bartered; this one
/// exists so the marketplace has something to mint.
public struct MarketplaceNFT has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    collection: String,
    rarity: String,
}

/// A new NFT exists. Lets clients discover NFTs without an indexer.
public struct NftMinted has copy, drop {
    nft_id: ID,
}

// === Private Initialization ===

fun init(otw: MARKETPLACE_NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let mut nft_display = display::new_with_fields<MarketplaceNFT>(
        &publisher,
        vector[b"name", b"description", b"image_url", b"collection", b"rarity"].map!(|key| key.to_string()),
        vector[b"{name}", b"{description}", b"{image_url}", b"{collection}", b"{rarity}"].map!(
            |template| template.to_string(),
        ),
        ctx,
    );
    nft_display.update_version();

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(nft_display, ctx.sender());
}

// === Public Functions ===

/// Mints an NFT and returns it; the transaction decides where it goes, so a
/// PTB can mint and bid in one go.
public fun mint(
    name: String,
    description: String,
    image_url: String,
    collection: String,
    rarity: String,
    ctx: &mut TxContext,
): MarketplaceNFT {
    let nft = MarketplaceNFT {
        id: object::new(ctx),
        name,
        description,
        image_url,
        collection,
        rarity,
    };

    event::emit(NftMinted { nft_id: nft.id.to_inner() });

    nft
}

// === Test-Only Functions ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(MARKETPLACE_NFT {}, ctx);
}

#[test_only]
/// Field snapshot in declaration order, for asserting minted metadata.
public fun metadata(self: &MarketplaceNFT): (String, String, String, String, String) {
    (self.name, self.description, self.image_url, self.collection, self.rarity)
}

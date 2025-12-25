use rasmodius::CSRandom;
use rasmodius::mechanics::get_cart_for_day;
use rasmodius::GameVersion;

#[test]
fn debug_cart_seed14_day14() {
    // Test both seed 14 and seed 20, day 14
    for seed in [14, 20] {
        let day = 14;

        println!("\n=== SEED {} ===", seed);
        for version in [GameVersion::V1_3, GameVersion::V1_4, GameVersion::V1_5, GameVersion::V1_6] {
            println!("\nCart for seed={}, day={}, {:?}:", seed, day, version);
            let cart = get_cart_for_day(seed, day, version);
            for (i, item) in cart.iter().enumerate() {
                let marker = if item.item_id == 266 { " <-- RED CABBAGE!" } else { "" };
                println!("  [{}] id={} price={} qty={}{}", i, item.item_id, item.price, item.quantity, marker);
            }

            if cart.iter().any(|item| item.item_id == 266) {
                println!("✓ Red Cabbage (266) IS in the cart for {:?}", version);
            }
        }
    }
}

#[test]
fn test_csrandom_seed6() {
    let mut rng = CSRandom::new(6);
    println!("Rust CSRandom(6):");
    for _ in 0..10 {
        let roll = rng.next_range(2, 790);
        println!("  next_range(2,790) = {}", roll);
        rng.next_range(1, 11);
        rng.next_range(3, 6);
        rng.sample();
    }
}

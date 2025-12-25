#!/usr/bin/env node
/**
 * Extract cart item mappings for all game versions from stardew-predictor.
 *
 * Pre-1.4: Roll -> name lookup -> find actual item ID
 * 1.4/1.5: Roll -> increment until valid ID in cartItems_1_4
 * 1.6: Shuffle-based selection (different algorithm entirely)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Create a sandbox context for stardew-predictor code
const sandbox = { console, Math, Date, TextEncoder: require('util').TextEncoder };

// Load CSRandom from stardew-predictor
const csRandomPath = path.join(__dirname, '../../stardew-predictor/cs-random.js');
const csRandomCode = fs.readFileSync(csRandomPath, 'utf8');
vm.runInNewContext(csRandomCode, sandbox);
const CSRandom = sandbox.CSRandom;

// Pre-1.4 cart items lookup (roll ID -> item name)
// Extracted from stardew-predictor save.cartItems
const CART_ITEMS_PRE14 = {
    789: 'Wild Horseradish', 788: 'Wild Horseradish', 787: 'Wild Horseradish',
    786: 'Battery Pack', 785: 'Battery Pack', 784: 'Battery Pack', 783: 'Battery Pack',
    782: 'Battery Pack', 781: 'Battery Pack', 780: 'Battery Pack', 779: 'Battery Pack',
    778: 'Battery Pack', 777: 'Battery Pack', 776: 'Battery Pack', 775: 'Battery Pack',
    774: 'Battery Pack', 773: 'Battery Pack', 772: 'Life Elixir', 771: 'Oil of Garlic',
    770: 'Fiber', 769: 'Fiber', 768: 'Void Essence', 767: 'Solar Essence', 766: 'Bat Wing',
    765: 'Slime', 764: 'Slime', 763: 'Slime', 762: 'Slime', 761: 'Slime', 760: 'Slime',
    759: 'Slime', 758: 'Slime', 757: 'Slime', 756: 'Slime', 755: 'Slime', 754: 'Slime',
    753: 'Slime', 752: 'Slime', 751: 'Slime', 750: 'Slime', 749: 'Slime', 748: 'Slime',
    747: 'Slime', 746: 'Slime', 745: 'Slime', 744: 'Slime', 743: 'Slime', 742: 'Slime',
    741: 'Slime', 740: 'Slime', 739: 'Slime', 738: 'Slime', 737: 'Slime', 736: 'Slime',
    735: 'Slime', 734: 'Slime', 733: 'Woodskip', 732: 'Woodskip', 731: 'Crab Cakes',
    730: 'Maple Bar', 729: 'Lobster Bisque', 728: 'Escargot', 727: 'Fish Stew',
    726: 'Chowder', 725: 'Pine Tar', 724: 'Oak Resin', 723: 'Maple Syrup', 722: 'Oyster',
    721: 'Periwinkle', 720: 'Snail', 719: 'Shrimp', 718: 'Mussel', 717: 'Cockle',
    716: 'Crab', 715: 'Crayfish', 714: 'Lobster', 713: 'Lobster', 712: 'Lobster',
    711: 'Lobster', 710: 'Lobster', 709: 'Lobster', 708: 'Hardwood', 707: 'Halibut',
    706: 'Lingcod', 705: 'Shad', 704: 'Albacore', 703: 'Dorado', 702: 'Magnet',
    701: 'Chub', 700: 'Tilapia', 699: 'Bullhead', 698: 'Tiger Trout', 697: 'Sturgeon',
    696: 'Sturgeon', 695: 'Sturgeon', 694: 'Cork Bobber', 693: 'Trap Bobber',
    692: 'Treasure Hunter', 691: 'Lead Bobber', 690: 'Barbed Hook', 689: 'Barbed Hook',
    688: 'Barbed Hook', 687: 'Barbed Hook', 686: 'Dressed Spinner', 685: 'Spinner',
    684: 'Bait', 683: 'Bug Meat', 682: 'Bug Meat', 681: 'Bug Meat', 680: 'Bug Meat',
    679: 'Bug Meat', 678: 'Bug Meat', 677: 'Bug Meat', 676: 'Bug Meat', 675: 'Bug Meat',
    674: 'Bug Meat', 673: 'Bug Meat', 672: 'Bug Meat', 671: 'Bug Meat', 670: 'Bug Meat',
    669: 'Bug Meat', 668: 'Bug Meat', 667: 'Bug Meat', 666: 'Bug Meat', 665: 'Bug Meat',
    664: 'Bug Meat', 663: 'Bug Meat', 662: 'Bug Meat', 661: 'Bug Meat', 660: 'Bug Meat',
    659: 'Bug Meat', 658: 'Bug Meat', 657: 'Bug Meat', 656: 'Bug Meat', 655: 'Bug Meat',
    654: 'Bug Meat', 653: 'Bug Meat', 652: 'Bug Meat', 651: 'Bug Meat',
    650: 'Poppyseed Muffin', 649: 'Poppyseed Muffin', 648: 'Fiddlehead Risotto',
    647: 'Coleslaw', 646: 'Coleslaw', 645: 'Coleslaw', 644: 'Coleslaw', 643: 'Coleslaw',
    642: 'Coleslaw', 641: 'Coleslaw', 640: 'Coleslaw', 639: 'Coleslaw', 638: 'Coleslaw',
    637: 'Cherry', 636: 'Pomegranate', 635: 'Peach', 634: 'Orange', 633: 'Apricot',
    632: 'Apple Sapling', 631: 'Pomegranate Sapling', 630: 'Peach Sapling',
    629: 'Orange Sapling', 628: 'Apricot Sapling', 627: 'Cherry Sapling',
    626: 'Cherry Sapling', 625: 'Cherry Sapling', 624: 'Cherry Sapling',
    623: 'Cherry Sapling', 622: 'Cherry Sapling', 621: 'Cherry Sapling',
    620: 'Quality Sprinkler', 619: 'Quality Sprinkler', 618: 'Quality Sprinkler',
    617: 'Bruschetta', 616: 'Bruschetta', 615: 'Bruschetta', 614: 'Bruschetta',
    613: 'Bruschetta', 612: 'Apple', 611: 'Cranberry Candy', 610: 'Blackberry Cobbler',
    609: 'Fruit Salad', 608: 'Radish Salad', 607: 'Pumpkin Pie', 606: 'Roasted Hazelnuts',
    605: 'Stir Fry', 604: 'Artichoke Dip', 603: 'Plum Pudding', 602: 'Plum Pudding',
    601: 'Plum Pudding', 600: 'Plum Pudding', 599: 'Plum Pudding', 598: 'Sprinkler',
    597: 'Sprinkler', 596: 'Blue Jazz', 595: 'Blue Jazz', 594: 'Fairy Rose',
    593: 'Fairy Rose', 592: 'Summer Spangle', 591: 'Summer Spangle', 590: 'Tulip',
    589: 'Tulip', 588: 'Tulip', 587: 'Tulip', 586: 'Tulip', 585: 'Tulip', 584: 'Tulip',
    583: 'Tulip', 582: 'Tulip', 581: 'Tulip', 580: 'Tulip', 579: 'Tulip', 578: 'Tulip',
    577: 'Tulip', 576: 'Tulip', 575: 'Tulip', 574: 'Tulip', 573: 'Tulip', 572: 'Tulip',
    571: 'Tulip', 570: 'Tulip', 569: 'Tulip', 568: 'Tulip', 567: 'Tulip', 566: 'Tulip',
    565: 'Tulip', 564: 'Tulip', 563: 'Tulip', 562: 'Tulip', 561: 'Tulip', 560: 'Tulip',
    559: 'Tulip', 558: 'Tulip', 557: 'Tulip', 556: 'Tulip', 555: 'Tulip', 554: 'Tulip',
    553: 'Tulip', 552: 'Tulip', 551: 'Tulip', 550: 'Tulip', 549: 'Tulip', 548: 'Tulip',
    547: 'Tulip', 546: 'Tulip', 545: 'Tulip', 544: 'Tulip', 543: 'Tulip', 542: 'Tulip',
    541: 'Tulip', 540: 'Tulip', 539: 'Tulip', 538: 'Tulip', 537: 'Tulip', 536: 'Tulip',
    535: 'Tulip', 534: 'Tulip', 533: 'Tulip', 532: 'Tulip', 531: 'Tulip', 530: 'Tulip',
    529: 'Tulip', 528: 'Tulip', 527: 'Tulip', 526: 'Tulip', 525: 'Tulip', 524: 'Tulip',
    523: 'Tulip', 522: 'Tulip', 521: 'Tulip', 520: 'Tulip', 519: 'Tulip', 518: 'Tulip',
    517: 'Tulip', 516: 'Tulip', 515: 'Tulip', 514: 'Tulip', 513: 'Tulip', 512: 'Tulip',
    511: 'Tulip', 510: 'Tulip', 509: 'Tulip', 508: 'Tulip', 507: 'Tulip', 506: 'Tulip',
    505: 'Tulip', 504: 'Tulip', 503: 'Tulip', 502: 'Tulip', 501: 'Tulip', 500: 'Tulip',
    499: 'Tulip', 498: 'Ancient Seeds', 497: 'Winter Seeds', 496: 'Fall Seeds',
    495: 'Summer Seeds', 494: 'Spring Seeds', 493: 'Beet Seeds', 492: 'Cranberry Seeds',
    491: 'Yam Seeds', 490: 'Bok Choy Seeds', 489: 'Pumpkin Seeds', 488: 'Artichoke Seeds',
    487: 'Eggplant Seeds', 486: 'Corn Seeds', 485: 'Starfruit Seeds',
    484: 'Red Cabbage Seeds', 483: 'Radish Seeds', 482: 'Wheat Seeds', 481: 'Pepper Seeds',
    480: 'Blueberry Seeds', 479: 'Tomato Seeds', 478: 'Melon Seeds', 477: 'Rhubarb Seeds',
    476: 'Kale Seeds', 475: 'Garlic Seeds', 474: 'Potato Seeds', 473: 'Cauliflower Seeds',
    472: 'Bean Starter', 471: 'Parsnip Seeds', 470: 'Parsnip Seeds', 469: 'Parsnip Seeds',
    468: 'Parsnip Seeds', 467: 'Parsnip Seeds', 466: 'Parsnip Seeds', 465: 'Deluxe Speed-Gro',
    464: 'Speed-Gro', 463: 'Speed-Gro', 462: 'Speed-Gro', 461: 'Speed-Gro', 460: 'Speed-Gro',
    459: 'Speed-Gro', 458: 'Mead', 457: 'Mead', 456: 'Pale Broth', 455: 'Algae Soup',
    454: 'Spangle Seeds', 453: 'Spangle Seeds', 452: 'Poppy Seeds', 451: 'Poppy Seeds',
    450: 'Poppy Seeds', 449: 'Poppy Seeds', 448: 'Poppy Seeds', 447: 'Poppy Seeds',
    446: 'Poppy Seeds', 445: "Rabbit's Foot", 444: "Rabbit's Foot", 443: 'Duck Feather',
    442: 'Duck Feather', 441: 'Duck Egg', 440: 'Duck Egg', 439: 'Wool', 438: 'Wool',
    437: 'L. Goat Milk', 436: 'L. Goat Milk', 435: 'Goat Milk', 434: 'Goat Milk',
    433: 'Goat Milk', 432: 'Coffee Bean', 431: 'Truffle Oil', 430: 'Sunflower Seeds',
    429: 'Truffle', 428: 'Jazz Seeds', 427: 'Cloth', 426: 'Tulip Bulb', 425: 'Goat Cheese',
    424: 'Fairy Seeds', 423: 'Cheese', 422: 'Cheese', 421: 'Purple Mushroom',
    420: 'Sunflower', 419: 'Red Mushroom', 418: 'Red Mushroom', 417: 'Crocus',
    416: 'Sweet Gem Berry', 415: 'Snow Yam', 414: 'Stepping Stone Path',
    413: 'Crystal Fruit', 412: 'Crystal Fruit', 411: 'Winter Root', 410: 'Cobblestone Path',
    409: 'Blackberry', 408: 'Crystal Path', 407: 'Hazelnut', 406: 'Gravel Path',
    405: 'Wild Plum', 404: 'Wood Path', 403: 'Common Mushroom', 402: 'Common Mushroom',
    401: 'Sweet Pea', 400: 'Straw Floor', 399: 'Strawberry', 398: 'Spring Onion',
    397: 'Grape', 396: 'Sea Urchin', 395: 'Spice Berry', 394: 'Spice Berry',
    393: 'Rainbow Shell', 392: 'Coral', 391: 'Nautilus Shell', 390: 'Nautilus Shell',
    389: 'Stone', 388: 'Stone', 387: 'Wood', 386: 'Wood', 385: 'Iridium Ore',
    384: 'Iridium Ore', 383: 'Gold Ore', 382: 'Gold Ore', 381: 'Coal', 380: 'Coal',
    379: 'Iron Ore', 378: 'Iron Ore', 377: 'Copper Ore', 376: 'Copper Ore', 375: 'Poppy',
    374: 'Poppy', 373: 'Poppy', 372: 'Poppy', 371: 'Clam', 370: 'Quality Retaining Soil',
    369: 'Basic Retaining Soil', 368: 'Quality Fertilizer', 367: 'Basic Fertilizer',
    366: 'Basic Fertilizer', 365: 'Basic Fertilizer', 364: 'Basic Fertilizer',
    363: 'Basic Fertilizer', 362: 'Basic Fertilizer', 361: 'Basic Fertilizer',
    360: 'Basic Fertilizer', 359: 'Basic Fertilizer', 358: 'Basic Fertilizer',
    357: 'Basic Fertilizer', 356: 'Basic Fertilizer', 355: 'Basic Fertilizer',
    354: 'Basic Fertilizer', 353: 'Basic Fertilizer', 352: 'Basic Fertilizer',
    351: 'Basic Fertilizer', 350: 'Basic Fertilizer', 349: 'Juice', 348: 'Juice',
    347: 'Wine', 346: 'Rare Seed', 345: 'Beer', 344: 'Beer', 343: 'Jelly', 342: 'Jelly',
    341: 'Pickles', 340: 'Pickles', 339: 'Honey', 338: 'Honey', 337: 'Refined Quartz',
    336: 'Iridium Bar', 335: 'Gold Bar', 334: 'Iron Bar', 333: 'Copper Bar',
    332: 'Crystal Floor', 331: 'Crystal Floor', 330: 'Weathered Floor', 329: 'Clay',
    328: 'Stone Floor', 327: 'Wood Floor', 326: 'Wood Floor', 325: 'Wood Floor',
    324: 'Gate', 323: 'Iron Fence', 322: 'Stone Fence', 321: 'Wood Fence',
    320: 'Wood Fence', 319: 'Wood Fence', 318: 'Wood Fence', 317: 'Wood Fence',
    316: 'Wood Fence', 315: 'Wood Fence', 314: 'Wood Fence', 313: 'Wood Fence',
    312: 'Wood Fence', 311: 'Wood Fence', 310: 'Pine Cone', 309: 'Maple Seed',
    308: 'Acorn', 307: 'Void Mayonnaise', 306: 'Duck Mayonnaise', 305: 'Mayonnaise',
    304: 'Void Egg', 303: 'Hops', 302: 'Pale Ale', 301: 'Hops Starter', 300: 'Grape Starter',
    299: 'Amaranth', 298: 'Amaranth Seeds', 297: 'Hardwood Fence', 296: 'Hardwood Fence',
    295: 'Salmonberry', 294: 'Salmonberry', 293: 'Salmonberry', 292: 'Salmonberry',
    291: 'Salmonberry', 290: 'Salmonberry', 289: 'Salmonberry', 288: 'Salmonberry',
    287: 'Mega Bomb', 286: 'Bomb', 285: 'Cherry Bomb', 284: 'Cherry Bomb', 283: 'Beet',
    282: 'Holly', 281: 'Cranberries', 280: 'Chanterelle', 279: 'Yam', 278: 'Yam',
    277: 'Bok Choy', 276: 'Bok Choy', 275: 'Pumpkin', 274: 'Pumpkin', 273: 'Artichoke',
    272: 'Artichoke', 271: 'Eggplant', 270: 'Eggplant', 269: 'Corn', 268: 'Corn',
    267: 'Starfruit', 266: 'Starfruit', 265: 'Red Cabbage', 264: 'Red Cabbage',
    263: 'Radish', 262: 'Radish', 261: 'Wheat', 260: 'Wheat', 259: 'Hot Pepper',
    258: 'Fiddlehead Fern', 257: 'Blueberry', 256: 'Morel', 255: 'Tomato', 254: 'Tomato',
    253: 'Melon', 252: 'Melon', 251: 'Rhubarb', 250: 'Rhubarb', 249: 'Kale', 248: 'Kale',
    247: 'Garlic', 246: 'Garlic', 245: 'Garlic', 244: 'Garlic', 243: 'Roots Platter',
    242: "Miner's Treat", 241: "Dish O' The Sea", 240: 'Survival Burger',
    239: "Farmer's Lunch", 238: 'Stuffing', 237: 'Cranberry Sauce', 236: 'Super Meal',
    235: 'Pumpkin Soup', 234: "Autumn's Bounty", 233: 'Blueberry Tart', 232: 'Ice Cream',
    231: 'Rice Pudding', 230: 'Eggplant Parmesan', 229: 'Red Plate', 228: 'Tortilla',
    227: 'Maki Roll', 226: 'Sashimi', 225: 'Spicy Eel', 224: 'Fried Eel', 223: 'Spaghetti',
    222: 'Cookie', 221: 'Rhubarb Pie', 220: 'Pink Cake', 219: 'Chocolate Cake',
    218: 'Trout Soup', 217: 'Tom Kha Soup', 216: 'Tom Kha Soup', 215: 'Bread',
    214: 'Pepper Poppers', 213: 'Crispy Bass', 212: 'Fish Taco', 211: 'Salmon Dinner',
    210: 'Pancakes', 209: 'Hashbrowns', 208: 'Carp Surprise', 207: 'Glazed Yams',
    206: 'Bean Hotpot', 205: 'Pizza', 204: 'Fried Mushroom', 203: 'Lucky Lunch',
    202: 'Strange Bun', 201: 'Fried Calamari', 200: 'Complete Breakfast',
    199: 'Vegetable Medley', 198: 'Parsnip Soup', 197: 'Baked Fish',
    196: 'Cheese Cauliflower', 195: 'Salad', 194: 'Omelet', 193: 'Fried Egg',
    192: 'Fried Egg', 191: 'Potato', 190: 'Potato', 189: 'Cauliflower', 188: 'Cauliflower',
    187: 'Green Bean', 186: 'Green Bean', 185: 'Large Milk', 184: 'Large Milk',
    183: 'Milk', 182: 'Milk', 181: 'Large Egg (Brown)', 180: 'Large Egg (Brown)',
    179: 'Egg (Brown)', 178: 'Egg (Brown)', 177: 'Egg (White)', 176: 'Egg (White)',
    175: 'Large Egg (White)', 174: 'Large Egg (White)', 173: 'Large Egg (White)',
    172: 'Large Egg (White)', 171: 'Large Egg (White)', 170: 'Large Egg (White)',
    169: 'Large Egg (White)', 168: 'Large Egg (White)', 167: 'Large Egg (White)',
    166: 'Joja Cola', 165: 'Joja Cola', 164: 'Scorpion Carp', 163: 'Sandfish',
    162: 'Sandfish', 161: 'Sandfish', 160: 'Sandfish', 159: 'Sandfish', 158: 'Sandfish',
    157: 'Sandfish', 156: 'Sandfish', 155: 'Ghostfish', 154: 'Super Cucumber',
    153: 'Sea Cucumber', 152: 'Sea Cucumber', 151: 'Sea Cucumber', 150: 'Squid',
    149: 'Red Snapper', 148: 'Octopus', 147: 'Eel', 146: 'Herring', 145: 'Red Mullet',
    144: 'Sunfish', 143: 'Pike', 142: 'Catfish', 141: 'Carp', 140: 'Perch', 139: 'Walleye',
    138: 'Salmon', 137: 'Rainbow Trout', 136: 'Smallmouth Bass', 135: 'Largemouth Bass',
    134: 'Largemouth Bass', 133: 'Largemouth Bass', 132: 'Largemouth Bass',
    131: 'Bream', 130: 'Sardine', 129: 'Tuna', 128: 'Anchovy', 127: 'Pufferfish',
    126: 'Pufferfish', 125: 'Pufferfish', 124: 'Pufferfish', 123: 'Pufferfish',
    122: 'Pufferfish', 121: 'Pufferfish', 120: 'Pufferfish', 119: 'Pufferfish',
    118: 'Pufferfish', 117: 'Pufferfish', 116: 'Pufferfish', 115: 'Pufferfish',
    114: 'Pufferfish', 113: 'Pufferfish', 112: 'Pufferfish', 111: 'Pufferfish',
    110: 'Pufferfish', 109: 'Pufferfish', 108: 'Pufferfish', 107: 'Pufferfish',
    106: 'Pufferfish', 105: 'Pufferfish', 104: 'Pufferfish', 103: 'Pufferfish',
    102: 'Pufferfish', 101: 'Pufferfish', 100: 'Pufferfish', 99: 'Pufferfish',
    98: 'Pufferfish', 97: 'Pufferfish', 96: 'Pufferfish', 95: 'Pufferfish',
    94: 'Pufferfish', 93: 'Pufferfish', 92: 'Pufferfish', 91: 'Sap', 90: 'Sap',
    89: 'Cactus Fruit', 88: 'Cactus Fruit', 87: 'Coconut', 86: 'Coconut', 85: 'Coconut',
    84: 'Coconut', 83: 'Coconut', 82: 'Coconut', 81: 'Coconut', 80: 'Coconut',
    79: 'Coconut', 78: 'Coconut', 77: 'Cave Carrot', 76: 'Cave Carrot', 75: 'Cave Carrot',
    74: 'Cave Carrot', 73: 'Cave Carrot', 72: 'Cave Carrot', 71: 'Cave Carrot',
    70: 'Cave Carrot', 69: 'Cave Carrot', 68: 'Cave Carrot', 67: 'Cave Carrot',
    66: 'Cave Carrot', 65: 'Cave Carrot', 64: 'Cave Carrot', 63: 'Cave Carrot',
    62: 'Cave Carrot', 61: 'Cave Carrot', 60: 'Cave Carrot', 59: 'Cave Carrot',
    58: 'Cave Carrot', 57: 'Cave Carrot', 56: 'Cave Carrot', 55: 'Cave Carrot',
    54: 'Cave Carrot', 53: 'Cave Carrot', 52: 'Cave Carrot', 51: 'Cave Carrot',
    50: 'Cave Carrot', 49: 'Cave Carrot', 48: 'Cave Carrot', 47: 'Cave Carrot',
    46: 'Cave Carrot', 45: 'Cave Carrot', 44: 'Cave Carrot', 43: 'Cave Carrot',
    42: 'Cave Carrot', 41: 'Cave Carrot', 40: 'Cave Carrot', 39: 'Cave Carrot',
    38: 'Cave Carrot', 37: 'Cave Carrot', 36: 'Cave Carrot', 35: 'Cave Carrot',
    34: 'Cave Carrot', 33: 'Cave Carrot', 32: 'Cave Carrot', 31: 'Cave Carrot',
    30: 'Cave Carrot', 29: 'Cave Carrot', 28: 'Cave Carrot', 27: 'Cave Carrot',
    26: 'Cave Carrot', 25: 'Cave Carrot', 24: 'Cave Carrot', 23: 'Parsnip',
    22: 'Parsnip', 21: 'Dandelion', 20: 'Dandelion', 19: 'Leek', 18: 'Leek',
    17: 'Daffodil', 16: 'Daffodil', 15: 'Wild Horseradish', 14: 'Wild Horseradish',
    13: 'Wild Horseradish', 12: 'Wild Horseradish', 11: 'Wild Horseradish',
    10: 'Wild Horseradish', 9: 'Wild Horseradish', 8: 'Wild Horseradish',
    7: 'Wild Horseradish', 6: 'Wild Horseradish', 5: 'Wild Horseradish',
    4: 'Wild Horseradish', 3: 'Wild Horseradish', 2: 'Wild Horseradish'
};

// Name -> actual item ID mapping
// This converts item names to their real object IDs
const NAME_TO_ID = {
    'Wild Horseradish': 16, 'Daffodil': 18, 'Leek': 20, 'Dandelion': 22, 'Parsnip': 24,
    'Cave Carrot': 78, 'Coconut': 88, 'Cactus Fruit': 90, 'Sap': 92, 'Pufferfish': 128,
    'Anchovy': 129, 'Tuna': 130, 'Sardine': 131, 'Bream': 132, 'Largemouth Bass': 136,
    'Smallmouth Bass': 137, 'Rainbow Trout': 138, 'Salmon': 139, 'Walleye': 140,
    'Perch': 141, 'Carp': 142, 'Catfish': 143, 'Pike': 144, 'Sunfish': 145,
    'Red Mullet': 146, 'Herring': 147, 'Eel': 148, 'Octopus': 149, 'Red Snapper': 150,
    'Squid': 151, 'Sea Cucumber': 154, 'Super Cucumber': 155, 'Ghostfish': 156,
    'Sandfish': 164, 'Scorpion Carp': 165, 'Joja Cola': 167, 'Large Egg (White)': 174,
    'Egg (White)': 176, 'Egg (Brown)': 180, 'Large Egg (Brown)': 182, 'Milk': 184,
    'Large Milk': 186, 'Green Bean': 188, 'Cauliflower': 190, 'Potato': 192,
    'Fried Egg': 194, 'Omelet': 195, 'Salad': 196, 'Cheese Cauliflower': 197,
    'Baked Fish': 198, 'Parsnip Soup': 199, 'Vegetable Medley': 200,
    'Complete Breakfast': 201, 'Fried Calamari': 202, 'Strange Bun': 203,
    'Lucky Lunch': 204, 'Fried Mushroom': 205, 'Pizza': 206, 'Bean Hotpot': 207,
    'Glazed Yams': 208, 'Carp Surprise': 209, 'Hashbrowns': 210, 'Pancakes': 211,
    'Salmon Dinner': 212, 'Fish Taco': 213, 'Crispy Bass': 214, 'Pepper Poppers': 215,
    'Bread': 216, 'Tom Kha Soup': 218, 'Trout Soup': 219, 'Chocolate Cake': 220,
    'Pink Cake': 221, 'Rhubarb Pie': 222, 'Cookie': 223, 'Spaghetti': 224,
    'Fried Eel': 225, 'Spicy Eel': 226, 'Sashimi': 227, 'Maki Roll': 228,
    'Tortilla': 229, 'Red Plate': 230, 'Eggplant Parmesan': 231, 'Rice Pudding': 232,
    'Ice Cream': 233, 'Blueberry Tart': 234, "Autumn's Bounty": 235, 'Pumpkin Soup': 236,
    'Super Meal': 237, 'Cranberry Sauce': 238, 'Stuffing': 239, "Farmer's Lunch": 240,
    'Survival Burger': 241, "Dish O' The Sea": 242, "Miner's Treat": 243,
    'Roots Platter': 244, 'Garlic': 248, 'Kale': 250, 'Rhubarb': 252, 'Melon': 254,
    'Tomato': 256, 'Morel': 257, 'Blueberry': 258, 'Fiddlehead Fern': 259,
    'Hot Pepper': 260, 'Wheat': 262, 'Radish': 264, 'Red Cabbage': 266, 'Starfruit': 268,
    'Corn': 270, 'Eggplant': 272, 'Artichoke': 274, 'Pumpkin': 276, 'Bok Choy': 278,
    'Yam': 280, 'Chanterelle': 281, 'Cranberries': 282, 'Holly': 283, 'Beet': 284,
    'Cherry Bomb': 286, 'Bomb': 287, 'Mega Bomb': 288, 'Salmonberry': 296,
    'Hardwood Fence': 298, 'Amaranth Seeds': 299, 'Amaranth': 300, 'Grape Starter': 301,
    'Hops Starter': 302, 'Pale Ale': 303, 'Hops': 304, 'Void Egg': 305, 'Mayonnaise': 306,
    'Duck Mayonnaise': 307, 'Void Mayonnaise': 308, 'Acorn': 309, 'Maple Seed': 310,
    'Pine Cone': 311, 'Wood Fence': 322, 'Stone Fence': 323, 'Iron Fence': 324,
    'Gate': 325, 'Wood Floor': 328, 'Stone Floor': 329, 'Clay': 330,
    'Weathered Floor': 331, 'Crystal Floor': 333, 'Copper Bar': 334, 'Iron Bar': 335,
    'Gold Bar': 336, 'Iridium Bar': 337, 'Refined Quartz': 338, 'Honey': 340,
    'Pickles': 342, 'Jelly': 344, 'Beer': 346, 'Rare Seed': 347, 'Wine': 348,
    'Juice': 350, 'Basic Fertilizer': 368, 'Quality Fertilizer': 369,
    'Basic Retaining Soil': 370, 'Quality Retaining Soil': 371, 'Clam': 372,
    'Poppy': 376, 'Copper Ore': 378, 'Iron Ore': 380, 'Coal': 382, 'Gold Ore': 384,
    'Iridium Ore': 386, 'Wood': 388, 'Stone': 390, 'Nautilus Shell': 392, 'Coral': 393,
    'Rainbow Shell': 394, 'Spice Berry': 396, 'Sea Urchin': 397, 'Grape': 398,
    'Spring Onion': 399, 'Strawberry': 400, 'Straw Floor': 401, 'Sweet Pea': 402,
    'Common Mushroom': 404, 'Wood Path': 405, 'Wild Plum': 406, 'Gravel Path': 407,
    'Hazelnut': 408, 'Crystal Path': 409, 'Blackberry': 410, 'Cobblestone Path': 411,
    'Winter Root': 412, 'Crystal Fruit': 414, 'Stepping Stone Path': 415,
    'Snow Yam': 416, 'Sweet Gem Berry': 417, 'Crocus': 418, 'Red Mushroom': 420,
    'Sunflower': 421, 'Purple Mushroom': 422, 'Cheese': 424, 'Goat Cheese': 426,
    'Fairy Seeds': 425, 'Tulip Bulb': 427, 'Cloth': 428, 'Jazz Seeds': 429,
    'Truffle': 430, 'Sunflower Seeds': 431, 'Truffle Oil': 432, 'Coffee Bean': 433,
    'Goat Milk': 436, 'L. Goat Milk': 438, 'Wool': 440, 'Duck Egg': 442,
    'Duck Feather': 444, "Rabbit's Foot": 446, 'Poppy Seeds': 453, 'Spangle Seeds': 455,
    'Algae Soup': 456, 'Pale Broth': 457, 'Mead': 459, 'Speed-Gro': 465,
    'Deluxe Speed-Gro': 466, 'Parsnip Seeds': 472, 'Bean Starter': 473,
    'Cauliflower Seeds': 474, 'Potato Seeds': 475, 'Garlic Seeds': 476,
    'Kale Seeds': 477, 'Rhubarb Seeds': 478, 'Melon Seeds': 479, 'Tomato Seeds': 480,
    'Blueberry Seeds': 481, 'Pepper Seeds': 482, 'Wheat Seeds': 483, 'Radish Seeds': 484,
    'Red Cabbage Seeds': 485, 'Starfruit Seeds': 486, 'Corn Seeds': 487,
    'Eggplant Seeds': 488, 'Artichoke Seeds': 489, 'Pumpkin Seeds': 490,
    'Bok Choy Seeds': 491, 'Yam Seeds': 492, 'Cranberry Seeds': 493, 'Beet Seeds': 494,
    'Spring Seeds': 495, 'Summer Seeds': 496, 'Fall Seeds': 497, 'Winter Seeds': 498,
    'Ancient Seeds': 499, 'Tulip': 591, 'Summer Spangle': 593, 'Fairy Rose': 595,
    'Blue Jazz': 597, 'Sprinkler': 599, 'Plum Pudding': 604, 'Artichoke Dip': 605,
    'Stir Fry': 606, 'Roasted Hazelnuts': 607, 'Pumpkin Pie': 608, 'Radish Salad': 609,
    'Fruit Salad': 610, 'Blackberry Cobbler': 611, 'Cranberry Candy': 612, 'Apple': 613,
    'Bruschetta': 618, 'Quality Sprinkler': 621, 'Cherry Sapling': 628,
    'Apricot Sapling': 629, 'Orange Sapling': 630, 'Peach Sapling': 631,
    'Pomegranate Sapling': 632, 'Apple Sapling': 633, 'Apricot': 634, 'Orange': 635,
    'Peach': 636, 'Pomegranate': 637, 'Cherry': 638, 'Coleslaw': 648,
    'Fiddlehead Risotto': 649, 'Poppyseed Muffin': 651, 'Bug Meat': 684, 'Bait': 685,
    'Spinner': 686, 'Dressed Spinner': 687, 'Barbed Hook': 691, 'Lead Bobber': 692,
    'Treasure Hunter': 693, 'Trap Bobber': 694, 'Cork Bobber': 695, 'Sturgeon': 698,
    'Tiger Trout': 699, 'Bullhead': 700, 'Tilapia': 701, 'Chub': 702, 'Magnet': 703,
    'Dorado': 704, 'Albacore': 705, 'Shad': 706, 'Lingcod': 707, 'Halibut': 708,
    'Hardwood': 709, 'Lobster': 715, 'Crayfish': 716, 'Crab': 717, 'Cockle': 718,
    'Mussel': 719, 'Shrimp': 720, 'Snail': 721, 'Periwinkle': 722, 'Oyster': 723,
    'Maple Syrup': 724, 'Oak Resin': 725, 'Pine Tar': 726, 'Chowder': 727,
    'Fish Stew': 728, 'Escargot': 729, 'Lobster Bisque': 730, 'Maple Bar': 731,
    'Crab Cakes': 732, 'Woodskip': 734, 'Slime': 766, 'Bat Wing': 767,
    'Solar Essence': 768, 'Void Essence': 769, 'Fiber': 771, 'Oil of Garlic': 772,
    'Life Elixir': 773, 'Battery Pack': 787
};

// Convert pre-1.4 roll to actual item ID
function rollToItemId(roll) {
    const name = CART_ITEMS_PRE14[roll];
    return NAME_TO_ID[name] || roll;
}

// Generate cart items for pre-1.4 (1.3)
function getCartItemIds_v13(gameId, day) {
    const rng = new CSRandom(gameId + day);
    const items = [];

    for (let slot = 0; slot < 10; slot++) {
        // Pre-1.4: direct roll lookup (no duplicate check)
        const roll = rng.Next(2, 790);
        const itemId = rollToItemId(roll);
        items.push(itemId);

        // Consume RNG for price and quantity
        rng.Next(1, 11);
        rng.Next(3, 6);
        rng.NextDouble();
    }

    return items;
}

// Valid cart items for 1.4+
const CART_ITEMS_1_4 = new Set([
    16, 18, 20, 22, 24, 78, 88, 90, 92, 128, 129, 130, 131, 132, 136, 137, 138, 139, 140,
    141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 154, 155, 156, 164, 165, 167,
    174, 176, 180, 182, 184, 186, 188, 190, 192, 194, 195, 196, 197, 198, 199, 200, 201,
    202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 218, 219,
    220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236,
    237, 238, 239, 240, 241, 242, 243, 244, 248, 250, 251, 252, 253, 254, 256, 257, 258,
    259, 260, 262, 264, 266, 268, 270, 271, 272, 273, 274, 276, 278, 280, 281, 282, 283,
    284, 286, 287, 288, 293, 296, 298, 299, 300, 301, 302, 303, 304, 306, 307, 309, 310,
    311, 322, 323, 324, 325, 328, 329, 330, 331, 333, 334, 335, 336, 337, 338, 340, 342,
    344, 346, 347, 348, 350, 368, 369, 370, 371, 372, 376, 378, 380, 382, 384, 386, 388,
    390, 392, 393, 394, 396, 397, 398, 399, 400, 401, 402, 404, 405, 406, 407, 408, 409,
    410, 411, 412, 414, 415, 416, 418, 420, 421, 422, 424, 425, 426, 427, 428, 429, 430,
    431, 432, 433, 436, 438, 440, 442, 444, 446, 453, 455, 456, 457, 459, 465, 466, 472,
    473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489,
    490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 591, 593, 595, 597, 599, 604, 605,
    606, 607, 608, 609, 610, 611, 612, 613, 614, 618, 621, 628, 629, 630, 631, 632, 633,
    634, 635, 636, 637, 638, 648, 649, 651, 684, 685, 686, 687, 691, 692, 693, 694, 695,
    698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 715, 716, 717, 718, 719,
    720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 766, 767,
    768, 769, 771, 772, 773, 787, 445, 267, 265, 269
]);

// Generate cart items for 1.4/1.5
function getCartItemIds_v14(gameId, day) {
    const rng = new CSRandom(gameId + day);
    const items = [];
    const seenItems = new Set();

    for (let slot = 0; slot < 10; slot++) {
        let itemId = rng.Next(2, 790);

        // 1.4+ finds next valid item by incrementing
        while (true) {
            itemId = (itemId + 1) % 790;
            if (CART_ITEMS_1_4.has(itemId) && !seenItems.has(itemId)) {
                break;
            }
        }

        seenItems.add(itemId);
        items.push(itemId);

        // Consume RNG for price and quantity
        rng.Next(1, 11);
        rng.Next(3, 6);
        rng.NextDouble();
    }

    return items;
}

// Load xxhash from stardew-predictor for 1.6 seeding
const xxhashPath = path.join(__dirname, '../../stardew-predictor/xxhash.min.js');
const xxhashCode = fs.readFileSync(xxhashPath, 'utf8');
vm.runInNewContext(xxhashCode, sandbox);
const XXH = sandbox.XXH;

const INT_MAX = 2147483647;

// XXHash-based seed for 1.6
function getHashFromArray(...values) {
    const array = new Int32Array(values);
    const H = XXH.h32();
    return H.update(array.buffer).digest().toNumber();
}

function getRandomSeed(a, b = 0, c = 0, d = 0, e = 0) {
    return getHashFromArray(a % INT_MAX, b % INT_MAX, c % INT_MAX, d % INT_MAX, e % INT_MAX);
}

// Read the stardew-predictor source to extract save.objects data for 1.6
const predictorPath = path.join(__dirname, '../../stardew-predictor/stardew-predictor.js');
const predictorCode = fs.readFileSync(predictorPath, 'utf8');

// Extract save.objects from stardew-predictor
function parseObjectsFromPredictor(code) {
    const objects = {};
    // Match object entries like: "_16": { 'id': "16", 'name': "...", ...}
    const entryRegex = /"_(\d+)":\s*\{\s*'id':\s*"(\d+)",\s*'name':\s*"([^"]*)",\s*'type':\s*"([^"]*)",\s*'category':\s*(-?\d+),\s*'price':\s*(\d+),\s*'offlimits':\s*(true|false)\s*\}/g;

    let match;
    while ((match = entryRegex.exec(code)) !== null) {
        const key = parseInt(match[1]);
        objects[key] = {
            id: parseInt(match[2]),
            name: match[3],
            type: match[4],
            category: parseInt(match[5]),
            price: parseInt(match[6]),
            offlimits: match[7] === 'true'
        };
    }
    return objects;
}

const objects1_6 = parseObjectsFromPredictor(predictorCode);
console.log(`Extracted ${Object.keys(objects1_6).length} objects for 1.6`);

/**
 * 1.6 cart algorithm - exactly matches stardew-predictor's getRandomItems() + predictCart_1_6()
 */
function getCartItemIds_v16(gameId, day) {
    // Seed: getRandomSeed(day, gameId/2) - hash-based
    const seed = getRandomSeed(day, Math.floor(gameId / 2));
    const rng = new CSRandom(seed);

    // Step 1: Generate shuffle keys for all objects in range 2-789
    // Filter: price > 0, offlimits = false
    const shuffledItems = {};
    for (let id = 2; id <= 789; id++) {
        const obj = objects1_6[id];
        if (!obj) continue;

        const key = rng.Next();

        // Initial filters (getRandomItems):
        if (obj.price === 0) continue;
        if (obj.offlimits) continue;

        shuffledItems[key] = id;
    }

    // Step 2: Sort by key (ascending numeric order - matches JS object iteration)
    const sortedKeys = Object.keys(shuffledItems).map(k => parseInt(k)).sort((a, b) => a - b);

    // Step 3: Apply category checks and take first 10
    const selectedItems = [];
    for (const key of sortedKeys) {
        const id = shuffledItems[key];
        const obj = objects1_6[id];

        // Category checks (doCategoryChecks=true):
        if (obj.category >= 0 || obj.category === -999) continue;
        if (obj.type === 'Arch' || obj.type === 'Minerals' || obj.type === 'Quest') continue;

        selectedItems.push(id);
        if (selectedItems.length >= 10) break;
    }

    // Step 4: Consume RNG for price and quantity (not returned, but must consume)
    for (const id of selectedItems) {
        const obj = objects1_6[id];
        rng.Next(1, 11); // random price base
        rng.Next(3, 6);  // scaled price
        rng.NextDouble(); // quantity check
    }

    return selectedItems;
}

// Generate comprehensive cart golden tests for all versions
function generateCartGoldenTests() {
    const testSeeds = [12345, 99999, 1, 2147483647, 123456789, 42, 1000000, 777777];
    const testDays = [5, 7, 12, 14, 19, 21, 26, 28];

    const tests = { cart_items: [] };

    for (const seed of testSeeds) {
        for (const day of testDays) {
            // 1.3
            tests.cart_items.push({
                version: '1.3',
                seed,
                day,
                item_ids: getCartItemIds_v13(seed, day)
            });

            // 1.4
            tests.cart_items.push({
                version: '1.4',
                seed,
                day,
                item_ids: getCartItemIds_v14(seed, day)
            });

            // 1.5 (same as 1.4)
            tests.cart_items.push({
                version: '1.5',
                seed,
                day,
                item_ids: getCartItemIds_v14(seed, day)
            });

            // 1.6
            tests.cart_items.push({
                version: '1.6',
                seed,
                day,
                item_ids: getCartItemIds_v16(seed, day)
            });
        }
    }

    return tests;
}

// Generate Rust code for 1.6 object data
function generateRustObjectData() {
    let rust = `/// Object data for 1.6 cart algorithm
/// Generated from stardew-predictor save.objects
/// (id, price, offlimits, category, type_excluded)
/// type_excluded = type is 'Arch', 'Minerals', or 'Quest'

pub const CART_OBJECTS_1_6: &[(i32, i32, bool, i32, bool)] = &[\n`;

    for (let id = 2; id <= 789; id++) {
        const obj = objects1_6[id];
        if (!obj) continue;

        const typeExcluded = obj.type === 'Arch' || obj.type === 'Minerals' || obj.type === 'Quest';
        rust += `    (${obj.id}, ${obj.price}, ${obj.offlimits}, ${obj.category}, ${typeExcluded}),\n`;
    }

    rust += `];\n`;
    return rust;
}

// Main execution
console.log('\n=== Cart Mappings Extraction ===\n');

console.log('Pre-1.4 cart test (seed=12345, day=5):');
console.log(getCartItemIds_v13(12345, 5).slice(0, 3));

console.log('\n1.4+ cart test (seed=12345, day=5):');
console.log(getCartItemIds_v14(12345, 5).slice(0, 3));

console.log('\n1.6 cart test (seed=12345, day=5):');
console.log(getCartItemIds_v16(12345, 5).slice(0, 3));

// Generate and write cart golden tests
console.log('\nGenerating cart golden tests...');
const tests = generateCartGoldenTests();
console.log(`Generated ${tests.cart_items.length} cart test cases`);

const cartTestsPath = path.join(__dirname, '../tests/cart_golden_values.json');
fs.writeFileSync(cartTestsPath, JSON.stringify(tests, null, 2));
console.log(`Cart tests written to: ${cartTestsPath}`);

// Generate and write Rust object data for 1.6
console.log('\nGenerating Rust object data for 1.6...');
const rustCode = generateRustObjectData();
const rustDataPath = path.join(__dirname, '../src/mechanics/cart_objects_1_6.rs');
fs.writeFileSync(rustDataPath, rustCode);
console.log(`Rust object data written to: ${rustDataPath}`);

// Sample 1.6 results
console.log('\nSample 1.6 cart (seed=12345, day=5):');
const sample = getCartItemIds_v16(12345, 5);
for (const id of sample) {
    const obj = objects1_6[id];
    console.log(`  ${id}: ${obj ? obj.name : 'UNKNOWN'}`);
}

// Write pre-1.4 mapping table
console.log('\n// Pre-1.4 roll-to-ID mapping (for Rust):');
const mapping = [];
for (let roll = 2; roll < 790; roll++) {
    const id = rollToItemId(roll);
    mapping.push(id);
}
console.log(`const CART_ROLL_TO_ID_PRE14: [i32; 788] = [${mapping.slice(0, 20).join(', ')}, ...];`);

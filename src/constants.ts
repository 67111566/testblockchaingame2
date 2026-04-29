export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const ITEM_WEAPON_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function nextTokenId() view returns (uint256)",
  "function weapons(uint256) view returns (string itemName, string description, string image, bool isUsed, address owner)",
  "function ownerWeapons(address, uint256) view returns (uint256)",
  "function imageMinted(string) view returns (bool)",
  "function mintWeapon(address to, string itemName, string description, string image) public",
  "function getMyWeapons() public view returns (tuple(string itemName, string description, string image, bool isUsed, address owner)[])",
  "function markAsUsed(uint256 tokenId) public",
  "function useWeapon(uint256 tokenId) public",
  "function getWeapon(uint256 tokenId) public view returns (tuple(string itemName, string description, string image, bool isUsed, address owner))"
];

export const MONSTERS = [
  {
    id: 'soul-wraith',
    name: 'Soul Wraith',
    image: 'https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089759/soul_wraith_alt_jibnvu.png',
    hp: 100,
    atk: 15,
    def: 5
  },
  {
    id: 'tormented-ghoul',
    name: 'Tormented Ghoul',
    image: 'https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089760/tormented_ghoul_alt_bv0wkn.png',
    hp: 80,
    atk: 20,
    def: 2
  },
  {
    id: 'undead-knight',
    name: 'Undead Knight',
    image: 'https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089760/undead_knight_alt_zfkml3.png',
    hp: 150,
    atk: 12,
    def: 15
  },
  {
    id: 'grave-titan',
    name: 'Grave Titan',
    image: 'https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089753/grave_titan_alt_fapkid.png',
    hp: 250,
    atk: 30,
    def: 10
  },
  {
    id: 'zombie-mage',
    name: 'Zombie Mage',
    image: 'https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089767/zombie_mage_alt_qcejvr.png',
    hp: 70,
    atk: 40,
    def: 0
  }
];

export const CARD_TEMPLATES = [
  "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card1_hrglra.png",
  "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card2_qckrxt.png",
  "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card3_id1bya.png",
  "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card4_ayja0l.png",
  "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card5_lhq4w8.png",
  "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card6_nvy664.png"
];

export const SHOP_ITEMS = [
  {
    name: "Shadow Dagger",
    description: "A fast weapon that ignores some defense.",
    image: CARD_TEMPLATES[0],
    stats: { atk: 25, def: 2 }
  },
  {
    name: "Bone Crusher",
    description: "Heavy mace with high physical damage.",
    image: CARD_TEMPLATES[1],
    stats: { atk: 45, def: 5 }
  },
  {
    name: "Soul Reaver",
    description: "Cursed blade that drains essence.",
    image: CARD_TEMPLATES[2],
    stats: { atk: 35, def: 8 }
  },
    {
    name: "Abyssal Staff",
    description: "Pure magic power from the void.",
    image: CARD_TEMPLATES[3],
    stats: { atk: 55, def: -5 }
  }
];

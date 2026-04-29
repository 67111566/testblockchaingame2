/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sword, 
  Shield, 
  ShoppingBag, 
  Hammer, 
  Scroll, 
  Wallet, 
  Loader2, 
  ChevronRight, 
  Trophy, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  CONTRACT_ADDRESS, 
  ITEM_WEAPON_ABI, 
  MONSTERS, 
  SHOP_ITEMS,
  CARD_TEMPLATES 
} from './constants';
import { cn } from './lib/utils';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// --- Types ---
interface Weapon {
  tokenId: number;
  itemName: string;
  description: string;
  image: string;
  isUsed: boolean;
  owner: string;
  stats?: { atk: number; def: number }; // Inferred metadata or parsed from description
}

interface GameState {
  view: 'lobby' | 'battle' | 'shop' | 'craft' | 'inventory';
  playerHp: number;
  monsterHp: number;
  currentMonster: typeof MONSTERS[0] | null;
  battleLog: string[];
  isBattling: boolean;
  winner: 'player' | 'monster' | null;
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    view: 'lobby',
    playerHp: 100,
    monsterHp: 0,
    currentMonster: null,
    battleLog: [],
    isBattling: false,
    winner: null,
  });

  // --- Web3 Logic ---
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError("Please install MetaMask");
      return;
    }
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      
      // Check Chain ID
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(31337)) {
        // Try to switch to Localhost 31337
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }], // 31337 in hex
          });
        } catch (switchError: any) {
          setError("Please connect to Localhost:8545 (Chain ID 31337)");
        }
      }
      
      await fetchWeapons(accounts[0]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeapons = useCallback(async (userAddress: string) => {
    if (!userAddress) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ITEM_WEAPON_ABI, provider);
      
      const weaponData = await contract.getMyWeapons();
      // Since our contract doesn't return TokenIDs in getMyWeapons easily 
      // (it returns an array of Weapon structs), we'll have to correlate or 
      // just display what we have. For this demo, we'll map them.
      
      const mappedWeapons: Weapon[] = weaponData.map((w: any, index: number) => ({
        tokenId: index, // Approximation for this demo
        itemName: w.itemName,
        description: w.description,
        image: w.image,
        isUsed: w.isUsed,
        owner: w.owner,
        // Mock stats based on the description or index for variety
        stats: { 
          atk: 10 + (index * 5) % 40, 
          def: 2 + (index * 2) % 15 
        }
      }));
      
      setWeapons(mappedWeapons);
    } catch (err) {
      console.error("Fetch weapons error:", err);
    }
  }, []);

  const mintWeapon = async (item: typeof SHOP_ITEMS[0]) => {
    if (!account) return;
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ITEM_WEAPON_ABI, signer);
      
      const tx = await contract.mintWeapon(
        account,
        item.name,
        item.description,
        item.image
      );
      
      await tx.wait();
      await fetchWeapons(account);
      setGameState(prev => ({ ...prev, view: 'inventory' }));
    } catch (err: any) {
      console.error(err);
      setError(err.reason || err.message || "Minting failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Battle Logic ---
  const startBattle = (monster: typeof MONSTERS[0]) => {
    setGameState(prev => ({
      ...prev,
      view: 'battle',
      currentMonster: monster,
      monsterHp: monster.hp,
      playerHp: 100,
      battleLog: [`A wild ${monster.name} appeared!`],
      isBattling: true,
      winner: null,
    }));
  };

  const executeAutoBattle = useCallback(() => {
    if (!gameState.isBattling || !gameState.currentMonster || gameState.winner) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev.currentMonster || prev.winner) {
          clearInterval(interval);
          return prev;
        }

        const newLog = [...prev.battleLog];
        
        // Player Attacks
        // Get average atk from weapons (simplification)
        const playerAtk = weapons.length > 0 ? Math.max(...weapons.map(w => w.stats?.atk || 0)) : 10;
        const playerDamage = Math.max(5, playerAtk - prev.currentMonster.def + Math.floor(Math.random() * 5));
        const newMonsterHp = Math.max(0, prev.monsterHp - playerDamage);
        newLog.push(`Player deals ${playerDamage} damage to ${prev.currentMonster.name}.`);

        if (newMonsterHp <= 0) {
          clearInterval(interval);
          return {
            ...prev,
            monsterHp: 0,
            battleLog: [...newLog, `Victory! ${prev.currentMonster.name} defeated.`],
            isBattling: false,
            winner: 'player'
          };
        }

        // Monster Attacks
        const monsterDamage = Math.max(2, prev.currentMonster.atk - (weapons.length > 0 ? 5 : 0) + Math.floor(Math.random() * 5));
        const newPlayerHp = Math.max(0, prev.playerHp - monsterDamage);
        newLog.push(`${prev.currentMonster.name} deals ${monsterDamage} damage to Player.`);

        if (newPlayerHp <= 0) {
          clearInterval(interval);
          return {
            ...prev,
            playerHp: 0,
            battleLog: [...newLog, `Defeat... Player was slain.`],
            isBattling: false,
            winner: 'monster'
          };
        }

        return {
          ...prev,
          monsterHp: newMonsterHp,
          playerHp: newPlayerHp,
          battleLog: newLog.slice(-5) // Keep last 5 logs for UI sanity
        };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [gameState.isBattling, gameState.currentMonster, gameState.winner, weapons]);

  useEffect(() => {
    if (gameState.isBattling) {
      const cleanup = executeAutoBattle();
      return cleanup;
    }
  }, [gameState.isBattling, executeAutoBattle]);

  // --- Render Components ---

  const Sidebar = () => (
    <div className="w-64 glass-panel p-6 flex flex-col gap-4 sticky top-6 h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
          <Sword className="text-indigo-400" size={20} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">SOUL WRAITH</h1>
      </div>

      <nav className="flex flex-col gap-2">
        <NavButton 
          active={gameState.view === 'lobby' || gameState.view === 'battle'} 
          icon={<Sword size={18}/>} 
          label="Hunt" 
          onClick={() => setGameState(prev => ({ ...prev, view: 'lobby' }))} 
        />
        <NavButton 
          active={gameState.view === 'inventory'} 
          icon={<Scroll size={18}/>} 
          label="Inventory" 
          onClick={() => setGameState(prev => ({ ...prev, view: 'inventory' }))} 
        />
        <NavButton 
          active={gameState.view === 'shop'} 
          icon={<ShoppingBag size={18}/>} 
          label="Shop" 
          onClick={() => setGameState(prev => ({ ...prev, view: 'shop' }))} 
        />
        <NavButton 
          active={gameState.view === 'craft'} 
          icon={<Hammer size={18}/>} 
          label="Crafting" 
          onClick={() => setGameState(prev => ({ ...prev, view: 'craft' }))} 
        />
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        {!account ? (
          <button 
            onClick={connectWallet}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Wallet size={18} />
            Connect
          </button>
        ) : (
          <div className="flex flex-col gap-2">
             <div className="text-xs text-slate-400 px-2">Connected Wallet</div>
             <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono truncate text-indigo-300">
               {account}
             </div>
          </div>
        )}
      </div>
    </div>
  );

  const NavButton = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group",
        active 
          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      <span className={cn(active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto flex gap-6">
      <Sidebar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3"
            >
              <AlertCircle size={20} />
              <div className="text-sm font-medium">{error}</div>
              <button className="ml-auto" onClick={() => setError(null)}>×</button>
            </motion.div>
          )}

          {gameState.view === 'lobby' && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header>
                <h2 className="text-3xl font-bold text-white mb-2">Dark Realms</h2>
                <p className="text-slate-400">Select a monster to begin your hunt. Higher risk, higher rewards.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MONSTERS.map((monster) => (
                  <motion.div 
                    key={monster.id}
                    whileHover={{ y: -5 }}
                    className="game-card group cursor-pointer"
                    onClick={() => startBattle(monster)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                    <img src={monster.image} alt={monster.name} className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-110" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                      <div className="flex justify-between items-end">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{monster.name}</h3>
                          <div className="flex gap-3 text-xs uppercase tracking-wider font-bold">
                            <span className="text-red-400">ATK {monster.atk}</span>
                            <span className="text-green-400">HP {monster.hp}</span>
                            <span className="text-blue-400">DEF {monster.def}</span>
                          </div>
                        </div>
                        <div className="p-2 rounded-full bg-white/10 backdrop-blur group-hover:bg-indigo-600 transition-colors">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {gameState.view === 'battle' && gameState.currentMonster && (
            <motion.div 
              key="battle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex flex-col gap-6"
            >
              <div className="grid grid-cols-2 gap-8 items-center justify-items-center py-12 flex-1">
                {/* Player Section */}
                <div className="text-center space-y-6">
                    <div className="relative">
                       <div className="w-48 h-48 rounded-full bg-indigo-500/10 border-4 border-indigo-500/20 flex items-center justify-center p-4">
                          <img src={weapons[0]?.image || CARD_TEMPLATES[0]} className="w-full h-full object-contain pixel-shadow" />
                       </div>
                       <motion.div 
                        animate={{ width: `${gameState.playerHp}%` }}
                        className="absolute -bottom-4 left-0 h-2 bg-green-500 shadow-[0_0_10px_#22c55e] rounded-full"
                       />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white">Player</h3>
                        <p className="text-sm text-slate-400">HP: {gameState.playerHp} / 100</p>
                    </div>
                </div>

                <div className="text-4xl font-black text-white/10 italic select-none">VS</div>

                {/* Monster Section */}
                <div className="text-center space-y-6">
                    <div className="relative">
                       <div className="w-48 h-48 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center p-4">
                          <img src={gameState.currentMonster.image} className="w-full h-full object-contain pixel-shadow" />
                       </div>
                       <motion.div 
                        animate={{ width: `${(gameState.monsterHp / gameState.currentMonster.hp) * 100}%` }}
                        className="absolute -bottom-4 left-0 h-2 bg-red-500 shadow-[0_0_10px_#ef4444] rounded-full"
                       />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white">{gameState.currentMonster.name}</h3>
                        <p className="text-sm text-slate-400">HP: {gameState.monsterHp} / {gameState.currentMonster.hp}</p>
                    </div>
                </div>
              </div>

              {/* Battle Logs & Results */}
              <div className="glass-panel p-6 min-h-[12rem] flex flex-col gap-4">
                 <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">Battle Log</h4>
                    {gameState.winner && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => startBattle(gameState.currentMonster!)}
                          className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-2"
                        >
                          <RefreshCw size={14} /> Retry
                        </button>
                        <button 
                          onClick={() => setGameState(prev => ({ ...prev, view: 'lobby' }))}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-all"
                        >
                          Leave
                        </button>
                      </div>
                    )}
                 </div>
                 
                 <div className="flex-1 space-y-2 overflow-y-auto max-h-40 scrollbar-hide">
                    {gameState.battleLog.map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i}
                        className={cn(
                          "text-sm font-medium",
                          log.includes('damage to Player') ? 'text-red-400' : 
                          log.includes('damage to') ? 'text-green-400' :
                          log.includes('Victory') ? 'text-yellow-400 text-lg font-bold' :
                          'text-slate-300'
                        )}
                      >
                        {log}
                      </motion.div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}

          {gameState.view === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Armory</h2>
                  <p className="text-slate-400">Your collection of soul-bound weapons.</p>
                </div>
                {!account && (
                  <div className="text-amber-400 text-sm flex items-center gap-2 bg-amber-400/10 px-4 py-2 rounded-lg border border-amber-400/20">
                    <Wallet size={16} /> Connect wallet to view your items
                  </div>
                )}
              </header>

              {weapons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 glass-panel border-dashed border-white/20">
                   <Loader2 className="text-slate-600 mb-4 animate-spin" size={48} />
                   <p className="text-slate-500 text-lg">No weapons found in your vault.</p>
                   <button 
                    onClick={() => setGameState(prev => ({ ...prev, view: 'shop' }))}
                    className="mt-6 text-indigo-400 hover:text-indigo-300 font-bold"
                   >
                     Visit the shop &rarr;
                   </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {weapons.map((weapon) => (
                    <div key={weapon.tokenId} className="game-card flex flex-col p-5 group">
                        <div className="aspect-[4/5] rounded-lg overflow-hidden relative mb-4">
                           <img src={weapon.image} className="w-full h-full object-cover" />
                           <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] uppercase font-black text-indigo-400 border border-indigo-400/30">
                             Token #{weapon.tokenId}
                           </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{weapon.itemName}</h3>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{weapon.description}</p>
                        <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                            <div className="flex gap-3">
                               <div className="flex items-center gap-1.5 text-red-400 font-bold">
                                  <Sword size={14} /> <span>{weapon.stats?.atk}</span>
                               </div>
                               <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                                  <Shield size={14} /> <span>{weapon.stats?.def}</span>
                               </div>
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {gameState.view === 'shop' && (
            <motion.div 
               key="shop"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="space-y-8"
            >
               <header>
                <h2 className="text-3xl font-bold text-white mb-2">The Void Trader</h2>
                <p className="text-slate-400">Exchange soul fragments (minting) for powerful equipment.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {SHOP_ITEMS.map((item, idx) => (
                  <div key={idx} className="glass-panel overflow-hidden flex flex-col md:flex-row p-4 gap-6 hover:border-indigo-500/50 transition-colors group">
                    <div className="w-full md:w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl relative">
                       <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    
                    <div className="flex-1 py-2 flex flex-col">
                      <div className="mb-2">
                        <h3 className="text-2xl font-bold text-white mb-1">{item.name}</h3>
                        <p className="text-xs text-slate-400 mb-4">{item.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                           <div className="text-[10px] uppercase text-slate-500 font-bold">Bonus Attack</div>
                           <div className="text-lg font-bold text-red-400">+{item.stats.atk}</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                           <div className="text-[10px] uppercase text-slate-500 font-bold">Bonus Armor</div>
                           <div className="text-lg font-bold text-blue-400">+{item.stats.def}</div>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <button 
                          disabled={!account || loading}
                          onClick={() => mintWeapon(item)}
                          className={cn(
                            "w-full py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                            account 
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                              : "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"
                          )}
                        >
                          {loading ? <Loader2 className="animate-spin" /> : <Trophy size={18} />}
                          {account ? "Forge NFT" : "Login to Forge"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {gameState.view === 'craft' && (
            <motion.div 
               key="craft"
               className="h-full flex flex-col items-center justify-center space-y-6 py-20"
            >
               <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 flex items-center justify-center">
                  <Hammer size={40} className="text-indigo-500/40" />
               </div>
               <div className="text-center max-w-md">
                 <h2 className="text-3xl font-bold text-white mb-4">Forge Under Construction</h2>
                 <p className="text-slate-400">Combine rare monster drops and broken spirits to create artifacts of immense power. Coming soon to the Realms.</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

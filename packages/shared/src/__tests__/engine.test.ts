import { describe, expect, it } from 'vitest';
import {
  BOARD_TILES,
  CHANCE_CARDS,
  CHEST_CARDS,
  INITIAL_BANKNOTES,
  INITIAL_CASH,
  PURCHASABLE_TILE_INDICES,
  applyGameAction,
  buildOnCurrentTile,
  buyCurrentTile,
  calculateRent,
  calculateUnmortgageCost,
  canBuildOnCurrentTile,
  canRollAgain,
  computeBanknotes,
  createGameState,
  createTradeOffer,
  decideNextBotAction,
  declareBankruptcy,
  declineCurrentTile,
  endTurn,
  mortgageTile,
  payJailBail,
  respondTradeOffer,
  rollDice,
  sellHouseOnTile,
  sumBanknotes,
  unmortgageCurrentTile,
  useJailCard,
} from '../index.js';
import type { GameState, RoomConfig } from '../types.js';

function createSeededRng(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function twoPlayerConfig(): RoomConfig {
  return {
    totalSeats: 2,
    slots: [
      { seatIndex: 0, kind: 'human', name: 'ผู้เล่น 1' },
      { seatIndex: 1, kind: 'human', name: 'ผู้เล่น 2' },
    ],
  };
}

function createStartedGameState(
  roomId = 'room-1',
  config: RoomConfig = twoPlayerConfig(),
  seed = 1,
): GameState {
  return createGameState(roomId, config, createSeededRng(seed), { skipTurnOrderRoll: true });
}

describe('boardData & banknotes', () => {
  it('defines exact 40 tiles and 29 deeds matching ซุปเปอร์เศรษฐี No. 9028', () => {
    expect(BOARD_TILES).toHaveLength(40);
    expect(PURCHASABLE_TILE_INDICES).toHaveLength(29);

    expect(BOARD_TILES[0]?.name).toBe('จุดเริ่มต้น');
    expect(BOARD_TILES[1]?.name).toBe('กรุงเทพฯ');
    expect(BOARD_TILES[1]?.deedNumber).toBe(1);
    expect(BOARD_TILES[10]?.name).toBe('เข้าคุก');
    expect(BOARD_TILES[20]?.name).toBe('แวะพักผ่อนคนจน');
    expect(BOARD_TILES[20]?.type).toBe('freeParking');
    expect(BOARD_TILES[25]?.name).toBe('แกรนด์คอนติเนนตัล');
    expect(BOARD_TILES[30]?.name).toBe('ไปติดคุก');
    expect(BOARD_TILES[38]?.name).toBe('จ่ายภาษี');
    expect(BOARD_TILES[39]?.name).toBe('เสาชิงช้า');
    expect(BOARD_TILES[39]?.deedNumber).toBe(29);

    expect(CHANCE_CARDS).toHaveLength(24);
    expect(CHEST_CARDS).toHaveLength(24);
  });

  it('starts every player with 15,000 THB and exact Thai banknote breakdown', () => {
    const state = createGameState('room-1', twoPlayerConfig(), createSeededRng(1));
    expect(state.banker.housesRemaining).toBe(32);
    expect(state.banker.hotelsRemaining).toBe(12);
    expect(state.banker.ledger.length).toBeGreaterThanOrEqual(1);

    for (const player of state.players) {
      expect(player.cash).toBe(INITIAL_CASH);
      expect(player.banknotes).toEqual(INITIAL_BANKNOTES);
      expect(sumBanknotes(player.banknotes)).toBe(15000);
    }

    expect(computeBanknotes(1930)).toEqual({
      5000: 0,
      1000: 1,
      500: 1,
      100: 4,
      50: 0,
      10: 3,
    });
    expect(sumBanknotes(computeBanknotes(1930))).toBe(1930);
  });
});

describe('turn order determination roll (TURN_ORDER_ROLL)', () => {
  it('picks the single highest roller to go first and starts AWAIT_ROLL cleanly', () => {
    const config: RoomConfig = {
      totalSeats: 3,
      slots: [
        { seatIndex: 0, kind: 'human', name: 'เอ' },
        { seatIndex: 1, kind: 'human', name: 'บี' },
        { seatIndex: 2, kind: 'human', name: 'ซี' },
      ],
    };
    let state = createGameState('room-order-1', config, createSeededRng(10));
    expect(state.phase).toBe('TURN_ORDER_ROLL');
    expect(state.turnOrder?.round).toBe(1);
    expect(state.turnOrder?.contenderIds).toEqual(['player-1', 'player-2', 'player-3']);
    expect(state.currentTurnIndex).toBe(0);

    // Non-current player cannot roll out of order
    expect(rollDice(state, 'player-2', [6, 6]).ok).toBe(false);

    state = rollDice(state, 'player-1', [3, 3]).state; // 6
    expect(state.phase).toBe('TURN_ORDER_ROLL');
    expect(state.currentTurnIndex).toBe(1);

    state = rollDice(state, 'player-2', [5, 4]).state; // 9 (winner)
    expect(state.phase).toBe('TURN_ORDER_ROLL');
    expect(state.currentTurnIndex).toBe(2);

    const lastRes = rollDice(state, 'player-3', [2, 4]); // 6
    expect(lastRes.ok).toBe(true);
    state = lastRes.state;

    expect(state.phase).toBe('AWAIT_ROLL');
    expect(state.currentTurnIndex).toBe(1); // player-2 goes first
    expect(state.hasRolledThisTurn).toBe(false);
    expect(state.turnOrder?.winnerId).toBe('player-2');
    expect(state.players.every((p) => p.position === 0)).toBe(true);

    // Winner plays Turn 1 and passes clockwise to player-3
    state = rollDice(state, 'player-2', [1, 1]).state; // double 2 -> chest (or stays turn)
    if (state.phase === 'AWAIT_DECISION') {
      state = declineCurrentTile(state, 'player-2').state;
    }
    if (canRollAgain(state, 'player-2')) {
      state = rollDice(state, 'player-2', [1, 2]).state;
      if (state.phase === 'AWAIT_DECISION') {
        state = declineCurrentTile(state, 'player-2').state;
      }
    }
    if (state.phase === 'ACTION_PHASE') {
      const endRes = endTurn(state, 'player-2');
      expect(endRes.ok).toBe(true);
      expect(endRes.state.currentTurnIndex).toBe(2); // clockwise to player-3
    }
  });

  it('rerolls ONLY tied highest-scoring contenders across multiple tie rounds until 1 winner emerges', () => {
    const config: RoomConfig = {
      totalSeats: 4,
      slots: [
        { seatIndex: 0, kind: 'human', name: 'ผู้เล่น 1' },
        { seatIndex: 1, kind: 'human', name: 'ผู้เล่น 2' },
        { seatIndex: 2, kind: 'human', name: 'ผู้เล่น 3' },
        { seatIndex: 3, kind: 'human', name: 'ผู้เล่น 4' },
      ],
    };
    let state = createGameState('room-tie', config, createSeededRng(7));

    // Round 1: player-1 (8), player-2 (5), player-3 (8), player-4 (3)
    state = rollDice(state, 'player-1', [4, 4]).state;
    state = rollDice(state, 'player-2', [2, 3]).state;
    state = rollDice(state, 'player-3', [3, 5]).state;
    state = rollDice(state, 'player-4', [1, 2]).state;

    expect(state.phase).toBe('TURN_ORDER_ROLL');
    expect(state.turnOrder?.round).toBe(2);
    expect(state.turnOrder?.contenderIds).toEqual(['player-1', 'player-3']);
    expect(state.currentTurnIndex).toBe(0);
    expect(state.turnOrder?.history).toHaveLength(1);
    expect(state.turnOrder?.history[0]?.tiedLeaderIds).toEqual(['player-1', 'player-3']);

    // Eliminated players cannot roll in Round 2
    expect(rollDice(state, 'player-2', [6, 6]).ok).toBe(false);
    expect(rollDice(state, 'player-4', [6, 6]).ok).toBe(false);

    // Round 2: tie again (player-1 = 7, player-3 = 7) -> triggers Round 3
    state = rollDice(state, 'player-1', [3, 4]).state;
    expect(state.currentTurnIndex).toBe(2); // skips player-2 cleanly!
    state = rollDice(state, 'player-3', [2, 5]).state;

    expect(state.phase).toBe('TURN_ORDER_ROLL');
    expect(state.turnOrder?.round).toBe(3);
    expect(state.turnOrder?.contenderIds).toEqual(['player-1', 'player-3']);
    expect(state.turnOrder?.history).toHaveLength(2);

    // Round 3: player-1 = 6, player-3 = 10 -> player-3 wins!
    state = rollDice(state, 'player-1', [3, 3]).state;
    state = rollDice(state, 'player-3', [4, 6]).state;

    expect(state.phase).toBe('AWAIT_ROLL');
    expect(state.currentTurnIndex).toBe(2);
    expect(state.turnOrder?.winnerId).toBe('player-3');
    expect(state.turnOrder?.history).toHaveLength(3);
  });

  it('resolves turn order cleanly if a tied contender leaves/bankrupts mid-roll', () => {
    const config: RoomConfig = {
      totalSeats: 3,
      slots: [
        { seatIndex: 0, kind: 'human', name: 'หนึ่ง' },
        { seatIndex: 1, kind: 'human', name: 'สอง' },
        { seatIndex: 2, kind: 'human', name: 'สาม' },
      ],
    };
    let state = createGameState('room-leave-order', config, createSeededRng(3));
    state = rollDice(state, 'player-1', [4, 4]).state; // 8
    state = rollDice(state, 'player-2', [5, 3]).state; // 8
    state = rollDice(state, 'player-3', [1, 2]).state; // 3

    expect(state.phase).toBe('TURN_ORDER_ROLL');
    expect(state.turnOrder?.contenderIds).toEqual(['player-1', 'player-2']);

    const b = declareBankruptcy(state, 'player-1');
    expect(b.ok).toBe(true);
    expect(b.state.phase).toBe('AWAIT_ROLL');
    expect(b.state.turnOrder?.winnerId).toBe('player-2');
    expect(b.state.currentTurnIndex).toBe(1);
  });
});

describe('no-auction & basic turn flow', () => {
  it('leaves deed unowned on declineCurrentTile without auction', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    // Roll 1 + 2 = 3 -> นครปฐม (#2)
    const r1 = rollDice(state, 'player-1', [1, 2]);
    expect(r1.ok).toBe(true);
    state = r1.state;
    expect(state.phase).toBe('AWAIT_DECISION');
    expect(state.pendingDecisionTileIndex).toBe(3);

    const dec = declineCurrentTile(state, 'player-1');
    expect(dec.ok).toBe(true);
    state = dec.state;
    expect(state.phase).toBe('ACTION_PHASE');
    expect(state.deeds[3]?.ownerId).toBeNull();

    const end = endTurn(state, 'player-1');
    expect(end.ok).toBe(true);
    expect(end.state.currentTurnIndex).toBe(1);
    expect(end.state.phase).toBe('AWAIT_ROLL');
  });

  it('does not grant any jackpot on Free Parking (แวะพักผ่อนคนจน)', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 15 } : p)),
    };
    const r = rollDice(state, 'player-1', [2, 3]);
    expect(r.ok).toBe(true);
    expect(r.state.players[0]?.position).toBe(20);
    expect(r.state.players[0]?.cash).toBe(15000);
    expect(r.state.phase).toBe('ACTION_PHASE');
  });
});

describe('land-on-own-tile build & unmortgage enforcement', () => {
  it('requires standing on own tile and full color group + even-build to build houses & hotels', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    // Give player-1 both brown deeds (1: กรุงเทพฯ, 3: นครปฐม), standing on tile 1
    state = {
      ...state,
      phase: 'ACTION_PHASE',
      hasRolledThisTurn: true,
      deeds: {
        ...state.deeds,
        1: { ...state.deeds[1]!, ownerId: 'player-1' },
        3: { ...state.deeds[3]!, ownerId: 'player-1' },
      },
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 5 } : p)),
    };

    // Standing on tile 5 (not tile 1 or 3): build must fail!
    expect(canBuildOnCurrentTile(state, 'player-1').allowed).toBe(false);
    expect(buildOnCurrentTile(state, 'player-1').ok).toBe(false);

    // Move player-1 onto tile 1 (กรุงเทพฯ)
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
    };
    // Build house #1 on tile 1 (cost 500)
    const b1 = buildOnCurrentTile(state, 'player-1');
    expect(b1.ok).toBe(true);
    state = b1.state;
    expect(state.deeds[1]?.houses).toBe(1);
    expect(state.banker.housesRemaining).toBe(31);
    expect(state.players[0]?.cash).toBe(14500);

    // Even-build: cannot build 2nd house on tile 1 while tile 3 has 0 houses!
    const b2 = buildOnCurrentTile(state, 'player-1');
    expect(b2.ok).toBe(false);

    // Move player-1 to tile 3 and build up to 4 houses alternating with tile 1
    for (let level = 1; level <= 4; level++) {
      state = {
        ...state,
        players: state.players.map((p, i) => (i === 0 ? { ...p, position: 3 } : p)),
      };
      const on3 = buildOnCurrentTile(state, 'player-1');
      expect(on3.ok).toBe(true);
      state = on3.state;

      if (level < 4) {
        state = {
          ...state,
          players: state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
        };
        const on1 = buildOnCurrentTile(state, 'player-1');
        expect(on1.ok).toBe(true);
        state = on1.state;
      }
    }

    expect(state.deeds[1]?.houses).toBe(4);
    expect(state.deeds[3]?.houses).toBe(4);
    expect(state.banker.housesRemaining).toBe(24);

    // Upgrade tile 3 from 4 houses to a hotel
    const hotelRes = buildOnCurrentTile(state, 'player-1');
    expect(hotelRes.ok).toBe(true);
    state = hotelRes.state;
    expect(state.deeds[3]?.hasHotel).toBe(true);
    expect(state.deeds[3]?.houses).toBe(0);
    expect(state.banker.housesRemaining).toBe(28);
    expect(state.banker.hotelsRemaining).toBe(11);
    expect(calculateRent(state, 3)).toBe(4500);
  });

  it('requires standing on own tile to unmortgage and charges principal + 10% rounded to nearest 10', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    // ดอนเมือง (tile 37): price 3500, mortgage 1750 -> 1750 * 1.1 = 1925 -> 1930 THB
    const tile37 = BOARD_TILES[37]!;
    expect(calculateUnmortgageCost(tile37)).toBe(1930);

    state = {
      ...state,
      phase: 'ACTION_PHASE',
      hasRolledThisTurn: true,
      deeds: {
        ...state.deeds,
        37: { ...state.deeds[37]!, ownerId: 'player-1', isMortgaged: true },
      },
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 10 } : p)),
    };

    // Standing at 10, cannot unmortgage tile 37
    expect(unmortgageCurrentTile(state, 'player-1').ok).toBe(false);

    // Standing on tile 37, can unmortgage for 1,930 THB
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 37 } : p)),
    };
    const res = unmortgageCurrentTile(state, 'player-1');
    expect(res.ok).toBe(true);
    expect(res.state.deeds[37]?.isMortgaged).toBe(false);
    expect(res.state.players[0]?.cash).toBe(15000 - 1930);
  });
});

describe('5-hotel, utility, and monopoly rents', () => {
  it('computes 250/500/1000/2000/4000 for 1..5 hotels and 40x/100x for utilities', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    const hotelIndices = [4, 5, 15, 25, 35];
    const expectedRents = [250, 500, 1000, 2000, 4000];

    for (let count = 1; count <= 5; count++) {
      const idx = hotelIndices[count - 1]!;
      state = {
        ...state,
        deeds: {
          ...state.deeds,
          [idx]: { ...state.deeds[idx]!, ownerId: 'player-2' },
        },
      };
      expect(calculateRent(state, 4)).toBe(expectedRents[count - 1]);
    }

    // Utilities: 12 (การไฟฟ้า) and 28 (การประปา)
    state = {
      ...state,
      deeds: {
        ...state.deeds,
        12: { ...state.deeds[12]!, ownerId: 'player-2' },
      },
    };
    expect(calculateRent(state, 12, 8)).toBe(320);

    state = {
      ...state,
      deeds: {
        ...state.deeds,
        28: { ...state.deeds[28]!, ownerId: 'player-2' },
      },
    };
    expect(calculateRent(state, 12, 8)).toBe(800);
  });
});

describe('doubles & jail rules', () => {
  it('allows doubles reroll in ACTION_PHASE and sends to jail on 3rd consecutive double', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);

    // Double 1: [1, 1] -> tile 2 (chest)
    const r1 = rollDice(state, 'player-1', [1, 1]);
    expect(r1.ok).toBe(true);
    state = r1.state;
    // Wait: if chest card was GO_TO_JAIL, pick a deterministic seed or force non-jail card
    if (!state.players[0]!.inJail) {
      expect(state.doublesCount).toBe(1);
      expect(canRollAgain(state, 'player-1')).toBe(true);
      expect(endTurn(state, 'player-1').ok).toBe(false);
    }

    // Fresh state with known safe landing for 3 consecutive doubles test
    let clean = createStartedGameState('room-2', twoPlayerConfig(), 99);
    // Roll [2, 2] -> tile 4 (hotel, AWAIT_DECISION) -> decline -> ACTION_PHASE
    clean = rollDice(clean, 'player-1', [2, 2]).state;
    clean = declineCurrentTile(clean, 'player-1').state;
    expect(clean.doublesCount).toBe(1);
    expect(canRollAgain(clean, 'player-1')).toBe(true);

    // Roll [3, 3] -> tile 10 (just visiting) -> ACTION_PHASE
    clean = rollDice(clean, 'player-1', [3, 3]).state;
    expect(clean.doublesCount).toBe(2);
    expect(clean.players[0]?.position).toBe(10);
    expect(clean.players[0]?.inJail).toBe(false);

    // Roll [4, 4] -> 3rd double -> immediately sent to jail!
    clean = rollDice(clean, 'player-1', [4, 4]).state;
    expect(clean.players[0]?.position).toBe(10);
    expect(clean.players[0]?.inJail).toBe(true);
    expect(clean.doublesCount).toBe(0);
    expect(canRollAgain(clean, 'player-1')).toBe(false);
    expect(endTurn(clean, 'player-1').ok).toBe(true);
  });

  it('supports Go To Jail tile, bail payment, jail card, and 3rd failed roll forced bail', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 25 } : p)),
    };
    // Roll 2+3 = 5 -> tile 30 (ไปติดคุก)
    state = rollDice(state, 'player-1', [2, 3]).state;
    expect(state.players[0]?.inJail).toBe(true);
    expect(state.players[0]?.position).toBe(10);
    expect(state.players[0]?.cash).toBe(15000); // did NOT pass START

    state = endTurn(state, 'player-1').state;
    state = rollDice(state, 'player-2', [1, 2]).state;
    state = declineCurrentTile(state, 'player-2').state;
    state = endTurn(state, 'player-2').state;

    // Player-1 pays 500 THB bail before rolling
    const bail = payJailBail(state, 'player-1');
    expect(bail.ok).toBe(true);
    state = bail.state;
    expect(state.players[0]?.inJail).toBe(false);
    expect(state.players[0]?.cash).toBe(14500);

    // Give player-1 a jail-free card and put back in jail
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0
          ? { ...p, inJail: true, position: 10, jailFreeCards: 1, heldJailCardDecks: ['chance'] }
          : p,
      ),
    };
    const useCard = useJailCard(state, 'player-1');
    expect(useCard.ok).toBe(true);
    expect(useCard.state.players[0]?.inJail).toBe(false);
    expect(useCard.state.players[0]?.jailFreeCards).toBe(0);

    // 3rd failed roll in jail forces 500 THB bail and moves out of jail
    let jail3 = createStartedGameState('room-jail3', twoPlayerConfig(), 1);
    jail3 = {
      ...jail3,
      players: jail3.players.map((p, i) =>
        i === 0 ? { ...p, inJail: true, position: 10, jailTurns: 2 } : p,
      ),
    };
    const rJail3 = rollDice(jail3, 'player-1', [1, 2]);
    expect(rJail3.ok).toBe(true);
    expect(rJail3.state.players[0]?.inJail).toBe(false);
    expect(rJail3.state.players[0]?.position).toBe(13); // 10 + 3
    expect(rJail3.state.players[0]?.cash).toBe(14500); // paid 500 bail (tile 13 unowned)
  });
});

describe('cards (ประตูดวง & หีบสมบัติ)', () => {
  it('applies MOVE_TO with START bonus, REPAIRS, COLLECT_FROM_ALL, PAY_ALL, and MOVE_BACK', () => {
    let state = createStartedGameState('room-cards', twoPlayerConfig(), 1);

    // Force top of chanceDeck to chance-5 (MOVE_TO tile 4, collectStartIfPassed) from position 20 -> lands on 22 (chance)
    state = {
      ...state,
      chanceDeck: ['chance-5', ...state.chanceDeck.filter((id) => id !== 'chance-5')],
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 20 } : p)),
    };
    const rMove = rollDice(state, 'player-1', [1, 1]);
    expect(rMove.ok).toBe(true);
    expect(rMove.state.players[0]?.position).toBe(4);
    expect(rMove.state.players[0]?.cash).toBe(17000); // +2000 START bonus
    expect(rMove.state.phase).toBe('AWAIT_DECISION'); // tile 4 unowned

    // Force top of chanceDeck to chance-14 (REPAIRS 250/house, 1000/hotel)
    let repairState = createStartedGameState('room-repairs', twoPlayerConfig(), 1);
    repairState = {
      ...repairState,
      chanceDeck: ['chance-14', ...repairState.chanceDeck.filter((id) => id !== 'chance-14')],
      deeds: {
        ...repairState.deeds,
        1: { ...repairState.deeds[1]!, ownerId: 'player-1', houses: 2 },
        3: { ...repairState.deeds[3]!, ownerId: 'player-1', hasHotel: true },
      },
      players: repairState.players.map((p, i) => (i === 0 ? { ...p, position: 4 } : p)),
    };
    const rRep = rollDice(repairState, 'player-1', [1, 2]); // 4 + 3 = 7 (chance)
    expect(rRep.ok).toBe(true);
    // 2 houses * 250 + 1 hotel * 1000 = 1500
    expect(rRep.state.players[0]?.cash).toBe(13500);

    // Force top of chestDeck to chest-9 (COLLECT_FROM_ALL 100) and test MOVE_BACK (chance-6 from 36 -> 33 chest)
    let comboState = createStartedGameState('room-combo', twoPlayerConfig(), 1);
    comboState = {
      ...comboState,
      chanceDeck: ['chance-6', ...comboState.chanceDeck.filter((id) => id !== 'chance-6')],
      chestDeck: ['chest-9', ...comboState.chestDeck.filter((id) => id !== 'chest-9')],
      players: comboState.players.map((p, i) => (i === 0 ? { ...p, position: 33 } : p)),
    };
    const rCombo = rollDice(comboState, 'player-1', [1, 2]); // 33 + 3 = 36 (chance) -> back 3 -> 33 (chest) -> +100 from player-2
    expect(rCombo.ok).toBe(true);
    expect(rCombo.state.players[0]?.position).toBe(33);
    expect(rCombo.state.players[0]?.cash).toBe(15100);
    expect(rCombo.state.players[1]?.cash).toBe(14900);
  });
});

describe('debt resolution, trading, and bankruptcy', () => {
  it('allows mortgaging any owned tile during AWAIT_DEBT_RESOLUTION and auto-settles debt', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    // Player-1 has 500 cash and owns #1 กรุงเทพฯ (mortgage 300) & #2 นครปฐม (mortgage 300)
    // Player-2 owns #29 เสาชิงช้า (rent 500 -> monopoly or house; let's put 1 house -> rent 2000)
    state = {
      ...state,
      deeds: {
        ...state.deeds,
        1: { ...state.deeds[1]!, ownerId: 'player-1' },
        3: { ...state.deeds[3]!, ownerId: 'player-1' },
        37: { ...state.deeds[37]!, ownerId: 'player-2' },
        39: { ...state.deeds[39]!, ownerId: 'player-2', houses: 1 },
      },
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 36, cash: 1500 } : { ...p, cash: 10000 },
      ),
    };

    // Player-1 rolls [1, 2] = 3 -> lands on 39 (เสาชิงช้า, rent 2000) with only 1500 cash
    const r = rollDice(state, 'player-1', [1, 2]);
    expect(r.ok).toBe(true);
    state = r.state;
    expect(state.phase).toBe('AWAIT_DEBT_RESOLUTION');
    expect(state.pendingDebt?.amount).toBe(2000);

    // Mortgage tile 1 (+300 -> cash 1800, still < 2000 -> stays in debt resolution)
    const m1 = mortgageTile(state, 'player-1', 1);
    expect(m1.ok).toBe(true);
    state = m1.state;
    expect(state.players[0]?.cash).toBe(1800);
    expect(state.phase).toBe('AWAIT_DEBT_RESOLUTION');

    // Mortgage tile 3 (+300 -> cash 2100 >= 2000 -> auto-settles 2000 to player-2!)
    const m2 = mortgageTile(state, 'player-1', 3);
    expect(m2.ok).toBe(true);
    state = m2.state;
    expect(state.phase).toBe('ACTION_PHASE');
    expect(state.pendingDebt).toBeNull();
    expect(state.players[0]?.cash).toBe(100);
    expect(state.players[1]?.cash).toBe(12000);
  });

  it('transfers assets and ends game on bankruptcy', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    state = {
      ...state,
      deeds: {
        ...state.deeds,
        1: { ...state.deeds[1]!, ownerId: 'player-1' },
      },
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 35, cash: 100 } : p)),
    };

    // Land on tile 38 (จ่ายภาษี 2000) with 100 cash -> AWAIT_DEBT_RESOLUTION
    state = rollDice(state, 'player-1', [1, 2]).state;
    expect(state.phase).toBe('AWAIT_DEBT_RESOLUTION');

    const b = declareBankruptcy(state, 'player-1');
    expect(b.ok).toBe(true);
    expect(b.state.players[0]?.isBankrupt).toBe(true);
    expect(b.state.phase).toBe('GAME_OVER');
    expect(b.state.winnerId).toBe('player-2');
    expect(b.state.deeds[1]?.ownerId).toBeNull();
  });

  it('executes trade offers cleanly', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    state = {
      ...state,
      phase: 'ACTION_PHASE',
      hasRolledThisTurn: true,
      deeds: {
        ...state.deeds,
        1: { ...state.deeds[1]!, ownerId: 'player-1' },
        6: { ...state.deeds[6]!, ownerId: 'player-2' },
      },
    };

    const offerRes = createTradeOffer(state, 'player-1', {
      toPlayerId: 'player-2',
      offeredTileIndices: [1],
      requestedTileIndices: [6],
      offeredCash: 500,
      requestedCash: 0,
      offeredJailCards: 0,
      requestedJailCards: 0,
    });
    expect(offerRes.ok).toBe(true);
    state = offerRes.state;
    const tradeId = state.pendingTrades[0]!.id;

    const acceptRes = respondTradeOffer(state, 'player-2', tradeId, true);
    expect(acceptRes.ok).toBe(true);
    state = acceptRes.state;
    expect(state.deeds[1]?.ownerId).toBe('player-2');
    expect(state.deeds[6]?.ownerId).toBe('player-1');
    expect(state.players[0]?.cash).toBe(14500);
    expect(state.players[1]?.cash).toBe(15500);
  });

  it('handles selling houses with even-sell enforcement', () => {
    let state = createStartedGameState('room-1', twoPlayerConfig(), 1);
    state = {
      ...state,
      phase: 'ACTION_PHASE',
      hasRolledThisTurn: true,
      deeds: {
        ...state.deeds,
        1: { ...state.deeds[1]!, ownerId: 'player-1', houses: 2 },
        3: { ...state.deeds[3]!, ownerId: 'player-1', houses: 1 },
      },
      banker: {
        ...state.banker,
        housesRemaining: 29,
      },
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 3 } : p)),
    };

    // Standing on tile 3 (1 house) when tile 1 has 2 houses -> must sell from tile 1 first!
    expect(sellHouseOnTile(state, 'player-1', 3).ok).toBe(false);

    // Move to tile 1 and sell 1 house -> refund 250 THB
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
    };
    const res = sellHouseOnTile(state, 'player-1', 1);
    expect(res.ok).toBe(true);
    expect(res.state.deeds[1]?.houses).toBe(1);
    expect(res.state.banker.housesRemaining).toBe(30);
    expect(res.state.players[0]?.cash).toBe(15250);
  });
});

describe('all-bot automated simulation sanity check', () => {
  it('runs a 4-bot spectator game cleanly without invalid actions or banknote drift', () => {
    const rng = createSeededRng(2026);
    const botConfig: RoomConfig = {
      totalSeats: 4,
      slots: [
        { seatIndex: 0, kind: 'bot', name: 'บอทบุก', botStyle: 'aggressive' },
        { seatIndex: 1, kind: 'bot', name: 'บอทสมดุล', botStyle: 'balanced' },
        { seatIndex: 2, kind: 'bot', name: 'บอทระวัง', botStyle: 'cautious' },
        { seatIndex: 3, kind: 'bot', name: 'บอทเจ้าสัว', botStyle: 'aggressive' },
      ],
    };

    let state: GameState = createGameState('bot-sim', botConfig, rng);
    let steps = 0;
    const maxSteps = 1200;

    while (state.phase !== 'GAME_OVER' && steps < maxSteps) {
      const current = state.players[state.currentTurnIndex]!;
      const action = decideNextBotAction(state, current.id, rng);
      expect(action).not.toBeNull();

      const res = applyGameAction(state, action!, rng);
      expect(res.ok, `Action ${action?.type} failed: ${res.error}`).toBe(true);
      state = res.state;
      steps++;
    }

    expect(steps).toBeGreaterThan(20);
    expect(state.turnNumber).toBeGreaterThan(10);
    expect(state.banker.ledger.length).toBeGreaterThan(20);
    expect(state.banker.housesRemaining).toBeGreaterThanOrEqual(0);
    expect(state.banker.hotelsRemaining).toBeGreaterThanOrEqual(0);

    for (const p of state.players) {
      expect(sumBanknotes(p.banknotes)).toBe(p.cash);
      expect(p.cash).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports an 8-player game cleanly and cycles shuffled 24-card decks without repeats', () => {
    const rng = createSeededRng(8080);
    const eightConfig: RoomConfig = {
      totalSeats: 8,
      slots: Array.from({ length: 8 }, (_, idx) => ({
        seatIndex: idx,
        kind: 'bot' as const,
        name: `เศรษฐี-${idx + 1}`,
        botStyle: 'balanced' as const,
      })),
    };

    let state = createGameState('room-8p', eightConfig, rng);
    expect(state.players).toHaveLength(8);
    expect(new Set(state.players.map((p) => p.color)).size).toBe(8);
    expect(new Set(state.players.map((p) => p.tokenId)).size).toBe(8);
    expect(state.chanceDeck).toHaveLength(24);
    expect(state.chestDeck).toHaveLength(24);

    // Draw all 24 Chance cards across forced landings and verify zero duplicate IDs before reshuffle
    const seenChance = new Set<string>();
    for (let i = 0; i < 24; i++) {
      state = {
        ...state,
        phase: 'AWAIT_ROLL',
        hasRolledThisTurn: false,
        doublesCount: 0,
        players: state.players.map((p, idx) =>
          idx === state.currentTurnIndex
            ? { ...p, position: 4, inJail: false, isBankrupt: false }
            : p,
        ),
      };
      const pid = state.players[state.currentTurnIndex]!.id;
      const rolled = rollDice(state, pid, [1, 2]); // lands on tile 7 (chance)
      expect(rolled.ok).toBe(true);
      const drawnId = rolled.state.lastCardDrawn?.card.id;
      expect(drawnId).toBeDefined();
      seenChance.add(drawnId!);
      state = {
        ...rolled.state,
        phase: 'ACTION_PHASE',
        pendingDecisionTileIndex: null,
        pendingDebt: null,
      };
    }

    expect(seenChance.size).toBe(24);
    // Deck automatically reshuffled for the next cycle (23 if chance-8 Jail-Free card is held, else 24)
    expect(state.chanceDeck.length).toBeGreaterThanOrEqual(23);
  });
});

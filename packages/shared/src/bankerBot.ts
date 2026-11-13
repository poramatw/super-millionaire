import { computeBanknotes, roundToNearestTen } from './banknotes.js';
import {
  COLOR_GROUP_TILES,
  INITIAL_HOTELS_SUPPLY,
  INITIAL_HOUSES_SUPPLY,
  formatTileLabel,
  getTile,
} from './boardData.js';
import type {
  BankerState,
  ColorGroup,
  DeedState,
  GameState,
  LedgerEntry,
  LedgerEntryType,
  PlayerState,
  TileDefinition,
} from './types.js';

export function createInitialBankerState(): BankerState {
  return {
    housesRemaining: INITIAL_HOUSES_SUPPLY,
    hotelsRemaining: INITIAL_HOTELS_SUPPLY,
    ledger: [],
  };
}

export interface AppendLedgerParams {
  type: LedgerEntryType;
  message: string;
  actorId?: string;
  targetId?: string;
  amount?: number;
  tileIndex?: number;
  timestamp?: number;
}

/**
 * Banker Bot records an immutable ledger entry and returns both the updated BankerState and the new entry.
 */
export function recordBankerEntry(
  banker: BankerState,
  params: AppendLedgerParams,
): { banker: BankerState; entry: LedgerEntry } {
  const nextSeq = banker.ledger.length + 1;
  const entry: LedgerEntry = {
    id: `ledger-${nextSeq}`,
    seq: nextSeq,
    timestamp: params.timestamp ?? Date.now(),
    type: params.type,
    actorId: params.actorId,
    targetId: params.targetId,
    amount: params.amount,
    tileIndex: params.tileIndex,
    message: params.message,
  };
  return {
    banker: {
      ...banker,
      ledger: [...banker.ledger, entry],
    },
    entry,
  };
}

export function setPlayerCash(player: PlayerState, newCash: number): PlayerState {
  const safeCash = Math.max(0, roundToNearestTen(newCash));
  return {
    ...player,
    cash: safeCash,
    banknotes: computeBanknotes(safeCash),
  };
}

export function adjustPlayerCash(player: PlayerState, delta: number): PlayerState {
  return setPlayerCash(player, player.cash + delta);
}

export function getDeedLevel(deed: DeedState): number {
  return deed.hasHotel ? 5 : deed.houses;
}

export function ownsFullColorGroup(
  state: GameState,
  playerId: string,
  colorGroup: ColorGroup,
): boolean {
  const indices = COLOR_GROUP_TILES[colorGroup];
  return indices.every((idx) => state.deeds[idx]?.ownerId === playerId);
}

export function hasAnyBuildingInColorGroup(
  state: GameState,
  colorGroup: ColorGroup,
): boolean {
  const indices = COLOR_GROUP_TILES[colorGroup];
  return indices.some((idx) => {
    const deed = state.deeds[idx];
    return deed !== undefined && (deed.houses > 0 || deed.hasHotel);
  });
}

export function hasMortgagedInColorGroup(
  state: GameState,
  colorGroup: ColorGroup,
): boolean {
  const indices = COLOR_GROUP_TILES[colorGroup];
  return indices.some((idx) => state.deeds[idx]?.isMortgaged === true);
}

export function calculateUnmortgageCost(tile: TileDefinition): number {
  const principal = tile.mortgageValue ?? Math.floor((tile.price ?? 0) / 2);
  return roundToNearestTen(principal * 1.1);
}

export function calculateRent(
  state: GameState,
  tileIndex: number,
  diceTotal = 7,
): number {
  const tile = getTile(tileIndex);
  const deed = state.deeds[tile.index];
  if (!deed || !deed.ownerId || deed.isMortgaged) {
    return 0;
  }

  const ownerId = deed.ownerId;

  if (tile.type === 'property' && tile.rents && tile.colorGroup) {
    if (deed.hasHotel) {
      return tile.rents[5] ?? 0;
    }
    if (deed.houses > 0) {
      return tile.rents[deed.houses] ?? 0;
    }
    const baseRent = tile.rents[0] ?? 0;
    const hasMonopoly = ownsFullColorGroup(state, ownerId, tile.colorGroup);
    return hasMonopoly ? baseRent * 2 : baseRent;
  }

  if (tile.type === 'hotel' && tile.rents) {
    const unmortgagedHotelsOwned = COLOR_GROUP_TILES.hotel.filter((idx) => {
      const d = state.deeds[idx];
      return d && d.ownerId === ownerId && !d.isMortgaged;
    }).length;
    if (unmortgagedHotelsOwned <= 0) return 0;
    return tile.rents[Math.min(unmortgagedHotelsOwned, 5) - 1] ?? 0;
  }

  if (tile.type === 'utility') {
    const unmortgagedUtilitiesOwned = COLOR_GROUP_TILES.utility.filter((idx) => {
      const d = state.deeds[idx];
      return d && d.ownerId === ownerId && !d.isMortgaged;
    }).length;
    if (unmortgagedUtilitiesOwned >= 2) {
      return 100 * diceTotal;
    }
    if (unmortgagedUtilitiesOwned === 1) {
      return 40 * diceTotal;
    }
    return 0;
  }

  return 0;
}

export function calculatePlayerNetWorth(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isBankrupt) return 0;

  let total = player.cash;
  for (const deed of Object.values(state.deeds)) {
    if (deed.ownerId !== playerId) continue;
    const tile = getTile(deed.tileIndex);
    if (deed.isMortgaged) {
      total += tile.mortgageValue ?? 0;
    } else {
      total += tile.price ?? 0;
    }
    if (tile.houseCost) {
      const levels = deed.hasHotel ? 5 : deed.houses;
      total += levels * Math.floor(tile.houseCost / 2);
    }
  }
  return total;
}

export function formatBaht(amount: number): string {
  return `${amount.toLocaleString('en-US')} บาท`;
}

export function buildTileLedgerLabel(tileIndex: number): string {
  return formatTileLabel(getTile(tileIndex));
}

import {
  calculateUnmortgageCost,
  ownsFullColorGroup,
} from './bankerBot.js';
import {
  COLOR_GROUP_TILES,
  JAIL_BAIL_AMOUNT,
  getTile,
} from './boardData.js';
import {
  canBuildOnCurrentTile,
  canHostileTakeoverCurrentTile,
  canMortgageTile,
  canRollAgain,
  canRollTurnOrder,
  canSellHouseOnTile,
  canUnmortgageCurrentTile,
  getCurrentPlayer,
} from './engine.js';
import type {
  BotStyle,
  GameAction,
  GameState,
  PlayerState,
  TradeOffer,
} from './types.js';

interface StyleProfile {
  buyReserve: number;
  monopolyBuyReserve: number;
  buildReserve: number;
  unmortgageReserve: number;
  bailCashThreshold: number;
}

const STYLE_PROFILES: Readonly<Record<BotStyle, StyleProfile>> = {
  aggressive: {
    buyReserve: 200,
    monopolyBuyReserve: 0,
    buildReserve: 300,
    unmortgageReserve: 200,
    bailCashThreshold: 1000,
  },
  balanced: {
    buyReserve: 1000,
    monopolyBuyReserve: 300,
    buildReserve: 1200,
    unmortgageReserve: 1000,
    bailCashThreshold: 2500,
  },
  cautious: {
    buyReserve: 2500,
    monopolyBuyReserve: 1000,
    buildReserve: 2500,
    unmortgageReserve: 2000,
    bailCashThreshold: 4000,
  },
};

function getStyleProfile(bot: PlayerState): StyleProfile {
  return STYLE_PROFILES[bot.botStyle ?? 'balanced'];
}

function wouldCompleteMonopoly(state: GameState, playerId: string, tileIndex: number): boolean {
  const tile = getTile(tileIndex);
  if (!tile.colorGroup) return false;
  if (tile.colorGroup === 'hotel') {
    const ownedHotels = COLOR_GROUP_TILES.hotel.filter(
      (idx) => state.deeds[idx]?.ownerId === playerId,
    ).length;
    return ownedHotels >= 1;
  }
  const groupIndices = COLOR_GROUP_TILES[tile.colorGroup];
  return groupIndices.every(
    (idx) => idx === tileIndex || state.deeds[idx]?.ownerId === playerId,
  );
}

/**
 * Evaluate whether a bot should accept a pending trade offer based on asset value and monopoly completion.
 */
export function evaluateTradeOffer(
  state: GameState,
  botPlayerId: string,
  offer: TradeOffer,
): boolean {
  const bot = state.players.find((p) => p.id === botPlayerId);
  if (!bot || bot.isBankrupt || offer.toPlayerId !== botPlayerId) {
    return false;
  }

  let valueReceived = offer.offeredCash + offer.offeredJailCards * 400;
  let valueGiven = offer.requestedCash + offer.requestedJailCards * 400;

  for (const idx of offer.offeredTileIndices) {
    const tile = getTile(idx);
    const deed = state.deeds[idx];
    const base = deed?.isMortgaged ? (tile.mortgageValue ?? 0) : (tile.price ?? 0);
    const monopolyBonus = wouldCompleteMonopoly(state, botPlayerId, idx) ? 1.5 : 1;
    valueReceived += base * monopolyBonus;
  }

  for (const idx of offer.requestedTileIndices) {
    const tile = getTile(idx);
    const deed = state.deeds[idx];
    const base = deed?.isMortgaged ? (tile.mortgageValue ?? 0) : (tile.price ?? 0);
    const breaksOwnMonopoly =
      tile.colorGroup &&
      tile.colorGroup !== 'hotel' &&
      ownsFullColorGroup(state, botPlayerId, tile.colorGroup);
    const penalty = breaksOwnMonopoly ? 2.5 : 1;
    valueGiven += base * penalty;
  }

  const profile = getStyleProfile(bot);
  if (bot.cash - offer.requestedCash + offer.offeredCash < profile.buyReserve) {
    return false;
  }

  return valueReceived >= valueGiven * 1.05;
}

/**
 * Decide the next valid GameAction for an AI bot player.
 * Returns null if no action is currently required for the bot.
 */
export function decideNextBotAction(
  state: GameState,
  botPlayerId: string,
  rng: () => number = Math.random,
): GameAction | null {
  if (state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
    return null;
  }

  const bot = state.players.find((p) => p.id === botPlayerId);
  if (!bot || bot.isBankrupt) {
    return null;
  }

  // Handle pending trade offers addressed to this bot first
  const incomingTrade = state.pendingTrades.find(
    (t) => t.status === 'PENDING' && t.toPlayerId === botPlayerId,
  );
  if (incomingTrade) {
    return {
      type: 'RESPOND_TRADE_OFFER',
      playerId: botPlayerId,
      tradeId: incomingTrade.id,
      accept: evaluateTradeOffer(state, botPlayerId, incomingTrade),
    };
  }

  const current = getCurrentPlayer(state);
  if (current.id !== botPlayerId) {
    return null;
  }

  const profile = getStyleProfile(bot);

  switch (state.phase) {
    case 'TURN_ORDER_ROLL': {
      if (canRollTurnOrder(state, botPlayerId)) {
        return { type: 'ROLL_DICE', playerId: botPlayerId };
      }
      return null;
    }

    case 'AWAIT_ROLL': {
      if (bot.inJail) {
        // Genuine jail detention rule: serve turns trying doubles unless 3rd turn forces bail,
        // holding a free pass, or an aggressive bot late in game pushes out early.
        const totalOwned = Object.values(state.deeds).filter((d) => d.ownerId !== null).length;
        const earlyAggressiveBreakout =
          bot.botStyle === 'aggressive' &&
          bot.jailTurns >= 1 &&
          totalOwned >= 16 &&
          bot.cash >= profile.bailCashThreshold * 4;
        if (bot.jailFreeCards > 0 && (bot.jailTurns >= 1 || totalOwned >= 12)) {
          return { type: 'USE_JAIL_CARD', playerId: botPlayerId };
        }
        if (bot.cash >= JAIL_BAIL_AMOUNT && (bot.jailTurns >= 2 || earlyAggressiveBreakout)) {
          return { type: 'PAY_JAIL_BAIL', playerId: botPlayerId };
        }
      }
      return { type: 'ROLL_DICE', playerId: botPlayerId };
    }

    case 'AWAIT_DECISION': {
      const tileIndex = state.pendingDecisionTileIndex;
      if (tileIndex === null) {
        return { type: 'DECLINE_CURRENT_TILE', playerId: botPlayerId };
      }
      const tile = getTile(tileIndex);
      const price = tile.price ?? 0;
      const completesSet = wouldCompleteMonopoly(state, botPlayerId, tileIndex);
      const reserve = completesSet ? profile.monopolyBuyReserve : profile.buyReserve;

      // Slight personality variance for balanced bots on borderline buys
      const jitter = bot.botStyle === 'balanced' ? (rng() - 0.5) * 200 : 0;

      if (price > 0 && bot.cash >= price && bot.cash - price >= reserve + jitter) {
        return { type: 'BUY_CURRENT_TILE', playerId: botPlayerId };
      }
      return { type: 'DECLINE_CURRENT_TILE', playerId: botPlayerId };
    }

    case 'AWAIT_DEBT_RESOLUTION': {
      // 1. Try mortgaging owned deeds (prefer non-monopolies and lower-value deeds first)
      const mortgageCandidates = Object.values(state.deeds)
        .filter(
          (d) =>
            d.ownerId === botPlayerId &&
            !d.isMortgaged &&
            canMortgageTile(state, botPlayerId, d.tileIndex).allowed,
        )
        .sort((a, b) => {
          const tileA = getTile(a.tileIndex);
          const tileB = getTile(b.tileIndex);
          const monoA =
            tileA.colorGroup && ownsFullColorGroup(state, botPlayerId, tileA.colorGroup) ? 1 : 0;
          const monoB =
            tileB.colorGroup && ownsFullColorGroup(state, botPlayerId, tileB.colorGroup) ? 1 : 0;
          if (monoA !== monoB) return monoA - monoB;
          return (tileA.mortgageValue ?? 0) - (tileB.mortgageValue ?? 0);
        });

      if (mortgageCandidates.length > 0) {
        return {
          type: 'MORTGAGE_TILE',
          playerId: botPlayerId,
          tileIndex: mortgageCandidates[0]!.tileIndex,
        };
      }

      // 2. Try selling houses/hotels (respecting even-sell)
      const sellCandidates = Object.values(state.deeds)
        .filter(
          (d) =>
            d.ownerId === botPlayerId &&
            (d.houses > 0 || d.hasHotel) &&
            canSellHouseOnTile(state, botPlayerId, d.tileIndex).allowed,
        )
        .sort((a, b) => {
          const tileA = getTile(a.tileIndex);
          const tileB = getTile(b.tileIndex);
          return (tileA.houseCost ?? 0) - (tileB.houseCost ?? 0);
        });

      if (sellCandidates.length > 0) {
        return {
          type: 'SELL_HOUSE_ON_TILE',
          playerId: botPlayerId,
          tileIndex: sellCandidates[0]!.tileIndex,
        };
      }

      // 3. No assets left to liquidate -> declare bankruptcy
      return { type: 'DECLARE_BANKRUPTCY', playerId: botPlayerId };
    }

    case 'ACTION_PHASE': {
      // 1. Unmortgage current tile if standing on it and cash permits
      const unmortgageCheck = canUnmortgageCurrentTile(state, botPlayerId);
      if (unmortgageCheck.allowed && unmortgageCheck.cost !== undefined) {
        const tile = getTile(bot.position);
        const cost = calculateUnmortgageCost(tile);
        if (bot.cash - cost >= profile.unmortgageReserve) {
          return { type: 'UNMORTGAGE_CURRENT_TILE', playerId: botPlayerId };
        }
      }

      // 1b. Hostile Takeover on opponent's tile if rule enabled and advantageous
      const takeoverCheck = canHostileTakeoverCurrentTile(state, botPlayerId);
      if (takeoverCheck.allowed && takeoverCheck.cost !== undefined) {
        const completesSet = wouldCompleteMonopoly(state, botPlayerId, bot.position);
        const minCashAfter = completesSet
          ? profile.monopolyBuyReserve
          : profile.buyReserve + 2200;
        if (bot.cash - takeoverCheck.cost >= minCashAfter) {
          return { type: 'HOSTILE_TAKEOVER_CURRENT_TILE', playerId: botPlayerId };
        }
      }

      // 2. Build house/hotel on current tile if standing on it and cash permits
      const buildCheck = canBuildOnCurrentTile(state, botPlayerId);
      if (buildCheck.allowed && buildCheck.cost !== undefined) {
        if (bot.cash - buildCheck.cost >= profile.buildReserve) {
          return { type: 'BUILD_ON_CURRENT_TILE', playerId: botPlayerId };
        }
      }

      // 3. Roll again if doubles were rolled and not in jail
      if (canRollAgain(state, botPlayerId)) {
        return { type: 'ROLL_DICE', playerId: botPlayerId };
      }

      // 4. End turn
      return { type: 'END_TURN', playerId: botPlayerId };
    }
  }
}

/**
 * Shared client-side timer pacing for AI bot actions so 3D dice throws and
 * turn-order winner reveals complete cleanly without overlapping animations.
 */
export function getRecommendedBotActionDelayMs(state: GameState, action: GameAction): number {
  if (state.phase === 'TURN_ORDER_ROLL') {
    return 1050;
  }
  if (
    state.phase === 'AWAIT_ROLL' &&
    !state.hasRolledThisTurn &&
    state.turnNumber === 1 &&
    state.turnOrder?.winnerId
  ) {
    return 2100;
  }
  return action.type === 'ROLL_DICE' ? 850 : 750;
}

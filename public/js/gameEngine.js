/**
 * Universal Coup Game Engine (Node.js + Browser Compatible)
 * Implements official Coup (Indie Boards & Cards / Dystopian Universe) rules:
 * - 2 to 6 players (human or AI bot)
 * - 15-card Court Deck (3x Duke, Assassin, Captain, Ambassador, Contessa)
 * - Actions: Income, Foreign Aid, Coup, Tax, Assassinate, Steal, Exchange
 * - Complete Challenge & Counteraction (Block) state machine
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CoupGameEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const ROLES = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

  const ACTIONS = {
    income: {
      id: 'income',
      cost: 0,
      claimedRole: null,
      needsTarget: false,
      challengeable: false,
      blockableBy: [],
    },
    foreign_aid: {
      id: 'foreign_aid',
      cost: 0,
      claimedRole: null,
      needsTarget: false,
      challengeable: false,
      blockableBy: ['duke'],
      anyPlayerCanBlock: true,
    },
    coup: {
      id: 'coup',
      cost: 7,
      claimedRole: null,
      needsTarget: true,
      challengeable: false,
      blockableBy: [],
    },
    tax: {
      id: 'tax',
      cost: 0,
      claimedRole: 'duke',
      needsTarget: false,
      challengeable: true,
      blockableBy: [],
    },
    assassinate: {
      id: 'assassinate',
      cost: 3,
      claimedRole: 'assassin',
      needsTarget: true,
      challengeable: true,
      blockableBy: ['contessa'],
      anyPlayerCanBlock: false,
    },
    steal: {
      id: 'steal',
      cost: 0,
      claimedRole: 'captain',
      needsTarget: true,
      challengeable: true,
      blockableBy: ['captain', 'ambassador'],
      anyPlayerCanBlock: false,
    },
    exchange: {
      id: 'exchange',
      cost: 0,
      claimedRole: 'ambassador',
      needsTarget: false,
      challengeable: true,
      blockableBy: [],
    },
  };

  const PLAYER_COLORS = [
    '#f59e0b', // Amber/Gold
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#ef4444', // Crimson
  ];

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function createDeck() {
    const deck = [];
    for (const role of ROLES) {
      for (let i = 0; i < 3; i++) {
        deck.push(role);
      }
    }
    return shuffle(deck);
  }

  class CoupRoom {
    constructor(roomCode, hostId, hostName) {
      this.roomCode = roomCode;
      this.hostId = hostId;
      this.state = 'LOBBY'; // LOBBY, TURN_START, AWAITING_ACTION_REACTION, AWAITING_BLOCK_REACTION, AWAITING_LOSE_INFLUENCE, AWAITING_EXCHANGE, GAME_OVER
      this.players = [];
      this.deck = [];
      this.turnIndex = 0;
      this.pendingAction = null;
      this.pendingBlock = null;
      this.pendingLoss = null;
      this.exchangePool = null;
      this.passedPlayerIds = [];
      this.logs = [];
      this.winner = null;
      this.turnNumber = 1;
      this.lastHighlight = null;

      if (hostId && hostName) {
        this.addPlayer(hostId, hostName, false);
      }
    }

    addLog(entry) {
      this.logs.unshift({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        timestamp: Date.now(),
        ...entry,
      });
      if (this.logs.length > 80) {
        this.logs.pop();
      }
    }

    addPlayer(id, name, isBot = false) {
      if (this.players.length >= 6) {
        return { error: 'ROOM_FULL' };
      }
      const existing = this.players.find((p) => p.id === id);
      if (existing) {
        existing.connected = true;
        existing.name = name || existing.name;
        return { player: existing };
      }
      const cleanName = (name || 'Player').trim().slice(0, 18) || 'Player';
      const color = PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
      const player = {
        id,
        name: cleanName,
        color,
        coins: 2,
        influences: [],
        alive: true,
        connected: true,
        isBot: !!isBot,
        wins: 0,
      };
      this.players.push(player);
      this.addLog({
        type: 'system',
        en: `${cleanName} joined the room.`,
        ar: `انضم ${cleanName} إلى الغرفة.`,
      });
      return { player };
    }

    removePlayer(id) {
      const idx = this.players.findIndex((p) => p.id === id);
      if (idx === -1) return;
      const p = this.players[idx];
      if (this.state === 'LOBBY') {
        this.players.splice(idx, 1);
        if (this.hostId === id && this.players.length > 0) {
          const nextHuman = this.players.find((pl) => !pl.isBot) || this.players[0];
          this.hostId = nextHuman.id;
        }
      } else {
        p.connected = false;
      }
    }

    addBot() {
      if (this.state !== 'LOBBY') return { error: 'GAME_ALREADY_STARTED' };
      if (this.players.length >= 6) return { error: 'ROOM_FULL' };
      const botNames = ['Viper 🤖', 'Cipher 🤖', 'Nova 🤖', 'Rook 🤖', 'Raven 🤖'];
      const usedNames = new Set(this.players.map((p) => p.name));
      const availableName = botNames.find((n) => !usedNames.has(n)) || `Bot ${this.players.length + 1} 🤖`;
      const botId = 'bot_' + Math.random().toString(36).slice(2, 9);
      return this.addPlayer(botId, availableName, true);
    }

    removeBot(botId) {
      if (this.state !== 'LOBBY') return { error: 'GAME_ALREADY_STARTED' };
      const idx = this.players.findIndex((p) => p.id === botId && p.isBot);
      if (idx !== -1) {
        this.players.splice(idx, 1);
      }
      return { ok: true };
    }

    reorderPlayers(newOrderIds) {
      if (this.state !== 'LOBBY') return { error: 'GAME_ALREADY_STARTED' };
      if (!Array.isArray(newOrderIds) || newOrderIds.length !== this.players.length) {
        return { error: 'INVALID_ORDER' };
      }
      const map = new Map(this.players.map((p) => [p.id, p]));
      const reordered = [];
      for (const id of newOrderIds) {
        if (!map.has(id)) return { error: 'INVALID_ORDER' };
        reordered.push(map.get(id));
      }
      this.players = reordered;
      return { ok: true };
    }

    startGame() {
      if (this.players.length < 2) {
        return { error: 'NEED_AT_LEAST_2_PLAYERS' };
      }
      this.deck = createDeck();
      for (const p of this.players) {
        p.coins = 2;
        p.alive = true;
        p.influences = [
          { role: this.deck.pop(), revealed: false },
          { role: this.deck.pop(), revealed: false },
        ];
      }
      this.turnIndex = Math.floor(Math.random() * this.players.length);
      this.state = 'TURN_START';
      this.pendingAction = null;
      this.pendingBlock = null;
      this.pendingLoss = null;
      this.exchangePool = null;
      this.passedPlayerIds = [];
      this.winner = null;
      this.turnNumber = 1;
      const firstPlayer = this.getCurrentPlayer();
      this.addLog({
        type: 'match',
        en: `Game started! Each player received 2 coins and 2 secret influences. ${firstPlayer.name} goes first.`,
        ar: `بدأت اللعبة! حصل كل لاعب على عملتين وبطاقتي نفوذ سريتين. الدور الأول عند ${firstPlayer.name}.`,
      });
      return { ok: true };
    }

    getCurrentPlayer() {
      return this.players[this.turnIndex] || null;
    }

    getPlayer(id) {
      return this.players.find((p) => p.id === id) || null;
    }

    getAlivePlayers() {
      return this.players.filter((p) => p.alive);
    }

    getUnrevealedCount(player) {
      return player.influences.filter((inf) => !inf.revealed).length;
    }

    checkAliveStatus(player) {
      const remaining = this.getUnrevealedCount(player);
      if (remaining === 0 && player.alive) {
        player.alive = false;
        this.addLog({
          type: 'elimination',
          en: `💀 ${player.name} lost all influences and is exiled from the Court!`,
          ar: `💀 خسر ${player.name} جميع بطاقاته وخرج من اللعبة!`,
        });
      }
      const alive = this.getAlivePlayers();
      if (alive.length === 1) {
        this.winner = alive[0];
        this.winner.wins = (this.winner.wins || 0) + 1;
        this.state = 'GAME_OVER';
        this.addLog({
          type: 'victory',
          en: `👑 ${this.winner.name} is the last player standing and wins the Coup!`,
          ar: `👑 ${this.winner.name} هو الناجي الأخير ويفوز بالانقلاب!`,
        });
        return true;
      }
      return false;
    }

    advanceTurn() {
      this.pendingAction = null;
      this.pendingBlock = null;
      this.pendingLoss = null;
      this.exchangePool = null;
      this.passedPlayerIds = [];

      const alive = this.getAlivePlayers();
      if (alive.length <= 1) {
        if (alive.length === 1 && this.state !== 'GAME_OVER') {
          this.winner = alive[0];
          this.winner.wins = (this.winner.wins || 0) + 1;
          this.state = 'GAME_OVER';
        }
        return;
      }

      let safety = 0;
      do {
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
        safety++;
      } while (!this.players[this.turnIndex].alive && safety <= this.players.length);

      this.turnNumber++;
      this.state = 'TURN_START';
    }

    declareAction(playerId, actionId, targetId = null) {
      if (this.state !== 'TURN_START') return { error: 'NOT_IN_TURN_START' };
      const actor = this.getCurrentPlayer();
      if (!actor || actor.id !== playerId) return { error: 'NOT_YOUR_TURN' };

      const spec = ACTIONS[actionId];
      if (!spec) return { error: 'INVALID_ACTION' };

      if (actor.coins >= 10 && actionId !== 'coup') {
        return { error: 'MUST_COUP_AT_10_COINS' };
      }
      if (actor.coins < spec.cost) {
        return { error: 'INSUFFICIENT_COINS' };
      }

      let target = null;
      if (spec.needsTarget) {
        target = this.getPlayer(targetId);
        if (!target || !target.alive || target.id === actor.id) {
          return { error: 'INVALID_TARGET' };
        }
        if (actionId === 'steal' && target.coins === 0) {
          return { error: 'TARGET_HAS_NO_COINS' };
        }
      }

      if (spec.cost > 0) {
        actor.coins -= spec.cost;
      }

      this.pendingAction = {
        type: actionId,
        actorId: actor.id,
        targetId: target ? target.id : null,
        claimedRole: spec.claimedRole,
        costPaid: spec.cost,
      };
      this.passedPlayerIds = [];

      // Log declaration
      this.logActionDeclaration(actor, actionId, target);

      // Immediate resolution if neither challengeable nor blockable
      if (!spec.challengeable && spec.blockableBy.length === 0) {
        return this.executePendingAction();
      }

      this.state = 'AWAITING_ACTION_REACTION';
      return { ok: true };
    }

    logActionDeclaration(actor, actionId, target) {
      const tName = target ? target.name : '';
      const messages = {
        income: {
          en: `💰 ${actor.name} takes Income (+1 coin).`,
          ar: `💰 أخذ ${actor.name} دخل (+1 عملة).`,
        },
        foreign_aid: {
          en: `🤝 ${actor.name} attempts to take Foreign Aid (+2 coins).`,
          ar: `🤝 يحاول ${actor.name} أخذ مساعدة خارجية (+2 عملة).`,
        },
        coup: {
          en: `⚡ ${actor.name} launches a COUP against ${tName} (-7 coins)!`,
          ar: `⚡ شنّ ${actor.name} انقلاباً (Coup) ضد ${tName} (-7 عملات)!`,
        },
        tax: {
          en: `👑 ${actor.name} claims DUKE to collect Tax (+3 coins).`,
          ar: `👑 يدّعي ${actor.name} أنه الدوق (Duke) لجمع الضريبة (+3 عملات).`,
        },
        assassinate: {
          en: `🗡️ ${actor.name} claims ASSASSIN to assassinate ${tName} (-3 coins)!`,
          ar: `🗡️ يدّعي ${actor.name} أنه القاتل (Assassin) لاغتيال ${tName} (-3 عملات)!`,
        },
        steal: {
          en: `⚓ ${actor.name} claims CAPTAIN to steal 2 coins from ${tName}!`,
          ar: `⚓ يدّعي ${actor.name} أنه القبطان (Captain) لسرقة عملتين من ${tName}!`,
        },
        exchange: {
          en: `🔄 ${actor.name} claims AMBASSADOR to exchange cards with the Court Deck.`,
          ar: `🔄 يدّعي ${actor.name} أنه السفير (Ambassador) لتبديل بطاقاته مع الكومة.`,
        },
      };
      this.addLog({
        type: 'action',
        actionId,
        ...messages[actionId],
      });
    }

    getEligibleReactorsForAction() {
      if (!this.pendingAction) return [];
      const spec = ACTIONS[this.pendingAction.type];
      const aliveOthers = this.getAlivePlayers().filter((p) => p.id !== this.pendingAction.actorId);
      if (spec.challengeable || spec.anyPlayerCanBlock) {
        return aliveOthers.map((p) => p.id);
      }
      // Otherwise only target can react
      if (this.pendingAction.targetId) {
        return [this.pendingAction.targetId];
      }
      return [];
    }

    getEligibleReactorsForBlock() {
      if (!this.pendingBlock) return [];
      return this.getAlivePlayers()
        .filter((p) => p.id !== this.pendingBlock.blockerId)
        .map((p) => p.id);
    }

    passReaction(playerId) {
      const player = this.getPlayer(playerId);
      if (!player || !player.alive) return { error: 'INVALID_PLAYER' };

      if (this.state === 'AWAITING_ACTION_REACTION') {
        const eligible = this.getEligibleReactorsForAction();
        if (!eligible.includes(playerId)) return { error: 'CANNOT_REACT' };
        if (!this.passedPlayerIds.includes(playerId)) {
          this.passedPlayerIds.push(playerId);
        }
        if (eligible.every((id) => this.passedPlayerIds.includes(id))) {
          return this.executePendingAction();
        }
        return { ok: true };
      }

      if (this.state === 'AWAITING_BLOCK_REACTION') {
        const eligible = this.getEligibleReactorsForBlock();
        if (!eligible.includes(playerId)) return { error: 'CANNOT_REACT' };
        if (!this.passedPlayerIds.includes(playerId)) {
          this.passedPlayerIds.push(playerId);
        }
        if (eligible.every((id) => this.passedPlayerIds.includes(id))) {
          const blocker = this.getPlayer(this.pendingBlock.blockerId);
          const actor = this.getPlayer(this.pendingAction.actorId);
          this.addLog({
            type: 'block_success',
            en: `🛡️ ${blocker.name}'s block (${this.pendingBlock.claimedRole.toUpperCase()}) succeeded! ${actor.name}'s action is stopped.`,
            ar: `🛡️ نجح صد ${blocker.name} (${this.pendingBlock.claimedRole.toUpperCase()})! تم إيقاف حركة ${actor.name}.`,
          });
          this.advanceTurn();
          return { ok: true };
        }
        return { ok: true };
      }

      return { error: 'NOT_AWAITING_REACTION' };
    }

    declareBlock(blockerId, claimedRole) {
      if (this.state !== 'AWAITING_ACTION_REACTION' || !this.pendingAction) {
        return { error: 'CANNOT_BLOCK_NOW' };
      }
      const blocker = this.getPlayer(blockerId);
      if (!blocker || !blocker.alive || blocker.id === this.pendingAction.actorId) {
        return { error: 'INVALID_BLOCKER' };
      }
      const spec = ACTIONS[this.pendingAction.type];
      if (!spec.blockableBy.includes(claimedRole)) {
        return { error: 'INVALID_BLOCK_ROLE' };
      }
      if (!spec.anyPlayerCanBlock && blocker.id !== this.pendingAction.targetId) {
        return { error: 'ONLY_TARGET_CAN_BLOCK' };
      }

      this.pendingBlock = {
        blockerId: blocker.id,
        claimedRole,
      };
      this.passedPlayerIds = [];
      this.state = 'AWAITING_BLOCK_REACTION';

      const actor = this.getPlayer(this.pendingAction.actorId);
      this.addLog({
        type: 'block',
        en: `🛡️ ${blocker.name} claims ${claimedRole.toUpperCase()} to block ${actor.name}!`,
        ar: `🛡️ يدّعي ${blocker.name} أنه (${claimedRole.toUpperCase()}) لصد حركة ${actor.name}!`,
      });
      return { ok: true };
    }

    declareChallenge(challengerId) {
      const challenger = this.getPlayer(challengerId);
      if (!challenger || !challenger.alive) return { error: 'INVALID_CHALLENGER' };

      if (this.state === 'AWAITING_ACTION_REACTION' && this.pendingAction) {
        const spec = ACTIONS[this.pendingAction.type];
        if (!spec.challengeable) return { error: 'ACTION_NOT_CHALLENGEABLE' };
        if (challenger.id === this.pendingAction.actorId) return { error: 'CANNOT_CHALLENGE_SELF' };

        const actor = this.getPlayer(this.pendingAction.actorId);
        const claimedRole = this.pendingAction.claimedRole;
        return this.resolveChallenge(challenger, actor, claimedRole, 'ACTION');
      }

      if (this.state === 'AWAITING_BLOCK_REACTION' && this.pendingBlock) {
        if (challenger.id === this.pendingBlock.blockerId) return { error: 'CANNOT_CHALLENGE_SELF' };
        const blocker = this.getPlayer(this.pendingBlock.blockerId);
        const claimedRole = this.pendingBlock.claimedRole;
        return this.resolveChallenge(challenger, blocker, claimedRole, 'BLOCK');
      }

      return { error: 'NOTHING_TO_CHALLENGE' };
    }

    resolveChallenge(challenger, claimedPlayer, claimedRole, context) {
      // Check if claimedPlayer actually holds an unrevealed copy of claimedRole
      const cardIndex = claimedPlayer.influences.findIndex(
        (inf) => !inf.revealed && inf.role === claimedRole
      );

      if (cardIndex !== -1) {
        // Claimed player was telling the TRUTH!
        // Shuffle their revealed role card back into the deck and draw a replacement
        const oldRole = claimedPlayer.influences[cardIndex].role;
        this.deck.push(oldRole);
        this.deck = shuffle(this.deck);
        claimedPlayer.influences[cardIndex].role = this.deck.pop();

        this.addLog({
          type: 'challenge_fail',
          en: `⚡ ${challenger.name} challenged ${claimedPlayer.name}'s ${claimedRole.toUpperCase()}, but ${claimedPlayer.name} really had it! ${claimedPlayer.name} draws a replacement card and ${challenger.name} must lose an influence!`,
          ar: `⚡ تحدى ${challenger.name} بطاقة (${claimedRole.toUpperCase()}) لدى ${claimedPlayer.name}، لكن ${claimedPlayer.name} كان صادقاً! قام ${claimedPlayer.name} بتبديل بطاقته مع الكومة، ويجب على ${challenger.name} خسارة بطاقة نفوذ!`,
        });

        this.promptLoseInfluence(
          challenger.id,
          context === 'ACTION' ? 'EXECUTE_ACTION' : 'END_TURN',
          {
            en: `Lost challenge against ${claimedPlayer.name}'s ${claimedRole.toUpperCase()}`,
            ar: `خسارة التحدي ضد ${claimedPlayer.name} (${claimedRole.toUpperCase()})`,
          }
        );
        return { ok: true };
      } else {
        // Claimed player was BLUFFING!
        this.addLog({
          type: 'challenge_win',
          en: `🚨 BLUFF CAUGHT! ${challenger.name} challenged ${claimedPlayer.name}'s ${claimedRole.toUpperCase()} and caught them bluffing! ${claimedPlayer.name} must lose an influence!`,
          ar: `🚨 كشف الكذبة! تحدى ${challenger.name} ادعاء ${claimedPlayer.name} (${claimedRole.toUpperCase()}) وكشف خداعه! يجب على ${claimedPlayer.name} خسارة بطاقة نفوذ!`,
        });

        // If Assassinate was bluffed and caught on challenge, refund the 3 coins per official rules
        if (context === 'ACTION' && this.pendingAction && this.pendingAction.type === 'assassinate') {
          claimedPlayer.coins += this.pendingAction.costPaid;
        }

        this.promptLoseInfluence(
          claimedPlayer.id,
          context === 'ACTION' ? 'END_TURN' : 'EXECUTE_ACTION',
          {
            en: `Caught bluffing ${claimedRole.toUpperCase()} by ${challenger.name}`,
            ar: `انكشف خداعه ببطاقة (${claimedRole.toUpperCase()}) بواسطة ${challenger.name}`,
          }
        );
        return { ok: true };
      }
    }

    promptLoseInfluence(playerId, nextStep, reason) {
      const player = this.getPlayer(playerId);
      if (!player || !player.alive) {
        return this.continueAfterLoss(nextStep);
      }

      const unrevealedIndices = [];
      player.influences.forEach((inf, idx) => {
        if (!inf.revealed) unrevealedIndices.push(idx);
      });

      // If the player only has 1 unrevealed card left, auto-reveal it or let them click?
      // Letting them click (or auto-revealing if 0) makes it dramatic, wait: if only 1 card left, auto-revealing immediately is super snappy and avoids unnecessary clicks when you have no choice!
      // Wait: let's check what players prefer: if you have 2 unrevealed cards, you MUST choose which one to lose. If you only have 1 unrevealed card left, you have no choice, or clicking it feels impactful. Let's make it so if you have 1 card left, we still let you click it (or bots auto-click it in 1s), OR auto-reveal? Wait: in ChickenKoup, when you have 1 influence left, does it auto-reveal or ask you to choose? Actually, if you have 2 influences, it asks you to choose; if you have 1 influence left, auto-revealing it immediately saves time AND prevents dead players from stalling the game! Let's auto-reveal if `unrevealedIndices.length === 1`!
      if (unrevealedIndices.length === 1) {
        const idx = unrevealedIndices[0];
        player.influences[idx].revealed = true;
        const lostRole = player.influences[idx].role;
        this.addLog({
          type: 'loss',
          en: `💔 ${player.name} revealed and lost ${lostRole.toUpperCase()} (${reason.en}).`,
          ar: `💔 كشف ${player.name} وخسر بطاقة ${lostRole.toUpperCase()} (${reason.ar}).`,
        });
        if (this.checkAliveStatus(player)) {
          return { ok: true };
        }
        return this.continueAfterLoss(nextStep);
      }

      this.pendingLoss = {
        playerId,
        nextStep,
        reason,
      };
      this.state = 'AWAITING_LOSE_INFLUENCE';
      return { ok: true };
    }

    chooseInfluenceToLose(playerId, cardIndex) {
      if (this.state !== 'AWAITING_LOSE_INFLUENCE' || !this.pendingLoss) {
        return { error: 'NOT_AWAITING_LOSS' };
      }
      if (this.pendingLoss.playerId !== playerId) {
        return { error: 'NOT_YOUR_LOSS_CHOICE' };
      }
      const player = this.getPlayer(playerId);
      const card = player && player.influences[cardIndex];
      if (!card || card.revealed) {
        return { error: 'INVALID_CARD_INDEX' };
      }

      card.revealed = true;
      const reason = this.pendingLoss.reason;
      const nextStep = this.pendingLoss.nextStep;
      this.pendingLoss = null;

      this.addLog({
        type: 'loss',
        en: `💔 ${player.name} revealed and lost ${card.role.toUpperCase()} (${reason.en}).`,
        ar: `💔 كشف ${player.name} وخسر بطاقة ${card.role.toUpperCase()} (${reason.ar}).`,
      });

      if (this.checkAliveStatus(player)) {
        return { ok: true };
      }

      return this.continueAfterLoss(nextStep);
    }

    continueAfterLoss(nextStep) {
      if (this.state === 'GAME_OVER') return { ok: true };
      if (nextStep === 'EXECUTE_ACTION') {
        return this.executePendingAction();
      }
      this.advanceTurn();
      return { ok: true };
    }

    executePendingAction() {
      if (!this.pendingAction) {
        this.advanceTurn();
        return { ok: true };
      }
      const { type, actorId, targetId } = this.pendingAction;
      const actor = this.getPlayer(actorId);
      const target = targetId ? this.getPlayer(targetId) : null;

      if (!actor || !actor.alive) {
        this.advanceTurn();
        return { ok: true };
      }

      switch (type) {
        case 'income':
          actor.coins += 1;
          this.advanceTurn();
          return { ok: true };

        case 'foreign_aid':
          actor.coins += 2;
          this.addLog({
            type: 'effect',
            en: `✨ ${actor.name} collected +2 coins from Foreign Aid.`,
            ar: `✨ حصل ${actor.name} على عملتين من المساعدة الخارجية.`,
          });
          this.advanceTurn();
          return { ok: true };

        case 'tax':
          actor.coins += 3;
          this.addLog({
            type: 'effect',
            en: `👑 ${actor.name} collected +3 coins in Tax.`,
            ar: `👑 جمع ${actor.name} 3 عملات كضريبة الدوق.`,
          });
          this.advanceTurn();
          return { ok: true };

        case 'steal': {
          if (!target || !target.alive) {
            this.advanceTurn();
            return { ok: true };
          }
          const stolen = Math.min(2, target.coins);
          target.coins -= stolen;
          actor.coins += stolen;
          this.addLog({
            type: 'effect',
            en: `⚓ ${actor.name} stole ${stolen} coin(s) from ${target.name}!`,
            ar: `⚓ سرق ${actor.name} ${stolen} عملة من ${target.name}!`,
          });
          this.advanceTurn();
          return { ok: true };
        }

        case 'coup': {
          if (!target || !target.alive) {
            this.advanceTurn();
            return { ok: true };
          }
          return this.promptLoseInfluence(target.id, 'END_TURN', {
            en: `Coup by ${actor.name}`,
            ar: `انقلاب من ${actor.name}`,
          });
        }

        case 'assassinate': {
          if (!target || !target.alive) {
            this.advanceTurn();
            return { ok: true };
          }
          return this.promptLoseInfluence(target.id, 'END_TURN', {
            en: `Assassinated by ${actor.name}`,
            ar: `اغتيال بواسطة ${actor.name}`,
          });
        }

        case 'exchange': {
          const drawn = [this.deck.pop(), this.deck.pop()].filter(Boolean);
          const currentUnrevealed = actor.influences
            .filter((inf) => !inf.revealed)
            .map((inf) => inf.role);
          const options = [...currentUnrevealed, ...drawn];
          this.exchangePool = {
            playerId: actor.id,
            options,
            keepCount: currentUnrevealed.length,
          };
          this.state = 'AWAITING_EXCHANGE';
          return { ok: true };
        }

        default:
          this.advanceTurn();
          return { ok: true };
      }
    }

    completeExchange(playerId, selectedIndices) {
      if (this.state !== 'AWAITING_EXCHANGE' || !this.exchangePool) {
        return { error: 'NOT_AWAITING_EXCHANGE' };
      }
      if (this.exchangePool.playerId !== playerId) {
        return { error: 'NOT_YOUR_EXCHANGE' };
      }
      const { options, keepCount } = this.exchangePool;
      if (!Array.isArray(selectedIndices) || selectedIndices.length !== keepCount) {
        return { error: 'INVALID_EXCHANGE_COUNT' };
      }
      const unique = new Set(selectedIndices);
      if (unique.size !== keepCount || selectedIndices.some((i) => i < 0 || i >= options.length)) {
        return { error: 'INVALID_EXCHANGE_INDICES' };
      }

      const actor = this.getPlayer(playerId);
      const keptRoles = [];
      const returnedRoles = [];
      options.forEach((role, idx) => {
        if (unique.has(idx)) {
          keptRoles.push(role);
        } else {
          returnedRoles.push(role);
        }
      });

      // Update actor's unrevealed influences
      let kIdx = 0;
      for (const inf of actor.influences) {
        if (!inf.revealed) {
          inf.role = keptRoles[kIdx++];
        }
      }

      // Return rest to deck and shuffle
      this.deck.push(...returnedRoles);
      this.deck = shuffle(this.deck);
      this.exchangePool = null;

      this.addLog({
        type: 'effect',
        en: `🔄 ${actor.name} completed the Ambassador Exchange with the Court Deck.`,
        ar: `🔄 أتمّ ${actor.name} تبديل البطاقات مع الكومة كسفير.`,
      });

      this.advanceTurn();
      return { ok: true };
    }

    /**
     * AI Bot Decision Engine
     * Returns an action object if a bot needs to act right now, or null
     */
    StepBot() {
      if (this.state === 'LOBBY' || this.state === 'GAME_OVER') return null;

      // 1. If a bot must choose an influence to lose
      if (this.state === 'AWAITING_LOSE_INFLUENCE' && this.pendingLoss) {
        const bot = this.getPlayer(this.pendingLoss.playerId);
        if (bot && bot.isBot) {
          const validIdx = bot.influences.findIndex((inf) => !inf.revealed);
          if (validIdx !== -1) {
            this.chooseInfluenceToLose(bot.id, validIdx);
            return { type: 'bot_loss', botId: bot.id };
          }
        }
        return null;
      }

      // 2. If a bot is completing Ambassador Exchange
      if (this.state === 'AWAITING_EXCHANGE' && this.exchangePool) {
        const bot = this.getPlayer(this.exchangePool.playerId);
        if (bot && bot.isBot) {
          // Prefer keeping Duke, Captain, Contessa, Assassin, Ambassador
          const priority = { duke: 5, captain: 4, contessa: 3, assassin: 2, ambassador: 1 };
          const indexed = this.exchangePool.options.map((role, idx) => ({
            role,
            idx,
            score: priority[role] || 0,
          }));
          indexed.sort((a, b) => b.score - a.score);
          const pick = indexed.slice(0, this.exchangePool.keepCount).map((x) => x.idx);
          this.completeExchange(bot.id, pick);
          return { type: 'bot_exchange', botId: bot.id };
        }
        return null;
      }

      // 3. If it's a bot's turn to declare an action
      if (this.state === 'TURN_START') {
        const current = this.getCurrentPlayer();
        if (current && current.isBot) {
          const others = this.getAlivePlayers().filter((p) => p.id !== current.id);
          if (others.length === 0) return null;
          // Sort targets by most influences then most coins
          others.sort((a, b) => {
            const infDiff = this.getUnrevealedCount(b) - this.getUnrevealedCount(a);
            if (infDiff !== 0) return infDiff;
            return b.coins - a.coins;
          });
          const bestTarget = others[0];
          const myRoles = current.influences.filter((i) => !i.revealed).map((i) => i.role);

          if (current.coins >= 10 || (current.coins >= 7 && Math.random() < 0.85)) {
            this.declareAction(current.id, 'coup', bestTarget.id);
            return { type: 'bot_action', botId: current.id };
          }
          if (current.coins >= 3 && (myRoles.includes('assassin') || Math.random() < 0.22)) {
            this.declareAction(current.id, 'assassinate', bestTarget.id);
            return { type: 'bot_action', botId: current.id };
          }
          if (myRoles.includes('duke') || Math.random() < 0.35) {
            this.declareAction(current.id, 'tax');
            return { type: 'bot_action', botId: current.id };
          }
          const richTargets = others.filter((p) => p.coins >= 2);
          if (richTargets.length > 0 && (myRoles.includes('captain') || Math.random() < 0.25)) {
            this.declareAction(current.id, 'steal', richTargets[0].id);
            return { type: 'bot_action', botId: current.id };
          }
          if (myRoles.includes('ambassador') && Math.random() < 0.5) {
            this.declareAction(current.id, 'exchange');
            return { type: 'bot_action', botId: current.id };
          }
          if (Math.random() < 0.65) {
            this.declareAction(current.id, 'foreign_aid');
          } else {
            this.declareAction(current.id, 'income');
          }
          return { type: 'bot_action', botId: current.id };
        }
        return null;
      }

      // 4. If awaiting reaction to an action from bots
      if (this.state === 'AWAITING_ACTION_REACTION' && this.pendingAction) {
        const eligible = this.getEligibleReactorsForAction();
        for (const id of eligible) {
          if (this.passedPlayerIds.includes(id)) continue;
          const bot = this.getPlayer(id);
          if (!bot || !bot.isBot) continue;

          const myRoles = bot.influences.filter((i) => !i.revealed).map((i) => i.role);
          const actType = this.pendingAction.type;

          // If targeted by assassinate: block if holding contessa, or bluff contessa if Down to 1 card!
          if (actType === 'assassinate' && this.pendingAction.targetId === bot.id) {
            if (myRoles.includes('contessa') || this.getUnrevealedCount(bot) === 1) {
              this.declareBlock(bot.id, 'contessa');
              return { type: 'bot_block', botId: bot.id };
            }
          }

          // If targeted by steal: block if holding captain or ambassador (or small bluff chance)
          if (actType === 'steal' && this.pendingAction.targetId === bot.id) {
            if (myRoles.includes('captain')) {
              this.declareBlock(bot.id, 'captain');
              return { type: 'bot_block', botId: bot.id };
            }
            if (myRoles.includes('ambassador')) {
              this.declareBlock(bot.id, 'ambassador');
              return { type: 'bot_block', botId: bot.id };
            }
            if (Math.random() < 0.2) {
              this.declareBlock(bot.id, 'captain');
              return { type: 'bot_block', botId: bot.id };
            }
          }

          // If foreign_aid: block if holding duke (or occasional bluff)
          if (actType === 'foreign_aid') {
            if (myRoles.includes('duke') || Math.random() < 0.15) {
              this.declareBlock(bot.id, 'duke');
              return { type: 'bot_block', botId: bot.id };
            }
          }

          // Consider challenging if bot holds 2 copies of the claimed role, or random suspicion
          const claimed = this.pendingAction.claimedRole;
          if (claimed) {
            const myCopies = myRoles.filter((r) => r === claimed).length;
            if (myCopies >= 2 || (myCopies === 1 && Math.random() < 0.18) || Math.random() < 0.08) {
              this.declareChallenge(bot.id);
              return { type: 'bot_challenge', botId: bot.id };
            }
          }

          this.passReaction(bot.id);
          return { type: 'bot_pass', botId: bot.id };
        }
      }

      // 5. If awaiting reaction to a block from bots
      if (this.state === 'AWAITING_BLOCK_REACTION' && this.pendingBlock) {
        const eligible = this.getEligibleReactorsForBlock();
        for (const id of eligible) {
          if (this.passedPlayerIds.includes(id)) continue;
          const bot = this.getPlayer(id);
          if (!bot || !bot.isBot) continue;

          const myRoles = bot.influences.filter((i) => !i.revealed).map((i) => i.role);
          const claimed = this.pendingBlock.claimedRole;
          const myCopies = myRoles.filter((r) => r === claimed).length;

          if (myCopies >= 2 || (id === this.pendingAction.actorId && Math.random() < 0.18)) {
            this.declareChallenge(bot.id);
            return { type: 'bot_challenge_block', botId: bot.id };
          }

          this.passReaction(bot.id);
          return { type: 'bot_pass_block', botId: bot.id };
        }
      }

      return null;
    }

    /**
     * Returns a sanitized snapshot of the room state for a specific viewer.
     * Unrevealed cards of OTHER players have their `role` hidden as `'hidden'`!
     */
    getStateForPlayer(viewerId) {
      return {
        roomCode: this.roomCode,
        hostId: this.hostId,
        state: this.state,
        turnIndex: this.turnIndex,
        turnNumber: this.turnNumber,
        deckCount: this.deck.length,
        pendingAction: this.pendingAction,
        pendingBlock: this.pendingBlock,
        pendingLoss: this.pendingLoss,
        passedPlayerIds: this.passedPlayerIds,
        eligibleActionReactors:
          this.state === 'AWAITING_ACTION_REACTION' ? this.getEligibleReactorsForAction() : [],
        eligibleBlockReactors:
          this.state === 'AWAITING_BLOCK_REACTION' ? this.getEligibleReactorsForBlock() : [],
        exchangePool:
          this.exchangePool && this.exchangePool.playerId === viewerId
            ? this.exchangePool
            : null,
        winner: this.winner
          ? { id: this.winner.id, name: this.winner.name, color: this.winner.color }
          : null,
        logs: this.logs.slice(0, 40),
        players: this.players.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          coins: p.coins,
          alive: p.alive,
          connected: p.connected,
          isBot: p.isBot,
          wins: p.wins || 0,
          influences: p.influences.map((inf) => ({
            revealed: inf.revealed,
            role: p.id === viewerId || inf.revealed || this.state === 'GAME_OVER' ? inf.role : 'hidden',
          })),
        })),
      };
    }
  }

  return {
    ROLES,
    ACTIONS,
    PLAYER_COLORS,
    CoupRoom,
  };
});

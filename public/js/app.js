/**
 * COUP Online - Simplified, Clean Progressive-Disclosure UI
 */
(function () {
  // ================= SOUND EFFECTS ENGINE =================
  class SoundEffects {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.12, delay = 0) {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const start = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(gainVal, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      } catch (e) {}
    }

    coin() {
      this.playTone(987.77, 'sine', 0.12, 0.12, 0);
      this.playTone(1318.51, 'sine', 0.22, 0.14, 0.08);
    }

    card() {
      this.playTone(320, 'triangle', 0.09, 0.12, 0);
      this.playTone(480, 'triangle', 0.11, 0.1, 0.05);
    }

    challenge() {
      this.playTone(523.25, 'sawtooth', 0.15, 0.14, 0);
      this.playTone(392.0, 'sawtooth', 0.25, 0.15, 0.12);
    }

    block() {
      this.playTone(440, 'square', 0.12, 0.1, 0);
      this.playTone(659.25, 'square', 0.18, 0.1, 0.09);
    }

    eliminate() {
      this.playTone(260, 'sawtooth', 0.22, 0.15, 0);
      this.playTone(185, 'sawtooth', 0.35, 0.16, 0.16);
    }

    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        this.playTone(f, 'triangle', 0.25, 0.15, idx * 0.11);
      });
    }
  }

  const sfx = new SoundEffects();

  // ================= CARD ROLE METADATA (With Deep On-Demand Details) =================
  const ROLE_META = {
    duke: {
      en: 'Duke',
      ar: 'الدوق',
      icon: '👑',
      color: '#d946ef',
      originalImg: 'assets/cards/modern-duke.jpg',
      hdImg: 'assets/cards/duke.jpg',
      actionAr: 'ضريبة (Tax): يسحب 3 عملات من الخزينة فوراً.',
      actionEn: 'Tax: Collect 3 coins from the treasury.',
      blockAr: 'يمنع أي لاعب آخر من أخذ المساعدة الخارجية (Foreign Aid).',
      blockEn: 'Blocks Foreign Aid (+2 coins).',
      tipAr: 'أقوى بطاقة لجمع العملات بسرعة في بداية اللعبة!',
      tipEn: 'The fastest way to build wealth early in the game.',
    },
    assassin: {
      en: 'Assassin',
      ar: 'القاتل',
      icon: '🗡️',
      color: '#64748b',
      originalImg: 'assets/cards/modern-assassin.jpg',
      hdImg: 'assets/cards/assassin.jpg',
      actionAr: 'اغتيال (Assassinate): ادفع 3 عملات لإجبار خصم على خسارة بطاقة.',
      actionEn: 'Assassinate: Pay 3 coins to force a target to lose an influence.',
      blockAr: 'لا يصد أي حركة.',
      blockEn: 'Cannot block any action.',
      tipAr: 'احذر: يمكن للكونتيسا (Contessa) صد الاغتيال وتضيع عليك الـ 3 عملات!',
      tipEn: 'Can be blocked by Contessa. Challenging a real Assassin costs 2 cards!',
    },
    captain: {
      en: 'Captain',
      ar: 'القبطان',
      icon: '⚓',
      color: '#38bdf8',
      originalImg: 'assets/cards/modern-captain.jpg',
      hdImg: 'assets/cards/captain.jpg',
      actionAr: 'سرقة (Steal): اسرق عملتين من أي لاعب آخر.',
      actionEn: 'Steal: Take up to 2 coins from another player.',
      blockAr: 'يمنع القبطان الآخر من سرقة عملاتك.',
      blockEn: 'Blocks another player from stealing from you.',
      tipAr: 'رائع لإبطاء اللاعبين الأغنياء ومنعهم من الوصول لـ 7 عملات.',
      tipEn: 'Great for slowing down rich opponents while boosting your coins.',
    },
    ambassador: {
      en: 'Ambassador',
      ar: 'السفير',
      icon: '🔄',
      color: '#a3e635',
      originalImg: 'assets/cards/modern-ambassador.jpg',
      hdImg: 'assets/cards/ambassador.jpg',
      actionAr: 'تبديل (Exchange): اسحب بطاقتين من الكومة، اختر ما تريد، وأرجع الباقي.',
      actionEn: 'Exchange: Draw 2 cards from the Court Deck and swap with your hand.',
      blockAr: 'يمنع القبطان من سرقة عملاتك.',
      blockEn: 'Blocks another player from stealing from you.',
      tipAr: 'يمنحك معرفة بالبطاقات الموجودة في الكومة ويحميك من السرقة!',
      tipEn: 'Lets you cycle weak cards and protects your coins from Captains.',
    },
    contessa: {
      en: 'Contessa',
      ar: 'الكونتيسا',
      icon: '💎',
      color: '#ef4444',
      originalImg: 'assets/cards/modern-contessa.jpg',
      hdImg: 'assets/cards/contessa.jpg',
      actionAr: 'لا تملك حركة هجومية في دورك.',
      actionEn: 'No active turn action.',
      blockAr: 'تمنع وتصد حركة الاغتيال (Assassinate) الموجهة ضدك!',
      blockEn: 'Blocks an Assassination attempt against you.',
      tipAr: 'درعك الواقي ضد القاتل! كثيراً ما يدّعيها اللاعبون خداعاً لإنقاذ آخر بطاقة لديهم.',
      tipEn: 'Your ultimate shield against Assassins—frequently bluffed when in danger!',
    },
  };

  // ================= TRANSLATIONS =================
  const I18N = {
    ar: {
      app_title: 'انقلاب | COUP',
      nav_cheatsheet: 'جدول الحركات',
      nav_rules: 'القوانين',
      nav_settings: 'الإعدادات',
      home_welcome: 'العب Coup مع أصدقائك أونلاين',
      home_sub: 'أنشئ غرفة أو ادخل كود الغرفة للعب مباشرة',
      tab_create: 'إنشاء غرفة',
      tab_join: 'انضمام بكود',
      label_your_name: 'اسمك',
      label_room_code: 'كود الغرفة (6 أحرف)',
      btn_create_room: 'إنشاء غرفة جديدة',
      btn_join_room: 'انضمام للغرفة الآن',
      btn_quick_bots: 'تجربة سريعة ضد الكمبيوتر (Bots)',
      btn_share_app: 'مشاركة رابط اللعبة مع أصدقائك',
      room_code_label: 'كود الغرفة لمشاركته مع أصدقائك',
      btn_copy_code: 'نسخ الكود',
      btn_copy_link: 'نسخ رابط الدعوة',
      btn_whatsapp_invite: 'دعوة واتساب',
      players_in_room: 'اللاعبون',
      btn_add_bot: '+ بوت',
      btn_shuffle_order: 'خلط الدور',
      btn_leave_room: 'خروج',
      btn_start_game: 'ابدأ اللعب!',
      btn_log: 'السجل',
      choose_action_title: '🎯 دورك الآن — اختر حركة للعب:',
      coins_word: 'عملات',
      click_card_hint: '💡 اضغط على أي بطاقة لفتح شرحها الكامل',
      btn_react: 'تفاعل',
      cs_modal_title: '📋 جدول الحركات والبطاقات (Cheat Sheet)',
      cs_col_influence: 'البطاقة',
      cs_col_action: 'الحركة',
      cs_col_effect: 'التأثير',
      cs_col_counter: 'الصد (Block)',
      cs_eff_income: 'اجمع 1 عملة',
      cs_eff_fa: 'اجمع عملتين',
      cs_eff_coup: 'ادفع 7 عملات — إسقاط بطاقة لاعب',
      cs_eff_tax: 'اجمع 3 عملات',
      cs_cnt_duke: 'يمنع المساعدة الخارجية',
      cs_eff_assassin: 'ادفع 3 عملات — إسقاط بطاقة لاعب',
      cs_eff_ambassador: 'اسحب بطاقتين وبدّل مع الكومة',
      cs_cnt_steal: 'يمنع السرقة',
      cs_eff_captain: 'اسرق عملتين من لاعب آخر',
      cs_cnt_contessa: 'تمنع الاغتيال',
      event_log_title: '📜 سجل أحداث الجولة',
      rules_modal_title: 'ℹ️ قوانين لعبة الانقلاب (Coup)',
      footer_rights: '© 2026 جميع الحقوق محفوظة — تطوير',
      contact_portfolio: 'موقعي وأعمالي',
      credits_modal_title: '👨‍💻 عن مطور اللعبة والتواصل',
      credits_bio: 'مطور برمجيات، مواقع ويب، متاجر إلكترونية، وتطبيقات هواتف ذكية. تم تصميم وتطوير هذه النسخة من لعبة COUP لتعمل أونلاين مجاناً مع الأصدقاء من أي مكان.',
      visit_portfolio: 'زيارة موقعي الشخصي (ObaiTech)',
      contact_wa: 'تواصل عبر واتساب (WhatsApp)',
    },
    en: {
      app_title: 'COUP ONLINE',
      nav_cheatsheet: 'Cheat Sheet',
      nav_rules: 'Rules',
      nav_settings: 'Settings',
      home_welcome: 'Play Coup Online with Friends',
      home_sub: 'Create a room or enter a 6-digit code to join',
      tab_create: 'Create Room',
      tab_join: 'Join Room',
      label_your_name: 'Your Name',
      label_room_code: 'Room Code (6 chars)',
      btn_create_room: 'Create New Room',
      btn_join_room: 'Join Room Now',
      btn_quick_bots: 'Quick Practice vs AI Bots',
      btn_share_app: 'Share Game Link',
      room_code_label: 'SHARE THIS ROOM CODE WITH FRIENDS',
      btn_copy_code: 'Copy Code',
      btn_copy_link: 'Copy Invite Link',
      btn_whatsapp_invite: 'WhatsApp Invite',
      players_in_room: 'Players',
      btn_add_bot: '+ Bot',
      btn_shuffle_order: 'Shuffle Order',
      btn_leave_room: 'Leave',
      btn_start_game: 'Start Game!',
      btn_log: 'Log',
      choose_action_title: '🎯 Your Turn — Choose an Action:',
      coins_word: 'Coins',
      click_card_hint: '💡 Click any card to view its abilities',
      btn_react: 'React',
      cs_modal_title: '📋 Coup Cheat Sheet',
      cs_col_influence: 'Influence',
      cs_col_action: 'Action',
      cs_col_effect: 'Effect',
      cs_col_counter: 'Counteraction',
      cs_eff_income: 'Collect 1 coin',
      cs_eff_fa: 'Collect 2 coins',
      cs_eff_coup: 'Pay 7 coins — Player loses influence',
      cs_eff_tax: 'Collect 3 coins',
      cs_cnt_duke: 'Blocks Foreign Aid',
      cs_eff_assassin: 'Pay 3 coins — Player loses influence',
      cs_eff_ambassador: 'Swap 2 cards with Court Deck',
      cs_cnt_steal: 'Blocks Stealing',
      cs_eff_captain: 'Steal 2 coins from a player',
      cs_cnt_contessa: 'Blocks Assassination',
      event_log_title: '📜 Match Event Log',
      rules_modal_title: 'ℹ️ How to Play Coup',
      footer_rights: '© 2026 All Rights Reserved — Developed by',
      contact_portfolio: 'Portfolio',
      credits_modal_title: '👨‍💻 About Developer & Contact',
      credits_bio: 'Software developer building websites, online stores, and mobile apps. This modern Coup Online edition is crafted to let friends play together seamlessly for free.',
      visit_portfolio: 'Visit Portfolio (ObaiTech)',
      contact_wa: 'Message on WhatsApp',
    },
  };

  const RULES_HTML = {
    ar: `
      <div class="info-card green">
        <strong>🎯 الهدف من اللعبة:</strong>
        <p>يبدأ كل لاعب بـ <strong>عملتين</strong> و<strong>بطاقتين سريتين</strong>. آخر لاعب تبقى لديه بطاقة غير مكشوفة يفوز!</p>
      </div>
      <div class="info-card">
        <strong>🤥 الخداع والتحدي (Bluff & Challenge):</strong>
        <p>في دورك يمكنك تنفيذ حركة أي شخصية حتى لو لم تكن تملك بطاقتها! إذا شك فيك أحد اللاعبين وضغط <strong>تحدي (Challenge)</strong>:</p>
        <ul style="padding-inline-start: 1.2rem; margin-top: 0.3rem;">
          <li>إذا كنت <strong>تملك البطاقة فعلاً</strong>: يخسر المتحدي بطاقة، وتُبدّل بطاقتك بأخرى جديدة من الكومة.</li>
          <li>إذا كنت <strong>تكذب</strong>: تخسر أنت بطاقة وتُلغى حركتك!</li>
        </ul>
      </div>
      <div class="info-card gold">
        <strong>🛡️ الصد (Block):</strong>
        <p>يمكن صد بعض الحركات (مثل منع المساعدة الخارجية بالدوق، أو منع السرقة بالقبطان/السفير، أو منع الاغتيال بالكونتيسا). ويمكن أيضاً تحدي اللاعب الذي يقوم بالصد!</p>
      </div>
    `,
    en: `
      <div class="info-card green">
        <strong>🎯 Objective:</strong>
        <p>Every player starts with <strong>2 coins</strong> and <strong>2 secret cards</strong>. Be the last player with an unrevealed card to win!</p>
      </div>
      <div class="info-card">
        <strong>🤥 Bluffing & Challenges:</strong>
        <p>You can claim ANY character's action on your turn, even if you don't hold that card! If another player clicks <strong>Challenge</strong>:</p>
        <ul style="padding-inline-start: 1.2rem; margin-top: 0.3rem;">
          <li>If you <strong>have the card</strong>: the challenger loses a card, and you draw a fresh replacement card.</li>
          <li>If you <strong>were bluffing</strong>: you lose a card and your action fails!</li>
        </ul>
      </div>
      <div class="info-card gold">
        <strong>🛡️ Blocking:</strong>
        <p>Foreign Aid, Steal, and Assassinate can be blocked by claiming Duke, Captain/Ambassador, or Contessa. Blocks can also be challenged!</p>
      </div>
    `,
  };

  // ================= CLIENT STATE =================
  let lang = localStorage.getItem('coup_lang') || 'ar';
  let cardStyle = localStorage.getItem('coup_card_style') || 'original';
  let activeTab = 'create';
  let myPlayerId = localStorage.getItem('coup_player_id');
  if (!myPlayerId) {
    myPlayerId = 'p_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('coup_player_id', myPlayerId);
  }
  let myPlayerName = localStorage.getItem('coup_player_name') || '';

  let transportMode = 'detecting';
  let socket = null;

  let peer = null;
  let p2pHostConn = null;
  let p2pClientConns = new Map();
  let localRoom = null;
  let localBotTimer = null;

  let roomState = null;
  let pendingTargetAction = null;
  let selectedExchangeIndices = [];
  let prevLogTopId = null;

  const el = (id) => document.getElementById(id);

  // ================= ON-DEMAND CARD INSPECTOR =================
  function openCardInspector(role) {
    const meta = ROLE_META[role];
    if (!meta) return;
    const imgSrc = cardStyle === 'original' ? meta.originalImg : meta.hdImg;
    const box = el('card-inspector-content');
    box.innerHTML = `
      <div class="modal-header">
        <h3 style="color: ${meta.color};">${meta.icon} ${meta.ar} (${meta.en})</h3>
        <button class="secondary-btn compact" id="btn-close-inspector">✖</button>
      </div>
      <div style="display: grid; grid-template-columns: 145px 1fr; gap: 1.1rem; align-items: center;">
        <div class="coup-card role-${role}" style="width: 145px; cursor: default;">
          <img class="coup-card-art" src="${imgSrc}" alt="${meta.en}" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.9rem; line-height: 1.55;">
          <div class="info-card" style="border-inline-start-color: ${meta.color};">
            <strong>⚡ ${lang === 'ar' ? 'الحركة في دورك:' : 'Action:'}</strong>
            <div>${lang === 'ar' ? meta.actionAr : meta.actionEn}</div>
          </div>
          <div class="info-card green">
            <strong>🛡️ ${lang === 'ar' ? 'الصد والدفاع:' : 'Counteraction (Block):'}</strong>
            <div>${lang === 'ar' ? meta.blockAr : meta.blockEn}</div>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">
            💡 ${lang === 'ar' ? meta.tipAr : meta.tipEn}
          </div>
        </div>
      </div>
    `;
    el('modal-card-inspector').classList.add('open');
    el('btn-close-inspector').addEventListener('click', () => {
      el('modal-card-inspector').classList.remove('open');
    });
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    el('lang-label').textContent = lang === 'ar' ? 'English' : 'العربية';

    const dict = I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (dict[key]) node.textContent = dict[key];
    });

    el('rules-modal-body').innerHTML = RULES_HTML[lang];
    updateCardStyleLabel();
    updateHomeTabUI();
    updateConnectionBadge();
    if (roomState) renderRoomState(roomState);
  }

  function updateCardStyleLabel() {
    el('card-style-label').textContent =
      cardStyle === 'original'
        ? lang === 'ar'
          ? 'الأصلية'
          : 'Original'
        : 'HD';

    document.querySelectorAll('#hero-card-fan .fan-card').forEach((cardEl) => {
      const role = cardEl.getAttribute('data-role');
      const img = cardEl.querySelector('img');
      if (img && ROLE_META[role]) {
        img.src = cardStyle === 'original' ? ROLE_META[role].originalImg : ROLE_META[role].hdImg;
      }
    });
  }

  function updateConnectionBadge() {
    const txtEl = el('connection-mode-text');
    if (transportMode === 'socketio') {
      txtEl.textContent = lang === 'ar' ? 'متصل بالخادم (Server)' : 'Server Online';
    } else {
      txtEl.textContent = lang === 'ar' ? 'متصل أونلاين (P2P)' : 'P2P Online Ready';
    }
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const target = el(screenId);
    if (target) target.classList.add('active');
  }

  function showHomeError(msg) {
    const box = el('home-error-msg');
    if (!msg) {
      box.style.display = 'none';
      return;
    }
    box.textContent = msg;
    box.style.display = 'block';
  }

  function updateHomeTabUI() {
    const isCreate = activeTab === 'create';
    el('tab-create').classList.toggle('active', isCreate);
    el('tab-join').classList.toggle('active', !isCreate);
    el('join-code-group').style.display = isCreate ? 'none' : 'block';
    el('submit-room-text').textContent = isCreate
      ? I18N[lang].btn_create_room
      : I18N[lang].btn_join_room;
    showHomeError('');
  }

  // ================= CLEAN CARD HTML BUILDER =================
  function buildCardHTML(role, options = {}) {
    const {
      size = 'large',
      revealed = false,
      selectableLoss = false,
      cardIndex = 0,
      selectedExchange = false,
      exchangeIndex = null,
    } = options;

    if (role === 'hidden') {
      return `
        <div class="coup-card ${size}" style="border-color: #64748b; cursor: default;">
          <img class="coup-card-art" src="assets/cards/back.jpg" alt="Coup Card Back" />
        </div>
      `;
    }

    const meta = ROLE_META[role] || ROLE_META.duke;
    const imgSrc = cardStyle === 'original' ? meta.originalImg : meta.hdImg;
    const extraClasses = [
      'coup-card',
      size,
      `role-${role}`,
      revealed ? 'revealed-dead' : '',
      selectableLoss ? 'selectable-loss' : '',
      selectedExchange ? 'selected-exchange' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const dataAttrs = [
      `data-inspect-role="${role}"`,
      selectableLoss ? `data-loss-index="${cardIndex}"` : '',
      exchangeIndex !== null ? `data-exchange-index="${exchangeIndex}"` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const stampHTML = revealed
      ? `<div class="exiled-stamp">${lang === 'ar' ? 'خاسرة' : 'OUT'}</div>`
      : '';

    const roleTitle = lang === 'ar' ? `${meta.icon} ${meta.ar}` : `${meta.icon} ${meta.en}`;

    return `
      <div class="${extraClasses}" ${dataAttrs} title="${
      lang === 'ar' ? 'اضغط لعرض قدرات البطاقة' : 'Click for card details'
    }">
        <img class="coup-card-art" src="${imgSrc}" alt="${meta.en}" />
        ${stampHTML}
        <div class="coup-card-pill">
          <span>${roleTitle}</span>
        </div>
      </div>
    `;
  }

  // ================= DUAL MULTIPLAYER TRANSPORT =================
  function initTransport() {
    const host = window.location.hostname;
    const isStaticHost =
      host.endsWith('github.io') ||
      host.endsWith('netlify.app') ||
      host.endsWith('vercel.app') ||
      host.endsWith('web.app') ||
      host.endsWith('firebaseapp.com') ||
      host.endsWith('pages.dev');

    if (isStaticHost) {
      transportMode = 'p2p';
      updateConnectionBadge();
      return;
    }

    // Try loading Socket.IO only when running on a Node.js backend
    const script = document.createElement('script');
    script.src = 'socket.io/socket.io.js';
    script.onload = () => {
      if (typeof window.io === 'function') {
        try {
          socket = window.io({ reconnectionAttempts: 2, timeout: 1800 });
          socket.on('connect', () => {
            transportMode = 'socketio';
            updateConnectionBadge();
          });
          socket.on('connect_error', () => {
            if (transportMode !== 'socketio') {
              transportMode = 'p2p';
              socket.disconnect();
              updateConnectionBadge();
            }
          });
          socket.on('room_state', (state) => handleIncomingState(state));
          socket.on('player_reaction', (payload) => showReactionToast(payload));
        } catch (e) {
          transportMode = 'p2p';
          updateConnectionBadge();
        }
      } else {
        transportMode = 'p2p';
        updateConnectionBadge();
      }
    };
    script.onerror = () => {
      transportMode = 'p2p';
      updateConnectionBadge();
    };
    document.head.appendChild(script);
  }

  function generateP2PRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  function broadcastLocalRoomState() {
    if (!localRoom) return;
    handleIncomingState(localRoom.getStateForPlayer(myPlayerId));
    for (const [pid, conn] of p2pClientConns.entries()) {
      if (conn && conn.open) {
        conn.send({ type: 'room_state', state: localRoom.getStateForPlayer(pid) });
      }
    }
    scheduleLocalBotStep();
  }

  function scheduleLocalBotStep() {
    if (!localRoom) return;
    if (localBotTimer) {
      clearTimeout(localBotTimer);
      localBotTimer = null;
    }
    if (localRoom.state === 'LOBBY' || localRoom.state === 'GAME_OVER') return;
    localBotTimer = setTimeout(() => {
      localBotTimer = null;
      if (!localRoom) return;
      const acted = localRoom.StepBot();
      if (acted) broadcastLocalRoomState();
    }, 1000);
  }

  const PEER_CONFIG = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    },
  };

  function createP2PRoom(playerName, withBots = false) {
    const roomCode = generateP2PRoomCode();
    localRoom = new window.CoupGameEngine.CoupRoom(roomCode, myPlayerId, playerName);
    if (withBots) {
      localRoom.addBot();
      localRoom.addBot();
      localRoom.addBot();
      localRoom.startGame();
    }

    if (typeof window.Peer === 'function') {
      try {
        if (peer) peer.destroy();
        peer = new window.Peer(`coup-online-room-${roomCode}`, PEER_CONFIG);
        peer.on('connection', (conn) => {
          conn.on('data', (msg) => handleP2PClientMessage(conn, msg));
          conn.on('close', () => {
            for (const [pid, c] of p2pClientConns.entries()) {
              if (c === conn) {
                p2pClientConns.delete(pid);
                if (localRoom) {
                  localRoom.removePlayer(pid);
                  broadcastLocalRoomState();
                }
              }
            }
          });
        });
      } catch (e) {}
    }
    broadcastLocalRoomState();
  }

  function handleP2PClientMessage(conn, msg) {
    if (!localRoom || !msg) return;
    const { action, payload, playerId } = msg;
    if (action === 'join') {
      const res = localRoom.addPlayer(playerId, payload.playerName, false);
      if (res.error) {
        conn.send({ type: 'join_error', error: res.error });
        return;
      }
      p2pClientConns.set(playerId, conn);
      broadcastLocalRoomState();
      return;
    }
    if (action === 'declare_action')
      localRoom.declareAction(playerId, payload.actionId, payload.targetId);
    else if (action === 'pass_reaction') localRoom.passReaction(playerId);
    else if (action === 'declare_block') localRoom.declareBlock(playerId, payload.claimedRole);
    else if (action === 'declare_challenge') localRoom.declareChallenge(playerId);
    else if (action === 'choose_loss')
      localRoom.chooseInfluenceToLose(playerId, payload.cardIndex);
    else if (action === 'complete_exchange')
      localRoom.completeExchange(playerId, payload.selectedIndices);
    else if (action === 'send_reaction') {
      const p = localRoom.getPlayer(playerId);
      if (p) {
        const toastPayload = {
          playerId: p.id,
          playerName: p.name,
          playerColor: p.color,
          emoji: payload.emoji,
          text: payload.text,
        };
        showReactionToast(toastPayload);
        for (const c of p2pClientConns.values()) {
          if (c && c.open) c.send({ type: 'player_reaction', payload: toastPayload });
        }
      }
      return;
    }
    broadcastLocalRoomState();
  }

  function joinP2PRoom(roomCode, playerName) {
    if (typeof window.Peer !== 'function') {
      showHomeError(lang === 'ar' ? 'تعذر الاتصال بالشبكة' : 'Network unavailable');
      return;
    }
    const cleanCode = roomCode.trim().toUpperCase();
    const submitBtn = el('btn-submit-room');
    if (submitBtn) submitBtn.disabled = true;
    el('submit-room-text').textContent =
      lang === 'ar' ? 'جاري الاتصال بالغرفة...' : 'Connecting to room...';

    if (peer) peer.destroy();
    peer = new window.Peer(undefined, PEER_CONFIG);
    peer.on('open', () => {
      const conn = peer.connect(`coup-online-room-${cleanCode}`, { reliable: true });
      p2pHostConn = conn;
      conn.on('open', () => {
        if (submitBtn) submitBtn.disabled = false;
        updateHomeTabUI();
        conn.send({ action: 'join', playerId: myPlayerId, payload: { playerName } });
      });
      conn.on('data', (data) => {
        if (data.type === 'room_state') handleIncomingState(data.state);
        else if (data.type === 'player_reaction') showReactionToast(data.payload);
        else if (data.type === 'join_error') {
          if (submitBtn) submitBtn.disabled = false;
          updateHomeTabUI();
          showHomeError(data.error);
        }
      });
    });
    peer.on('error', () => {
      if (submitBtn) submitBtn.disabled = false;
      updateHomeTabUI();
      showHomeError(
        lang === 'ar'
          ? 'لم يتم العثور على الغرفة. تأكد من الكود.'
          : 'Room not found. Check the 6-character code.'
      );
    });
  }

  function sendGameCommand(eventName, payload = {}, cb) {
    if (localRoom) {
      let res = { ok: true };
      if (eventName === 'add_bot') res = localRoom.addBot();
      else if (eventName === 'remove_bot') res = localRoom.removeBot(payload.botId);
      else if (eventName === 'reorder_players') res = localRoom.reorderPlayers(payload.orderIds);
      else if (eventName === 'start_game') res = localRoom.startGame();
      else if (eventName === 'back_to_lobby') {
        localRoom.state = 'LOBBY';
        localRoom.pendingAction = null;
        localRoom.pendingBlock = null;
        localRoom.pendingLoss = null;
        localRoom.exchangePool = null;
      } else if (eventName === 'declare_action')
        res = localRoom.declareAction(myPlayerId, payload.actionId, payload.targetId);
      else if (eventName === 'pass_reaction') res = localRoom.passReaction(myPlayerId);
      else if (eventName === 'declare_block')
        res = localRoom.declareBlock(myPlayerId, payload.claimedRole);
      else if (eventName === 'declare_challenge') res = localRoom.declareChallenge(myPlayerId);
      else if (eventName === 'choose_loss')
        res = localRoom.chooseInfluenceToLose(myPlayerId, payload.cardIndex);
      else if (eventName === 'complete_exchange')
        res = localRoom.completeExchange(myPlayerId, payload.selectedIndices);
      else if (eventName === 'send_reaction') {
        const me = localRoom.getPlayer(myPlayerId);
        if (me) {
          const toastData = {
            playerId: me.id,
            playerName: me.name,
            playerColor: me.color,
            emoji: payload.emoji,
            text: payload.text,
          };
          showReactionToast(toastData);
          for (const c of p2pClientConns.values()) {
            if (c && c.open) c.send({ type: 'player_reaction', payload: toastData });
          }
        }
        return;
      }
      if (typeof cb === 'function') cb(res);
      broadcastLocalRoomState();
      return;
    }

    if (p2pHostConn && p2pHostConn.open) {
      p2pHostConn.send({ action: eventName, playerId: myPlayerId, payload });
      return;
    }

    if (socket && socket.connected) {
      socket.emit(eventName, payload, cb);
    }
  }

  // ================= RENDER STATE =================
  function handleIncomingState(state) {
    if (!state) return;
    if (state.logs && state.logs.length > 0) {
      const topLog = state.logs[0];
      if (topLog.id !== prevLogTopId) {
        prevLogTopId = topLog.id;
        if (topLog.type === 'victory') sfx.victory();
        else if (topLog.type === 'challenge_win' || topLog.type === 'challenge_fail')
          sfx.challenge();
        else if (topLog.type === 'block' || topLog.type === 'block_success') sfx.block();
        else if (topLog.type === 'loss' || topLog.type === 'elimination') sfx.eliminate();
        else if (topLog.type === 'effect' || topLog.actionId === 'income') sfx.coin();
        else sfx.card();
      }
    }
    roomState = state;
    renderRoomState(state);
  }

  function renderRoomState(state) {
    if (state.state === 'LOBBY') {
      showScreen('screen-lobby');
      renderLobby(state);
    } else {
      showScreen('screen-game');
      renderGameBoard(state);
    }
  }

  function renderLobby(state) {
    el('lobby-room-code').textContent = state.roomCode;
    el('lobby-player-count').textContent = state.players.length;
    const isHost = state.hostId === myPlayerId;
    el('lobby-host-controls').style.display = isHost ? 'flex' : 'none';
    el('btn-start-game').disabled = !isHost || state.players.length < 2;

    const listEl = el('lobby-players-list');
    listEl.innerHTML = state.players
      .map((p, idx) => {
        const isMe = p.id === myPlayerId;
        const isRoomHost = p.id === state.hostId;
        return `
          <div class="lobby-player-row">
            <div class="lobby-player-info">
              <div class="player-avatar-dot" style="background: ${p.color};">${idx + 1}</div>
              <div>
                <div style="font-weight: 800; font-size: 0.96rem;">
                  ${escapeHtml(p.name)}
                  ${isMe ? `<span style="color: #38bdf8; font-size: 0.78rem;">(${lang === 'ar' ? 'أنت' : 'You'})</span>` : ''}
                  ${isRoomHost ? `<span style="color: #fbbf24; font-size: 0.78rem;">👑</span>` : ''}
                </div>
              </div>
            </div>
            <div>
              ${
                isHost && p.isBot
                  ? `<button class="secondary-btn compact btn-remove-bot" data-bot-id="${p.id}" style="color: #f87171;">✖</button>`
                  : `<span style="font-size: 0.78rem; color: var(--text-muted);">${p.wins ? `🏆 ${p.wins}` : ''}</span>`
              }
            </div>
          </div>
        `;
      })
      .join('');

    listEl.querySelectorAll('.btn-remove-bot').forEach((btn) => {
      btn.addEventListener('click', () => {
        sendGameCommand('remove_bot', { botId: btn.getAttribute('data-bot-id') });
      });
    });
  }

  function renderGameBoard(state) {
    const me = state.players.find((p) => p.id === myPlayerId) || state.players[0];
    const currentTurnPlayer = state.players[state.turnIndex];
    const isMyTurn = currentTurnPlayer && currentTurnPlayer.id === myPlayerId;

    el('deck-count-badge').textContent = state.deckCount;

    // 1. Clean Top Status Bar + 1-line Latest Event Ticker
    const banner = el('game-status-banner');
    banner.classList.toggle('my-turn', isMyTurn && state.state === 'TURN_START');
    banner.classList.toggle(
      'alert-reaction',
      state.state === 'AWAITING_ACTION_REACTION' ||
        state.state === 'AWAITING_BLOCK_REACTION' ||
        (state.state === 'AWAITING_LOSE_INFLUENCE' &&
          state.pendingLoss &&
          state.pendingLoss.playerId === myPlayerId)
    );

    const headline = el('turn-headline-text');
    if (state.state === 'GAME_OVER' && state.winner) {
      headline.innerHTML =
        lang === 'ar'
          ? `👑 الفائز هو <span style="color: ${state.winner.color};">${escapeHtml(state.winner.name)}</span>!`
          : `👑 <span style="color: ${state.winner.color};">${escapeHtml(state.winner.name)}</span> Wins!`;
    } else if (isMyTurn && state.state === 'TURN_START') {
      headline.innerHTML =
        lang === 'ar'
          ? `🟢 دورك الآن يا <span style="color: #fbbf24;">${escapeHtml(me.name)}</span>`
          : `🟢 Your Turn, <span style="color: #fbbf24;">${escapeHtml(me.name)}</span>`;
    } else if (currentTurnPlayer) {
      headline.innerHTML =
        lang === 'ar'
          ? `⏳ الدور عند <span style="color: ${currentTurnPlayer.color};">${escapeHtml(currentTurnPlayer.name)}</span>`
          : `⏳ <span style="color: ${currentTurnPlayer.color};">${escapeHtml(currentTurnPlayer.name)}'s</span> Turn`;
    }

    const latestLog = state.logs && state.logs[0];
    el('latest-log-ticker').textContent = latestLog
      ? lang === 'ar'
        ? latestLog.ar
        : latestLog.en
      : '';

    // 2. Clean Players Row (Opponents + You in a clean ChickenKoup-style horizontal row)
    const seatsGrid = el('players-seats-grid');
    seatsGrid.innerHTML = state.players
      .map((p, idx) => {
        const isTurn = idx === state.turnIndex && state.state !== 'GAME_OVER';
        const isMe = p.id === myPlayerId;
        const canTarget =
          pendingTargetAction &&
          isMyTurn &&
          state.state === 'TURN_START' &&
          p.alive &&
          p.id !== myPlayerId &&
          (pendingTargetAction !== 'steal' || p.coins > 0);

        // For opponents (or revealed cards), show mini cards. For "You", show hidden back in the top row so your secret cards are only in your bottom private hand!
        const miniCardsHTML = p.influences
          .map((inf) =>
            buildCardHTML(inf.revealed || state.state === 'GAME_OVER' ? inf.role : 'hidden', {
              size: 'mini',
              revealed: inf.revealed,
            })
          )
          .join('');

        return `
          <div class="player-seat-card ${isTurn ? 'active-turn' : ''} ${!p.alive ? 'eliminated' : ''} ${canTarget ? 'targetable' : ''}"
               data-target-player-id="${canTarget ? p.id : ''}"
               style="border-top: 4px solid ${p.color};">
            <div class="seat-header">
              <div class="seat-name-wrap">
                <span class="seat-color-bar" style="background: ${p.color};"></span>
                <span>${escapeHtml(p.name)}</span>
                ${isMe ? `<span style="font-size: 0.7rem; color: #38bdf8;">(${lang === 'ar' ? 'أنت' : 'You'})</span>` : ''}
              </div>
              <div class="coin-badge">🪙 ${p.coins}</div>
            </div>

            <div class="seat-mini-cards">${miniCardsHTML}</div>

            ${
              canTarget
                ? `<div style="text-align: center; padding: 0.25rem; border-radius: 7px; background: rgba(239,68,68,0.25); color: #fca5a5; font-weight: 800; font-size: 0.76rem;">
                     🎯 ${lang === 'ar' ? 'اضغط للاستهداف' : 'Click to Target'}
                   </div>`
                : ''
            }
          </div>
        `;
      })
      .join('');

    seatsGrid.querySelectorAll('[data-target-player-id]').forEach((cardEl) => {
      const targetId = cardEl.getAttribute('data-target-player-id');
      if (targetId) {
        cardEl.addEventListener('click', () => {
          const act = pendingTargetAction;
          pendingTargetAction = null;
          el('target-instruction-badge').style.display = 'none';
          sendGameCommand('declare_action', { actionId: act, targetId });
        });
      }
    });

    // Allow clicking revealed mini-cards to inspect their role details
    seatsGrid.querySelectorAll('[data-inspect-role]').forEach((cEl) => {
      cEl.addEventListener('click', (e) => {
        if (pendingTargetAction) return;
        e.stopPropagation();
        openCardInspector(cEl.getAttribute('data-inspect-role'));
      });
    });

    // 3. Center Stage: Show Reaction Prompt OR Your Turn Action Buttons (Never both, never when waiting!)
    renderDynamicPrompt(state, me);
    renderActionButtons(state, me, isMyTurn);

    // 4. Bottom My Hand Bar
    if (me) {
      el('my-color-dot').style.background = me.color;
      el('my-player-tag').textContent = me.name;
      el('my-coins-count').textContent = me.coins;

      const mustChooseLoss =
        state.state === 'AWAITING_LOSE_INFLUENCE' &&
        state.pendingLoss &&
        state.pendingLoss.playerId === myPlayerId;

      const myCardsContainer = el('my-cards-container');
      myCardsContainer.innerHTML = me.influences
        .map((inf, idx) =>
          buildCardHTML(inf.role, {
            size: 'large',
            revealed: inf.revealed,
            selectableLoss: mustChooseLoss && !inf.revealed,
            cardIndex: idx,
          })
        )
        .join('');

      myCardsContainer.querySelectorAll('.coup-card').forEach((cardEl) => {
        cardEl.addEventListener('click', () => {
          if (mustChooseLoss && cardEl.hasAttribute('data-loss-index')) {
            const idx = parseInt(cardEl.getAttribute('data-loss-index'), 10);
            sendGameCommand('choose_loss', { cardIndex: idx });
            return;
          }
          const role = cardEl.getAttribute('data-inspect-role');
          if (role) openCardInspector(role);
        });
      });
    }

    // 5. Populate On-Demand Event Log Modal
    const logList = el('event-log-list');
    logList.innerHTML = (state.logs || [])
      .map(
        (item) => `
        <div class="log-item type-${item.type || 'system'}">
          ${escapeHtml(lang === 'ar' ? item.ar : item.en)}
        </div>
      `
      )
      .join('');
  }

  function renderDynamicPrompt(state, me) {
    const container = el('dynamic-prompt-container');

    if (state.state === 'GAME_OVER' && state.winner) {
      const isHost = state.hostId === myPlayerId;
      container.innerHTML = `
        <div class="reaction-panel" style="border-color: #fbbf24;">
          <div style="font-size: 1.25rem; font-weight: 900; color: #fbbf24;">
            🏆 ${
              lang === 'ar'
                ? `فاز ${escapeHtml(state.winner.name)} بالجولة!`
                : `${escapeHtml(state.winner.name)} Won!`
            }
          </div>
          <div class="reaction-buttons-row">
            ${
              isHost
                ? `
                  <button class="react-btn pass" id="btn-rematch-now">
                    🔄 ${lang === 'ar' ? 'جولة جديدة' : 'Play Again'}
                  </button>
                  <button class="secondary-btn" id="btn-return-lobby">
                    ⚙️ ${lang === 'ar' ? 'صالة الانتظار' : 'Lobby'}
                  </button>
                `
                : `<span style="color: var(--text-muted);">${
                    lang === 'ar' ? 'بانتظار المضيف لبدء جولة جديدة...' : 'Waiting for host...'
                  }</span>`
            }
          </div>
        </div>
      `;
      const btnRematch = el('btn-rematch-now');
      if (btnRematch) btnRematch.addEventListener('click', () => sendGameCommand('start_game'));
      const btnLobby = el('btn-return-lobby');
      if (btnLobby) btnLobby.addEventListener('click', () => sendGameCommand('back_to_lobby'));
      return;
    }

    if (state.state === 'AWAITING_LOSE_INFLUENCE' && state.pendingLoss) {
      const victim = state.players.find((p) => p.id === state.pendingLoss.playerId);
      const isMe = victim && victim.id === myPlayerId;
      container.innerHTML = `
        <div class="reaction-panel" style="border-color: #ef4444;">
          <div style="font-weight: 900; color: #fca5a5;">
            💔 ${
              isMe
                ? lang === 'ar'
                  ? 'اضغط على إحدى بطاقاتك بالأسفل للتضحية بها!'
                  : 'Click one of your cards below to lose it!'
                : lang === 'ar'
                ? `بانتظار ${escapeHtml(victim ? victim.name : '')} لاختيار بطاقة...`
                : `Waiting for ${escapeHtml(victim ? victim.name : '')} to lose a card...`
            }
          </div>
        </div>
      `;
      return;
    }

    if (state.state === 'AWAITING_EXCHANGE') {
      const actor = state.players[state.turnIndex];
      if (state.exchangePool && state.exchangePool.playerId === myPlayerId) {
        const { options, keepCount } = state.exchangePool;
        if (selectedExchangeIndices.length > keepCount) selectedExchangeIndices = [];
        const cardsHtml = options
          .map((role, idx) =>
            buildCardHTML(role, {
              size: 'large',
              selectedExchange: selectedExchangeIndices.includes(idx),
              exchangeIndex: idx,
            })
          )
          .join('');

        container.innerHTML = `
          <div class="reaction-panel" style="border-color: #a3e635;">
            <div style="font-weight: 900; color: #bef264;">
              🔄 ${
                lang === 'ar'
                  ? `تبديل السفير: اختر ${keepCount} بطاقة للاحتفاظ بها (${selectedExchangeIndices.length}/${keepCount})`
                  : `Select ${keepCount} card(s) to keep (${selectedExchangeIndices.length}/${keepCount})`
              }
            </div>
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center;">
              ${cardsHtml}
            </div>
            <button class="react-btn pass" id="btn-confirm-exchange" ${
              selectedExchangeIndices.length !== keepCount ? 'disabled' : ''
            }>
              ✅ ${lang === 'ar' ? 'تأكيد التبديل' : 'Confirm'}
            </button>
          </div>
        `;

        container.querySelectorAll('[data-exchange-index]').forEach((cEl) => {
          cEl.addEventListener('click', () => {
            const idx = parseInt(cEl.getAttribute('data-exchange-index'), 10);
            if (selectedExchangeIndices.includes(idx)) {
              selectedExchangeIndices = selectedExchangeIndices.filter((i) => i !== idx);
            } else if (selectedExchangeIndices.length < keepCount) {
              selectedExchangeIndices.push(idx);
            } else if (keepCount === 1) {
              selectedExchangeIndices = [idx];
            }
            renderDynamicPrompt(state, me);
          });
        });

        const confirmBtn = el('btn-confirm-exchange');
        if (confirmBtn) {
          confirmBtn.addEventListener('click', () => {
            const chosen = [...selectedExchangeIndices];
            selectedExchangeIndices = [];
            sendGameCommand('complete_exchange', { selectedIndices: chosen });
          });
        }
      } else {
        container.innerHTML = `
          <div class="reaction-panel" style="border-color: #a3e635;">
            <div>🔄 ${
              lang === 'ar'
                ? `${escapeHtml(actor ? actor.name : '')} يبدل بطاقاته مع الكومة...`
                : `${escapeHtml(actor ? actor.name : '')} is exchanging cards...`
            }</div>
          </div>
        `;
      }
      return;
    }

    if (state.state === 'AWAITING_ACTION_REACTION' && state.pendingAction) {
      const act = state.pendingAction;
      const actor = state.players.find((p) => p.id === act.actorId);
      const target = act.targetId ? state.players.find((p) => p.id === act.targetId) : null;
      const spec = window.CoupGameEngine.ACTIONS[act.type];
      const eligibleIds = state.eligibleActionReactors || [];
      const canIReact = me && me.alive && eligibleIds.includes(me.id);
      const haveIPassed = state.passedPlayerIds.includes(myPlayerId);

      const canChallenge = canIReact && spec.challengeable && act.actorId !== myPlayerId;
      const canBlock =
        canIReact &&
        spec.blockableBy.length > 0 &&
        (spec.anyPlayerCanBlock || act.targetId === myPlayerId);

      const blockButtonsHtml = canBlock
        ? spec.blockableBy
            .map((role) => {
              const rMeta = ROLE_META[role];
              return `
                <button class="react-btn block btn-do-block" data-block-role="${role}">
                  🛡️ ${lang === 'ar' ? `صد بـ ${rMeta.ar}` : `Block (${rMeta.en})`}
                </button>
              `;
            })
            .join('')
        : '';

      container.innerHTML = `
        <div class="reaction-panel">
          <div style="font-weight: 900; font-size: 1.02rem; color: #fbbf24;">
            ⚡ ${
              lang === 'ar'
                ? `${escapeHtml(actor ? actor.name : '')} يلعب: ${act.type.toUpperCase()}${
                    target ? ` ضد ${escapeHtml(target.name)}` : ''
                  }`
                : `${escapeHtml(actor ? actor.name : '')} plays ${act.type.toUpperCase()}${
                    target ? ` on ${escapeHtml(target.name)}` : ''
                  }`
            }
          </div>

          ${
            canIReact
              ? `
                <div class="reaction-buttons-row">
                  <button class="react-btn pass" id="btn-pass-reaction" ${haveIPassed ? 'disabled' : ''}>
                    ✅ ${
                      haveIPassed
                        ? lang === 'ar'
                          ? 'تم التمرير...'
                          : 'Passed...'
                        : lang === 'ar'
                        ? 'موافقة (Pass)'
                        : 'Allow (Pass)'
                    }
                  </button>
                  ${
                    canChallenge
                      ? `<button class="react-btn challenge" id="btn-challenge-action">
                           🚨 ${lang === 'ar' ? 'تحدي (كشف الكذبة)!' : 'Challenge Bluff!'}
                         </button>`
                      : ''
                  }
                  ${blockButtonsHtml}
                </div>
              `
              : `<div style="font-size: 0.85rem; color: #cbd5e1;">
                   ⏳ ${lang === 'ar' ? 'بانتظار رد بقية اللاعبين...' : 'Waiting for other players...'}
                 </div>`
          }
        </div>
      `;

      const passBtn = el('btn-pass-reaction');
      if (passBtn) passBtn.addEventListener('click', () => sendGameCommand('pass_reaction'));

      const challBtn = el('btn-challenge-action');
      if (challBtn) challBtn.addEventListener('click', () => sendGameCommand('declare_challenge'));

      container.querySelectorAll('.btn-do-block').forEach((b) => {
        b.addEventListener('click', () => {
          sendGameCommand('declare_block', { claimedRole: b.getAttribute('data-block-role') });
        });
      });
      return;
    }

    if (state.state === 'AWAITING_BLOCK_REACTION' && state.pendingBlock) {
      const blk = state.pendingBlock;
      const blocker = state.players.find((p) => p.id === blk.blockerId);
      const eligibleIds = state.eligibleBlockReactors || [];
      const canIReact = me && me.alive && eligibleIds.includes(me.id);
      const haveIPassed = state.passedPlayerIds.includes(myPlayerId);
      const rMeta = ROLE_META[blk.claimedRole];

      container.innerHTML = `
        <div class="reaction-panel" style="border-color: #a855f7;">
          <div style="font-weight: 900; color: #e9d5ff;">
            🛡️ ${
              lang === 'ar'
                ? `${escapeHtml(blocker ? blocker.name : '')} يصد الحركة ببطاقة ${rMeta.ar}!`
                : `${escapeHtml(blocker ? blocker.name : '')} blocks with ${rMeta.en}!`
            }
          </div>
          ${
            canIReact
              ? `
                <div class="reaction-buttons-row">
                  <button class="react-btn pass" id="btn-accept-block" ${haveIPassed ? 'disabled' : ''}>
                    ✅ ${
                      haveIPassed
                        ? lang === 'ar'
                          ? 'تم القبول...'
                          : 'Accepted...'
                        : lang === 'ar'
                        ? 'قبول الصد (Pass)'
                        : 'Accept Block'
                    }
                  </button>
                  <button class="react-btn challenge" id="btn-challenge-block">
                    🚨 ${lang === 'ar' ? 'تحدي الصد (كذاب)!' : 'Challenge Block!'}
                  </button>
                </div>
              `
              : `<div style="font-size: 0.85rem; color: #cbd5e1;">
                   ⏳ ${lang === 'ar' ? 'بانتظار رد اللاعبين...' : 'Waiting for players...'}
                 </div>`
          }
        </div>
      `;

      const acceptBtn = el('btn-accept-block');
      if (acceptBtn) acceptBtn.addEventListener('click', () => sendGameCommand('pass_reaction'));

      const challBlkBtn = el('btn-challenge-block');
      if (challBlkBtn)
        challBlkBtn.addEventListener('click', () => sendGameCommand('declare_challenge'));
      return;
    }

    container.innerHTML = '';
  }

  function renderActionButtons(state, me, isMyTurn) {
    const panel = el('my-turn-actions-panel');
    const grid = el('actions-buttons-grid');
    const canAct = isMyTurn && state.state === 'TURN_START' && me && me.alive;

    // Hide the action buttons completely when it is NOT your turn so the screen stays 100% clean!
    if (!canAct) {
      panel.style.display = 'none';
      pendingTargetAction = null;
      return;
    }

    panel.style.display = 'block';
    const coins = me.coins;
    const mustCoup = coins >= 10;

    const actionItems = [
      {
        id: 'income',
        roleClass: 'role-general',
        nameAr: 'دخل (Income)',
        nameEn: 'Income',
        badgeAr: '+1 عملة',
        badgeEn: '+1 Coin',
        disabled: mustCoup,
        needsTarget: false,
      },
      {
        id: 'foreign_aid',
        roleClass: 'role-general',
        nameAr: 'مساعدة خارجية',
        nameEn: 'Foreign Aid',
        badgeAr: '+2 عملة',
        badgeEn: '+2 Coins',
        disabled: mustCoup,
        needsTarget: false,
      },
      {
        id: 'coup',
        roleClass: 'role-general',
        nameAr: '⚡ انقلاب (Coup)',
        nameEn: '⚡ Coup',
        badgeAr: '-7 عملات',
        badgeEn: '-7 Coins',
        disabled: coins < 7,
        needsTarget: true,
      },
      {
        id: 'tax',
        roleClass: 'role-duke',
        nameAr: '👑 الدوق (Tax)',
        nameEn: '👑 Tax (Duke)',
        badgeAr: '+3 عملات',
        badgeEn: '+3 Coins',
        disabled: mustCoup,
        needsTarget: false,
      },
      {
        id: 'assassinate',
        roleClass: 'role-assassin',
        nameAr: '🗡️ القاتل',
        nameEn: '🗡️ Assassinate',
        badgeAr: '-3 عملات',
        badgeEn: '-3 Coins',
        disabled: mustCoup || coins < 3,
        needsTarget: true,
      },
      {
        id: 'steal',
        roleClass: 'role-captain',
        nameAr: '⚓ القبطان (سرقة)',
        nameEn: '⚓ Steal (Captain)',
        badgeAr: 'سرقة 2 🪙',
        badgeEn: 'Steal 2 🪙',
        disabled:
          mustCoup || !state.players.some((p) => p.alive && p.id !== myPlayerId && p.coins > 0),
        needsTarget: true,
      },
      {
        id: 'exchange',
        roleClass: 'role-ambassador',
        nameAr: '🔄 السفير (تبديل)',
        nameEn: '🔄 Exchange',
        badgeAr: 'تبديل بطاقتين',
        badgeEn: 'Swap 2 Cards',
        disabled: mustCoup,
        needsTarget: false,
      },
    ];

    grid.innerHTML = actionItems
      .map(
        (item) => `
        <button class="action-btn ${item.roleClass}"
                data-action-id="${item.id}"
                data-needs-target="${item.needsTarget}"
                ${item.disabled ? 'disabled' : ''}
                style="${
                  pendingTargetAction === item.id ? 'border-color: #ef4444; background: rgba(127,29,29,0.45);' : ''
                }">
          <span class="action-btn-name">${lang === 'ar' ? item.nameAr : item.nameEn}</span>
          <span class="action-btn-badge">${lang === 'ar' ? item.badgeAr : item.badgeEn}</span>
        </button>
      `
      )
      .join('');

    grid.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const actionId = btn.getAttribute('data-action-id');
        const needsTarget = btn.getAttribute('data-needs-target') === 'true';

        if (!needsTarget) {
          pendingTargetAction = null;
          el('target-instruction-badge').style.display = 'none';
          sendGameCommand('declare_action', { actionId });
          return;
        }

        const validTargets = state.players.filter(
          (p) => p.alive && p.id !== myPlayerId && (actionId !== 'steal' || p.coins > 0)
        );
        if (validTargets.length === 1) {
          pendingTargetAction = null;
          el('target-instruction-badge').style.display = 'none';
          sendGameCommand('declare_action', { actionId, targetId: validTargets[0].id });
          return;
        }

        pendingTargetAction = actionId;
        const badge = el('target-instruction-badge');
        badge.style.display = 'inline-block';
        badge.textContent =
          lang === 'ar' ? '👆 اضغط على اللاعب المستهدف في الأعلى' : '👆 Click a player above to target';
        renderGameBoard(state);
      });
    });
  }

  function showReactionToast({ playerName, playerColor, emoji, text }) {
    const container = el('toast-container');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'reaction-toast';
    item.innerHTML = `
      <span style="font-size: 1.3rem;">${escapeHtml(emoji || '💬')}</span>
      <div>
        <div style="font-size: 0.75rem; color: ${playerColor || '#38bdf8'};">${escapeHtml(playerName || 'Player')}</div>
        <div style="font-size: 0.85rem;">${escapeHtml(text || '')}</div>
      </div>
    `;
    container.appendChild(item);
    sfx.card();
    setTimeout(() => item.remove(), 3500);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ================= INIT & LISTENERS =================
  window.addEventListener('DOMContentLoaded', () => {
    initTransport();

    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      activeTab = 'join';
      el('input-room-code').value = urlRoom.toUpperCase().slice(0, 6);
    } else if (window.location.pathname.includes('/join')) {
      activeTab = 'join';
    }

    if (myPlayerName) el('input-player-name').value = myPlayerName;
    applyLanguage();

    if (urlRoom) {
      const cleanRoom = urlRoom.toUpperCase().slice(0, 6);
      el('home-sub-title').textContent =
        lang === 'ar'
          ? `تمت دعوتك للغرفة ${cleanRoom} — اكتب اسمك واضغط انضمام!`
          : `You were invited to room ${cleanRoom} — enter your name to join!`;
      setTimeout(() => el('input-player-name').focus(), 100);
    }

    // Settings Dropdown Toggle
    el('btn-toggle-settings').addEventListener('click', (e) => {
      e.stopPropagation();
      el('settings-menu').classList.toggle('open');
    });

    // Emoji Popover Toggle
    el('btn-toggle-emojis').addEventListener('click', (e) => {
      e.stopPropagation();
      el('emoji-popover').classList.toggle('open');
    });

    document.addEventListener('click', () => {
      el('settings-menu').classList.remove('open');
      const ep = el('emoji-popover');
      if (ep) ep.classList.remove('open');
    });

    el('settings-menu').addEventListener('click', (e) => e.stopPropagation());

    // Language Switch
    el('btn-toggle-lang').addEventListener('click', () => {
      lang = lang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('coup_lang', lang);
      applyLanguage();
    });

    // Card Style Switch
    el('btn-toggle-card-style').addEventListener('click', () => {
      cardStyle = cardStyle === 'original' ? 'hd' : 'original';
      localStorage.setItem('coup_card_style', cardStyle);
      updateCardStyleLabel();
      if (roomState) renderRoomState(roomState);
    });

    // Sound Toggle
    el('btn-toggle-sound').addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      el('sound-icon').textContent = sfx.enabled
        ? lang === 'ar'
          ? 'مفعّل'
          : 'ON'
        : lang === 'ar'
        ? 'صامت'
        : 'OFF';
      if (sfx.enabled) sfx.coin();
    });

    // Modals
    el('btn-open-rules').addEventListener('click', () => el('modal-rules').classList.add('open'));
    el('btn-open-cheatsheet').addEventListener('click', () =>
      el('modal-cheatsheet').classList.add('open')
    );
    el('btn-open-log').addEventListener('click', () => el('modal-log').classList.add('open'));
    el('btn-open-credits').addEventListener('click', () => {
      el('settings-menu').classList.remove('open');
      el('modal-credits').classList.add('open');
    });

    function shareGameUrl(customRoomCode) {
      const baseUrl = window.location.href.split('?')[0].split('#')[0];
      const shareUrl = customRoomCode ? `${baseUrl}?room=${customRoomCode}` : baseUrl;
      const shareText = customRoomCode
        ? lang === 'ar'
          ? `تعال العب معي لعبة COUP أونلاين! كود الغرفة: ${customRoomCode}\n${shareUrl}`
          : `Join my COUP Online room! Code: ${customRoomCode}\n${shareUrl}`
        : lang === 'ar'
        ? `العب لعبة COUP الخداع الجماعية أونلاين مجاناً مع أصدقائك:\n${shareUrl}`
        : `Play COUP Online with friends for free:\n${shareUrl}`;

      if (navigator.share) {
        navigator
          .share({
            title: 'COUP Online — ObaiTech',
            text: shareText,
            url: shareUrl,
          })
          .catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl);
        showReactionToast({
          playerName: 'ObaiTech',
          playerColor: '#d946ef',
          emoji: '📣',
          text: lang === 'ar' ? 'تم نسخ رابط اللعبة! أرسله لأصدقائك' : 'Game link copied!',
        });
      }
    }

    el('btn-share-game').addEventListener('click', () => {
      el('settings-menu').classList.remove('open');
      shareGameUrl(roomState ? roomState.roomCode : null);
    });
    el('btn-home-share').addEventListener('click', () => shareGameUrl(null));

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        el(btn.getAttribute('data-close-modal')).classList.remove('open');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    });

    // Clicking fan cards opens Card Inspector for that specific card!
    document.querySelectorAll('#hero-card-fan .fan-card').forEach((fc) => {
      fc.addEventListener('click', () => openCardInspector(fc.getAttribute('data-role')));
    });

    // Home Tabs
    el('tab-create').addEventListener('click', () => {
      activeTab = 'create';
      updateHomeTabUI();
    });
    el('tab-join').addEventListener('click', () => {
      activeTab = 'join';
      updateHomeTabUI();
    });

    // Create / Join Submit
    el('btn-submit-room').addEventListener('click', () => {
      sfx.init();
      const nameVal =
        el('input-player-name').value.trim() || (lang === 'ar' ? 'أبي (Obai)' : 'Obai');
      myPlayerName = nameVal;
      localStorage.setItem('coup_player_name', nameVal);

      if (activeTab === 'create') {
        if (transportMode === 'socketio' && socket && socket.connected) {
          socket.emit('create_room', { playerName: nameVal, playerId: myPlayerId }, (res) => {
            if (res && res.error) showHomeError(res.error);
          });
        } else {
          createP2PRoom(nameVal, false);
        }
      } else {
        const codeVal = el('input-room-code').value.trim().toUpperCase();
        if (codeVal.length < 4) {
          showHomeError(lang === 'ar' ? 'أدخل كود الغرفة المكون من 6 أحرف' : 'Enter 6-char room code');
          return;
        }
        if (transportMode === 'socketio' && socket && socket.connected) {
          socket.emit(
            'join_room',
            { roomCode: codeVal, playerName: nameVal, playerId: myPlayerId },
            (res) => {
              if (res && res.error) {
                showHomeError(
                  lang === 'ar' ? 'الغرفة غير موجودة أو بدأت اللعبة' : `Error: ${res.error}`
                );
              }
            }
          );
        } else {
          joinP2PRoom(codeVal, nameVal);
        }
      }
    });

    // Quick Practice vs Bots
    el('btn-quick-bot-match').addEventListener('click', () => {
      sfx.init();
      const nameVal =
        el('input-player-name').value.trim() || (lang === 'ar' ? 'أبي (Obai)' : 'Obai');
      myPlayerName = nameVal;
      localStorage.setItem('coup_player_name', nameVal);
      createP2PRoom(nameVal, true);
    });

    // Lobby Controls
    el('btn-copy-code').addEventListener('click', () => {
      if (!roomState) return;
      navigator.clipboard.writeText(roomState.roomCode);
      showReactionToast({
        playerName: 'System',
        playerColor: '#10b981',
        emoji: '📋',
        text: lang === 'ar' ? `تم نسخ الكود: ${roomState.roomCode}` : `Copied: ${roomState.roomCode}`,
      });
    });

    el('btn-copy-link').addEventListener('click', () => {
      if (!roomState) return;
      const baseUrl = window.location.href.split('?')[0].split('#')[0];
      const url = `${baseUrl}?room=${roomState.roomCode}`;
      navigator.clipboard.writeText(url);
      showReactionToast({
        playerName: 'System',
        playerColor: '#38bdf8',
        emoji: '🔗',
        text: lang === 'ar' ? 'تم نسخ رابط الدعوة!' : 'Invite link copied!',
      });
    });

    el('btn-whatsapp-invite').addEventListener('click', () => {
      if (!roomState) return;
      const baseUrl = window.location.href.split('?')[0].split('#')[0];
      const url = `${baseUrl}?room=${roomState.roomCode}`;
      const msg =
        lang === 'ar'
          ? `تعال العب معي لعبة COUP أونلاين! 🔥\nكود الغرفة: ${roomState.roomCode}\nاضغط للانضمام فوراً: ${url}`
          : `Join my COUP Online game! 🔥\nRoom Code: ${roomState.roomCode}\nJoin here: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    });

    el('btn-add-bot').addEventListener('click', () => sendGameCommand('add_bot'));

    el('btn-shuffle-order').addEventListener('click', () => {
      if (!roomState) return;
      const ids = roomState.players.map((p) => p.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      sendGameCommand('reorder_players', { orderIds: ids });
    });

    el('btn-start-game').addEventListener('click', () => sendGameCommand('start_game'));

    el('btn-leave-lobby').addEventListener('click', () => {
      localRoom = null;
      roomState = null;
      showScreen('screen-home');
    });

    el('btn-home-logo').addEventListener('click', () => {
      if (!roomState || confirm(lang === 'ar' ? 'العودة للصفحة الرئيسية؟' : 'Leave game?')) {
        localRoom = null;
        roomState = null;
        showScreen('screen-home');
      }
    });

    // Emoji Reactions
    document.querySelectorAll('#emoji-popover .emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        el('emoji-popover').classList.remove('open');
        sendGameCommand('send_reaction', {
          emoji: btn.getAttribute('data-emoji'),
          text: btn.getAttribute('data-text'),
        });
      });
    });
  });
})();

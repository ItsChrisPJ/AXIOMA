// =========================================================
//  AXIOMA — renderer.js
//  Controlador de Modos, LocalStorage y Motor Dual (Gemini/Groq)
// =========================================================

import { oponentes, inquisidorTopics } from './data/bosses.js';
import {
    initAudio,
    configureAudio,
    playSound,
    playTypeSound,
    startBGM,
    stopBGM,
    updateBgmTension
} from './multimedia/audio.js';

const screens = {
    menu:     document.getElementById('menu-screen'),
    settings: document.getElementById('settings-screen'),
    profile:  document.getElementById('profile-screen'),
    mode:     document.getElementById('mode-screen'),
    boss:     document.getElementById('boss-screen'),
    thesis:   document.getElementById('thesis-screen'),
    battle:   document.getElementById('battle-screen'),
    summary:  document.getElementById('summary-modal')
};

const btnGotoProfile   = document.getElementById('btn-goto-profile');
const toggleBgm        = document.getElementById('toggle-bgm');
const perkCards        = document.querySelectorAll('.perk-card');

const topicInput       = document.getElementById('topic-input');
const thesisSubtitle   = document.getElementById('thesis-subtitle');
const bossCards        = document.querySelectorAll('.boss-selectable');
const btnConfirmBoss   = document.getElementById('btn-confirm-boss');
const btnStartBattle   = document.getElementById('start-battle-btn');
const chatLog          = document.getElementById('chat-log');
const argumentInput    = document.getElementById('argument-input');
const attackBtn        = document.getElementById('attack-btn');
const playerHealthFill = document.getElementById('player-health-fill');
const aiHealthFill     = document.getElementById('ai-health-fill');
const aiNameLabel      = document.getElementById('ai-name-label');
const pauseModal       = document.getElementById('pause-modal');

// --- VARIABLES DE ESTADO Y MODOS ---
let playerHP = 100;
let aiHP = 100;
let currentTopic = "";
let isAiThinking = false;
let selectedBoss = null;

let gameRule = 'standard';  // standard, blitz, inquisidor, sudden_death, gauntlet, espejo, silencio, debate_ciego, eco, caos
let blitzTimer = null;
let blitzTimeLeft = 30;
let cooldownTimer = null;
let silencioTimer = null;
let lastPlayerText = "";
let gauntletQueue = [];
let gauntletIndex = 0;



let API_KEYS = { gemini: "", groq: "" };
let soundEnabled = true;
let masterVolume = 0.5;
let keyboardShortcut = 'enter';
let uiScale = '100';
let showGrid = true;
let showScanlines = true;
let bgmEnabled = true;

// RPG Progression variables
let playerWins = 0;
let playerLosses = 0;
let playerMaxStreak = 0;
let playerCurrentStreak = 0;
let playerXp = 0;
let playerLevel = 1;
let unlockedAchievements = [];
let matchAchievementsUnlocked = [];

let playerName = 'DEBATIENTE';
let playerBio = 'Novicio en el arte de la dialéctica.';
let playerTheme = 'neutral';
let playerAvatar = '';
let playerFeaturedBadge = '';

const achievementsDef = [
    { id: 'ach_first_debate', title: 'Inicio Dialéctico', desc: 'Inicia tu primer debate en la arena.', icon: '💬' },
    { id: 'ach_first_win', title: 'Iniciación Lógica', desc: 'Gana tu primer debate en el cuadrilátero.', icon: '🎓' },
    { id: 'ach_karen', title: 'Cazador de Karens', desc: 'Silencia los reclamos indignados de Karen.', icon: '💁‍♀️' },
    { id: 'ach_perfect', title: 'Victoria Impecable', desc: 'Gana un debate sin que dañen tu credibilidad.', icon: '🌟' },
    { id: 'ach_gauntlet', title: 'Maestro del Guantelete', desc: 'Supera a tres jefes consecutivos sin regenerar salud.', icon: '🛡️' },
    { id: 'ach_blind', title: 'Debate a Ciegas', desc: 'Derrota a un oponente con el HUD de vida invisible.', icon: '👁️' },
    { id: 'ach_level_5', title: 'Deidad del Logos', desc: 'Alcanza el nivel 5 de Debatiente.', icon: '⚡' }
];

const skillNodesDef = {
    log1: { id: 'log1', name: 'Ockham I', desc: 'La explicación más simple suele ser la correcta. Aumenta tu daño base en combate en un 10%.', cost: 1, req: null, branch: 'logic', icon: '🪒' },
    log2: { id: 'log2', name: 'Ockham II', desc: 'Refinamiento lógico de tus premisas. Aumenta tu daño base en combate en un 20% (reemplaza Ockham I).', cost: 1, req: 'log1', branch: 'logic', icon: '📐' },
    log3: { id: 'log3', name: 'Hombre de Hierro', desc: 'Síntesis constructiva de los argumentos del rival. Recuperas 5 de Credibilidad cada vez que infliges daño significativo.', cost: 2, req: 'log2', branch: 'logic', icon: '⛓️' },
    
    ret1: { id: 'ret1', name: 'Elocuencia I', desc: 'Léxico fluido. Reduce el daño por eco mental (palabras repetidas) en un 25%.', cost: 1, req: null, branch: 'rhetoric', icon: '💬' },
    ret2: { id: 'ret2', name: 'Elocuencia II', desc: 'Dominio oratorio absoluto. Reduce el daño por eco mental en un 50% (reemplaza Elocuencia I).', cost: 1, req: 'ret1', branch: 'rhetoric', icon: '🗣️' },
    ret3: { id: 'ret3', name: 'Reductio Absurdum', desc: 'Habilidad de llevar al oponente a contradicciones obvias. El rival recibe un 15% más de daño de todos tus ataques.', cost: 2, req: 'ret2', branch: 'rhetoric', icon: '🌀' },
    
    res1: { id: 'res1', name: 'Estoico I', desc: 'Control emocional ante falacias. Reduce todo el daño que recibes en combate en un 10%.', cost: 1, req: null, branch: 'defense', icon: '🛡️' },
    res2: { id: 'res2', name: 'Estoico II', desc: 'Fortaleza dialéctica impenetrable. Reduce todo el daño que recibes en combate en un 20% (reemplaza Estoico I).', cost: 1, req: 'res1', branch: 'defense', icon: '🏰' },
    res3: { id: 'res3', name: 'Mente Clara', desc: 'Lógica templada en momentos de prisa. Añade 10 segundos extra al temporizador en el Modo Blitz.', cost: 2, req: 'res2', branch: 'defense', icon: '⏳' }
};

let unlockedSkills = [];
let selectedNodeId = null;

// --- VARIABLES Y CONFIGURACIÓN DEL MAZO DIALÉCTICO ---
const tacticsPool = {
    ockham: {
        id: 'ockham',
        name: 'Navaja de Ockham',
        desc: 'Escribe menos de 60 caracteres.',
        effectDesc: 'Daño infligido +40%',
        icon: '🪒',
        check: (arg) => arg.length < 60
    },
    steelman: {
        id: 'steelman',
        name: 'Steelmanning',
        desc: 'Empieza con: "Entiendo que", "Es cierto que" o "Comprendo".',
        effectDesc: 'Cura 15 Credibilidad (HP)',
        icon: '⛓️',
        check: (arg) => {
            const l = arg.toLowerCase().trim();
            return l.startsWith('entiendo que') || l.startsWith('es cierto que') || l.startsWith('comprendo tu') || l.startsWith('comprendo que') || l.startsWith('comprendo');
        }
    },
    evidence: {
        id: 'evidence',
        name: 'Evidencia Empírica',
        desc: 'Incluye al menos una cifra o porcentaje.',
        effectDesc: 'Daño +20% e ignora defensas',
        icon: '📊',
        check: (arg) => /\d+%?/.test(arg)
    },
    absurdum: {
        id: 'absurdum',
        name: 'Reductio',
        desc: 'Termina el argumento con un signo de interrogación (?).',
        effectDesc: 'Daño +15% y debilita al oponente',
        icon: '🌀',
        check: (arg) => arg.trim().endsWith('?')
    },
    smoke: {
        id: 'smoke',
        name: 'Cortina de Humo',
        desc: 'Usa al menos 3 palabras de 10 o más letras.',
        effectDesc: 'Daño recibido -50% el próximo turno',
        icon: '🌫️',
        check: (arg) => {
            const words = arg.split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")).filter(w => w.length >= 10);
            return words.length >= 3;
        }
    }
};

let deckHand = [];
let selectedTactic = null;
let activeSmokeScreen = false;
let activeAbsurdumVulnerability = false;

function drawInitialDeckHand() {
    deckHand = [];
    selectedTactic = null;
    const keys = Object.keys(tacticsPool);
    while (deckHand.length < 3) {
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        if (!deckHand.includes(randKey)) {
            deckHand.push(randKey);
        }
    }
    renderDeckHand();
}

function renderDeckHand() {
    const deckContainer = document.getElementById('dialectical-deck');
    if (!deckContainer) return;
    deckContainer.innerHTML = '';
    
    deckHand.forEach(tacticId => {
        const tactic = tacticsPool[tacticId];
        if (!tactic) return;
        
        const card = document.createElement('div');
        card.className = `tactical-card ${selectedTactic === tacticId ? 'active-selected' : ''}`;
        card.dataset.tactic = tacticId;
        card.innerHTML = `
            <div class="card-header">
                <span class="card-icon">${tactic.icon}</span>
                <span class="card-title">${tactic.name}</span>
            </div>
            <div class="card-condition">${tactic.desc}</div>
            <div class="card-effect">${tactic.effectDesc}</div>
        `;
        
        card.addEventListener('click', () => {
            if (isAiThinking || playerHP <= 0 || aiHP <= 0) return;
            if (selectedTactic === tacticId) {
                selectedTactic = null;
            } else {
                selectedTactic = tacticId;
            }
            playSound('click');
            renderDeckHand();
        });
        
        deckContainer.appendChild(card);
    });
}

function replaceUsedCard(tacticId) {
    const index = deckHand.indexOf(tacticId);
    if (index > -1) {
        const keys = Object.keys(tacticsPool);
        let randKey = keys[Math.floor(Math.random() * keys.length)];
        let attempts = 0;
        while (deckHand.includes(randKey) && attempts < 10) {
            randKey = keys[Math.floor(Math.random() * keys.length)];
            attempts++;
        }
        deckHand[index] = randKey;
    }
    selectedTactic = null;
    renderDeckHand();
}




function getRankTitle(level) {
    if (level >= 10) return "Deidad del Logos";
    if (level >= 7) return "Tribuno Racional";
    if (level >= 5) return "Destructor de Falacias";
    if (level >= 3) return "Refutador Escéptico";
    return "Novicio Lógico";
}

function getXpNeeded(level) {
    return level * 100;
}

function loadProfile() {
    playerWins = parseInt(localStorage.getItem('axioma_wins') || '0');
    playerLosses = parseInt(localStorage.getItem('axioma_losses') || '0');
    playerMaxStreak = parseInt(localStorage.getItem('axioma_max_streak') || '0');
    playerCurrentStreak = parseInt(localStorage.getItem('axioma_current_streak') || '0');
    playerXp = parseInt(localStorage.getItem('axioma_xp') || '0');
    playerLevel = parseInt(localStorage.getItem('axioma_level') || '1');
    
    playerName = localStorage.getItem('axioma_player_name') || 'DEBATIENTE';
    playerBio = localStorage.getItem('axioma_player_bio') || 'Novicio en el arte de la dialéctica.';
    playerTheme = localStorage.getItem('axioma_player_theme') || 'neutral';
    playerAvatar = localStorage.getItem('axioma_player_avatar') || '';
    playerFeaturedBadge = localStorage.getItem('axioma_featured_badge') || '';
    
    try {
        unlockedAchievements = JSON.parse(localStorage.getItem('axioma_achievements') || '[]');
    } catch(e) {
        unlockedAchievements = [];
    }
    
    try {
        unlockedSkills = JSON.parse(localStorage.getItem('axioma_skills') || '[]');
    } catch(e) {
        unlockedSkills = [];
    }
    
    const total = playerWins + playerLosses;
    const accuracy = total > 0 ? Math.round((playerWins / total) * 100) : 100;
    
    document.getElementById('stat-wins').innerText = playerWins;
    document.getElementById('stat-losses').innerText = playerLosses;
    document.getElementById('stat-accuracy').innerText = `${accuracy}%`;
    document.getElementById('stat-streak').innerText = playerMaxStreak;
    
    const xpNeeded = getXpNeeded(playerLevel);
    document.getElementById('profile-rank-title').innerText = `${getRankTitle(playerLevel)} (Niv. ${playerLevel})`;
    document.getElementById('profile-xp-current').innerText = playerXp;
    document.getElementById('profile-xp-next').innerText = xpNeeded;
    
    const xpPct = Math.min(100, Math.round((playerXp / xpNeeded) * 100));
    document.getElementById('profile-xp-fill').style.width = `${xpPct}%`;
    
    // Sincronizar previsualización del perfil
    document.getElementById('profile-name-display').innerText = playerName;
    document.getElementById('profile-bio-display').innerText = `"${playerBio}"`;
    
    // Set theme CSS custom property
    const themeColors = {
        neutral: 'var(--accent-politico)',
        academico: 'var(--accent-academico)',
        politico: 'var(--accent-politico)',
        barrio: 'var(--accent-barrio)',
        sofista: 'var(--accent-sofista)',
        guru: 'var(--accent-guru)',
        ejecutivo: 'var(--accent-ejecutivo)',
        troll: 'var(--accent-troll)',
        conspira: 'var(--accent-conspira)'
    };
    const layout = document.querySelector('.profile-layout');
    if (layout) {
        layout.style.setProperty('--theme-accent', themeColors[playerTheme] || themeColors.neutral);
    }
    
    // Sincronizar campos de edición
    document.getElementById('profile-name-input').value = playerName;
    document.getElementById('profile-bio-input').value = playerBio;
    document.getElementById('profile-theme-select').value = playerTheme;
    
    // Avatar
    const avatarDisplay = document.getElementById('profile-avatar-display');
    if (playerAvatar) {
        avatarDisplay.innerHTML = `<img src="${playerAvatar}">`;
    } else {
        avatarDisplay.innerHTML = '👤';
    }
    
    // Poblar dropdown de insignia destacada
    const badgeSelect = document.getElementById('profile-badge-select');
    badgeSelect.innerHTML = '<option value="">Ninguna Insignia</option>';
    
    achievementsDef.forEach(ach => {
        if (unlockedAchievements.includes(ach.id)) {
            const opt = document.createElement('option');
            opt.value = ach.id;
            opt.innerText = `${ach.icon} ${ach.title}`;
            badgeSelect.appendChild(opt);
        }
    });
    badgeSelect.value = playerFeaturedBadge;
    
    // Actualizar insignia destacada en la cabecera
    const badgeDisplay = document.getElementById('profile-featured-badge-display');
    if (playerFeaturedBadge) {
        const ach = achievementsDef.find(a => a.id === playerFeaturedBadge);
        if (ach && unlockedAchievements.includes(playerFeaturedBadge)) {
            badgeDisplay.querySelector('.badge-icon').innerText = ach.icon;
            badgeDisplay.querySelector('.badge-title').innerText = ach.title;
            badgeDisplay.style.display = 'inline-flex';
        } else {
            badgeDisplay.style.display = 'none';
        }
    } else {
        badgeDisplay.style.display = 'none';
    }

    // Logros en el contenedor
    const container = document.getElementById('achievements-container');
    container.innerHTML = '';
    
    achievementsDef.forEach(ach => {
        const isUnlocked = unlockedAchievements.includes(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
        
        card.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-info">
                <span class="achievement-title">${ach.title}</span>
                <span class="achievement-desc">${ach.desc}</span>
            </div>
        `;
        container.appendChild(card);
    });
    updateSkillTreeUI();
}

function updateSkillTreeUI() {
    const totalPointsEarned = playerLevel - 1;
    let spentPoints = 0;
    unlockedSkills.forEach(nodeId => {
        const def = skillNodesDef[nodeId];
        if (def) spentPoints += def.cost;
    });
    const availablePoints = Math.max(0, totalPointsEarned - spentPoints);
    const availablePointsEl = document.getElementById('skill-points-available');
    if (availablePointsEl) availablePointsEl.innerText = availablePoints;

    document.querySelectorAll('.skill-node-card').forEach(card => {
        const nodeId = card.dataset.node;
        const def = skillNodesDef[nodeId];
        if (!def) return;

        card.classList.remove('locked', 'available', 'unlocked', 'selected-active');

        if (selectedNodeId === nodeId) {
            card.classList.add('selected-active');
        }

        if (unlockedSkills.includes(nodeId)) {
            card.classList.add('unlocked');
        } else {
            const isReqMet = !def.req || unlockedSkills.includes(def.req);
            if (isReqMet) {
                card.classList.add('available');
            } else {
                card.classList.add('locked');
            }
        }
    });

    const panelIcon = document.getElementById('detail-node-icon');
    const panelName = document.getElementById('detail-node-name');
    const panelBranch = document.getElementById('detail-node-branch');
    const panelCost = document.getElementById('detail-node-cost');
    const panelDesc = document.getElementById('detail-node-desc');
    const btnUnlock = document.getElementById('btn-unlock-node');

    if (panelIcon && panelName && panelBranch && panelCost && panelDesc && btnUnlock) {
        if (selectedNodeId) {
            const def = skillNodesDef[selectedNodeId];
            if (def) {
                panelIcon.innerText = def.icon;
                panelName.innerText = def.name;
                
                const branches = { logic: 'Rama de Lógica', rhetoric: 'Rama de Retórica', defense: 'Rama de Resistencia' };
                panelBranch.innerText = branches[def.branch] || 'Rama Desconocida';
                panelBranch.style.color = def.branch === 'logic' ? 'var(--accent-academico)' : (def.branch === 'rhetoric' ? 'var(--accent-politico)' : 'var(--accent-barrio)');
                
                panelCost.innerText = `COSTO: ${def.cost} PUNTO${def.cost > 1 ? 'S' : ''}`;
                panelDesc.innerText = def.desc;

                const isUnlocked = unlockedSkills.includes(selectedNodeId);
                const isReqMet = !def.req || unlockedSkills.includes(def.req);
                
                if (isUnlocked) {
                    btnUnlock.innerText = "Habilidad Adquirida";
                    btnUnlock.disabled = true;
                } else if (!isReqMet) {
                    btnUnlock.innerText = "Bloqueado (Requiere nivel anterior)";
                    btnUnlock.disabled = true;
                } else if (availablePoints < def.cost) {
                    btnUnlock.innerText = `Puntos Insuficientes (Requiere ${def.cost})`;
                    btnUnlock.disabled = true;
                } else {
                    btnUnlock.innerText = `Adquirir Habilidad por ${def.cost} Punto${def.cost > 1 ? 's' : ''}`;
                    btnUnlock.disabled = false;
                }
            }
        } else {
            panelIcon.innerText = '❓';
            panelName.innerText = 'Selecciona una Habilidad';
            panelBranch.innerText = 'Haz clic en cualquier nodo para ver sus detalles';
            panelBranch.style.color = 'var(--text-muted)';
            panelCost.innerText = 'COSTO: -';
            panelDesc.innerText = 'Desbloquea habilidades en el árbol gastando tus puntos de Logos obtenidos al subir de nivel.';
            btnUnlock.innerText = 'Adquirir Habilidad';
            btnUnlock.disabled = true;
        }
    }
}

function updateActivePerksUI() {
    const listContainer = document.getElementById('active-perks-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    const activePerks = [];
    
    // Check nodes and add to active list
    if (unlockedSkills.includes('log2')) {
        activePerks.push({ icon: '📐', name: 'Ockham II', desc: 'Refinamiento lógico de tus premisas. Aumenta tu daño base en combate en un 20%.' });
    } else if (unlockedSkills.includes('log1')) {
        activePerks.push({ icon: '🪒', name: 'Ockham I', desc: 'La explicación más simple suele ser la correcta. Aumenta tu daño base en combate en un 10%.' });
    }
    
    if (unlockedSkills.includes('log3')) {
        activePerks.push({ icon: '⛓️', name: 'Hombre de Hierro', desc: 'Síntesis constructiva. Recuperas 5 de Credibilidad cada vez que infliges daño significativo.' });
    }
    
    if (unlockedSkills.includes('ret2')) {
        activePerks.push({ icon: '🗣️', name: 'Elocuencia II', desc: 'Dominio oratorio absoluto. Reduce el daño por eco mental en un 50%.' });
    } else if (unlockedSkills.includes('ret1')) {
        activePerks.push({ icon: '💬', name: 'Elocuencia I', desc: 'Léxico fluido. Reduce el daño por eco mental en un 25%.' });
    }
    
    if (unlockedSkills.includes('ret3')) {
        activePerks.push({ icon: '🌀', name: 'Reductio Absurdum', desc: 'Llevar al rival al absurdo. El oponente recibe un 15% más de daño.' });
    }
    
    if (unlockedSkills.includes('res2')) {
        activePerks.push({ icon: '🏰', name: 'Estoico II', desc: 'Fortaleza dialéctica impenetrable. Reduce todo el daño recibido en un 20%.' });
    } else if (unlockedSkills.includes('res1')) {
        activePerks.push({ icon: '🛡️', name: 'Estoico I', desc: 'Control emocional ante falacias. Reduce todo el daño recibido en un 10%.' });
    }
    
    if (unlockedSkills.includes('res3')) {
        activePerks.push({ icon: '⏳', name: 'Mente Clara', desc: 'Lógica templada en prisa. Otorga +10 segundos en el Modo Blitz.' });
    }
    
    if (activePerks.length === 0) {
        listContainer.innerHTML = `
            <div style="grid-column: span 3; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem; padding: 20px; border: 1px dashed var(--border-dim); background: var(--bg-void);">
                NINGUNA VENTAJA ACTIVA.<br>DESBLOQUEA HABILIDADES EN LA SECCIÓN "PERFIL Y LOGROS" GASTANDO PUNTOS DE LOGOS.
            </div>
        `;
    } else {
        activePerks.forEach(perk => {
            const card = document.createElement('div');
            card.className = 'perk-card selected';
            card.style.cursor = 'default';
            card.innerHTML = `
                <div class="perk-icon-box">${perk.icon}</div>
                <div class="perk-info">
                    <span class="perk-name">${perk.name}</span>
                    <span class="perk-desc">${perk.desc}</span>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }
}

function initSkillTree() {
    // Listeners de Pestañas del Perfil
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
            
            btn.classList.add('active');
            const tabId = `profile-tab-${btn.dataset.tab}`;
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.remove('hidden');
            playSound('click');
        });
    });

    // Listeners de los Nodos del Árbol de Habilidades
    document.querySelectorAll('.skill-node-card').forEach(card => {
        card.addEventListener('click', () => {
            const nodeId = card.dataset.node;
            const def = skillNodesDef[nodeId];
            if (!def) return;
            
            const isReqMet = !def.req || unlockedSkills.includes(def.req);
            const isUnlocked = unlockedSkills.includes(nodeId);
            
            if (isReqMet || isUnlocked) {
                selectedNodeId = nodeId;
                playSound('click');
                updateSkillTreeUI();
            }
        });
    });

    // Botón para adquirir nodo
    const btnUnlockNode = document.getElementById('btn-unlock-node');
    if (btnUnlockNode) {
        btnUnlockNode.addEventListener('click', () => {
            if (!selectedNodeId) return;
            const def = skillNodesDef[selectedNodeId];
            if (!def) return;
            
            const totalPointsEarned = playerLevel - 1;
            let spentPoints = 0;
            unlockedSkills.forEach(id => {
                const node = skillNodesDef[id];
                if (node) spentPoints += node.cost;
            });
            const availablePoints = Math.max(0, totalPointsEarned - spentPoints);
            
            const isUnlocked = unlockedSkills.includes(selectedNodeId);
            const isReqMet = !def.req || unlockedSkills.includes(def.req);
            
            if (!isUnlocked && isReqMet && availablePoints >= def.cost) {
                unlockedSkills.push(selectedNodeId);
                saveProfile();
                playSound('success');
                updateSkillTreeUI();
            }
        });
    }

    // Botón para restablecer el árbol
    const btnResetSkills = document.getElementById('btn-reset-skills');
    if (btnResetSkills) {
        btnResetSkills.addEventListener('click', () => {
            if (unlockedSkills.length === 0) return;
            
            if (confirm('¿Estás seguro de que quieres restablecer todo tu árbol de habilidades? Recuperarás todos tus puntos.')) {
                unlockedSkills = [];
                selectedNodeId = null;
                saveProfile();
                playSound('click');
                updateSkillTreeUI();
            }
        });
    }
}


function saveProfile() {
    localStorage.setItem('axioma_wins', playerWins);
    localStorage.setItem('axioma_losses', playerLosses);
    localStorage.setItem('axioma_max_streak', playerMaxStreak);
    localStorage.setItem('axioma_current_streak', playerCurrentStreak);
    localStorage.setItem('axioma_xp', playerXp);
    localStorage.setItem('axioma_level', playerLevel);
    localStorage.setItem('axioma_achievements', JSON.stringify(unlockedAchievements));
}

function unlockAchievement(id) {
    if (!unlockedAchievements.includes(id)) {
        unlockedAchievements.push(id);
        saveProfile();
        
        const ach = achievementsDef.find(a => a.id === id);
        if (ach) {
            playSound('success');
            
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.background = 'var(--bg-surface)';
            toast.style.border = '1px solid var(--accent-normal)';
            toast.style.padding = '15px';
            toast.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.3)';
            toast.style.zIndex = '999';
            toast.style.display = 'flex';
            toast.style.gap = '12px';
            toast.style.alignItems = 'center';
            toast.style.animation = 'slideIn 0.3s both';
            
            toast.innerHTML = `
                <div style="font-size: 2rem;">🏆</div>
                <div>
                    <div style="font-family: var(--font-mono); font-size: 0.6rem; color: var(--accent-normal); text-transform: uppercase;">¡Logro Desbloqueado!</div>
                    <div style="font-family: var(--font-display); font-size: 0.85rem; text-transform: uppercase; color: var(--text-primary); font-weight: bold;">${ach.title}</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted);">${ach.desc}</div>
                </div>
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'fadeUp 0.3s reverse both';
                setTimeout(() => {
                    if (toast.parentNode) document.body.removeChild(toast);
                }, 300);
            }, 4000);
        }
    }
}

function addXp(amount) {
    playerXp += amount;
    let leveledUp = false;
    
    while (playerXp >= getXpNeeded(playerLevel)) {
        playerXp -= getXpNeeded(playerLevel);
        playerLevel++;
        leveledUp = true;
    }
    
    saveProfile();
    
    if (leveledUp) {
        playSound('success');
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'var(--bg-surface)';
        toast.style.border = '1px solid var(--accent-politico)';
        toast.style.padding = '15px 30px';
        toast.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.4)';
        toast.style.zIndex = '999';
        toast.style.textAlign = 'center';
        toast.style.animation = 'slideIn 0.3s both';
        
        toast.innerHTML = `
            <div style="font-family: var(--font-display); font-size: 1.4rem; color: var(--accent-politico); letter-spacing: 0.2em; text-transform: uppercase; font-weight: bold;">¡Ascenso Lógico!</div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-primary); margin-top: 5px;">Has alcanzado el Nivel ${playerLevel}</div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeUp 0.3s reverse both';
            setTimeout(() => {
                if (toast.parentNode) document.body.removeChild(toast);
            }, 300);
        }, 3000);
        
        if (playerLevel >= 5) {
            unlockAchievement('ach_level_5');
        }
    }
}

function recordMatchResult(isWin) {
    playerWins = parseInt(localStorage.getItem('axioma_wins') || '0');
    playerLosses = parseInt(localStorage.getItem('axioma_losses') || '0');
    playerMaxStreak = parseInt(localStorage.getItem('axioma_max_streak') || '0');
    playerCurrentStreak = parseInt(localStorage.getItem('axioma_current_streak') || '0');
    playerXp = parseInt(localStorage.getItem('axioma_xp') || '0');
    playerLevel = parseInt(localStorage.getItem('axioma_level') || '1');
    try {
        unlockedAchievements = JSON.parse(localStorage.getItem('axioma_achievements') || '[]');
    } catch(e) {
        unlockedAchievements = [];
    }

    if (isWin) {
        playerWins++;
        playerCurrentStreak++;
        if (playerCurrentStreak > playerMaxStreak) {
            playerMaxStreak = playerCurrentStreak;
        }
        saveProfile();
        addXp(35);
        
        unlockAchievement('ach_first_win');
        if (selectedBoss && selectedBoss.name === "Karen") {
            unlockAchievement('ach_karen');
        }
        if (playerHP === 100) {
            unlockAchievement('ach_perfect');
        }
        if (gameRule === 'gauntlet') {
            unlockAchievement('ach_gauntlet');
        }
        if (gameRule === 'debate_ciego') {
            unlockAchievement('ach_blind');
        }
    } else {
        playerLosses++;
        playerCurrentStreak = 0;
        saveProfile();
        addXp(10);
    }
    
    saveProfile();
}

function showBattleSummary(isWin) {
    const outcomeText = document.getElementById('summary-outcome-text');
    if (isWin) {
        outcomeText.innerText = "VICTORIA LÓGICA";
        outcomeText.className = "summary-outcome win";
    } else {
        outcomeText.innerText = "DERROTA ARGUMENTATIVA";
        outcomeText.className = "summary-outcome loss";
    }
    
    document.getElementById('summary-boss-name').innerText = selectedBoss ? selectedBoss.name : "Debate";
    
    let modeText = "Estándar";
    if (gameRule === 'blitz') modeText = "Modo Blitz";
    else if (gameRule === 'inquisidor') modeText = "Inquisidor";
    else if (gameRule === 'sudden_death') modeText = "Muerte Súbita";
    else if (gameRule === 'gauntlet') modeText = "Guantelete";
    else if (gameRule === 'espejo') modeText = "Modo Espejo";
    else if (gameRule === 'silencio') modeText = "Silencio Administrativo";
    else if (gameRule === 'debate_ciego') modeText = "Debate Ciego";
    else if (gameRule === 'eco') modeText = "Eco Mental";
    else if (gameRule === 'caos') modeText = "Ruleta del Caos";
    document.getElementById('summary-game-mode').innerText = modeText;
    
    let perkText = "Ninguna";
    if (unlockedSkills.length > 0) {
        const activeNames = [];
        if (unlockedSkills.includes('log2')) activeNames.push('Ockham II');
        else if (unlockedSkills.includes('log1')) activeNames.push('Ockham I');
        if (unlockedSkills.includes('log3')) activeNames.push('Hombre de Hierro');
        if (unlockedSkills.includes('ret2')) activeNames.push('Elocuencia II');
        else if (unlockedSkills.includes('ret1')) activeNames.push('Elocuencia I');
        if (unlockedSkills.includes('ret3')) activeNames.push('Reductio Absurdum');
        if (unlockedSkills.includes('res2')) activeNames.push('Estoico II');
        else if (unlockedSkills.includes('res1')) activeNames.push('Estoico I');
        if (unlockedSkills.includes('res3')) activeNames.push('Mente Clara');
        perkText = activeNames.join(', ');
    }
    document.getElementById('summary-perk-name').innerText = perkText;
    
    document.getElementById('summary-xp-gained').innerText = isWin ? "+35 XP" : "+10 XP";
    document.getElementById('summary-final-hp').innerText = `${Math.max(0, playerHP)} / 100 HP`;
    
    const summaryUnlocks = document.getElementById('summary-unlocks-container');
    const summaryList = document.getElementById('summary-achievements-list');
    summaryList.innerHTML = '';
    
    if (matchAchievementsUnlocked.length > 0) {
        summaryUnlocks.style.display = 'block';
        matchAchievementsUnlocked.forEach(achId => {
            const ach = achievementsDef.find(a => a.id === achId);
            if (ach) {
                const div = document.createElement('div');
                div.className = 'summary-ach-toast';
                div.innerHTML = `<span style="font-size: 1.2rem;">🏆</span> <div><strong>${ach.title}</strong><br>${ach.desc}</div>`;
                summaryList.appendChild(div);
            }
        });
    } else {
        summaryUnlocks.style.display = 'none';
    }
    
    showScreen('summary');
}

// Bind summary buttons
document.getElementById('btn-summary-restart').addEventListener('click', () => {
    clearInterval(blitzTimer);
    clearInterval(cooldownTimer);
    clearInterval(silencioTimer);
    clearInterval(parryTimer);
    startBattleFlow();
});

document.getElementById('btn-summary-menu').addEventListener('click', () => {
    clearInterval(blitzTimer);
    clearInterval(cooldownTimer);
    clearInterval(silencioTimer);
    clearInterval(parryTimer);
    showScreen('menu');
});



// === SISTEMA DE PARTÍCULAS CANVAS ===
let canvas = null;
let ctx = null;
let particles = [];

function initCanvas() {
    canvas = document.getElementById('effects-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    requestAnimationFrame(animateParticles);
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= this.decay;
    }
    draw() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

function spawnExplosion(x, y, color) {
    if (!canvas) return;
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function animateParticles() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Safe reverse loop for splicing
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Add subtle ambient floating particles in the background
    if (particles.length < 35 && Math.random() < 0.15) {
        const x = Math.random() * canvas.width;
        const y = canvas.height + 10;
        const colors = ['rgba(99, 102, 241, 0.2)', 'rgba(168, 85, 247, 0.2)', 'rgba(34, 197, 94, 0.1)'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const p = new Particle(x, y, color);
        p.speedX = Math.random() * 0.4 - 0.2;
        p.speedY = -(Math.random() * 0.5 + 0.2); // float up
        p.size = Math.random() * 2 + 1;
        p.decay = Math.random() * 0.003 + 0.001;
        particles.push(p);
    }
    
    requestAnimationFrame(animateParticles);
}

setTimeout(initCanvas, 100);



function applyUiScale(scale) {
    let size = '100%';
    if (scale === '115') size = '115%';
    if (scale === '130') size = '130%';
    document.documentElement.style.fontSize = size;
}

function applyGrid(visible) {
    if (visible) {
        document.body.classList.remove('no-grid');
    } else {
        document.body.classList.add('no-grid');
    }
}

function applyScanlines(visible) {
    const scanlineEl = document.querySelector('.scanline');
    if (scanlineEl) {
        if (visible) {
            scanlineEl.classList.remove('hidden');
        } else {
            scanlineEl.classList.add('hidden');
        }
    }
}

function toggleFullscreen(enable) {
    if (enable) {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }
    } else {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
}

function loadAllSettings() {
    API_KEYS.gemini = localStorage.getItem('axioma_gemini') || "";
    API_KEYS.groq   = localStorage.getItem('axioma_groq') || "";
    document.getElementById('input-gemini').value = API_KEYS.gemini;
    document.getElementById('input-groq').value   = API_KEYS.groq;

    soundEnabled = localStorage.getItem('axioma_sound_enabled') !== 'false';
    document.getElementById('toggle-sound').checked = soundEnabled;

    bgmEnabled = localStorage.getItem('axioma_bgm_enabled') !== 'false';
    document.getElementById('toggle-bgm').checked = bgmEnabled;

    masterVolume = parseFloat(localStorage.getItem('axioma_master_volume') ?? '0.5');
    document.getElementById('slider-volume').value = masterVolume;

    configureAudio({ soundEnabled, bgmEnabled, masterVolume });

    keyboardShortcut = localStorage.getItem('axioma_keyboard_shortcut') || 'enter';
    const radioBtn = document.querySelector(`input[name="shortcut-send"][value="${keyboardShortcut}"]`);
    if (radioBtn) radioBtn.checked = true;

    uiScale = localStorage.getItem('axioma_ui_scale') || '100';
    document.getElementById('select-scale').value = uiScale;
    applyUiScale(uiScale);

    showGrid = localStorage.getItem('axioma_show_grid') !== 'false';
    document.getElementById('toggle-grid').checked = showGrid;
    applyGrid(showGrid);

    showScanlines = localStorage.getItem('axioma_show_scanlines') !== 'false';
    document.getElementById('toggle-scanlines').checked = showScanlines;
    applyScanlines(showScanlines);

    const isFullscreen = document.fullscreenElement !== null;
    document.getElementById('toggle-fullscreen').checked = isFullscreen;
}

document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || 
        e.target.closest('button') || 
        e.target.classList.contains('boss-card') || 
        e.target.classList.contains('boss-selectable') || 
        e.target.classList.contains('mode-card') ||
        e.target.classList.contains('perk-card') ||
        e.target.closest('.perk-card')) {
        playSound('click');
    }
    
    // Auto-resume BGM on user interaction
    startBGM();
});

document.addEventListener('fullscreenchange', () => {
    const toggle = document.getElementById('toggle-fullscreen');
    if (toggle) {
        toggle.checked = !!document.fullscreenElement;
    }
});

document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.add('hidden'));
        
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    });
});

document.getElementById('toggle-fullscreen').addEventListener('change', (e) => {
    toggleFullscreen(e.target.checked);
});

document.getElementById('select-scale').addEventListener('change', (e) => {
    uiScale = e.target.value;
    localStorage.setItem('axioma_ui_scale', uiScale);
    applyUiScale(uiScale);
});

document.getElementById('toggle-grid').addEventListener('change', (e) => {
    showGrid = e.target.checked;
    localStorage.setItem('axioma_show_grid', showGrid);
    applyGrid(showGrid);
});

document.getElementById('toggle-scanlines').addEventListener('change', (e) => {
    showScanlines = e.target.checked;
    localStorage.setItem('axioma_show_scanlines', showScanlines);
    applyScanlines(showScanlines);
});

document.getElementById('toggle-sound').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    localStorage.setItem('axioma_sound_enabled', soundEnabled);
    configureAudio({ soundEnabled });
});

document.getElementById('toggle-bgm').addEventListener('change', (e) => {
    bgmEnabled = e.target.checked;
    localStorage.setItem('axioma_bgm_enabled', bgmEnabled);
    configureAudio({ bgmEnabled });
});

document.getElementById('slider-volume').addEventListener('input', (e) => {
    masterVolume = parseFloat(e.target.value);
    localStorage.setItem('axioma_master_volume', masterVolume);
    configureAudio({ masterVolume });
});

document.getElementById('slider-volume').addEventListener('change', (e) => {
    playSound('click');
});

document.querySelectorAll('input[name="shortcut-send"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        keyboardShortcut = e.target.value;
        localStorage.setItem('axioma_keyboard_shortcut', keyboardShortcut);
    });
});

document.getElementById('btn-save-keys').addEventListener('click', () => {
    localStorage.setItem('axioma_gemini', document.getElementById('input-gemini').value.trim());
    localStorage.setItem('axioma_groq', document.getElementById('input-groq').value.trim());
    
    localStorage.setItem('axioma_ui_scale', document.getElementById('select-scale').value);
    localStorage.setItem('axioma_show_grid', document.getElementById('toggle-grid').checked);
    localStorage.setItem('axioma_show_scanlines', document.getElementById('toggle-scanlines').checked);
    localStorage.setItem('axioma_sound_enabled', document.getElementById('toggle-sound').checked);
    localStorage.setItem('axioma_bgm_enabled', document.getElementById('toggle-bgm').checked);
    localStorage.setItem('axioma_master_volume', document.getElementById('slider-volume').value);
    
    const selectedShortcut = document.querySelector('input[name="shortcut-send"]:checked');
    if (selectedShortcut) {
        localStorage.setItem('axioma_keyboard_shortcut', selectedShortcut.value);
    }
    
    loadAllSettings();
    const status = document.getElementById('settings-status');
    status.innerText = "Configuración guardada exitosamente.";
    setTimeout(() => status.innerText = "", 3000);
});

// Initialize Skill Tree and load settings
initSkillTree();
loadAllSettings();

argumentInput.addEventListener('input', playTypeSound);
topicInput.addEventListener('input', playTypeSound);

function initBossAvatars() {
    Object.keys(oponentes).forEach(bossKey => {
        const card = document.querySelector(`.boss-selectable[data-boss="${bossKey}"]`);
        if (card) {
            const svgIcon = card.querySelector('.svg-icon');
            if (svgIcon) {
                const container = document.createElement('div');
                container.className = 'boss-card-avatar';
                container.innerHTML = oponentes[bossKey].avatar || '';
                svgIcon.replaceWith(container);
            }
        }
    });
}
initBossAvatars();

// --- VALIDACIÓN DE APIS DE MOTOR ---
async function testGeminiKey(key) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }]
        })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Error HTTP ${response.status}`);
    }
    return true;
}

async function testGroqKey(key) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1
        })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Error HTTP ${response.status}`);
    }
    return true;
}

document.getElementById('btn-test-gemini').addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-gemini');
    const input = document.getElementById('input-gemini');
    const resultDiv = document.getElementById('gemini-test-result');
    const key = input.value.trim();

    if (!key) {
        resultDiv.className = "test-result-msg error";
        resultDiv.innerText = "Ingresa una API key primero.";
        return;
    }

    btn.disabled = true;
    btn.innerText = "Probando...";
    resultDiv.className = "test-result-msg";
    resultDiv.innerText = "Estableciendo conexión...";

    try {
        await testGeminiKey(key);
        resultDiv.className = "test-result-msg success";
        resultDiv.innerText = "Conexión exitosa ✔";
    } catch (err) {
        resultDiv.className = "test-result-msg error";
        resultDiv.innerText = `Error: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerText = "Probar";
    }
});

document.getElementById('btn-test-groq').addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-groq');
    const input = document.getElementById('input-groq');
    const resultDiv = document.getElementById('groq-test-result');
    const key = input.value.trim();

    if (!key) {
        resultDiv.className = "test-result-msg error";
        resultDiv.innerText = "Ingresa una API key primero.";
        return;
    }

    btn.disabled = true;
    btn.innerText = "Probando...";
    resultDiv.className = "test-result-msg";
    resultDiv.innerText = "Estableciendo conexión...";

    try {
        await testGroqKey(key);
        resultDiv.className = "test-result-msg success";
        resultDiv.innerText = "Conexión exitosa ✔";
    } catch (err) {
        resultDiv.className = "test-result-msg error";
        resultDiv.innerText = `Error: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerText = "Probar";
    }
});

document.getElementById('input-gemini').addEventListener('input', () => {
    document.getElementById('gemini-test-result').innerText = "";
});
document.getElementById('input-groq').addEventListener('input', () => {
    document.getElementById('groq-test-result').innerText = "";
});



function showScreen(targetName) {
    if (targetName === 'thesis') {
        updateActivePerksUI();
    }
    Object.values(screens).forEach(s => { s.classList.remove('visible'); s.classList.add('hidden'); });
    screens[targetName].classList.remove('hidden'); void screens[targetName].offsetWidth; screens[targetName].classList.add('visible');
}

document.getElementById('btn-goto-modes').addEventListener('click', () => showScreen('mode'));
btnGotoProfile.addEventListener('click', () => {
    loadProfile();
    showScreen('profile');
});
document.getElementById('btn-goto-settings').addEventListener('click', () => showScreen('settings'));
document.getElementById('btn-exit').addEventListener('click', () => window.close());
const backToMenuBtns = document.querySelectorAll('.back-to-menu');
console.log("AXIOMA: Encontrados botones back-to-menu:", backToMenuBtns.length);
backToMenuBtns.forEach(btn => btn.addEventListener('click', () => { 
    console.log("AXIOMA: Click en back-to-menu");
    clearInterval(blitzTimer); 
    clearInterval(cooldownTimer); 
    clearInterval(silencioTimer); 
    clearInterval(parryTimer); 
    updateBgmTension(); 
    showScreen('menu'); 
}));

document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        gameRule = card.dataset.rule;
        let flow = card.dataset.flow;

        if (flow === 'normal') {
            selectedBoss = oponentes.normal;
            thesisSubtitle.innerText = "Tu argumento de apertura:";
            topicInput.value = ''; topicInput.disabled = false;
            showScreen('thesis');
        } else if (flow === 'boss') {
            bossCards.forEach(c => c.classList.remove('selected'));
            selectedBoss = null; btnConfirmBoss.disabled = true;
            showScreen('boss');
        } else if (flow === 'gauntlet') {
            let bossKeys = Object.keys(oponentes).filter(k => k !== 'normal');
            gauntletQueue = bossKeys.sort(() => 0.5 - Math.random()).slice(0, 3).map(k => oponentes[k]);
            gauntletIndex = 0;
            selectedBoss = gauntletQueue[0];
            thesisSubtitle.innerText = "Preparación para el Guantelete:";
            topicInput.value = ''; topicInput.disabled = false;
            showScreen('thesis');
        }
    });
});

document.getElementById('btn-back-to-modes').addEventListener('click', () => showScreen('mode'));
document.getElementById('btn-back-from-thesis').addEventListener('click', () => {
    if (gameRule === 'gauntlet' || gameRule === 'standard' && selectedBoss === oponentes.normal) showScreen('mode');
    else showScreen('boss');
});

bossCards.forEach(card => {
    card.addEventListener('click', () => {
        bossCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedBoss = oponentes[card.dataset.boss];
        btnConfirmBoss.disabled = false; btnConfirmBoss.classList.add('ready');
    });
});

btnConfirmBoss.addEventListener('click', () => {
    if (gameRule === 'inquisidor') {
        currentTopic = inquisidorTopics[Math.floor(Math.random() * inquisidorTopics.length)];
        topicInput.value = currentTopic;
        topicInput.disabled = true;
        thesisSubtitle.innerText = "El sistema te ha asignado defender esto:";
        btnStartBattle.disabled = false; btnStartBattle.classList.add('ready');
    } else {
        topicInput.value = ''; topicInput.disabled = false;
        thesisSubtitle.innerText = "Tu argumento de apertura:";
        btnStartBattle.disabled = true; btnStartBattle.classList.remove('ready');
    }
    showScreen('thesis');
});

topicInput.addEventListener('input', () => {
    btnStartBattle.disabled = topicInput.value.trim().length < 4;
    btnStartBattle.classList.toggle('ready', topicInput.value.trim().length >= 4);
});

// --- FLUJO DE ARENA ---
function startBattleFlow() {
    if (selectedBoss.api === 'gemini' && !API_KEYS.gemini) return alert("Falta la API Key de Gemini en Ajustes.");
    if (selectedBoss.api === 'groq' && !API_KEYS.groq) return alert("Falta la API Key de Groq en Ajustes.");

    clearInterval(cooldownTimer);
    clearInterval(silencioTimer);
    isAiThinking = false;
    lastPlayerText = "";
    currentTopic = topicInput.value.trim();
    playerHP = (gameRule === 'sudden_death') ? 1 : 100;
    aiHP = (gameRule === 'sudden_death') ? 1 : 100;
    
    chatLog.innerHTML = '';
    playerHealthFill.style.width = '100%'; aiHealthFill.style.width = '100%';
    attackBtn.disabled = false; argumentInput.disabled = false; attackBtn.innerText = 'Atacar';

    // Manejo de clase de modo ciego
    const hud = document.querySelector('.hud');
    if (gameRule === 'debate_ciego') {
        hud.classList.add('blind');
    } else {
        hud.classList.remove('blind');
    }
    
    let bossDisplay = gameRule === 'gauntlet' ? `${selectedBoss.name} (Ronda 1/3)` : selectedBoss.name;
    aiNameLabel.innerText = bossDisplay;
    
    // Personalización en la batalla
    const pName = localStorage.getItem('axioma_player_name') || 'DEBATIENTE';
    const playerHealthLabel = document.getElementById('player-health-label');
    if (playerHealthLabel) {
        playerHealthLabel.innerText = `🧠 Credibilidad de ${pName}`;
    }
    
    const pAvatar = localStorage.getItem('axioma_player_avatar') || '';
    const playerHudAvatar = document.getElementById('hud-player-avatar');
    if (playerHudAvatar) {
        playerHudAvatar.innerHTML = pAvatar ? `<img src="${pAvatar}">` : '👤';
    }
    
    const aiHudAvatar = document.getElementById('hud-ai-avatar');
    if (aiHudAvatar) {
        aiHudAvatar.innerHTML = selectedBoss.avatar || '🤖';
    }
    
    unlockAchievement('ach_first_debate');
    
    // Inicializar estados de tácticas y mano del mazo
    activeSmokeScreen = false;
    activeAbsurdumVulnerability = false;
    drawInitialDeckHand();
    
    showScreen('battle');
    
    let sysMsg = gameRule === 'sudden_death' ? "[ MUERTE SÚBITA ACTIVADA - Un golpe letal ]" : `[ ARENA ABIERTA ] Tesis: "${currentTopic}"`;
    if (gameRule === 'silencio') sysMsg = "[ SILENCIO ADMINISTRATIVO - Daño pasivo activo ] " + sysMsg;
    if (gameRule === 'debate_ciego') sysMsg = "[ DEBATE CIEGO - HUD Oculto ] " + sysMsg;
    if (gameRule === 'eco') sysMsg = "[ ECO MENTAL - No repitas palabras ] " + sysMsg;
    if (gameRule === 'caos') sysMsg = "[ RULETA DEL CAOS - El jefe cambia por turno ] " + sysMsg;
    
    matchAchievementsUnlocked = [];
    screens.battle.classList.remove('low-hp');
    
    addMessage('system', sysMsg, () => {
        addMessage('ai', `[${selectedBoss.name}] Defenderás: "${currentTopic}". Ataca primero.`, () => {
            isAiThinking = false;
            attackBtn.disabled = false;
            argumentInput.disabled = false;
            attackBtn.innerText = 'Atacar';
            argumentInput.focus();
            if (gameRule === 'blitz') startBlitzTimer();
            else if (gameRule === 'silencio') startSilenceTimer();
            else { startPlayerCooldown(3); }
        });
    });
}

btnStartBattle.addEventListener('click', startBattleFlow);

// --- PAUSA Y EVENTOS NUEVOS ---
document.getElementById('btn-pause').addEventListener('click', () => { 
    console.log("AXIOMA: Click en btn-pause");
    clearInterval(blitzTimer); 
    clearInterval(cooldownTimer); 
    clearInterval(silencioTimer);
    clearInterval(parryTimer);
    pauseModal.classList.add('active'); 
});
document.getElementById('btn-resume').addEventListener('click', () => { 
    pauseModal.classList.remove('active'); 
    if (inParry) {
        startParryTimer();
    } else if (gameRule === 'blitz' && playerHP > 0 && !isAiThinking) {
        startBlitzTimer(); 
    } else if (gameRule === 'silencio' && playerHP > 0 && !isAiThinking) {
        startSilenceTimer();
    } else if (playerHP > 0 && aiHP > 0 && isAiThinking && attackBtn.innerText.includes('Cargando')) {
        let match = attackBtn.innerText.match(/\d+/);
        if (match) startPlayerCooldown(parseInt(match[0]));
    }
});

// Nuevo botón: Reiniciar Debate
document.getElementById('btn-restart').addEventListener('click', () => {
    pauseModal.classList.remove('active');
    clearInterval(blitzTimer);
    clearInterval(cooldownTimer);
    clearInterval(silencioTimer);
    clearInterval(parryTimer);
    inParry = false;
    startBattleFlow(); // Re-dispara la pelea con la misma tesis y el mismo jefe
});

document.getElementById('btn-surrender').addEventListener('click', () => { 
    clearInterval(blitzTimer); 
    clearInterval(cooldownTimer); 
    clearInterval(silencioTimer);
    clearInterval(parryTimer);
    inParry = false;
    pauseModal.classList.remove('active'); 
    updateBgmTension(); // Restablecer tensión
    showScreen('menu'); 
});

function triggerDamageFlash() {
    playSound('damage');
    screens.battle.classList.add('glitch-damage');
    setTimeout(() => screens.battle.classList.remove('glitch-damage'), 400);
}

function triggerSuccessFlash() {
    playSound('success');
    screens.battle.classList.add('glitch-success');
    setTimeout(() => screens.battle.classList.remove('glitch-success'), 400);
}

function startSilenceTimer() {
    clearInterval(silencioTimer);
    silencioTimer = setInterval(() => {
        if (playerHP > 0 && aiHP > 0 && !isAiThinking) {
            let silenceDmg = unlockedSkills.includes('res2') ? 1 : (unlockedSkills.includes('res1') ? 1.5 : 2);
            playerHP -= silenceDmg;
            updateHealth();
            if (playerHP <= 0) {
                clearInterval(silencioTimer);
            }
        }
    }, 1000);
}

function startPlayerCooldown(seconds) {
    isAiThinking = true; // Bloquea entradas durante el cooldown
    attackBtn.disabled = true;
    argumentInput.disabled = true;
    let timeLeft = seconds;
    attackBtn.innerText = `Cargando (${timeLeft}s)`;
    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(cooldownTimer);
            isAiThinking = false;
            attackBtn.disabled = false;
            argumentInput.disabled = false;
            attackBtn.innerText = 'Atacar';
            argumentInput.focus();
        } else {
            attackBtn.innerText = `Cargando (${timeLeft}s)`;
        }
    }, 1000);
}

function parseMarkdown(text) {
    // Escapar HTML para evitar XSS básico al renderizar HTML dinámico
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Bloques de código (```código```)
    html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
        return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
    });

    // Código en línea (`código`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negrita (**texto** o __texto__)
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');

    // Cursiva (*texto* o _texto_)
    html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
    html = html.replace(/_([\s\S]+?)_/g, '<em>$1</em>');

    // Listas con viñetas (- elemento o * elemento)
    let lines = html.split('\n');
    let inList = false;
    let processedLines = [];

    for (let line of lines) {
        let listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
        if (listMatch) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${listMatch[2]}</li>`);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            processedLines.push(line);
        }
    }
    if (inList) {
        processedLines.push('</ul>');
    }

    html = processedLines.join('\n');

    // Párrafos / Saltos de línea (respetando bloques pre)
    let parts = html.split(/(<pre[\s\S]*?<\/pre>)/);
    for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<pre')) {
            parts[i] = parts[i].replace(/\n/g, '<br>');
        }
    }
    html = parts.join('');

    return html;
}

function addMessage(speaker, text, callback) {
    const div = document.createElement('div');
    div.className = `message msg-${speaker}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;

    if (speaker === 'player') {
        div.innerHTML = parseMarkdown(text);
        chatLog.scrollTop = chatLog.scrollHeight;
        if (callback) callback();
    } else {
        let i = 0;
        const speed = speaker === 'system' ? 10 : 25;
        
        argumentInput.disabled = true;
        attackBtn.disabled = true;
        
        function type() {
            if (i < text.length) {
                div.innerText = text.substring(0, i + 1);
                chatLog.scrollTop = chatLog.scrollHeight;
                if (i % 2 === 0) {
                    playTypeSound();
                }
                i++;
                setTimeout(type, speed);
            } else {
                if (speaker === 'system') {
                    div.innerText = text;
                } else {
                    div.innerHTML = parseMarkdown(text);
                }
                chatLog.scrollTop = chatLog.scrollHeight;
                
                if (playerHP > 0 && aiHP > 0 && !isAiThinking) {
                    argumentInput.disabled = false;
                    attackBtn.disabled = false;
                }
                
                if (callback) callback();
            }
        }
        type();
    }
}

function updateHealth() {
    playerHealthFill.style.width = `${Math.max(0, playerHP)}%`; aiHealthFill.style.width = `${Math.max(0, aiHP)}%`;
    
    // Música reactiva: actualizar tensión del sintetizador
    updateBgmTension(playerHP);
    
    if (playerHP <= 30 && playerHP > 0) {
        screens.battle.classList.add('low-hp');
        playSound('warning');
    } else {
        screens.battle.classList.remove('low-hp');
    }
    
    if (playerHP <= 0) {
        clearInterval(blitzTimer);
        clearInterval(silencioTimer);
        clearInterval(parryTimer);
        inParry = false;
        updateBgmTension(); // Reset tensión
        playSound('defeat');
        recordMatchResult(false);
        setTimeout(() => showBattleSummary(false), 500);
    } else if (aiHP <= 0 && (gameRule !== 'gauntlet' || gauntletIndex >= 2)) {
        clearInterval(blitzTimer);
        clearInterval(silencioTimer);
        clearInterval(parryTimer);
        inParry = false;
        updateBgmTension(); // Reset tensión
        playSound('victory');
        recordMatchResult(true);
        setTimeout(() => showBattleSummary(true), 500);
    }
}

function startBlitzTimer() {
    clearInterval(blitzTimer); 
    blitzTimeLeft = unlockedSkills.includes('res3') ? 40 : 30;
    attackBtn.innerText = `Atacar (${blitzTimeLeft}s)`;
    blitzTimer = setInterval(() => {
        blitzTimeLeft--;
        attackBtn.innerText = `Atacar (${blitzTimeLeft}s)`;
        if (blitzTimeLeft <= 0) {
            clearInterval(blitzTimer);
            let blitzDmg = unlockedSkills.includes('res2') ? 16 : (unlockedSkills.includes('res1') ? 18 : 20);
            playerHP -= blitzDmg;
            addMessage('system', `[ BLITZ ] Tiempo agotado. Daño por silencio: ${blitzDmg}`, () => {
                triggerDamageFlash(); updateHealth();
                if (playerHP > 0) startBlitzTimer();
            });
        }
    }, 1000);
}

// --- MOTOR DUAL ---
async function attackAI(playerText) {
    isAiThinking = true; attackBtn.disabled = true; argumentInput.disabled = true;
    clearInterval(blitzTimer); 
    clearInterval(silencioTimer);
    clearInterval(parryTimer);
    attackBtn.innerText = "Analizando...";

    // Evaluar Táctica seleccionada
    let tacticBonusDamageMultiplier = 1;
    let tacticHealAmount = 0;
    let nextTurnSmokeScreen = false;
    let nextTurnAbsurdumVulnerability = false;
    let currentUsedTactic = selectedTactic;

    if (currentUsedTactic) {
        const tactic = tacticsPool[currentUsedTactic];
        if (tactic) {
            const success = tactic.check(playerText);
            if (success) {
                addMessage('system', `[ TÁCTICA EXITOSA: ${tactic.name.toUpperCase()} ] ¡Condición cumplida!`);
                if (currentUsedTactic === 'ockham') {
                    tacticBonusDamageMultiplier = 1.4;
                } else if (currentUsedTactic === 'steelman') {
                    tacticHealAmount = 15;
                } else if (currentUsedTactic === 'evidence') {
                    tacticBonusDamageMultiplier = 1.2;
                } else if (currentUsedTactic === 'absurdum') {
                    tacticBonusDamageMultiplier = 1.15;
                    nextTurnAbsurdumVulnerability = true;
                } else if (currentUsedTactic === 'smoke') {
                    nextTurnSmokeScreen = true;
                }
            } else {
                addMessage('system', `[ TÁCTICA FALLIDA: ${tactic.name.toUpperCase()} ] No cumpliste la condición.`);
            }
        }
        replaceUsedCard(currentUsedTactic);
    } else {
        renderDeckHand();
    }

    if (tacticHealAmount > 0) {
        playerHP = Math.min(100, playerHP + tacticHealAmount);
        updateHealth();
    }

    // Evaluar Eco Mental
    let ecoDamage = 0;
    if (gameRule === 'eco' && lastPlayerText) {
        const cleanWords = (txt) => txt.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(w => w.length > 3);
        const currentWords = cleanWords(playerText);
        const prevWords = cleanWords(lastPlayerText);
        
        if (currentWords.length > 0 && prevWords.length > 0) {
            const repeated = currentWords.filter(w => prevWords.includes(w));
            const ratio = repeated.length / currentWords.length;
            if (ratio >= 0.3) {
                ecoDamage = Math.round(ratio * 30);
                if (unlockedSkills.includes('ret2')) {
                    ecoDamage = Math.round(ecoDamage * 0.5);
                } else if (unlockedSkills.includes('ret1')) {
                    ecoDamage = Math.round(ecoDamage * 0.75);
                }
            }
        }
    }
    lastPlayerText = playerText;

    if (ecoDamage > 0) {
        playerHP -= ecoDamage;
        addMessage('system', `[ ECO MENTAL ] Repetición detectada. Daño por eco: ${ecoDamage}`, () => {
            triggerDamageFlash();
            updateHealth();
            if (playerHP <= 0) {
                isAiThinking = false;
                attackBtn.disabled = true;
                argumentInput.disabled = true;
                attackBtn.innerText = "Derrotado";
            }
        });
        if (playerHP <= 0) {
            return;
        }
    }
    
    const thinkingMsg = document.createElement('div');
    thinkingMsg.className = 'message msg-ai'; thinkingMsg.style.opacity = '0.4'; thinkingMsg.innerText = `[ Procesando lógica... ]`;
    chatLog.appendChild(thinkingMsg); chatLog.scrollTop = chatLog.scrollHeight;

    let promptText = selectedBoss.prompt;
    if (gameRule === 'espejo') {
        promptText += "\nREGLA DE MODO ESPEJO: Debes copiar la postura y tesis del usuario, pero exagerándola al extremo o usándola como contraargumento en su contra. Reconvierte sus propios razonamientos y úsalos como si fueran tuyos para atacarle.";
    }
    const finalSystemPrompt = `${promptText}\nReglas: Tema "${currentTopic}". Evalúa el argumento del usuario. Responde ÚNICAMENTE con un objeto JSON válido: {"daño_recibido": (1-30), "daño_infligido": (5-25), "respuesta_ia": "tu contraargumento", "falacia_cometida": "Ad Hominem" | "Hombre de Paja" | "Falsa Dicotomía" | "Ad Populum" | "Generalización Apresurada" | "Evadir la Cuestión" | "Ninguna"}`;

    try {
        let responseText = "";
        if (selectedBoss.api === "gemini") {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEYS.gemini}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: playerText }] }],
                    systemInstruction: { parts: [{ text: finalSystemPrompt }] },
                    generationConfig: { responseMimeType: "application/json" },
                    safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }]
                })
            });
            const data = await res.json();
            if (!data.candidates) throw new Error("API bloqueó la respuesta.");
            responseText = data.candidates[0].content.parts[0].text;
        } else {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST', headers: { 'Authorization': `Bearer ${API_KEYS.groq}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: "llama-3.1-8b-instant", response_format: { type: "json_object" }, messages: [{ role: "system", content: finalSystemPrompt }, { role: "user", content: playerText }] })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.choices[0].message.content;
        }

        if (thinkingMsg.parentNode) chatLog.removeChild(thinkingMsg);
        const result = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());

        let finalDmgRecibido = result.daño_recibido;
        if (unlockedSkills.includes('log2')) {
            finalDmgRecibido = Math.round(finalDmgRecibido * 1.2);
        } else if (unlockedSkills.includes('log1')) {
            finalDmgRecibido = Math.round(finalDmgRecibido * 1.1);
        }

        if (unlockedSkills.includes('ret3')) {
            finalDmgRecibido = Math.round(finalDmgRecibido * 1.15);
        }

        // Aplicar multiplicador de táctica
        finalDmgRecibido = Math.round(finalDmgRecibido * tacticBonusDamageMultiplier);

        // Aplicar vulnerabilidad por Reductio si estaba activa
        if (activeAbsurdumVulnerability) {
            finalDmgRecibido = Math.round(finalDmgRecibido * 1.2);
            activeAbsurdumVulnerability = false; // Consumida
        }

        // Hombre de Hierro (log3)
        if (unlockedSkills.includes('log3') && finalDmgRecibido > 10) {
            const healAmt = 5;
            playerHP = Math.min(100, playerHP + healAmt);
            addMessage('system', `[ HOMBRE DE HIERRO ] +${healAmt} Credibilidad (Sinergia de Síntesis)`);
        }

        if (gameRule === 'sudden_death') {
            if (finalDmgRecibido > 0) aiHP = 0;
            if (result.daño_infligido > 0) playerHP = 0;
        } else { aiHP -= finalDmgRecibido; }

        addMessage('system', `[ HIT ] Daño causado: ${gameRule === 'sudden_death' && aiHP === 0 ? 'LETAL' : finalDmgRecibido}`, () => {
            if (finalDmgRecibido > 0) triggerSuccessFlash();
            
            if (aiHP > 0 || gameRule === 'sudden_death') {
                setTimeout(() => {
                    addMessage('ai', result.respuesta_ia, () => {
                        let finalDmgInfligido = result.daño_infligido;
                        if (unlockedSkills.includes('res2')) {
                            finalDmgInfligido = Math.round(finalDmgInfligido * 0.8);
                        } else if (unlockedSkills.includes('res1')) {
                            finalDmgInfligido = Math.round(finalDmgInfligido * 0.9);
                        }
                        
                        // Aplicar Cortina de Humo (smoke card) de la jugada anterior del jugador
                        if (activeSmokeScreen) {
                            finalDmgInfligido = Math.round(finalDmgInfligido * 0.5);
                            activeSmokeScreen = false; // Consumida
                        }

                        // Emparejar y validar falacia cometida para Parry
                        const validFalacias = ["Ad Hominem", "Hombre de Paja", "Falsa Dicotomía", "Ad Populum", "Generalización Apresurada", "Evadir la Cuestión"];
                        let falaciaCorrecta = "Ninguna";
                        if (result.falacia_cometida) {
                            const found = validFalacias.find(f => f.toLowerCase() === result.falacia_cometida.toLowerCase());
                            if (found) falaciaCorrecta = found;
                        }

                        if (falaciaCorrecta !== "Ninguna" && finalDmgInfligido > 0) {
                            triggerParryPhase(falaciaCorrecta, finalDmgInfligido, () => {
                                postAiAttackFlow(nextTurnSmokeScreen, nextTurnAbsurdumVulnerability);
                            });
                        } else {
                            if (gameRule !== 'sudden_death') playerHP -= finalDmgInfligido;
                            
                            addMessage('system', `[ HIT ] Daño recibido: ${gameRule === 'sudden_death' && playerHP === 0 ? 'LETAL' : finalDmgInfligido}`, () => {
                                if (finalDmgInfligido > 0) triggerDamageFlash();
                                updateHealth();
                                postAiAttackFlow(nextTurnSmokeScreen, nextTurnAbsurdumVulnerability);
                            });
                        }
                    });
                }, 400);
            } else if (aiHP <= 0 && gameRule === 'gauntlet') {
                if (gauntletIndex < 2) {
                    gauntletIndex++; selectedBoss = gauntletQueue[gauntletIndex]; aiHP = 100;
                    aiNameLabel.innerText = `${selectedBoss.name} (Ronda ${gauntletIndex + 1}/3)`;
                    const aiHudAvatar = document.getElementById('hud-ai-avatar');
                    if (aiHudAvatar) {
                        aiHudAvatar.innerHTML = selectedBoss.avatar || '🤖';
                    }
                    addMessage('system', `[ GUANTELETE ] ¡Oponente derrotado! Entra a la arena: ${selectedBoss.name}`, () => {
                        updateHealth();
                        setTimeout(() => { startPlayerCooldown(3); }, 1000);
                    });
                } else { updateHealth(); }
            } else { updateHealth(); }
        });
    } catch (error) {
        if (thinkingMsg.parentNode) chatLog.removeChild(thinkingMsg);
        addMessage('system', `[ ERROR ] ${error.message}`);
        attackBtn.disabled = false; argumentInput.disabled = false; attackBtn.innerText = 'Atacar';
    } finally { isAiThinking = false; }
}

let parryTimer = null;
let inParry = false;
let parryTimeRemaining = 7000;
let activeParryFalacia = "";
let activeParryDamage = 0;
let activeParryOnComplete = null;
let activeParryBox = null;

function startParryTimer() {
    clearInterval(parryTimer);
    if (!activeParryBox) return;
    const timerFill = activeParryBox.querySelector('#parry-timer-fill');
    const countdownText = activeParryBox.querySelector('#parry-countdown-text');
    const updateRate = 100;
    
    parryTimer = setInterval(() => {
        parryTimeRemaining -= updateRate;
        const pct = Math.max(0, (parryTimeRemaining / 7000) * 100);
        if (timerFill) timerFill.style.width = `${pct}%`;
        if (countdownText) countdownText.innerText = `${(parryTimeRemaining / 1000).toFixed(1)}s`;

        if (parryTimeRemaining <= 0) {
            clearInterval(parryTimer);
            resolveActiveParry(false, "tiempo");
        }
    }, updateRate);
}

function resolveActiveParry(isSuccess, reason) {
    inParry = false;
    clearInterval(parryTimer);
    
    if (!activeParryBox) return;
    
    // Deshabilitar todos los botones
    activeParryBox.querySelectorAll('.parry-btn').forEach(btn => btn.disabled = true);

    if (isSuccess) {
        playSound('success');
        triggerSuccessFlash();
        
        // Parry exitoso: 0 daño al jugador, 10 daño al oponente
        aiHP = Math.max(0, aiHP - 10);
        activeParryBox.style.borderColor = 'rgba(34, 197, 94, 0.6)';
        activeParryBox.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.25)';
        activeParryBox.querySelector('.parry-prompt').innerHTML = `¡PARRY EXITOSO! Identificaste correctamente: "${activeParryFalacia}". Reflejas el ataque e infliges 10 de daño.`;
        
        const currentBox = activeParryBox;
        const onComplete = activeParryOnComplete;
        setTimeout(() => {
            currentBox.remove();
            addMessage('system', `[ PARRY ] Anulaste el daño y contraatacaste con 10 de daño.`, () => {
                updateHealth();
                isAiThinking = false;
                if (onComplete) onComplete();
            });
        }, 2000);
    } else {
        playSound('damage');
        triggerDamageFlash();

        // Parry fallido: recibe daño completo
        if (gameRule !== 'sudden_death') {
            playerHP -= activeParryDamage;
        } else {
            playerHP = 0; 
        }
        
        activeParryBox.style.borderColor = 'rgba(239, 68, 68, 0.6)';
        activeParryBox.querySelector('.parry-prompt').innerText = reason === "incorrecto" 
            ? `¡PARRY FALLIDO! Era "${activeParryFalacia}". Recibes el daño completo.`
            : `¡PARRY FALLIDO! Se agotó el tiempo. Recibes el daño completo.`;

        const currentBox = activeParryBox;
        const onComplete = activeParryOnComplete;
        const dmg = activeParryDamage;
        setTimeout(() => {
            currentBox.remove();
            addMessage('system', `[ HIT ] Daño recibido: ${gameRule === 'sudden_death' && playerHP === 0 ? 'LETAL' : dmg}`, () => {
                updateHealth();
                isAiThinking = false;
                if (onComplete) onComplete();
            });
        }, 2000);
    }
}

function triggerParryPhase(falaciaCorrecta, dañoPotencial, onComplete) {
    isAiThinking = true; 
    attackBtn.disabled = true;
    argumentInput.disabled = true;

    // Pausar todos los timers de juego
    clearInterval(blitzTimer);
    clearInterval(silencioTimer);
    clearInterval(cooldownTimer);
    clearInterval(parryTimer);

    playSound('warning');

    const parryBox = document.createElement('div');
    parryBox.className = 'parry-box';
    
    // Obtener dos falacias falsas aleatorias
    const falaciasPool = ["Ad Hominem", "Hombre de Paja", "Falsa Dicotomía", "Ad Populum", "Generalización Apresurada", "Evadir la Cuestión"];
    const falsas = falaciasPool.filter(f => f !== falaciaCorrecta).sort(() => 0.5 - Math.random()).slice(0, 2);
    const opciones = [falaciaCorrecta, ...falsas].sort(() => 0.5 - Math.random());

    parryBox.innerHTML = `
        <div class="parry-header">
            <span>🚨 DETECTOR DE FALACIAS ACTIVADO</span>
            <span id="parry-countdown-text">7.0s</span>
        </div>
        <div class="parry-timer-container">
            <div class="parry-timer-fill" id="parry-timer-fill" style="width: 100%;"></div>
        </div>
        <div class="parry-prompt">El detector de logos sospecha una falacia en la respuesta del oponente. Identifícala para realizar un PARRY.</div>
        <div class="parry-options">
            ${opciones.map(opt => `<button class="parry-btn" data-fallacy="${opt}">${opt}</button>`).join('')}
            <button class="parry-btn skip">Ignorar (Recibir daño)</button>
        </div>
    `;

    chatLog.appendChild(parryBox);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Configurar estado de parry global
    inParry = true;
    parryTimeRemaining = 7000;
    activeParryFalacia = falaciaCorrecta;
    activeParryDamage = dañoPotencial;
    activeParryOnComplete = onComplete;
    activeParryBox = parryBox;

    startParryTimer();

    parryBox.querySelectorAll('.parry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!inParry) return;
            const chosen = btn.dataset.fallacy;
            if (btn.classList.contains('skip')) {
                resolveActiveParry(false, "ignorar");
            } else if (chosen === falaciaCorrecta) {
                resolveActiveParry(true, "correcto");
            } else {
                resolveActiveParry(false, "incorrecto");
            }
        });
    });
}

function postAiAttackFlow(nextTurnSmokeScreen, nextTurnAbsurdumVulnerability) {
    if (nextTurnSmokeScreen) activeSmokeScreen = true;
    if (nextTurnAbsurdumVulnerability) activeAbsurdumVulnerability = true;

    if (playerHP > 0 && aiHP > 0) {
        if (gameRule === 'caos') {
            const bossKeys = Object.keys(oponentes).filter(k => k !== 'normal');
            const randomKey = bossKeys[Math.floor(Math.random() * bossKeys.length)];
            selectedBoss = oponentes[randomKey];
            aiNameLabel.innerText = `${selectedBoss.name} (Caos)`;
            const aiHudAvatar = document.getElementById('hud-ai-avatar');
            if (aiHudAvatar) {
                aiHudAvatar.innerHTML = selectedBoss.avatar || '🤖';
            }
            addMessage('system', `[ RULETA DEL CAOS ] La personalidad cambia a: ${selectedBoss.name}`);
        }

        renderDeckHand();
        if (gameRule === 'blitz') startBlitzTimer();
        else if (gameRule === 'silencio') startSilenceTimer();
        else { startPlayerCooldown(3); }
    }
}

attackBtn.addEventListener('click', () => {
    const arg = argumentInput.value.trim(); if (!arg || isAiThinking || playerHP <= 0 || aiHP <= 0) return;
    addMessage('player', arg); argumentInput.value = ''; attackAI(arg);
});
argumentInput.addEventListener('keydown', (e) => {
    if (keyboardShortcut === 'enter') {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault();
            if (!attackBtn.disabled) {
                attackBtn.click();
            }
        }
    } else {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (!attackBtn.disabled) {
                attackBtn.click();
            }
        }
    }
});

// =========================================================
//  SISTEMA DE PERSONALIZACIÓN DEL PERFIL
// =========================================================

function saveCustomProfile() {
    const nameInput = document.getElementById('profile-name-input').value.trim() || 'DEBATIENTE';
    const bioInput = document.getElementById('profile-bio-input').value.trim() || 'Novicio en el arte de la dialéctica.';
    const themeInput = document.getElementById('profile-theme-select').value;
    const badgeInput = document.getElementById('profile-badge-select').value;
    
    localStorage.setItem('axioma_player_name', nameInput);
    localStorage.setItem('axioma_player_bio', bioInput);
    localStorage.setItem('axioma_player_theme', themeInput);
    localStorage.setItem('axioma_featured_badge', badgeInput);
    
    playerName = nameInput;
    playerBio = bioInput;
    playerTheme = themeInput;
    playerFeaturedBadge = badgeInput;
    
    playSound('success');
    loadProfile();
    
    const statusMsg = document.getElementById('profile-status');
    statusMsg.innerText = "¡Perfil actualizado con éxito!";
    setTimeout(() => {
        statusMsg.innerText = "";
    }, 3000);
}

function resizeAndSaveAvatar(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const max_size = 128;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }
            } else {
                if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            localStorage.setItem('axioma_player_avatar', dataUrl);
            playerAvatar = dataUrl;
            
            document.getElementById('profile-avatar-display').innerHTML = `<img src="${dataUrl}">`;
            playSound('click');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Listeners de Personalización
document.getElementById('btn-save-profile').addEventListener('click', saveCustomProfile);

const btnUploadAvatar = document.getElementById('btn-upload-avatar');
const avatarUploadInput = document.getElementById('profile-avatar-upload');
const btnResetAvatar = document.getElementById('btn-reset-avatar');

if (btnUploadAvatar && avatarUploadInput) {
    btnUploadAvatar.addEventListener('click', () => avatarUploadInput.click());
    avatarUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            resizeAndSaveAvatar(file);
        }
    });
}

if (btnResetAvatar) {
    btnResetAvatar.addEventListener('click', () => {
        localStorage.removeItem('axioma_player_avatar');
        playerAvatar = '';
        document.getElementById('profile-avatar-display').innerHTML = '👤';
        playSound('click');
    });
}
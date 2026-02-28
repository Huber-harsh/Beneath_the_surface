const THOUGHTS = [
    "Everyone else is ahead of me.",
    "I’m running out of time.",
    "What if I choose the wrong path?",
    "They’re probably judging me.",
    "I should be better by now.",
    "Why is this so easy for everyone else?",
    "If I stop trying, at least I won’t fail.",
    "If I try and fail, it proves I’m not good enough.",
    "What if I peak too early?",
    "What if I never peak at all?",
    "I don’t even know who I am.",
    "I act different around different people — which one is the real me?",
    "If they knew the real me, would they still like me?",
    "What if I disappoint everyone?",
    "What if I’m just average?",
    "What if I’m not special?",
    "What if I care too much?",
    "What if I don’t care enough?",
    "Why does everything feel so intense?",
    "I'm not good enough.",
    "Everyone is judging me.",
    "I'll never succeed.",
    "Why am I like this?",
    "It's all my fault.",
    "I'm a burden.",
    "I'm so stupid.",
    "I don't belong here.",
    "I'm going to fail.",
    "I should just give up.",
    "Everything is too much."
];

const DEADLY_THOUGHTS = [
    "YOU ARE NOTHING",
    "GIVE UP NOW",
    "IT NEVER ENDS",
    "NO ONE CARES",
    "YOU ARE TRAPPED",
    "IT'S OVER"
];

let stability = 100;
let timeLeft = 60;
let playerX = 50;
let activeKeys = {};
let fallingThoughts = [];
let lastSpawn = 0;
let gameActive = false;
let timerId = null;
let animId = null;

let audioContext = null;
let droneGain = null;
let heartbeatTimer = null;

const intro = document.getElementById('intro-screen');
const game = document.getElementById('game-screen');
const gameBg = document.getElementById('game-bg');
const chaos = document.querySelector('.chaos-overlay');
const end = document.getElementById('end-screen');
const char = document.getElementById('player');
const world = document.getElementById('game-world');
const bar = document.getElementById('stability-bar-inner');
const clock = document.getElementById('timer-display');
const vignette = document.querySelector('.low-stability-vignette');

function init() {
    document.getElementById('start-btn').onclick = start;
    document.getElementById('retry-btn').onclick = start;
    document.getElementById('back-btn').onclick = () => {
        end.classList.add('hidden');
        intro.classList.remove('hidden');
    };
    document.getElementById('how-to-toggle').onclick = () => {
        document.getElementById('how-to-content').classList.toggle('hidden');
    };
    
    window.onkeydown = (e) => activeKeys[e.code] = true;
    window.onkeyup = (e) => activeKeys[e.code] = false;
}

function start() {
    gameActive = true;
    stability = 100;
    timeLeft = 60;
    playerX = 50;
    
    fallingThoughts.forEach(t => t.el.remove());
    fallingThoughts = [];
    
    intro.classList.add('hidden');
    end.classList.add('hidden');
    game.classList.remove('hidden');
    
    updateUI();
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        droneGain = audioContext.createGain();
        osc.frequency.value = 55;
        droneGain.gain.value = 0.04;
        osc.connect(droneGain);
        droneGain.connect(audioContext.destination);
        osc.start();
    }

    lastSpawn = performance.now();
    animId = requestAnimationFrame(loop);
    
    timerId = setInterval(() => {
        timeLeft--;
        clock.innerText = timeLeft;
        if (timeLeft <= 0) finish(true);
    }, 1000);

    startHeartbeat();
}

function startHeartbeat() {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    if (!gameActive) return;

    let interval = 1000;
    if (stability < 70) interval = 700;
    if (stability < 40) interval = 400;
    if (stability < 20) interval = 250;

    playHeartbeat();
    heartbeatTimer = setTimeout(startHeartbeat, interval);
}

function playHeartbeat() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const g = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioContext.currentTime + 0.1);
    g.gain.setValueAtTime(0.1, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    osc.connect(g);
    g.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
}

function loop(t) {
    if (!gameActive) return;

    if (activeKeys['KeyA'] || activeKeys['ArrowLeft']) playerX -= 0.8;
    if (activeKeys['KeyD'] || activeKeys['ArrowRight']) playerX += 0.8;
    if (playerX < 5) playerX = 5;
    if (playerX > 95) playerX = 95;
    char.style.left = playerX + '%';

    let progress = 1 - (timeLeft / 60);
    let rate = 1100 - (progress * 850);
    if (t - lastSpawn > rate) {
        spawn();
        lastSpawn = t;
    }

    let speed = 2.5 + (progress * 5);
    for (let i = fallingThoughts.length - 1; i >= 0; i--) {
        let th = fallingThoughts[i];
        
        let thSpeed = speed;
        if (th.isDeadly) thSpeed *= 1.6;
        if (th.isEcho) thSpeed *= 0.5;
        
        th.y += thSpeed;
        th.rot += th.rotSpeed;
        th.el.style.top = th.y + 'px';
        th.el.style.transform = `rotate(${th.rot}deg)`;

        if (th.isEcho) {
            th.opacity -= 0.001;
            th.el.style.opacity = th.opacity;
            if (th.opacity <= 0) {
                th.el.remove();
                fallingThoughts.splice(i, 1);
                continue;
            }
        }

        let pRect = char.getBoundingClientRect();
        let tRect = th.el.getBoundingClientRect();
        
        if (pRect.left + 18 < tRect.right && pRect.right - 18 > tRect.left &&
            pRect.top + 15 < tRect.bottom && pRect.bottom - 10 > tRect.top) {
            
            let damage = 10;
            if (th.isDeadly) damage = 18;
            if (th.isEcho) damage = 4;
            
            stability -= damage;
            if (stability < 0) stability = 0;
            updateUI();
            
            game.classList.remove('shake', 'strong-shake', 'glitch');
            void game.offsetWidth;
            game.classList.add(th.isDeadly ? 'strong-shake' : 'shake');
            if (th.isDeadly) game.classList.add('glitch');

            th.el.remove();
            fallingThoughts.splice(i, 1);
            
            if (stability <= 0) finish(false);
            continue;
        }

        if (th.y > window.innerHeight) {
            if (th.isDeadly && !th.isEcho) {
                spawnEcho(th.el.innerText, th.el.style.left);
            }
            th.el.remove();
            fallingThoughts.splice(i, 1);
        }
    }

    animId = requestAnimationFrame(loop);
}

function spawn() {
    let isDeadly = (timeLeft < 15) && Math.random() > 0.55;
    let txt = isDeadly ? DEADLY_THOUGHTS[Math.floor(Math.random() * DEADLY_THOUGHTS.length)] : THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
    
    let el = document.createElement('div');
    el.className = 'thought-block' + (isDeadly ? ' deadly-thought' : '');
    el.innerText = txt;
    world.appendChild(el);

    let x = Math.random() * (window.innerWidth - el.offsetWidth);
    el.style.left = x + 'px';
    el.style.top = '-80px';

    fallingThoughts.push({ 
        el, 
        y: -80, 
        isDeadly, 
        isEcho: false,
        rot: (Math.random() - 0.5) * 20,
        rotSpeed: (Math.random() - 0.5) * 2
    });
}

function spawnEcho(txt, x) {
    let el = document.createElement('div');
    el.className = 'thought-block echo-thought';
    el.innerText = txt;
    el.style.left = x;
    el.style.top = '-80px';
    world.appendChild(el);

    fallingThoughts.push({
        el,
        y: -80,
        isDeadly: false,
        isEcho: true,
        opacity: 0.2,
        rot: (Math.random() - 0.5) * 40,
        rotSpeed: (Math.random() - 0.5) * 1
    });
}

function updateUI() {
    bar.style.width = stability + '%';
    
    let s = stability / 100;
    
    // Smooth transition from dark obsidian to deep crimson
    let r = Math.floor(12 * s + (1 - s) * 40);
    let g = Math.floor(12 * s + (1 - s) * 10);
    let b = Math.floor(14 * s + (1 - s) * 10);
    gameBg.style.background = `rgb(${r}, ${g}, ${b})`;
    
    chaos.style.opacity = (1 - s) * 0.6;
    if (stability < 50) chaos.classList.add('chaos-active');
    else chaos.classList.remove('chaos-active');

    if (stability > 60) bar.style.backgroundColor = '#34c759';
    else if (stability > 30) bar.style.backgroundColor = '#f1c40f';
    else bar.style.backgroundColor = '#ff3b30';

    if (stability < 40) vignette.style.opacity = (40 - stability) / 40;
    else vignette.style.opacity = 0;
}

function finish(win) {
    gameActive = false;
    cancelAnimationFrame(animId);
    clearInterval(timerId);
    clearTimeout(heartbeatTimer);
    game.classList.add('hidden');
    end.classList.remove('hidden');
    
    const title = document.getElementById('end-title');
    const msg = document.getElementById('end-message');
    if (win) {
        end.className = 'screen win';
        title.innerText = "He Survived the Panic Attack";
        msg.innerText = "He made it through the storm — for now.";
    } else {
        end.className = 'screen lose';
        title.innerText = "He Collapsed Beneath the Surface";
        msg.innerText = "The weight became too heavy today.";
    }
}

init();

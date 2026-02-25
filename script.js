const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 400;

let player = { 
    x: 50, y: 350, w: 30, h: 30, baseH: 30, crouchH: 15,
    dx: 0, dy: 0, jump: -12, gravity: 0.6, 
    speed: 5, grounded: true, jumpsLeft: 2, 
    isCrouching: false, isDashing: false, dashTimer: 0, canDash: true,
    dashLag: 0, hasShield: false, scoreMult: 1, multTimer: 0
};

let obstacles = [];
let enemies = []; // New: Stompable enemies
let particles = [];
let trails = [];
let powerups = []; 
let score = 0;
let highScore = localStorage.getItem('runnerHighScore') || 0;
let gameActive = true;
let lastSpawnTime = 0;
let minSpawnInterval = 1000;
let keys = {};

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.color = color || `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.life = 1.0;
    }
    update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.03; }
    draw() {
        ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function spawnEntities(currentTime) {
    if (currentTime - lastSpawnTime > minSpawnInterval) {
        const rand = Math.random();
        if (rand < 0.05) {
            // 70% static obstacle, 30% stompable enemy
            if (Math.random() > 0.3) {
                let type = Math.random() > 0.7 ? 'high' : 'low';
                obstacles.push({ x: canvas.width, y: type === 'high' ? 300 : 350, w: 20, h: 30, type });
            } else {
                enemies.push({ x: canvas.width, y: 350, w: 30, h: 30 });
            }
            lastSpawnTime = currentTime;
            minSpawnInterval = Math.max(500, 1000 - (score / 15));
        }
        if (Math.random() < 0.003) {
            let pType = Math.random() > 0.5 ? 'shield' : 'mult';
            powerups.push({ x: canvas.width, y: 320, w: 20, h: 20, type: pType });
        }
    }
}

function update(currentTime) {
    if (!gameActive) {
        particles.forEach((p, i) => { p.update(); if (p.life <= 0) particles.splice(i, 1); });
        return;
    }

    // Movement & Dash Lag
    if (!player.isDashing && player.dashLag <= 0) {
        if (keys['ArrowRight']) player.x += player.speed;
        if (keys['ArrowLeft']) player.x -= player.speed;
    }

    if (player.isDashing) {
        trails.push({ x: player.x, y: player.y, w: player.w, h: player.h, life: 0.5 });
        player.dashTimer--;
        player.x += 15; 
        if (player.dashTimer <= 0) { player.isDashing = false; player.dashLag = 20; }
    } else {
        player.dy += player.gravity;
        player.y += player.dy;
        if (player.dashLag > 0) player.dashLag--;
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

    if (player.y + player.h > 380) {
        player.y = 380 - player.h; player.dy = 0; player.grounded = true;
        player.jumpsLeft = 2; player.canDash = true;
    }

    // Enemy Stomp Logic
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.x -= 5 + (score / 600);
        
        if (player.x < e.x + e.w && player.x + player.w > e.x && player.y < e.y + e.h && player.y + player.h > e.y) {
            // Check if falling onto the enemy's head
            if (player.dy > 0 && player.y + player.h < e.y + e.h / 2) {
                enemies.splice(i, 1);
                score += 50 * player.scoreMult;
                player.dy = -10; // Bounce up
                for (let j=0; j<10; j++) particles.push(new Particle(e.x, e.y, '#0099ff'));
            } else if (!player.hasShield) {
                gameOver();
            } else {
                player.hasShield = false;
                enemies.splice(i, 1);
            }
        }
        if (e.x + e.w < 0) enemies.splice(i, 1);
    }

    // Obstacle & Powerup collision (same as before)
    powerups.forEach((p, i) => {
        p.x -= 5;
        if (player.x < p.x + p.w && player.x + player.w > p.x && player.y < p.y + p.h && player.y + player.h > p.y) {
            if (p.type === 'shield') player.hasShield = true;
            else { player.scoreMult = 2; player.multTimer = 400; }
            powerups.splice(i, 1);
        }
    });

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= 6 + (score / 500);
        if (player.x < obs.x + obs.w && player.x + player.w > obs.x && player.y < obs.y + obs.h && player.y + player.h > obs.y) {
            if (player.hasShield) { player.hasShield = false; obstacles.splice(i, 1); }
            else gameOver();
        }
        if (obs.x + obs.w < 0) { obstacles.splice(i, 1); score += 10 * player.scoreMult; }
    }

    spawnEntities(currentTime);
    if (score > highScore) highScore = score;
    document.getElementById('score').innerText = `Score: ${score} | High: ${highScore}`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#444"; ctx.fillRect(0, 380, canvas.width, 20); // Floor

    trails.forEach(t => { ctx.globalAlpha = t.life; ctx.fillStyle = "#00ffff"; ctx.fillRect(t.x, t.y, t.w, t.h); });
    ctx.globalAlpha = 1.0;

    if (gameActive) {
        ctx.fillStyle = player.hasShield ? "#ffff00" : (player.scoreMult > 1 ? "#ff00ff" : (player.isDashing ? "#00ffff" : "#00ff00"));
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // Draw Enemies (Blue rectangles)
    enemies.forEach(e => {
        ctx.fillStyle = "#0099ff";
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.fillStyle = "white"; // "Eyes" for enemies
        ctx.fillRect(e.x + 5, e.y + 5, 5, 5); ctx.fillRect(e.x + 20, e.y + 5, 5, 5);
    });

    particles.forEach(p => p.draw());
    powerups.forEach(p => { 
        ctx.fillStyle = p.type === 'shield' ? "yellow" : "purple"; 
        ctx.beginPath(); ctx.arc(p.x+10, p.y+10, 10, 0, Math.PI*2); ctx.fill();
    });
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.type === 'high' ? "#ffaa00" : "#ff0000";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });
    requestAnimationFrame(drawLoop);
}

function drawLoop(time) { update(time); draw(); }

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    for (let i = 0; i < 30; i++) particles.push(new Particle(player.x + player.w/2, player.y + player.h/2));
    localStorage.setItem('runnerHighScore', highScore);
    setTimeout(() => location.reload(), 1000);
}

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && player.jumpsLeft > 0) {
        player.dy = player.jump; player.grounded = false; player.jumpsLeft--;
    }
    if (e.code === 'ArrowDown' && player.grounded) {
        player.isCrouching = true; player.h = player.crouchH; player.y = 380 - player.h;
    }
    if (e.code === 'ShiftLeft' && player.canDash && player.dashLag <= 0) {
        player.isDashing = true; player.dashTimer = 12; player.canDash = false; player.dy = 0;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'ArrowDown') {
        player.isCrouching = false; player.h = player.baseH; player.y = 380 - player.h;
    }
});

requestAnimationFrame(drawLoop);

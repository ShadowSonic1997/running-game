const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 400;

// Game State
let player = { 
    x: 50, y: 350, w: 30, h: 30, baseH: 30, crouchH: 15,
    dy: 0, jump: -12, gravity: 0.6, 
    grounded: true, jumpsLeft: 2, isCrouching: false,
    isDashing: false, dashTimer: 0
};
let obstacles = [];
let particles = []; // For death effect
let score = 0;
let highScore = localStorage.getItem('runnerHighScore') || 0;
let gameActive = true;
let lastSpawnTime = 0;
let minSpawnInterval = 1000;

// Particle Class for Explosion
class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.life = 1.0;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function spawnObstacle(currentTime) {
    if (currentTime - lastSpawnTime > minSpawnInterval) {
        if (Math.random() < 0.05) {
            let isFloating = Math.random() > 0.7;
            obstacles.push({
                x: canvas.width, y: isFloating ? 300 : 350,
                w: 20, h: 30, type: isFloating ? 'high' : 'low'
            });
            lastSpawnTime = currentTime;
            minSpawnInterval = Math.max(500, 1000 - (score / 10));
        }
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y));
    }
}

function update(currentTime) {
    if (!gameActive) {
        particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) particles.splice(i, 1);
        });
        return;
    }

    // Dash Logic
    if (player.isDashing) {
        player.dashTimer--;
        player.x += 10; // Rapid move forward
        if (player.dashTimer <= 0) {
            player.isDashing = false;
        }
    } else {
        // Normal Gravity (only if not dashing)
        player.dy += player.gravity;
        player.y += player.dy;
        if (player.x > 50) player.x -= 2; // Return to home position
    }
    
    // Grounding
    if (player.y + player.h > 380) {
        player.y = 380 - player.h;
        player.dy = 0;
        player.grounded = true;
        player.jumpsLeft = 2;
    }

    // Move & Collide
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= 6 + (score / 500);

        if (player.x < obs.x + obs.w && player.x + player.w > obs.x &&
            player.y < obs.y + obs.h && player.y + player.h > obs.y) {
            gameOver();
        }

        if (obs.x + obs.w < 0) { obstacles.splice(i, 1); score += 10; }
    }

    spawnObstacle(currentTime);
    if (score > highScore) highScore = score;
    document.getElementById('score').innerText = `Score: ${score} | High: ${highScore}`;
}

function draw(currentTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Environment
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 380, canvas.width, 20);

    // Draw Player
    if (gameActive) {
        ctx.fillStyle = player.isDashing ? "#00ffff" : (player.isCrouching ? "#00bb00" : "#00ff00");
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // Draw Particles
    particles.forEach(p => p.draw());

    // Draw Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.type === 'high' ? "#ffaa00" : "#ff0000";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });

    requestAnimationFrame(drawLoop);
}

function drawLoop(time) { update(time); draw(time); }

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    createExplosion(player.x + player.w/2, player.y + player.h/2);
    localStorage.setItem('runnerHighScore', highScore);
    setTimeout(() => location.reload(), 1000); // Reset after 1 second
}

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && player.jumpsLeft > 0) {
        player.dy = player.jump;
        player.grounded = false;
        player.jumpsLeft--;
    }
    if (e.code === 'ArrowDown' && player.grounded) {
        player.isCrouching = true; player.h = player.crouchH; player.y = 380 - player.h;
    }
    if (e.code === 'ShiftLeft' && !player.isDashing) {
        player.isDashing = true; player.dashTimer = 15; // 15 frames of dashing
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
        player.isCrouching = false; player.h = player.baseH; player.y = 380 - player.h;
    }
});

requestAnimationFrame(drawLoop);

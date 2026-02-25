const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 400;

let player = { x: 50, y: 350, w: 30, h: 30, dy: 0, jump: -12, gravity: 0.6, grounded: true };
let obstacles = [];
let score = 0;
let gameActive = true;

function spawnObstacle() {
    obstacles.push({ x: canvas.width, y: 350, w: 20, h: 30 });
}

function update() {
    if (!gameActive) return;
    
    // Jump Logic
    player.dy += player.gravity;
    player.y += player.dy;
    if (player.y + player.h > 380) { player.y = 380 - player.h; player.dy = 0; player.grounded = true; }

    // Move Obstacles
    obstacles.forEach((obs, i) => {
        obs.x -= 6 + (score / 500); // Speed up as score increases
        if (obs.x + obs.w < 0) { obstacles.splice(i, 1); score += 10; }
        
        // Collision
        if (player.x < obs.x + obs.w && player.x + player.w > obs.x && player.y < obs.y + obs.h && player.y + player.h > obs.y) {
            gameActive = false; alert("Game Over! Score: " + score); location.reload();
        }
    });

    if (Math.random() < 0.02) spawnObstacle();
    document.getElementById('score').innerText = "Score: " + score;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff00"; ctx.fillRect(player.x, player.y, player.w, player.h); // Player
    ctx.fillStyle = "#ff0000"; obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.w, obs.h)); // Obstacles
    requestAnimationFrame(() => { update(); draw(); });
}

window.addEventListener('keydown', (e) => { if (e.code === 'Space' && player.grounded) { player.dy = player.jump; player.grounded = false; } });
draw();

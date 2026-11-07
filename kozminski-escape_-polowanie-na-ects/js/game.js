/**
 * Kozminski Escape: Polowanie na ECTS
 * Główny silnik gry 2D - Akademia Leona Koźmińskiego w Warszawie
 */

(function () {
  'use strict';

  // Stałe gry
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 540;
  const TARGET_ECTS = 30;
  const MAX_STAMINA = 100;
  const STAMINA_DRAIN_RATE = 28; // na sekundę podczas sprintu
  const STAMINA_RECOVERY_RATE = 18; // na sekundę podczas marszu/stania
  const PLAYER_NORMAL_SPEED = 180;
  const PLAYER_SPRINT_SPEED = 285;
  const PROF_PATROL_SPEED = 105;
  const PROF_CHASE_SPEED = 165;

  // Strefy kampusu ALK (Jagiellońska 57/59)
  const CAMPUS_ZONES = [
    { name: 'Budynek A: Hol Główny i Rektorat', x: 20, y: 20, w: 230, h: 220, color: '#0d2544' },
    { name: 'Korytarz Kawiarni i Dziekanatu', x: 270, y: 20, w: 240, h: 220, color: '#091c33' },
    { name: 'Budynek C: Biblioteka ALK', x: 530, y: 20, w: 250, h: 220, color: '#0b233e' },
    { name: 'Zielone Patio ALK (Strefa Relaksu)', x: 120, y: 260, w: 560, h: 250, color: '#06261f' }
  ];

  // Kwestie surowego Profesora Egzaminatora
  const PROFESSOR_QUOTES = [
    '„Panie Kolego! Kolokwium zaraz się zaczyna, gdzie pan ucieka?!”',
    '„Wzór Blacka-Scholesa ma Pan opanowany, czy liczy Pan na cud?!”',
    '„Termin zerowy minął w zeszły wtorek! Proszę podejść do tablicy!”',
    '„Proszę schować smartfon i okazać legitymację studencką!”',
    '„Kto nie ma 30 ECTS, tego wita Kampania Wrześniowa!”',
    '„Widzę Pana za filarem w Zielonym Patio!”',
    '„Dziekanat już szykuje zawiadomienie o skreśleniu z listy!”'
  ];

  // Elementy DOM
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // HUD
  const ectsCounterEl = document.getElementById('ects-counter');
  const ectsProgressBar = document.getElementById('ects-progress-bar');
  const staminaPercentEl = document.getElementById('stamina-percent');
  const staminaProgressBar = document.getElementById('stamina-progress-bar');
  const campusLocationTextEl = document.getElementById('campus-location-text');
  const campusDotEl = document.getElementById('campus-pulse-dot');
  const audioToggleBtn = document.getElementById('btn-audio-toggle');
  const audioIconEl = document.getElementById('audio-icon');
  const pauseToggleBtn = document.getElementById('btn-pause-toggle');
  const pauseIconEl = document.getElementById('pause-icon');

  // Dymek profesora
  const profSpeechBubble = document.getElementById('prof-speech-bubble');
  const profQuoteText = document.getElementById('prof-quote-text');

  // Modale
  const startModal = document.getElementById('start-modal');
  const btnStartGame = document.getElementById('btn-start-game');
  const gameoverModal = document.getElementById('gameover-modal');
  const btnRestartGame = document.getElementById('btn-restart-game');
  const gameoverReasonEl = document.getElementById('gameover-reason');
  const finalEctsLostEl = document.getElementById('final-ects-lost');
  const finalTimeLostEl = document.getElementById('final-time-lost');
  const finalZonesLostEl = document.getElementById('final-zones-lost');
  const victoryModal = document.getElementById('victory-modal');
  const btnVictoryRestart = document.getElementById('btn-victory-restart');
  const victoryTimeEl = document.getElementById('victory-time');
  const victoryGradeEl = document.getElementById('victory-grade');
  const victoryCoffeeEl = document.getElementById('victory-coffee');
  const pauseOverlay = document.getElementById('pause-overlay');
  const btnResumeGame = document.getElementById('btn-resume-game');

  // Touch controls
  const touchUp = document.getElementById('touch-up');
  const touchDown = document.getElementById('touch-down');
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchSprint = document.getElementById('touch-sprint');

  // Stan wejścia klawiatury i dotyku
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false
  };

  // Stan gry
  const gameState = {
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    ects: 0,
    stamina: 100,
    isSprinting: false,
    coffeeBoostTime: 0,
    notesConfusionTime: 0,
    startTime: 0,
    elapsedTime: 0,
    coffeeCupsDrank: 0,
    lastTime: 0,
    currentCampusZone: CAMPUS_ZONES[0].name,
    visitedZones: new Set(),
    speechTimer: null
  };

  // Gracz (Student ALK)
  const player = {
    x: 100,
    y: 120,
    radius: 14,
    vx: 0,
    vy: 0,
    direction: 0,
    animFrame: 0,
    isMoving: false
  };

  // Przeszkody architektoniczne kampusu (filary, lady, regały, rośliny)
  const obstacles = [
    // Ściany działowe i filary holu
    { x: 250, y: 20, w: 20, h: 140, type: 'wall', label: 'Ściana Dziekanatu' },
    { x: 510, y: 20, w: 20, h: 140, type: 'wall', label: 'Ściana Biblioteki' },
    // Filary nośne holu
    { x: 100, y: 160, w: 24, h: 24, type: 'pillar' },
    { x: 380, y: 160, w: 24, h: 24, type: 'pillar' },
    { x: 650, y: 160, w: 24, h: 24, type: 'pillar' },
    // Lada kawiarni i recepcja
    { x: 320, y: 90, w: 120, h: 32, type: 'counter', label: 'Bufet ALK' },
    // Strefa Zielonego Patio - wielkie donice z palmami i ławki
    { x: 200, y: 310, w: 50, h: 50, type: 'plant', label: 'Fikus Patio' },
    { x: 550, y: 310, w: 50, h: 50, type: 'plant', label: 'Fikus Patio' },
    { x: 340, y: 380, w: 120, h: 36, type: 'bench', label: 'Ławki studenckie' },
    { x: 200, y: 440, w: 50, h: 50, type: 'plant', label: 'Fikus Patio' },
    { x: 550, y: 440, w: 50, h: 50, type: 'plant', label: 'Fikus Patio' }
  ];

  // Egzaminator (Profesor AI)
  const professor = {
    x: 680,
    y: 420,
    radius: 16,
    speed: PROF_PATROL_SPEED,
    state: 'patrol', // 'patrol' lub 'chase'
    targetX: 680,
    targetY: 420,
    patrolIndex: 0,
    visionRange: 210,
    visionAngle: Math.PI * 0.7,
    facingAngle: Math.PI,
    quotesCooldown: 0,
    patrolPoints: [
      { x: 680, y: 420 },
      { x: 400, y: 440 },
      { x: 180, y: 380 },
      { x: 380, y: 220 },
      { x: 650, y: 100 },
      { x: 400, y: 50 },
      { x: 120, y: 80 }
    ]
  };

  // Znajdźki na planszy
  let items = [];

  // Inicjalizacja znajdziek
  function spawnItems() {
    items = [];
    const occupiedSpawns = [];

    function isSafeSpawn(x, y) {
      if (x < 40 || x > CANVAS_WIDTH - 40 || y < 40 || y > CANVAS_HEIGHT - 40) return false;
      for (const obs of obstacles) {
        if (x > obs.x - 20 && x < obs.x + obs.w + 20 && y > obs.y - 20 && y < obs.y + obs.h + 20) {
          return false;
        }
      }
      for (const sp of occupiedSpawns) {
        const dx = sp.x - x;
        const dy = sp.y - y;
        if (Math.hypot(dx, dy) < 32) return false;
      }
      return true;
    }

    function getRandomFreeSpot() {
      let attempts = 0;
      while (attempts < 150) {
        attempts++;
        const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
        const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
        if (isSafeSpawn(x, y)) {
          occupiedSpawns.push({ x, y });
          return { x, y };
        }
      }
      return { x: 400, y: 270 };
    }

    // 1. ECTS (30 sztuk do zebrania w partii)
    for (let i = 0; i < 30; i++) {
      const spot = getRandomFreeSpot();
      items.push({
        id: 'ects-' + i,
        type: 'ects',
        x: spot.x,
        y: spot.y,
        radius: 10,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    // 2. Kawa ze Starbucksa / bufetu ALK (5 sztuk)
    for (let i = 0; i < 5; i++) {
      const spot = getRandomFreeSpot();
      items.push({
        id: 'coffee-' + i,
        type: 'coffee',
        x: spot.x,
        y: spot.y,
        radius: 11,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    // 3. Notatki ze Starostwa (4 sztuki)
    for (let i = 0; i < 4; i++) {
      const spot = getRandomFreeSpot();
      items.push({
        id: 'notes-' + i,
        type: 'notes',
        x: spot.x,
        y: spot.y,
        radius: 11,
        bobOffset: Math.random() * Math.PI * 2
      });
    }
  }

  // Wyświetlanie dymku z kwestią profesora
  function showProfessorQuote(text, duration = 3500) {
    if (!profSpeechBubble || !profQuoteText) return;
    profQuoteText.textContent = text;
    profSpeechBubble.classList.remove('speech-hidden');

    if (gameState.speechTimer) {
      clearTimeout(gameState.speechTimer);
    }
    gameState.speechTimer = setTimeout(() => {
      profSpeechBubble.classList.add('speech-hidden');
    }, duration);
  }

  // Rozpoczęcie gry
  function startGame() {
    startModal.classList.add('modal-hidden');
    gameoverModal.classList.add('modal-hidden');
    victoryModal.classList.add('modal-hidden');
    pauseOverlay.classList.add('modal-hidden');

    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.isVictory = false;
    gameState.ects = 0;
    gameState.stamina = MAX_STAMINA;
    gameState.coffeeBoostTime = 0;
    gameState.notesConfusionTime = 0;
    gameState.coffeeCupsDrank = 0;
    gameState.startTime = performance.now();
    gameState.elapsedTime = 0;
    gameState.visitedZones.clear();

    // Reset pozycji
    player.x = 90;
    player.y = 90;
    player.vx = 0;
    player.vy = 0;

    professor.x = 680;
    professor.y = 440;
    professor.state = 'patrol';
    professor.patrolIndex = 0;
    professor.quotesCooldown = 2;

    spawnItems();
    updateHUD();

    if (window.gameAudio) {
      window.gameAudio.init();
      window.gameAudio.startBGM();
    }

    showProfessorQuote('„Uwaga studenci! Egzamin z Finansów właśnie się rozpoczął! Nikt nie wyjdzie bez wpisu!”', 4000);

    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  // Aktualizacja HUD
  function updateHUD() {
    if (ectsCounterEl) ectsCounterEl.textContent = gameState.ects;
    if (ectsProgressBar) {
      const pct = Math.min(100, Math.round((gameState.ects / TARGET_ECTS) * 100));
      ectsProgressBar.style.width = pct + '%';
    }

    if (staminaPercentEl) staminaPercentEl.textContent = Math.round(gameState.stamina);
    if (staminaProgressBar) {
      staminaProgressBar.style.width = gameState.stamina + '%';
      if (gameState.stamina < 25) {
        staminaProgressBar.classList.add('stamina-low');
      } else {
        staminaProgressBar.classList.remove('stamina-low');
      }
    }

    // Wykrywanie aktualnej strefy kampusu
    let matchedZone = 'Budynek A: Kampus Główny';
    for (const zone of CAMPUS_ZONES) {
      if (player.x >= zone.x && player.x <= zone.x + zone.w && player.y >= zone.y && player.y <= zone.y + zone.h) {
        matchedZone = zone.name;
        gameState.visitedZones.add(zone.name);
        break;
      }
    }
    if (campusLocationTextEl) {
      campusLocationTextEl.textContent = matchedZone;
    }
    if (campusDotEl) {
      if (professor.state === 'chase') {
        campusDotEl.style.backgroundColor = '#ef4444';
        campusDotEl.style.boxShadow = '0 0 10px #ef4444';
      } else {
        campusDotEl.style.backgroundColor = '#10b981';
        campusDotEl.style.boxShadow = '0 0 10px #10b981';
      }
    }
  }

  // Kolizje z przeszkodami
  function resolveCollisions(entity) {
    // Krawędzie canvasa
    if (entity.x - entity.radius < 0) entity.x = entity.radius;
    if (entity.x + entity.radius > CANVAS_WIDTH) entity.x = CANVAS_WIDTH - entity.radius;
    if (entity.y - entity.radius < 0) entity.y = entity.radius;
    if (entity.y + entity.radius > CANVAS_HEIGHT) entity.y = CANVAS_HEIGHT - entity.radius;

    // Przeszkody
    for (const obs of obstacles) {
      const nearestX = Math.max(obs.x, Math.min(entity.x, obs.x + obs.w));
      const nearestY = Math.max(obs.y, Math.min(entity.y, obs.y + obs.h));
      const dx = entity.x - nearestX;
      const dy = entity.y - nearestY;
      const dist = Math.hypot(dx, dy);

      if (dist < entity.radius) {
        const overlap = entity.radius - dist;
        if (dist === 0) {
          entity.x += overlap;
        } else {
          entity.x += (dx / dist) * overlap;
          entity.y += (dy / dist) * overlap;
        }
      }
    }
  }

  // Logika fizyki i AI
  function update(dt) {
    if (!gameState.isRunning || gameState.isPaused) return;

    gameState.elapsedTime = (performance.now() - gameState.startTime) / 1000;

    // Odliczanie boosterów
    if (gameState.coffeeBoostTime > 0) {
      gameState.coffeeBoostTime -= dt;
    }
    if (gameState.notesConfusionTime > 0) {
      gameState.notesConfusionTime -= dt;
    }

    // 1. Ruch Studenta
    let moveX = 0;
    let moveY = 0;

    if (keys.up) moveY -= 1;
    if (keys.down) moveY += 1;
    if (keys.left) moveX -= 1;
    if (keys.right) moveX += 1;

    player.isMoving = moveX !== 0 || moveY !== 0;

    if (player.isMoving) {
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;

      player.direction = Math.atan2(moveY, moveX);
      player.animFrame += dt * 10;

      // Sprint i Stamina
      const wantsSprint = keys.sprint;
      const hasStamina = gameState.stamina > 5;
      const hasCoffeeBoost = gameState.coffeeBoostTime > 0;

      if ((wantsSprint || hasCoffeeBoost) && hasStamina) {
        gameState.isSprinting = true;
        let speed = PLAYER_SPRINT_SPEED;
        if (hasCoffeeBoost) speed += 50;

        player.vx = moveX * speed;
        player.vy = moveY * speed;

        if (!hasCoffeeBoost) {
          gameState.stamina = Math.max(0, gameState.stamina - STAMINA_DRAIN_RATE * dt);
        }
        if (Math.random() < 0.2 && window.gameAudio) {
          window.gameAudio.playSprintStep();
        }
      } else {
        gameState.isSprinting = false;
        player.vx = moveX * PLAYER_NORMAL_SPEED;
        player.vy = moveY * PLAYER_NORMAL_SPEED;
        gameState.stamina = Math.min(MAX_STAMINA, gameState.stamina + STAMINA_RECOVERY_RATE * dt);
      }
    } else {
      player.vx = 0;
      player.vy = 0;
      gameState.isSprinting = false;
      gameState.stamina = Math.min(MAX_STAMINA, gameState.stamina + (STAMINA_RECOVERY_RATE * 1.5) * dt);
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    resolveCollisions(player);

    // 2. Zbieranie przedmiotów
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const dist = Math.hypot(player.x - it.x, player.y - it.y);

      if (dist < player.radius + it.radius) {
        if (it.type === 'ects') {
          gameState.ects++;
          if (window.gameAudio) window.gameAudio.playEctsPickup();
          items.splice(i, 1);

          if (gameState.ects >= TARGET_ECTS) {
            triggerVictory();
            return;
          }
        } else if (it.type === 'coffee') {
          gameState.coffeeCupsDrank++;
          gameState.coffeeBoostTime = 4.5;
          gameState.stamina = MAX_STAMINA;
          if (window.gameAudio) window.gameAudio.playCoffeePowerup();
          showProfessorQuote('„Czy to zapach świeżej kawy z Bufetu ALK?! I tak pana dogonię!”', 2800);
          items.splice(i, 1);
        } else if (it.type === 'notes') {
          gameState.notesConfusionTime = 5.0;
          if (window.gameAudio) window.gameAudio.playNotesPickup();
          showProfessorQuote('„Kto sporządził te notatki ze Starostwa?! Muszę sprawdzić literaturę!”', 3000);
          items.splice(i, 1);
        }
      }
    }

    // 3. Sztuczna Inteligencja Profesora
    const distToPlayer = Math.hypot(player.x - professor.x, player.y - professor.y);
    const angleToPlayer = Math.atan2(player.y - professor.y, player.x - professor.x);

    // Widzenie profesora (chyba że student użył notatek – wtedy zasięg spada o połowę)
    const effectiveVisionRange = gameState.notesConfusionTime > 0 ? professor.visionRange * 0.5 : professor.visionRange;
    const isPlayerInSight = distToPlayer < effectiveVisionRange;

    // Przełączanie stanów AI
    if (isPlayerInSight && gameState.notesConfusionTime <= 0) {
      if (professor.state !== 'chase') {
        professor.state = 'chase';
        if (window.gameAudio) window.gameAudio.playProfessorAlert();
        // Losowy okrzyk
        const randomQuote = PROFESSOR_QUOTES[Math.floor(Math.random() * PROFESSOR_QUOTES.length)];
        showProfessorQuote(randomQuote, 3200);
      }
    } else {
      if (professor.state === 'chase' && distToPlayer > effectiveVisionRange * 1.5) {
        professor.state = 'patrol';
      }
    }

    // Ruch profesora
    let profSpeed = professor.state === 'chase' ? PROF_CHASE_SPEED : PROF_PATROL_SPEED;
    if (gameState.notesConfusionTime > 0) {
      profSpeed *= 0.6; // Oszołomiony czytaniem notatek
    }

    if (professor.state === 'chase') {
      professor.facingAngle = angleToPlayer;
      professor.x += Math.cos(angleToPlayer) * profSpeed * dt;
      professor.y += Math.sin(angleToPlayer) * profSpeed * dt;
    } else {
      // Patrolowanie punktów kampusu
      const currentPatrol = professor.patrolPoints[professor.patrolIndex];
      const distToPatrol = Math.hypot(currentPatrol.x - professor.x, currentPatrol.y - professor.y);

      if (distToPatrol < 15) {
        professor.patrolIndex = (professor.patrolIndex + 1) % professor.patrolPoints.length;
      } else {
        const patrolAngle = Math.atan2(currentPatrol.y - professor.y, currentPatrol.x - professor.x);
        professor.facingAngle = patrolAngle;
        professor.x += Math.cos(patrolAngle) * profSpeed * dt;
        professor.y += Math.sin(patrolAngle) * profSpeed * dt;
      }
    }

    resolveCollisions(professor);

    // 4. Detekcja schwytania (Porażka)
    if (distToPlayer < player.radius + professor.radius) {
      triggerGameOver();
      return;
    }

    // Okresowe rzucanie uwagami przez profesora
    professor.quotesCooldown -= dt;
    if (professor.quotesCooldown <= 0 && professor.state === 'chase') {
      professor.quotesCooldown = 6 + Math.random() * 4;
      const quote = PROFESSOR_QUOTES[Math.floor(Math.random() * PROFESSOR_QUOTES.length)];
      showProfessorQuote(quote, 2800);
    }

    updateHUD();
  }

  // Ekran Porażki
  function triggerGameOver() {
    gameState.isRunning = false;
    gameState.isGameOver = true;

    if (window.gameAudio) window.gameAudio.playDefeatSound();

    if (finalEctsLostEl) finalEctsLostEl.textContent = `${gameState.ects} / ${TARGET_ECTS}`;
    if (finalTimeLostEl) finalTimeLostEl.textContent = formatTime(gameState.elapsedTime);
    if (finalZonesLostEl) {
      finalZonesLostEl.textContent = Array.from(gameState.visitedZones).join(', ') || 'Budynek A';
    }

    if (gameoverReasonEl) {
      gameoverReasonEl.textContent = `Profesor dopadł Cię w ${campusLocationTextEl ? campusLocationTextEl.textContent : 'korytarzu'}! Zabrakło Ci ${TARGET_ECTS - gameState.ects} ECTS do zaliczenia w pierwszym terminie!`;
    }

    gameoverModal.classList.remove('modal-hidden');
  }

  // Ekran Zwycięstwa
  function triggerVictory() {
    gameState.isRunning = false;
    gameState.isVictory = true;

    if (window.gameAudio) window.gameAudio.playVictoryFanfare();

    if (victoryTimeEl) victoryTimeEl.textContent = formatTime(gameState.elapsedTime);
    if (victoryCoffeeEl) victoryCoffeeEl.textContent = `${gameState.coffeeCupsDrank} kubków`;

    let grade = 'Bardzo dobry (5.0) 🌟';
    if (gameState.elapsedTime > 90) grade = 'Dobry plus (4.5) 🎓';
    if (gameState.elapsedTime > 140) grade = 'Dostateczny (3.0) 📜';
    if (victoryGradeEl) victoryGradeEl.textContent = grade;

    victoryModal.classList.remove('modal-hidden');
  }

  // Formatowanie sekund do formatu MM:SS
  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Rysowanie planszy i elementów
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Tło i Strefy Kampusu ALK
    // Posadzka bazowa
    ctx.fillStyle = '#081728';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Rysowanie stref
    for (const zone of CAMPUS_ZONES) {
      ctx.fillStyle = zone.color;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

      // Obwódka strefy
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

      // Nazwa strefy w tle
      ctx.font = '10px "Space Grotesk", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillText(zone.name.toUpperCase(), zone.x + 10, zone.y + 18);
    }

    // Zielone Patio - specjalny szklany dach ze strukturą siatki i roślinami
    drawZielonePatioDetails();

    // 2. Przeszkody architektoniczne
    for (const obs of obstacles) {
      if (obs.type === 'wall') {
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      } else if (obs.type === 'pillar') {
        ctx.fillStyle = '#0f2942';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      } else if (obs.type === 'counter') {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('☕ BUFET ALK', obs.x + 20, obs.y + 20);
      } else if (obs.type === 'plant') {
        // Roślina w Patio
        ctx.beginPath();
        ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#065f46';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪴', obs.x + obs.w / 2, obs.y + obs.h / 2);
      } else if (obs.type === 'bench') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px sans-serif';
        ctx.fillText('STREFA PRACY I RELAKSU', obs.x + 10, obs.y + 22);
      }
    }

    // 3. Rysowanie przedmiotów (ECTS, Kawa, Notatki)
    const timeNow = performance.now() / 1000;
    for (const it of items) {
      const bob = Math.sin(timeNow * 4 + it.bobOffset) * 3;

      if (it.type === 'ects') {
        // Kryształ ECTS
        ctx.save();
        ctx.translate(it.x, it.y + bob);

        // Blask
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.fill();

        // Romb ECTS
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', 0, 0);

        ctx.restore();
      } else if (it.type === 'coffee') {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☕', it.x, it.y + bob);
      } else if (it.type === 'notes') {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📑', it.x, it.y + bob);
      }
    }

    // 4. Rysowanie Egzaminatora (Profesor)
    drawProfessor();

    // 5. Rysowanie Gracza (Student)
    drawPlayer();
  }

  // Detale Zielonego Patio ze szklanym dachem
  function drawZielonePatioDetails() {
    const patio = CAMPUS_ZONES[3];
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.lineWidth = 1;

    // Siatka szklanego dachu
    for (let x = patio.x; x <= patio.x + patio.w; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, patio.y);
      ctx.lineTo(x, patio.y + patio.h);
      ctx.stroke();
    }
    for (let y = patio.y; y <= patio.y + patio.h; y += 35) {
      ctx.beginPath();
      ctx.moveTo(patio.x, y);
      ctx.lineTo(patio.x + patio.w, y);
      ctx.stroke();
    }

    // Napis Zielone Patio
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('🌿 ZIELONE PATIO ALK - SERCE KAMPUSU 🌿', patio.x + patio.w / 2, patio.y + patio.h - 15);
    ctx.restore();
  }

  // Rysowanie Profesora i stożka widzenia
  function drawProfessor() {
    ctx.save();

    // Stożek widzenia
    const range = gameState.notesConfusionTime > 0 ? professor.visionRange * 0.5 : professor.visionRange;
    ctx.beginPath();
    ctx.moveTo(professor.x, professor.y);
    ctx.arc(
      professor.x,
      professor.y,
      range,
      professor.facingAngle - professor.visionAngle / 2,
      professor.facingAngle + professor.visionAngle / 2
    );
    ctx.closePath();

    if (professor.state === 'chase') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    } else {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
    }
    ctx.fill();
    ctx.stroke();

    // Ciało profesora
    ctx.beginPath();
    ctx.arc(professor.x, professor.y, professor.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#7f1d1d';
    ctx.fill();
    ctx.strokeStyle = professor.state === 'chase' ? '#ef4444' : '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Awatar / ikona
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👨‍🏫', professor.x, professor.y);

    // Etykieta nad profesorem
    ctx.font = 'bold 9px "Space Grotesk", monospace';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('EGZAMINATOR', professor.x, professor.y - 20);

    ctx.restore();
  }

  // Rysowanie Studenta
  function drawPlayer() {
    ctx.save();

    // Poświata przy sprincie / kawie
    if (gameState.coffeeBoostTime > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.fill();
    } else if (gameState.isSprinting) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.fill();
    }

    // Ciało studenta
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ikona studenta
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧑‍🎓', player.x, player.y);

    // Etykieta Studenta ALK
    ctx.font = 'bold 9px "Space Grotesk", monospace';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText('STUDENT ALK', player.x, player.y - 18);

    ctx.restore();
  }

  // Pętla gry
  function gameLoop(timestamp) {
    if (!gameState.isRunning) return;

    const dt = Math.min((timestamp - gameState.lastTime) / 1000, 0.1);
    gameState.lastTime = timestamp;

    if (!gameState.isPaused) {
      update(dt);
      render();
    }

    requestAnimationFrame(gameLoop);
  }

  // Przełączanie pauzy
  function togglePause() {
    if (!gameState.isRunning || gameState.isGameOver || gameState.isVictory) return;
    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
      pauseOverlay.classList.remove('modal-hidden');
      if (pauseIconEl) pauseIconEl.textContent = '▶️';
    } else {
      pauseOverlay.classList.add('modal-hidden');
      if (pauseIconEl) pauseIconEl.textContent = '⏸️';
      gameState.lastTime = performance.now();
    }
  }

  // Obsługa klawiatury
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        keys.up = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        keys.down = true;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        keys.left = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        keys.right = true;
        break;
      case 'Shift':
        keys.sprint = true;
        break;
      case ' ':
        togglePause();
        e.preventDefault();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        keys.up = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        keys.down = false;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        keys.right = false;
        break;
      case 'Shift':
        keys.sprint = false;
        break;
    }
  });

  // Wirtualne przyciski dotykowe
  function setupTouchButton(el, keyName) {
    if (!el) return;

    const press = (e) => {
      e.preventDefault();
      keys[keyName] = true;
      el.classList.add('touch-active');
    };

    const release = (e) => {
      e.preventDefault();
      keys[keyName] = false;
      el.classList.remove('touch-active');
    };

    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
  }

  setupTouchButton(touchUp, 'up');
  setupTouchButton(touchDown, 'down');
  setupTouchButton(touchLeft, 'left');
  setupTouchButton(touchRight, 'right');
  setupTouchButton(touchSprint, 'sprint');

  // Przyciski interfejsu
  if (btnStartGame) btnStartGame.addEventListener('click', startGame);
  if (btnRestartGame) btnRestartGame.addEventListener('click', startGame);
  if (btnVictoryRestart) btnVictoryRestart.addEventListener('click', startGame);
  if (btnResumeGame) btnResumeGame.addEventListener('click', togglePause);
  if (pauseToggleBtn) pauseToggleBtn.addEventListener('click', togglePause);

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      if (window.gameAudio) {
        const isMuted = window.gameAudio.toggleMute();
        if (audioIconEl) audioIconEl.textContent = isMuted ? '🔇' : '🔊';
      }
    });
  }

  // Wstępny render tła canvasa przy załadowaniu strony
  render();
})();

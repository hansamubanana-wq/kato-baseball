const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000',
    parent: 'game-container',
    physics: { default: 'arcade' },
    scene: { preload: preload, create: create, update: update },
    pixelArt: true
};

const game = new Phaser.Game(config);

let ball, batter, bat, pitcher, cursor;
let score = 0, outCount = 0, combo = 0, level = 1, exp = 0;
let scoreText, messageText, outText, statusText, levelText;
let isSwinging = false;
let ballState = 'ready'; 
let targetPos = { x: 400, y: 530 };
let stats = { meet: 50, power: 50 };

function preload() {
    this.load.audio('hit', 'https://labs.phaser.io/assets/audio/SoundEffects/p-town-spinnin.mp3');
    this.load.audio('swing', 'https://labs.phaser.io/assets/audio/SoundEffects/magical_get_item.mp3');
    this.load.audio('out', 'https://labs.phaser.io/assets/audio/SoundEffects/alien_death.mp3');
    
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // 1. スタジアム描画
    drawStadium(this);

    // 2. タップ判定を確実にするための巨大な透明背景
    const clickRegion = this.add.rectangle(400, 300, 800, 600, 0x000000, 0).setInteractive();

    // 3. テクスチャとキャラ
    generateCharacterTextures(this);
    pitcher = this.add.sprite(400, 200, 'pitcher_real');
    batter = this.add.sprite(300, 520, 'kato_real').setScale(1.8);
    bat = this.add.sprite(345, 520, 'bat_dot').setOrigin(0.5, 0.9).setScale(2.5);
    ball = this.add.sprite(400, 200, 'ball_dot').setScale(0.1).setVisible(false);
    
    // ミートカーソル
    cursor = this.add.circle(400, 530, stats.meet, 0xffffff, 0.1);
    cursor.setStrokeStyle(2, 0xffffff, 0.3).setVisible(false);

    // 4. UI（タップを邪魔しないよう配置）
    scoreText = this.add.text(20, 20, 'HR: 0', { fontSize: '24px', fill: '#ffd700', fontStyle: 'bold' });
    levelText = this.add.text(20, 50, 'LV: 1', { fontSize: '18px', fill: '#fff' });
    outText = this.add.text(20, 80, 'OUT: ●●●', { fontSize: '18px', fill: '#ff4444' });
    statusText = this.add.text(20, 110, `MEET: ${stats.meet} / POW: ${stats.power}`, { fontSize: '14px', fill: '#aaa' });
    messageText = this.add.text(400, 300, 'KATO BASEBALL', { fontSize: '42px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    this.particles = this.add.particles(0, 0, 'spark', { speed: 250, scale: { start: 2, end: 0 }, emitting: false });

    // --- 確実に反応するタップイベント ---
    clickRegion.on('pointerdown', () => {
        if (ballState === 'ready') {
            startPitchSequence.call(this);
        } else if (ballState === 'pitching' && !isSwinging) {
            swingBat.call(this);
        }
    });
}

function startPitchSequence() {
    ballState = 'wait';
    messageText.setText('');
    this.tweens.add({ targets: pitcher, y: 195, duration: 300, yoyo: true, onComplete: () => throwBall.call(this) });
}

function throwBall() {
    ballState = 'pitching';
    ball.setVisible(true).setPosition(400, 200).setScale(0.1);
    targetPos.x = 400 + Phaser.Math.Between(-80, 80);
    cursor.setPosition(targetPos.x, targetPos.y).setVisible(true).setAlpha(0);
    
    let duration = Math.max(1000 - (level * 20), 300);
    this.tweens.add({
        targets: ball,
        x: targetPos.x, y: targetPos.y, scale: 5,
        duration: duration,
        ease: 'Cubic.easeIn',
        onUpdate: (tw) => { if (tw.progress > 0.4) cursor.setAlpha(tw.progress); },
        onComplete: () => {
            if (ballState === 'pitching') {
                ballState = 'missed';
                messageText.setText('STRIKE!');
                this.sound.play('out');
                outCount++;
                updateStats.call(this);
                this.time.delayedCall(1000, resetStage);
            }
        }
    });
}

function swingBat() {
    isSwinging = true;
    this.sound.play('swing', { volume: 0.5 });

    this.tweens.add({
        targets: bat,
        angle: 160,
        x: '+=70',
        duration: 80,
        yoyo: true,
        onComplete: () => {
            isSwinging = false;
            bat.angle = 0;
            bat.x = 345;
        }
    });

    let dist = Phaser.Math.Distance.Between(ball.x, ball.y, cursor.x, cursor.y);
    // 判定時間を少し広げました (scale 3.0 ~ 5.0)
    if (ballState === 'pitching' && ball.scale > 3.0 && ball.scale < 5.0 && dist < stats.meet) {
        ballState = 'hit';
        score++;
        exp += 25;
        this.sound.play('hit', { volume: 1.0 });
        messageText.setText('HOMERUN!!');
        this.cameras.main.shake(300, 0.05);
        this.particles.emitParticleAt(ball.x, ball.y, 50);

        this.tweens.add({ targets: ball, y: -200, x: (ball.x - 400) * 10, scale: 0.2, duration: 1500 });
        updateStats.call(this);
        this.time.delayedCall(2000, resetStage);
    }
}

function updateStats() {
    if (exp >= 100) {
        level++;
        exp = 0;
        stats.meet += 5;
        stats.power += 5;
        cursor.setRadius(stats.meet);
    }
    scoreText.setText('HR: ' + score);
    levelText.setText(`LV: ${level} (EXP: ${exp}%)`);
    let dots = '';
    for(let i=0; i<3; i++) dots += (i < outCount) ? '○' : '●';
    outText.setText('OUT: ' + dots);
    statusText.setText(`MEET: ${stats.meet} / POW: ${stats.power}`);

    if (outCount >= 3) {
        messageText.setText('GAME OVER');
        this.time.delayedCall(3000, () => location.reload());
    }
}

function resetStage() {
    if (outCount < 3) {
        ballState = 'ready';
        messageText.setText('NEXT AT BAT');
        ball.setVisible(false);
        cursor.setVisible(false);
    }
}

function drawStadium(scene) {
    let field = scene.add.graphics();
    field.fillGradientStyle(0x000033, 0x000033, 0x003300, 0x003300, 1);
    field.fillRect(0, 0, 800, 600);
    field.fillStyle(0x1a4a1a, 1);
    field.fillPoints([{ x: 300, y: 220 }, { x: 500, y: 220 }, { x: 900, y: 600 }, { x: -100, y: 600 }], true);
}

function generateCharacterTextures(scene) {
    const katoData = ['....AAAAAA......','...A111111A.....','..A11111111A....','..A17711771A....','..A17211721A....','..A11111111A....','..A11555511A....','...A111111A.....','....A2222A......','...A222222A.....','..A22222222A....','.A2222222222A...','.A2222222222A...','..A22222222A....','...A22..22A.....','....AA..AA......'];
    scene.textures.generate('kato_real', { data: katoData, pixelWidth: 5 });
    scene.textures.generate('pitcher_real', { data: katoData, pixelWidth: 4 });
    scene.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    scene.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66'], pixelWidth: 10 });
}

function update() {}
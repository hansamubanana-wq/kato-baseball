const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#87CEEB',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    pixelArt: true
};

const game = new Phaser.Game(config);

let ball, batter, bat, pitcher;
let score = 0, outCount = 0, combo = 0;
let stamina = 100; // スタミナシステム
let staminaBar, chargeBar;
let scoreText, messageText, outText;
let isSwinging = false;
let ballState = 'title'; 
let gameMode = 'batter'; 
let swingPower = 0; // 強振チャージ
let isCharging = false;

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
    drawStadium(this);
    generateCharacterTextures(this);

    pitcher = this.add.sprite(400, 190, 'pitcher_real');
    batter = this.add.sprite(320, 500, 'kato_real').setScale(1.5);
    bat = this.add.sprite(355, 500, 'bat_dot').setOrigin(0.5, 0.9).setScale(2);
    ball = this.add.sprite(400, 190, 'ball_dot').setScale(0.1).setVisible(false);
    
    // --- UI強化 ---
    // スタミナバー（外枠）
    this.add.rectangle(600, 40, 154, 24, 0x000000);
    staminaBar = this.add.rectangle(600, 40, 150, 20, 0x00ff00);
    this.add.text(500, 30, 'STAMINA', { fontSize: '18px', fill: '#fff' });

    // チャージバー（バッティング用）
    this.add.rectangle(400, 580, 204, 14, 0x000000);
    chargeBar = this.add.rectangle(400, 580, 0, 10, 0xffff00);

    scoreText = this.add.text(20, 20, '', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    outText = this.add.text(20, 65, '', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' });
    messageText = this.add.text(400, 300, 'KATO BASEBALL PRO', { fontSize: '50px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
    
    let btnBatter = this.add.text(250, 400, '[ BATTER ]', { fontSize: '32px', fill: '#fff', backgroundColor: '#00f' }).setPadding(10).setInteractive();
    let btnPitcher = this.add.text(450, 400, '[ PITCHER ]', { fontSize: '32px', fill: '#fff', backgroundColor: '#f00' }).setPadding(10).setInteractive();

    btnBatter.on('pointerdown', () => { gameMode = 'batter'; startGame(this, btnBatter, btnPitcher); });
    btnPitcher.on('pointerdown', () => { gameMode = 'pitcher'; startGame(this, btnBatter, btnPitcher); });

    this.particles = this.add.particles(0, 0, 'spark', { speed: 200, scale: { start: 2, end: 0 }, emitting: false });

    // --- 入力制御 ---
    this.input.on('pointerdown', () => {
        if (ballState === 'ready' && gameMode === 'batter') preparePitch.call(this);
        else if (ballState === 'pitching' && gameMode === 'batter') isCharging = true;
        else if (ballState === 'ready' && gameMode === 'pitcher') preparePitch.call(this);
    });

    this.input.on('pointerup', () => {
        if (isCharging) {
            swingBat.call(this);
            isCharging = false;
        }
    });
}

function startGame(scene, b1, b2) {
    b1.destroy(); b2.destroy();
    ballState = 'ready'; score = 0; outCount = 0; stamina = 100;
    scoreText.setText(gameMode === 'batter' ? 'HOMERUNS: 0' : 'STRIKEOUTS: 0');
    updateOutDisplay();
}

function update() {
    // スタミナバーの更新
    staminaBar.width = stamina * 1.5;
    if (stamina < 30) staminaBar.setFillStyle(0xff0000);

    // チャージバーの更新
    if (isCharging && swingPower < 100) {
        swingPower += 2;
        chargeBar.width = swingPower * 2;
    }
}

function drawStadium(scene) {
    scene.add.rectangle(400, 100, 800, 200, 0x444444);
    let field = scene.add.graphics();
    field.fillStyle(0x2e7d32, 1);
    field.fillPoints([{ x: 300, y: 200 }, { x: 500, y: 200 }, { x: 850, y: 600 }, { x: -50, y: 600 }], true);
    scene.add.ellipse(400, 220, 120, 50, 0xcd853f); 
    scene.add.ellipse(400, 560, 450, 150, 0xcd853f);
}

function generateCharacterTextures(scene) {
    const katoRealData = ['....AAAAAA......','...A111111A.....','..A11111111A....','..A17711771A....','..A17211721A....','..A11111111A....','..A11555511A....','...A111111A.....','....A2222A......','...A222222A.....','..A22222222A....','.A2222222222A...','.A2222222222A...','..A22222222A....','...A22..22A.....','....AA..AA......'];
    const pitcherRealData = ['....BBBBBB......','...B999999B.....','..B99999999B....','..B93399339B....','..B99999999B....','..B99999999B....','..B99444499B....','...B999999B.....','....C6666C......','...C666666C.....','..C66666666C....','.C6666666666C...','.C6666666666C...','..C66666666C....','...C66..22C.....','....CC..CC......'];
    scene.textures.generate('kato_real', { data: katoRealData, pixelWidth: 5 });
    scene.textures.generate('pitcher_real', { data: pitcherRealData, pixelWidth: 4 });
    scene.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    scene.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66','66','66'], pixelWidth: 10 });
}

function preparePitch() {
    if (stamina <= 0) {
        messageText.setText('OUT OF STAMINA');
        return;
    }
    ballState = 'wait';
    stamina -= 5;
    this.tweens.add({ targets: pitcher, scaleX: 1.2, duration: 200, yoyo: true, onComplete: () => startPitch.call(this) });
}

function startPitch() {
    ballState = 'pitching';
    ball.setVisible(true).setPosition(400, 190).setScale(0.1);
    
    let duration = 1000 - (score * 10);
    if (stamina < 30) duration += 200; // スタミナ切れで球が遅くなる

    this.tweens.add({
        targets: ball,
        x: 400 + Phaser.Math.Between(-30, 30),
        y: 530, scale: 4.5,
        duration: Math.max(duration, 300),
        ease: 'Cubic.easeIn',
        onComplete: () => {
            if (ballState === 'pitching') {
                ballState = 'missed';
                messageText.setText('STRIKE!');
                outCount++;
                updateOutDisplay();
                this.time.delayedCall(1000, resetBall);
            }
        }
    });
}

function swingBat() {
    isSwinging = true;
    this.sound.play('swing', { volume: 0.3 });
    
    // チャージによる威力補正
    let powerBonus = swingPower / 50;
    this.tweens.add({ targets: bat, angle: 150, x: '+=60', duration: 90, yoyo: true, onComplete: () => { isSwinging = false; bat.angle = 0; bat.x = 355; swingPower = 0; chargeBar.width = 0; } });

    if (ball.scale > 3.0 && ball.scale < 4.8 && ballState === 'pitching') {
        ballState = 'hit';
        score++;
        messageText.setText(swingPower > 80 ? 'CRITICAL HIT!!' : 'HIT!');
        this.sound.play('hit', { volume: 0.8 });
        scoreText.setText((gameMode === 'batter' ? 'HOMERUNS: ' : 'STRIKEOUTS: ') + score);
        this.cameras.main.shake(250, 0.04);
        this.particles.emitParticleAt(ball.x, ball.y, 40);
        
        this.tweens.add({ targets: ball, y: -150, x: Phaser.Math.Between(-200, 1000), scale: 0.1, duration: 1200 });
        this.time.delayedCall(2000, resetBall);
    }
}

function updateOutDisplay() {
    let dots = '';
    for(let i=0; i<3; i++) dots += (i < outCount) ? '○' : '●';
    outText.setText('OUT: ' + dots);
    if (outCount >= 3) {
        messageText.setText('GAME OVER');
        this.time.delayedCall(3000, () => { location.reload(); });
    }
}

function resetBall() {
    ballState = 'ready';
    messageText.setText('READY?');
    ball.setVisible(false);
}
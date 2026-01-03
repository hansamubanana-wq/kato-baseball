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
let score = 0;
let outCount = 0;
let scoreText, messageText, outText, quoteText;
let isSwinging = false;
let ballState = 'title'; // title, ready, pitching, hit, missed
let gameMode = 'batter'; // batter or pitcher
let selectedCourse = 400; // 投手モード用：コース選択
let selectedType = 'straight'; // 投手モード用：球種選択

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
    // 背景・スタジアム描画（共通）
    drawStadium(this);

    // テクスチャ生成
    generateCharacterTextures(this);

    // キャラ配置
    pitcher = this.add.sprite(400, 190, 'pitcher_real');
    batter = this.add.sprite(320, 500, 'kato_real').setScale(1.5);
    bat = this.add.sprite(355, 500, 'bat_dot').setOrigin(0.5, 0.9).setScale(2);
    ball = this.add.sprite(400, 190, 'ball_dot').setScale(0.1).setVisible(false);
    
    // UI
    scoreText = this.add.text(20, 20, '', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    outText = this.add.text(20, 65, '', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' });
    messageText = this.add.text(400, 300, 'CHOOSE MODE', { fontSize: '60px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
    quoteText = this.add.text(400, 400, '', { fontSize: '30px', fill: '#fff' }).setOrigin(0.5);

    // モード選択ボタン
    let btnBatter = this.add.text(250, 400, '[ BATTER ]', { fontSize: '32px', fill: '#fff', backgroundColor: '#00f' }).setPadding(10).setInteractive();
    let btnPitcher = this.add.text(450, 400, '[ PITCHER ]', { fontSize: '32px', fill: '#fff', backgroundColor: '#f00' }).setPadding(10).setInteractive();

    btnBatter.on('pointerdown', () => {
        gameMode = 'batter';
        startGame(this, btnBatter, btnPitcher);
    });

    btnPitcher.on('pointerdown', () => {
        gameMode = 'pitcher';
        startGame(this, btnBatter, btnPitcher);
    });

    this.particles = this.add.particles(0, 0, 'spark', { speed: 200, scale: { start: 2, end: 0 }, emitting: false });

    // ゲームメインクリック
    this.input.on('pointerdown', (pointer) => {
        if (ballState === 'ready' && gameMode === 'batter') preparePitch.call(this);
        else if (!isSwinging && ballState === 'pitching' && gameMode === 'batter') swingBat.call(this);
        else if (ballState === 'ready' && gameMode === 'pitcher') handlePitcherControl.call(this, pointer);
    });
}

function startGame(scene, b1, b2) {
    b1.destroy();
    b2.destroy();
    ballState = 'ready';
    score = 0;
    outCount = 0;
    scoreText.setText(gameMode === 'batter' ? 'HOMERUNS: 0' : 'STRIKEOUTS: 0');
    updateOutDisplay();
    messageText.setText(gameMode === 'batter' ? 'READY?' : 'CLICK TO PITCH');
}

// 投手モード：クリック位置でコース、キーやタイミングで球種を指定（今回は簡易的にクリック位置で制御）
function handlePitcherControl(pointer) {
    selectedCourse = pointer.x;
    const types = ['straight', 'curve', 'fork'];
    selectedType = types[Math.floor(Math.random() * 3)]; // 実際はボタン等で選ばせるとより良い
    messageText.setText(selectedType.toUpperCase() + "!");
    preparePitch.call(this);
}

function drawStadium(scene) {
    scene.add.rectangle(400, 100, 800, 200, 0x444444);
    scene.add.rectangle(400, 185, 800, 10, 0xaaaaaa);
    scene.add.rectangle(400, 70, 250, 100, 0x003300);
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
    ballState = 'wait';
    this.tweens.add({ targets: pitcher, scaleX: 1.2, duration: 200, yoyo: true, onComplete: () => startPitch.call(this) });
}

function startPitch() {
    ballState = 'pitching';
    ball.setVisible(true).setPosition(400, 190).setScale(0.1);
    
    let targetX = (gameMode === 'batter') ? 400 + Phaser.Math.Between(-30, 30) : selectedCourse;
    let duration = 1100 - (score * 20);
    let type = (gameMode === 'batter') ? ['straight', 'curve', 'fork'][Phaser.Math.Between(0, 2)] : selectedType;

    let pitchConfig = {
        targets: ball,
        x: targetX, y: 530, scale: 4.5,
        duration: Math.max(duration, 300),
        ease: 'Cubic.easeIn',
        onComplete: () => {
            if (ballState === 'pitching') {
                ballState = 'missed';
                messageText.setText('STRIKE!');
                this.sound.play('out', { volume: 0.5 });
                if (gameMode === 'pitcher') score++; // 投手モードは空振りで加点
                else outCount++;
                scoreText.setText((gameMode === 'batter' ? 'HOMERUNS: ' : 'STRIKEOUTS: ') + score);
                updateOutDisplay();
                this.time.delayedCall(1000, resetBall);
            }
        }
    };

    if (type === 'curve') pitchConfig.x += 160;
    if (type === 'fork') pitchConfig.duration += 400;

    this.tweens.add(pitchConfig);

    // 投手モードの場合、CPU加藤先生が振るかどうかを判定
    if (gameMode === 'pitcher') {
        this.time.delayedCall(pitchConfig.duration * 0.8, () => {
            if (ballState === 'pitching') {
                // CPUが打つかどうかのランダム判定
                if (Phaser.Math.Between(0, 10) > 7) {
                    swingBat.call(this); // CPUスイング
                }
            }
        });
    }
}

function swingBat() {
    isSwinging = true;
    this.sound.play('swing', { volume: 0.3 });
    this.tweens.add({ targets: bat, angle: 150, x: '+=60', duration: 90, yoyo: true, onComplete: () => { isSwinging = false; bat.angle = 0; bat.x = 355; } });

    if (ball.scale > 3.0 && ball.scale < 4.8 && ballState === 'pitching') {
        ballState = 'hit';
        if (gameMode === 'batter') {
            score++;
            messageText.setText('HOMERUN!!');
        } else {
            outCount++; // 投手モードで打たれたらアウトカウント（実質失点的な扱い）
            messageText.setText('HIT!!');
        }
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
    outText.setText(gameMode === 'batter' ? 'OUT: ' + dots : 'HITS: ' + dots);
    if (outCount >= 3) {
        messageText.setText('GAME OVER');
        this.time.delayedCall(3000, () => { location.reload(); });
    }
}

function resetBall() {
    if (outCount < 3) {
        ballState = 'ready';
        messageText.setText(gameMode === 'batter' ? 'READY?' : 'CLICK TO PITCH');
        ball.setVisible(false);
    }
}

function update() {}
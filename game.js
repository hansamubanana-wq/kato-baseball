const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#87CEEB', // 空の色
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
let scoreText, messageText, outText;
let isSwinging = false;
let ballState = 'ready'; 

function preload() {
    // 火花用パーティクル
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // --- 背景デザイン ---
    // 観客席と空
    this.add.rectangle(400, 100, 800, 200, 0x555555); // スタンド
    this.add.rectangle(400, 180, 800, 20, 0xffffff); // フェンス
    
    // スコアボード（中央）
    this.add.rectangle(400, 80, 200, 80, 0x002200);
    this.add.text(320, 50, 'GUEST 0\nKATO  ' + score, { fontSize: '20px', fill: '#0f0', fontFamily: 'Courier New' });

    // 遠近感のあるグラウンド
    let field = this.add.graphics();
    field.fillStyle(0x2e7d32, 1);
    field.fillPoints([{ x: 300, y: 200 }, { x: 500, y: 200 }, { x: 800, y: 600 }, { x: 0, y: 600 }], true);
    
    this.add.ellipse(400, 220, 100, 40, 0xcd853f); // マウンド
    this.add.ellipse(400, 550, 350, 120, 0xcd853f); // バッターボックス周辺

    // --- UI表示 ---
    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    outText = this.add.text(20, 60, 'OUT: ●●●', { fontSize: '24px', fill: '#f00' });
    messageText = this.add.text(400, 300, 'TAP TO START', { fontSize: '50px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);

    // --- ドット絵生成 ---
    // 加藤先生
    this.textures.generate('kato_dot', { data: ['..777..','.77777.','7717177','7777777','.72227.','..777..'], pixelWidth: 10 });
    // ピッチャー（青い服の敵）
    this.textures.generate('pitcher_dot', { data: ['..444..','.44444.','4414144','4444444','.45554.','..444..'], pixelWidth: 8 });
    this.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    this.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66'], pixelWidth: 12 });

    // キャラ配置
    pitcher = this.add.sprite(400, 190, 'pitcher_dot').setScale(2);
    batter = this.add.sprite(300, 500, 'kato_dot').setScale(3);
    bat = this.add.sprite(340, 500, 'bat_dot').setOrigin(0.5, 1).setScale(2);
    ball = this.add.sprite(400, 190, 'ball_dot').setScale(0.1).setVisible(false);
    
    this.particles = this.add.particles(0, 0, 'spark', { speed: 150, scale: { start: 2, end: 0 }, emitting: false });

    // 操作
    this.input.on('pointerdown', () => {
        if (ballState === 'ready') preparePitch.call(this);
        else if (!isSwinging && ballState === 'pitching') swingBat.call(this);
    });
}

function preparePitch() {
    ballState = 'wait';
    messageText.setText('');
    
    // ピッチャーの振りかぶり演出
    this.tweens.add({
        targets: pitcher,
        y: 170,
        duration: 400,
        yoyo: true,
        onComplete: () => startPitch.call(this)
    });
}

function startPitch() {
    ballState = 'pitching';
    ball.setVisible(true).setPosition(400, 190).setScale(0.1);
    
    const pitchType = Phaser.Math.Between(0, 2); // 0:直線, 1:カーブ, 2:フォーク
    let targetX = 400 + Phaser.Math.Between(-40, 40);
    let duration = 1000 - (score * 20); // スコアで加速

    let config = {
        targets: ball,
        x: targetX,
        y: 520,
        scale: 4,
        duration: Math.max(duration, 400),
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
    };

    // 変化球の動きを追加
    if (pitchType === 1) config.x += 150; // カーブ
    if (pitchType === 2) config.duration += 300; // フォーク（遅くなる）

    this.tweens.add(config);
}

function swingBat() {
    isSwinging = true;
    this.tweens.add({
        targets: bat,
        angle: -150,
        x: '-=50',
        duration: 100,
        yoyo: true,
        onComplete: () => { isSwinging = false; bat.angle = 0; bat.x = 340; }
    });

    if (ball.scale > 2.8 && ball.scale < 4.2 && ballState === 'pitching') {
        ballState = 'hit';
        score++;
        scoreText.setText('HOMERUNS: ' + score);
        messageText.setText('HOMERUN!!');
        this.cameras.main.shake(200, 0.03);
        this.particles.emitParticleAt(ball.x, ball.y, 30);

        this.tweens.add({
            targets: ball,
            y: -100,
            x: Phaser.Math.Between(0, 800),
            scale: 0.1,
            duration: 1000
        });
        this.time.delayedCall(2000, resetBall);
    }
}

function updateOutDisplay() {
    let dots = '';
    for(let i=0; i<3; i++) dots += (i < outCount) ? '○' : '●';
    outText.setText('OUT: ' + dots);
    if (outCount >= 3) {
        messageText.setText('GAME OVER');
        ballState = 'gameover';
        this.time.delayedCall(3000, () => { location.reload(); });
    }
}

function resetBall() {
    if (ballState !== 'gameover') {
        ballState = 'ready';
        messageText.setText('NEXT BATTLE');
        ball.setVisible(false);
    }
}

function update() {}
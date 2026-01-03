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
let ballState = 'ready'; 

// 加藤先生の語録リスト
const katoQuotes = ["よし！", "完璧だ！", "これが教育だ！", "フルスイング！", "熱血！"];

function preload() {
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // --- 豪華背景 ---
    this.add.rectangle(400, 100, 800, 200, 0x444444); // スタンド
    this.add.rectangle(400, 185, 800, 10, 0xaaaaaa); // フェンス
    
    // スコアボード
    this.add.rectangle(400, 70, 250, 100, 0x003300);
    this.add.text(300, 35, 'KATO  ' + score + '\nENEMY 0', { 
        fontSize: '24px', fill: '#0f0', fontFamily: 'Courier New', fontStyle: 'bold' 
    });

    // 遠近グラウンド
    let field = this.add.graphics();
    field.fillStyle(0x2e7d32, 1);
    field.fillPoints([{ x: 300, y: 200 }, { x: 500, y: 200 }, { x: 850, y: 600 }, { x: -50, y: 600 }], true);
    this.add.ellipse(400, 220, 120, 50, 0xcd853f); // マウンド
    this.add.ellipse(400, 560, 450, 150, 0xcd853f); // バッターボックス周辺

    // UI
    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    outText = this.add.text(20, 65, 'OUT: ●●●', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' });
    messageText = this.add.text(400, 300, 'TAP TO START', { fontSize: '60px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
    quoteText = this.add.text(400, 400, '', { fontSize: '40px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

    // ドット絵生成
    this.textures.generate('kato_dot', { data: ['..777..','.77777.','7717177','7777777','.72227.','..777..'], pixelWidth: 10 });
    this.textures.generate('pitcher_dot', { data: ['..444..','.44444.','4414144','4444444','.45554.','..444..'], pixelWidth: 8 });
    this.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    this.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66'], pixelWidth: 12 });

    // 配置 (右打ち設定)
    pitcher = this.add.sprite(400, 190, 'pitcher_dot').setScale(2);
    batter = this.add.sprite(320, 500, 'kato_dot').setScale(3);
    bat = this.add.sprite(350, 500, 'bat_dot').setOrigin(0.5, 0.9).setScale(2);
    ball = this.add.sprite(400, 190, 'ball_dot').setScale(0.1).setVisible(false);
    
    this.particles = this.add.particles(0, 0, 'spark', { speed: 200, scale: { start: 2, end: 0 }, emitting: false });

    this.input.on('pointerdown', () => {
        if (ballState === 'ready') preparePitch.call(this);
        else if (!isSwinging && ballState === 'pitching') swingBat.call(this);
    });
}

function preparePitch() {
    ballState = 'wait';
    messageText.setText('');
    quoteText.setText('');
    this.tweens.add({ targets: pitcher, y: 175, duration: 300, yoyo: true, onComplete: () => startPitch.call(this) });
}

function startPitch() {
    ballState = 'pitching';
    ball.setVisible(true).setPosition(400, 190).setScale(0.1);
    
    const pitchType = Phaser.Math.Between(0, 2); 
    let targetX = 400 + Phaser.Math.Between(-30, 30);
    let duration = 1100 - (score * 25); 

    let pitchConfig = {
        targets: ball,
        x: targetX,
        y: 530,
        scale: 4.5,
        duration: Math.max(duration, 350),
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

    if (pitchType === 1) pitchConfig.x += 160; // カーブ
    if (pitchType === 2) pitchConfig.duration += 400; // フォーク
    this.tweens.add(pitchConfig);
}

function swingBat() {
    isSwinging = true;
    
    // バットの回転方向を修正（反時計回りにスイング）
    this.tweens.add({
        targets: bat,
        angle: 150, // プラス方向に回転させることで正しくスイング
        x: '+=60',
        duration: 90,
        yoyo: true,
        onComplete: () => { isSwinging = false; bat.angle = 0; bat.x = 350; }
    });

    if (ball.scale > 3.0 && ball.scale < 4.8 && ballState === 'pitching') {
        ballState = 'hit';
        score++;
        scoreText.setText('HOMERUNS: ' + score);
        messageText.setText('HOMERUN!!');
        quoteText.setText(Phaser.Utils.Array.GetRandom(katoQuotes));

        // 振動（スマホのみ）
        if (navigator.vibrate) navigator.vibrate(100);

        this.cameras.main.shake(250, 0.04);
        this.particles.emitParticleAt(ball.x, ball.y, 40);

        this.tweens.add({
            targets: ball,
            y: -150,
            x: Phaser.Math.Between(-200, 1000),
            scale: 0.1,
            duration: 1200,
            ease: 'Power2'
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
        this.time.delayedCall(3000, () => { location.reload(); });
    }
}

function resetBall() {
    if (outCount < 3) {
        ballState = 'ready';
        messageText.setText('READY?');
        ball.setVisible(false);
    }
}

function update() {}
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

const katoQuotes = ["よし！", "完璧だ！", "これが教育だ！", "フルスイング！", "熱血！", "単位やるぞ！"];

function preload() {
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // --- 背景 ---
    this.add.rectangle(400, 100, 800, 200, 0x444444); 
    this.add.rectangle(400, 185, 800, 10, 0xaaaaaa); 
    
    this.add.rectangle(400, 70, 250, 100, 0x003300);
    this.add.text(300, 35, 'KATO  ' + score + '\nENEMY 0', { 
        fontSize: '24px', fill: '#0f0', fontFamily: 'Courier New', fontStyle: 'bold' 
    });

    let field = this.add.graphics();
    field.fillStyle(0x2e7d32, 1);
    field.fillPoints([{ x: 300, y: 200 }, { x: 500, y: 200 }, { x: 850, y: 600 }, { x: -50, y: 600 }], true);
    this.add.ellipse(400, 220, 120, 50, 0xcd853f); 
    this.add.ellipse(400, 560, 450, 150, 0xcd853f); 

    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    outText = this.add.text(20, 65, 'OUT: ●●●', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' });
    messageText = this.add.text(400, 300, 'TAP TO START', { fontSize: '60px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
    quoteText = this.add.text(400, 400, '', { fontSize: '40px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

    // --- リアルなドット絵データ (16x16) ---
    // 加藤先生（眼鏡、ネクタイ、熱血な表情）
    const katoRealData = [
        '....AAAAAA......',
        '...A111111A.....',
        '..A11111111A....',
        '..A17711771A....', // 7は眼鏡の縁
        '..A17211721A....', // 2は瞳
        '..A11111111A....',
        '..A11555511A....', // 5は口
        '...A111111A.....',
        '....A2222A......', // 2はネクタイの色
        '...A222222A.....',
        '..A22222222A....',
        '.A2222222222A...',
        '.A2222222222A...',
        '..A22222222A....',
        '...A22..22A.....',
        '....AA..AA......'
    ];
    // ピッチャー（少し不気味なライバル校の選手）
    const pitcherRealData = [
        '....BBBBBB......',
        '...B999999B.....',
        '..B99999999B....',
        '..B93399339B....', // 3は鋭い目
        '..B99999999B....',
        '..B99999999B....',
        '..B99444499B....',
        '...B999999B.....',
        '....C6666C......', // 6はユニフォームの青
        '...C666666C.....',
        '..C66666666C....',
        '.C6666666666C...',
        '.C6666666666C...',
        '..C66666666C....',
        '...C66..66C.....',
        '....CC..CC......'
    ];

    this.textures.generate('kato_real', { data: katoRealData, pixelWidth: 5 });
    this.textures.generate('pitcher_real', { data: pitcherRealData, pixelWidth: 4 });
    this.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    this.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66','66','66'], pixelWidth: 10 });

    // 配置
    pitcher = this.add.sprite(400, 190, 'pitcher_real');
    batter = this.add.sprite(320, 500, 'kato_real').setScale(1.5);
    bat = this.add.sprite(355, 500, 'bat_dot').setOrigin(0.5, 0.9).setScale(2);
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
    this.tweens.add({ targets: pitcher, scaleX: 1.2, duration: 200, yoyo: true, onComplete: () => startPitch.call(this) });
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
    };

    if (pitchType === 1) pitchConfig.x += 160; 
    if (pitchType === 2) pitchConfig.duration += 400; 
    this.tweens.add(pitchConfig);
}

function swingBat() {
    isSwinging = true;
    this.tweens.add({
        targets: bat,
        angle: 150, 
        x: '+=60',
        duration: 90,
        yoyo: true,
        onComplete: () => { isSwinging = false; bat.angle = 0; bat.x = 355; }
    });

    if (ball.scale > 3.0 && ball.scale < 4.8 && ballState === 'pitching') {
        ballState = 'hit';
        score++;
        scoreText.setText('HOMERUNS: ' + score);
        messageText.setText('HOMERUN!!');
        quoteText.setText(Phaser.Utils.Array.GetRandom(katoQuotes));

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
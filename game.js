const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
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

let ball;
let batter;
let bat;
let score = 0;
let scoreText;
let messageText;
let isSwinging = false;
let ballState = 'ready'; // ready, pitching, hit, missed

function preload() {
    // 火花用
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // 遠近感のあるグラウンド（台形っぽく描画）
    let field = this.add.graphics();
    field.fillStyle(0x2e7d32, 1);
    field.fillPoints([
        { x: 300, y: 200 }, { x: 500, y: 200 }, 
        { x: 800, y: 600 }, { x: 0, y: 600 }
    ], true);
    
    // マウンド
    this.add.ellipse(400, 220, 100, 40, 0xcd853f);
    // ホームベース付近
    this.add.ellipse(400, 550, 300, 100, 0xcd853f);

    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { 
        fontSize: '40px', fill: '#fff', fontFamily: 'Courier New', fontStyle: 'bold'
    });

    messageText = this.add.text(400, 200, 'CLICK TO START', {
        fontSize: '50px', fill: '#ffff00', fontFamily: 'Courier New', fontStyle: 'bold'
    }).setOrigin(0.5);

    // ドット絵生成
    this.textures.generate('kato_dot', { 
        data: ['..777..','.77777.','7717177','7777777','.72227.','..777..'], pixelWidth: 10 
    });
    this.textures.generate('ball_dot', { 
        data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 
    });
    this.textures.generate('bat_dot', { 
        data: ['66','66','66','66','66','66','66','66'], pixelWidth: 12 
    });

    // 加藤先生（手前）
    batter = this.add.sprite(300, 500, 'kato_dot').setScale(3);
    bat = this.add.sprite(340, 500, 'bat_dot').setOrigin(0.5, 1).setScale(2);

    // ボール（最初は奥に小さく配置）
    ball = this.add.sprite(400, 220, 'ball_dot').setScale(0.5);
    
    this.particles = this.add.particles(0, 0, 'spark', {
        speed: 150, scale: { start: 2, end: 0 }, emitting: false
    });

    this.input.on('pointerdown', () => {
        if (ballState === 'ready') {
            startPitch();
        } else if (!isSwinging && ballState === 'pitching') {
            swingBat.call(this);
        }
    });
}

function startPitch() {
    ballState = 'pitching';
    messageText.setText('');
    ball.setPosition(400, 220);
    ball.setScale(0.5);
    
    // 奥行きを出すアニメーション（奥から手前へ）
    this.tweens.add({
        targets: ball,
        x: 400 + Phaser.Math.Between(-50, 50), // 左右に少しブレる
        y: 520,
        scale: 4, // 手前に来るほど大きく
        duration: 800 + Math.random() * 400,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            if (ballState === 'pitching') {
                ballState = 'missed';
                messageText.setText('STRIKE!');
                this.time.delayedCall(1000, () => { ballState = 'ready'; messageText.setText('NEXT BALL'); });
            }
        }
    });
}

function swingBat() {
    isSwinging = true;

    // バットを振るアニメーション
    this.tweens.add({
        targets: bat,
        angle: -150,
        x: '-=50',
        duration: 100,
        yoyo: true,
        onComplete: () => {
            isSwinging = false;
            bat.angle = 0;
            bat.x = 340;
        }
    });

    // タイミング判定（ボールが手前に来ているか ＆ スケールが大きいか）
    if (ball.scale > 2.5 && ball.scale < 4.0 && ballState === 'pitching') {
        ballState = 'hit';
        score += 1;
        scoreText.setText('HOMERUNS: ' + score);
        messageText.setText('HOMERUN!!');
        
        this.cameras.main.shake(200, 0.03);
        this.particles.emitParticleAt(ball.x, ball.y, 30);

        // ボールが空高く飛んでいく演出
        this.tweens.add({
            targets: ball,
            y: -100,
            x: Phaser.Math.Between(0, 800),
            scale: 0.1,
            duration: 1000,
            ease: 'Power2'
        });

        this.time.delayedCall(2000, () => { ballState = 'ready'; messageText.setText('NEXT BALL'); });
    }
}

function update() {
    // 常に最新の状態を維持
}
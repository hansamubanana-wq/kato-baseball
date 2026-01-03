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
let combo = 0;
let scoreText;
let isSwinging = false;
let messageText;
let pitchSpeed = 400; // 初期速度

function preload() {
    // パーティクル（火花）用の白い四角形を作成
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // 背景デザイン
    this.add.rectangle(400, 300, 800, 600, 0x2e7d32); // 芝生
    this.add.circle(400, 300, 80, 0xcd853f); // マウンド
    this.add.rectangle(400, 520, 200, 100, 0xcd853f); // バッターボックスエリア

    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { 
        fontSize: '40px', 
        fill: '#ffffff',
        fontFamily: 'Courier New',
        fontStyle: 'bold'
    });

    messageText = this.add.text(400, 250, 'READY?', {
        fontSize: '60px',
        fill: '#ffff00',
        fontFamily: 'Courier New',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // --- ドット絵生成 ---
    this.textures.generate('kato_dot', { 
        data: ['..777..','.77777.','7717177','7777777','.72227.','..777..'], 
        pixelWidth: 10 
    });
    this.textures.generate('ball_dot', { 
        data: ['.FF.','FFFF','FFFF','.FF.'], 
        pixelWidth: 8 
    });
    this.textures.generate('bat_dot', { 
        data: ['66','66','66','66','66','66','66','66','66','66'], 
        pixelWidth: 10 
    });

    batter = this.add.sprite(400, 520, 'kato_dot').setScale(2);
    bat = this.add.sprite(435, 520, 'bat_dot').setOrigin(0.5, 1);
    ball = this.physics.add.sprite(400, -50, 'ball_dot');
    
    // パーティクル（ホームラン時の火花）の設定
    const particles = this.add.particles(0, 0, 'spark', {
        speed: 100,
        scale: { start: 2, end: 0 },
        blendMode: 'ADD',
        emitting: false
    });

    this.input.on('pointerdown', () => {
        if (!isSwinging) swingBat.call(this, particles);
    });

    this.time.delayedCall(1000, startPitch, [], this);
}

function startPitch() {
    isSwinging = false;
    bat.angle = 0;
    ball.setPosition(400 + (Phaser.Math.Between(-20, 20)), -50);
    ball.setAngularVelocity(0); // ボールの回転を止める
    
    // スコアが上がると速度アップ（最大1200まで）
    let currentSpeed = Math.min(pitchSpeed + (score * 20), 1200);
    ball.setVelocity(0, currentSpeed);
}

function swingBat(particles) {
    isSwinging = true;

    this.tweens.add({
        targets: bat,
        angle: -150,
        duration: 120,
        yoyo: true,
        onComplete: () => {
            if (ball.y < 600) isSwinging = false; // まだ画面内なら振り直し不可
        }
    });

    let distance = Phaser.Math.Distance.Between(ball.x, ball.y, bat.x, bat.y);
    
    // 当たり判定
    if (distance < 100 && ball.y > 400 && ball.y < 550) {
        // ヒット！
        score += 1;
        scoreText.setText('HOMERUNS: ' + score);
        messageText.setText('GREAT!!');
        messageText.setColor('#ff00ff');

        // ボールを飛ばす演出
        ball.setVelocity(Phaser.Math.Between(-400, 400), -1500);
        ball.setAngularVelocity(1000); // ボールを回転させる
        
        // 火花を散らす
        particles.emitParticleAt(ball.x, ball.y, 20);

        this.cameras.main.shake(200, 0.03);
        this.time.delayedCall(1500, startPitch, [], this);
    } else {
        // 空振りの瞬間は何もしない（updateで判定）
    }
}

function update() {
    if (ball.y > 580 && ball.y < 600 && !isSwinging) {
        messageText.setText('STRIKE!');
        messageText.setColor('#ff0000');
    }

    if (ball.y > 650) {
        startPitch();
    }
}
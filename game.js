const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false } // 当たり判定を確認したい時はここを true にすると枠が出ます
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
let isSwinging = false;
let messageText; // 「HOMERUN!」などの文字用

function preload() {
}

function create() {
    // 背景をグラウンドっぽく（土の色）
    this.add.rectangle(400, 300, 800, 600, 0x8b4513);
    // マウンド（円）
    this.add.circle(400, 300, 100, 0xcd853f);

    scoreText = this.add.text(20, 20, 'HOMERUN: 0', { 
        fontSize: '40px', 
        fill: '#00ff00',
        fontFamily: 'Courier New'
    });

    messageText = this.add.text(400, 300, '', {
        fontSize: '80px',
        fill: '#ffff00',
        fontFamily: 'Courier New',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    // --- ドット絵の生成 ---
    const katoData = [
        '..777..',
        '.77777.',
        '7717177',
        '7777777',
        '.72227.',
        '..777..'
    ];
    this.textures.generate('kato_dot', { data: katoData, pixelWidth: 10 });

    const ballData = [
        '.FF.',
        'FFFF',
        'FFFF',
        '.FF.'
    ];
    this.textures.generate('ball_dot', { data: ballData, pixelWidth: 8 });

    const batData = [
        '66', '66', '66', '66', '66', '66', '66', '66'
    ];
    this.textures.generate('bat_dot', { data: batData, pixelWidth: 10 });

    // キャラクター配置
    batter = this.add.sprite(400, 520, 'kato_dot').setScale(2);
    
    // バットを加藤先生の少し横に配置
    bat = this.add.sprite(430, 520, 'bat_dot');
    bat.setOrigin(0.5, 1); // 持ち手を支点にする

    ball = this.physics.add.sprite(400, -50, 'ball_dot');
    
    this.input.on('pointerdown', () => {
        if (!isSwinging) swingBat.call(this);
    });

    startPitch();
}

function startPitch() {
    messageText.setText('');
    ball.setPosition(400 + (Phaser.Math.Between(-30, 30)), -50);
    // ボールの速度を少し調整
    ball.setVelocity(0, 400);
}

function swingBat() {
    isSwinging = true;

    // バットを振るアニメーション（より大きく振る）
    this.tweens.add({
        targets: bat,
        angle: -150,
        duration: 100,
        yoyo: true,
        onComplete: () => {
            isSwinging = false;
            bat.angle = 0;
        }
    });

    // --- 当たり判定の修正 ---
    // ボールがバットの高さ（450px〜550px）にいる時にクリックしたらヒット
    // 距離の判定を 100 くらいまで広げて当てやすくします
    let distance = Phaser.Math.Distance.Between(ball.x, ball.y, bat.x, bat.y);
    
    if (distance < 100 && ball.y > 400 && ball.y < 560) {
        // ヒット成功！
        ball.setVelocity(Phaser.Math.Between(-300, 300), -1200);
        score += 1;
        scoreText.setText('HOMERUN: ' + score);
        
        // 演出
        messageText.setText('HOMERUN!!');
        this.cameras.main.shake(200, 0.02);
        this.cameras.main.flash(100, 255, 255, 255);
        
        // 2秒後に次へ
        this.time.delayedCall(2000, startPitch, [], this);
    }
}

function update() {
    // ボールが下に消えたら（空振り）
    if (ball.y > 650) {
        startPitch();
    }
}
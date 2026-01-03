const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d', // レトロな暗い背景
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
    pixelArt: true // ドット絵をクッキリ表示する設定
};

const game = new Phaser.Game(config);

let ball;
let batter;
let bat;
let score = 0;
let scoreText;
let isSwinging = false;

function preload() {
    // 今回は外部画像を使わず、プログラム内でドット絵を生成します
}

function create() {
    // スコア表示（レトロなフォント風）
    scoreText = this.add.text(20, 20, 'HOMERUN: 0', { 
        fontSize: '40px', 
        fill: '#00ff00',
        fontFamily: 'Courier New'
    });

    // --- ドット絵の生成 ---
    // 加藤先生（ドット絵風のテクスチャを作成）
    const katoData = [
        '..777..',
        '.77777.',
        '7717177',
        '7777777',
        '.72227.',
        '..777..'
    ];
    this.textures.generate('kato_dot', { data: katoData, pixelWidth: 10 });

    // ボール（ドット絵風）
    const ballData = [
        '.FF.',
        'FFFF',
        'FFFF',
        '.FF.'
    ];
    this.textures.generate('ball_dot', { data: ballData, pixelWidth: 8 });

    // バット（ドット絵風）
    const batData = [
        '66',
        '66',
        '66',
        '66',
        '66',
        '66'
    ];
    this.textures.generate('bat_dot', { data: batData, pixelWidth: 10 });

    // ----------------------

    // キャラクター配置
    batter = this.add.sprite(400, 520, 'kato_dot');
    batter.setScale(2);

    bat = this.add.sprite(450, 520, 'bat_dot');
    bat.setOrigin(0.5, 1); // 持ち手を支点にする

    ball = this.physics.add.sprite(400, -50, 'ball_dot');
    
    // クリック・タップでスイング
    this.input.on('pointerdown', () => {
        if (!isSwinging) swingBat.call(this);
    });

    startPitch();
}

function startPitch() {
    ball.setPosition(400 + (Math.random() * 40 - 20), 50);
    ball.setVelocity(0, 450);
}

function swingBat() {
    isSwinging = true;

    // バットを振るアニメーション
    this.tweens.add({
        targets: bat,
        angle: -120,
        duration: 150,
        yoyo: true,
        onComplete: () => {
            isSwinging = false;
            bat.angle = 0;
        }
    });

    // 当たり判定
    let distance = Phaser.Math.Distance.Between(ball.x, ball.y, bat.x, bat.y);
    if (distance < 60 && ball.y > 450 && ball.y < 550) {
        // ホームラン！
        ball.setVelocity(Phaser.Math.Between(-200, 200), -1000);
        score += 1;
        scoreText.setText('HOMERUN: ' + score);
        
        // 画面フラッシュ演出
        this.cameras.main.flash(100, 255, 255, 255);
        
        this.time.delayedCall(1500, startPitch, [], this);
    }
}

function update() {
    if (ball.y > 650) {
        startPitch();
    }
}
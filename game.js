const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let ball;
let bat;
let isPitching = false;
let score = 0;
let scoreText;

function preload() {
    // 仮の素材を生成（本来はここに加藤先生の画像を入れます）
    this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
}

function create() {
    // 背景（マウンドっぽく）
    this.add.rectangle(400, 300, 800, 600, 0x228b22);
    
    // スコア表示
    scoreText = this.add.text(16, 16, 'HomeRuns: 0', { fontSize: '32px', fill: '#fff' });

    // バッターボックス（下部）
    bat = this.add.rectangle(400, 550, 100, 20, 0xffffff);
    this.physics.add.existing(bat, true);

    // ボール
    ball = this.physics.add.sprite(400, -50, 'ball');
    
    // タップ・クリックでスイング
    this.input.on('pointerdown', () => {
        swingBat();
    });

    // 投球開始
    startPitch();
}

function startPitch() {
    ball.setPosition(400, 50);
    ball.setVelocity(0, 300 + Math.random() * 200); // 速度をランダムに
    isPitching = true;
}

function swingBat() {
    // スイング時にバットの色を変える（演出）
    bat.setFillStyle(0xff0000);
    setTimeout(() => bat.setFillStyle(0xffffff), 100);

    // 当たり判定
    let distance = Phaser.Math.Distance.Between(ball.x, ball.y, bat.x, bat.y);
    if (distance < 50 && ball.y > 500) {
        // ヒット！
        ball.setVelocity(Phaser.Math.Between(-200, 200), -800);
        score += 1;
        scoreText.setText('HomeRuns: ' + score);
        setTimeout(startPitch, 1000);
    }
}

function update() {
    // ボールが画面外（下）に行ったらリセット
    if (ball.y > 650) {
        startPitch();
    }
}
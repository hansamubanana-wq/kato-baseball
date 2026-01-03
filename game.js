const config = {
    type: Phaser.AUTO,
    width: window.innerWidth > 800 ? 800 : window.innerWidth,
    height: window.innerHeight > 600 ? 600 : window.innerHeight,
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
let batter;
let score = 0;
let scoreText;

function preload() {
    // ネット上の仮素材を使用
    this.load.image('ball', 'https://labs.phaser.io/assets/sprites/shinyball.png');
    this.load.image('stadium', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('kato', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
}

function create() {
    this.add.image(400, 300, 'stadium').setDisplaySize(800, 600);
    
    scoreText = this.add.text(16, 16, 'HomeRuns: 0', { 
        fontSize: '32px', 
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 6 
    });

    batter = this.physics.add.sprite(config.width / 2, config.height - 100, 'kato');
    batter.setScale(2);

    ball = this.physics.add.sprite(config.width / 2, -50, 'ball');
    
    this.input.on('pointerdown', () => {
        swingBat.call(this);
    });

    startPitch();
}

function startPitch() {
    ball.setPosition(config.width / 2, 50);
    ball.setVelocity(0, 400 + Math.random() * 300);
}

function swingBat() {
    this.tweens.add({
        targets: batter,
        angle: -45,
        duration: 100,
        yoyo: true
    });

    let distance = Phaser.Math.Distance.Between(ball.x, ball.y, batter.x, batter.y);
    if (distance < 80 && ball.y > batter.y - 50) {
        ball.setVelocity(Phaser.Math.Between(-300, 300), -1000);
        score += 1;
        scoreText.setText('HomeRuns: ' + score);
        this.cameras.main.shake(200, 0.01);
        setTimeout(startPitch, 1500);
    }
}

function update() {
    if (ball.y > config.height + 50) {
        startPitch();
    }
}
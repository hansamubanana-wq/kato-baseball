const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000',
    parent: 'game-container',
    physics: { default: 'arcade' },
    scene: { preload: preload, create: create, update: update },
    pixelArt: true
};

const game = new Phaser.Game(config);

let ball, batter, bat, pitcher, cursor;
let score = 0, outCount = 0, combo = 0;
let scoreText, messageText, outText, comboText;
let isSwinging = false;
let ballState = 'ready'; 
let targetPos = { x: 400, y: 530 };

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
    // プロスピ風のリアルなスタジアム演出
    let bg = this.add.graphics();
    bg.fillGradientStyle(0x000033, 0x000033, 0x003300, 0x003300, 1);
    bg.fillRect(0, 0, 800, 600);
    
    // フィールド
    let field = this.add.graphics();
    field.fillStyle(0x1a4a1a, 1);
    field.fillPoints([{ x: 300, y: 220 }, { x: 500, y: 220 }, { x: 900, y: 600 }, { x: -100, y: 600 }], true);
    
    // バッターボックスの円
    this.add.ellipse(400, 550, 400, 120, 0x8b4513, 0.5);

    generateCharacterTextures(this);

    // キャラクター
    pitcher = this.add.sprite(400, 200, 'pitcher_real');
    batter = this.add.sprite(300, 520, 'kato_real').setScale(1.8);
    bat = this.add.sprite(345, 520, 'bat_dot').setOrigin(0.5, 0.9).setScale(2.5);
    ball = this.add.sprite(400, 200, 'ball_dot').setScale(0.1).setVisible(false);
    
    // 投球カーソル（プロスピ風）
    cursor = this.add.circle(400, 530, 15, 0xffffff, 0.2);
    cursor.setStrokeStyle(2, 0xffffff, 0.5);
    cursor.setVisible(false);

    // 高級感のあるUI
    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { fontSize: '28px', fill: '#ffd700', fontStyle: 'bold' });
    outText = this.add.text(20, 55, 'OUT: ●●●', { fontSize: '20px', fill: '#ff4444' });
    comboText = this.add.text(20, 90, '', { fontSize: '24px', fill: '#00ffff' });
    messageText = this.add.text(400, 300, 'TAP TO START', { fontSize: '48px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    this.particles = this.add.particles(0, 0, 'spark', { speed: 250, scale: { start: 2, end: 0 }, emitting: false });

    // 操作改善：クリックした瞬間に振る！
    this.input.on('pointerdown', () => {
        if (ballState === 'ready') {
            startPitchSequence.call(this);
        } else if (ballState === 'pitching' && !isSwinging) {
            swingBat.call(this);
        }
    });
}

function generateCharacterTextures(scene) {
    const katoData = ['....AAAAAA......','...A111111A.....','..A11111111A....','..A17711771A....','..A17211721A....','..A11111111A....','..A11555511A....','...A111111A.....','....A2222A......','...A222222A.....','..A22222222A....','.A2222222222A...','.A2222222222A...','..A22222222A....','...A22..22A.....','....AA..AA......'];
    scene.textures.generate('kato_real', { data: katoData, pixelWidth: 5 });
    scene.textures.generate('pitcher_real', { data: katoData, pixelWidth: 4 }); // 敵もリアルに
    scene.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    scene.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66'], pixelWidth: 10 });
}

function startPitchSequence() {
    ballState = 'wait';
    messageText.setText('');
    
    // セットポジションの動き
    this.tweens.add({
        targets: pitcher,
        y: 190,
        duration: 400,
        yoyo: true,
        onComplete: () => throwBall.call(this)
    });
}

function throwBall() {
    ballState = 'pitching';
    ball.setVisible(true).setPosition(400, 200).setScale(0.1);
    
    // プロスピ風：着弾予測点をランダムに設定
    targetPos.x = 400 + Phaser.Math.Between(-60, 60);
    cursor.setPosition(targetPos.x, targetPos.y).setVisible(true).setAlpha(0);
    
    // 球種決定
    let rand = Phaser.Math.Between(0, 10);
    let duration = 900;
    let ease = 'Cubic.easeIn';

    if (rand > 8) { duration = 1400; ease = 'Sine.easeOut'; } // スローカーブ
    else if (rand > 6) { duration = 1100; targetPos.x += 100; } // シュート

    // 投球アニメーション
    this.tweens.add({
        targets: ball,
        x: targetPos.x,
        y: targetPos.y,
        scale: 5,
        duration: duration,
        ease: ease,
        onUpdate: (tween) => {
            if (tween.progress > 0.5) cursor.setAlpha(tween.progress - 0.5);
        },
        onComplete: () => {
            if (ballState === 'pitching') {
                ballState = 'missed';
                messageText.setText('STRIKE!');
                this.sound.play('out');
                outCount++;
                combo = 0;
                updateUI.call(this);
                this.time.delayedCall(1000, resetStage);
            }
        }
    });
}

function swingBat() {
    isSwinging = true;
    this.sound.play('swing', { volume: 0.5 });

    // スイングアニメーション
    this.tweens.add({
        targets: bat,
        angle: 160,
        x: '+=70',
        duration: 80,
        yoyo: true,
        onComplete: () => {
            isSwinging = false;
            bat.angle = 0;
            bat.x = 345;
        }
    });

    // 判定（プロスピ並みにシビアかつ爽快に）
    let dist = Phaser.Math.Distance.Between(ball.x, ball.y, bat.x + 50, bat.y - 20);
    if (ballState === 'pitching' && ball.scale > 3.2 && ball.scale < 4.8) {
        ballState = 'hit';
        score++;
        combo++;
        this.sound.play('hit');
        messageText.setText('HOMERUN!!');
        
        // 迫力のカメラシェイクとスロー
        this.cameras.main.shake(300, 0.05);
        this.particles.emitParticleAt(ball.x, ball.y, 50);

        this.tweens.add({
            targets: ball,
            x: ball.x + (ball.x - 400) * 5,
            y: -200,
            scale: 0.5,
            duration: 1500,
            ease: 'Power2'
        });

        updateUI.call(this);
        this.time.delayedCall(2000, resetStage);
    }
}

function updateUI() {
    scoreText.setText('HOMERUNS: ' + score);
    comboText.setText(combo > 1 ? combo + ' COMBO!' : '');
    let dots = '';
    for(let i=0; i<3; i++) dots += (i < outCount) ? '○' : '●';
    outText.setText('OUT: ' + dots);
    
    if (outCount >= 3) {
        messageText.setText('GAME OVER');
        this.time.delayedCall(3000, () => location.reload());
    }
}

function resetStage() {
    if (outCount < 3) {
        ballState = 'ready';
        messageText.setText('READY?');
        ball.setVisible(false);
        cursor.setVisible(false);
    }
}

function update() {}
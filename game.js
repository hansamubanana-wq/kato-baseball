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

let ball, batter, bat, pitcher, audience;
let score = 0;
let outCount = 0;
let scoreText, messageText, outText, quoteText;
let isSwinging = false;
let ballState = 'ready'; 

// 加藤先生の語録
const katoQuotes = ["よし！", "完璧だ！", "これが教育だ！", "フルスイング！", "熱血！", "単位やるぞ！"];

function preload() {
    // 音素材の読み込み（ネット上のフリー音源を仮に使用）
    this.load.audio('hit', 'https://labs.phaser.io/assets/audio/SoundEffects/p-town-spinnin.mp3'); // ヒット音代わり
    this.load.audio('swing', 'https://labs.phaser.io/assets/audio/SoundEffects/magical_get_item.mp3'); // スイング音代わり
    this.load.audio('out', 'https://labs.phaser.io/assets/audio/SoundEffects/alien_death.mp3'); // アウト音代わり

    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
}

function create() {
    // --- 背景と動く観客 ---
    this.add.rectangle(400, 100, 800, 200, 0x444444); // スタンド
    
    // 観客（ドットの集合体）を生成して動かす
    audience = this.add.group();
    for(let i=0; i<40; i++) {
        let x = Phaser.Math.Between(50, 750);
        let y = Phaser.Math.Between(50, 150);
        let person = this.add.rectangle(x, y, 10, 10, Phaser.Display.Color.RandomRGB().color);
        audience.add(person);
        // 観客をぴょんぴょん跳ねさせる
        this.tweens.add({
            targets: person,
            y: y - 5,
            duration: Phaser.Math.Between(300, 600),
            yoyo: true,
            repeat: -1
        });
    }

    this.add.rectangle(400, 185, 800, 10, 0xaaaaaa); // フェンス
    this.add.rectangle(400, 70, 250, 100, 0x003300);
    this.add.text(300, 35, 'KATO  ' + score + '\nENEMY 0', { fontSize: '24px', fill: '#0f0', fontFamily: 'Courier New', fontStyle: 'bold' });

    let field = this.add.graphics();
    field.fillStyle(0x2e7d32, 1);
    field.fillPoints([{ x: 300, y: 200 }, { x: 500, y: 200 }, { x: 850, y: 600 }, { x: -50, y: 600 }], true);
    this.add.ellipse(400, 220, 120, 50, 0xcd853f); 
    this.add.ellipse(400, 560, 450, 150, 0xcd853f); 

    // UI
    scoreText = this.add.text(20, 20, 'HOMERUNS: 0', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    outText = this.add.text(20, 65, 'OUT: ●●●', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' });
    messageText = this.add.text(400, 300, 'TAP TO START', { fontSize: '60px', fill: '#ff0', fontStyle: 'bold' }).setOrigin(0.5);
    quoteText = this.add.text(400, 400, '', { fontSize: '40px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

    // キャラクターのドット絵生成（前回と同じ）
    generateCharacterTextures(this);

    pitcher = this.add.sprite(400, 190, 'pitcher_real');
    batter = this.add.sprite(320, 500, 'kato_real').setScale(1.5);
    bat = this.add.sprite(355, 500, 'bat_dot').setOrigin(0.5, 0.9).setScale(2);
    ball = this.add.sprite(400, 190, 'ball_dot').setScale(0.1).setVisible(false);
    
    this.particles = this.add.particles(0, 0, 'spark', { speed: 200, scale: { start: 2, end: 0 }, emitting: false });

    // クリックイベント
    this.input.on('pointerdown', () => {
        if (ballState === 'ready') preparePitch.call(this);
        else if (!isSwinging && ballState === 'pitching') swingBat.call(this);
    });
}

function generateCharacterTextures(scene) {
    const katoRealData = ['....AAAAAA......','...A111111A.....','..A11111111A....','..A17711771A....','..A17211721A....','..A11111111A....','..A11555511A....','...A111111A.....','....A2222A......','...A222222A.....','..A22222222A....','.A2222222222A...','.A2222222222A...','..A22222222A....','...A22..22A.....','....AA..AA......'];
    const pitcherRealData = ['....BBBBBB......','...B999999B.....','..B99999999B....','..B93399339B....','..B99999999B....','..B99999999B....','..B99444499B....','...B999999B.....','....C6666C......','...C666666C.....','..C66666666C....','.C6666666666C...','.C6666666666C...','..C66666666C....','...C66..22C.....','....CC..CC......'];
    scene.textures.generate('kato_real', { data: katoRealData, pixelWidth: 5 });
    scene.textures.generate('pitcher_real', { data: pitcherRealData, pixelWidth: 4 });
    scene.textures.generate('ball_dot', { data: ['.FF.','FFFF','FFFF','.FF.'], pixelWidth: 8 });
    scene.textures.generate('bat_dot', { data: ['66','66','66','66','66','66','66','66','66','66'], pixelWidth: 10 });
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
        x: targetX, y: 530, scale: 4.5,
        duration: Math.max(duration, 300),
        ease: 'Cubic.easeIn',
        onComplete: () => {
            if (ballState === 'pitching') {
                ballState = 'missed';
                messageText.setText('STRIKE!');
                this.sound.play('out', { volume: 0.5 });
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
    this.sound.play('swing', { volume: 0.3 });

    this.tweens.add({
        targets: bat,
        angle: 150, x: '+=60', duration: 90, yoyo: true,
        onComplete: () => { isSwinging = false; bat.angle = 0; bat.x = 355; }
    });

    if (ball.scale > 3.0 && ball.scale < 4.8 && ballState === 'pitching') {
        ballState = 'hit';
        score++;
        this.sound.play('hit', { volume: 0.8 });
        scoreText.setText('HOMERUNS: ' + score);
        messageText.setText('HOMERUN!!');
        quoteText.setText(Phaser.Utils.Array.GetRandom(katoQuotes));

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        this.cameras.main.shake(250, 0.04);
        this.particles.emitParticleAt(ball.x, ball.y, 40);

        this.tweens.add({
            targets: ball,
            y: -150, x: Phaser.Math.Between(-200, 1000), scale: 0.1, duration: 1200, ease: 'Power2'
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
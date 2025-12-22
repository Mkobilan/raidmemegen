import { Scene } from 'phaser';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    init(data) {
        this.plan = data.plan;
        this.onClose = data.onClose;
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // --- Visual Loading Bar ---
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x1e293b, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 30,
            text: 'Loading...',
            style: { font: '20px Inter, sans-serif', fill: '#ffffff' }
        }).setOrigin(0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 + 25,
            text: '0%',
            style: { font: '18px monospace', fill: '#00ff88' }
        }).setOrigin(0.5);

        const assetText = this.make.text({
            x: width / 2,
            y: height / 2 + 70,
            text: '',
            style: { font: '14px monospace', fill: '#94a3b8' }
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0x00ff88, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
        });

        this.load.on('fileprogress', (file) => {
            assetText.setText('Loading: ' + file.key);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
        });

        this.load.on('loaderror', (file) => {
            console.error('Loader error on:', file.src);
            assetText.setText('Fail: ' + file.key + ' (Skipping)');
        });

        // --- Assets ---
        this.load.image('player', '/images/game/player.png');
        this.load.image('enemy', '/images/game/enemy.png');
        this.load.image('objective', '/images/game/objective.png');
        this.load.image('background', '/images/game/background.jpg');

        // Load basic particles (Local placeholders or internal generation)
        // Avoiding external labs.phaser.io URLs which can hang the loader in restricted environments

        // Load Audio Assets (Local to avoid CORS)
        this.load.audio('collect', '/audio/collect.mp3');
        this.load.audio('death', '/audio/death.mp3');
        this.load.audio('music', '/audio/music.mp3');
    }

    create() {
        // Generate internal particle textures to avoid external asset dependency
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x00ffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);

        graphics.clear();
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('red-particle', 8, 8);

        // Link close callback to game instance for RaidScene access
        this.game.onExternalClose = this.onClose;

        this.scene.start('RaidScene', { plan: this.plan });
    }
}

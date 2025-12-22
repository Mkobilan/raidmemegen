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

import { Scene } from 'phaser';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.image('player', '/images/game/player.jpg');
        this.load.image('enemy', '/images/game/enemy.jpg');
        this.load.image('objective', '/images/game/objective.jpg');
        this.load.image('background', '/images/game/background.jpg');

        // Load some basic particles
        this.load.image('particle', 'https://labs.phaser.io/assets/particles/blue.png');
        this.load.image('red-particle', 'https://labs.phaser.io/assets/particles/red.png');
    }

    create() {
        const plan = this.game.raidPlan;
        this.scene.start('RaidScene', { plan: plan });
    }
}

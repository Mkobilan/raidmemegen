import { BootScene } from './scenes/BootScene';
import { RaidScene } from './scenes/RaidScene';
import Phaser from 'phaser';

const StartGame = (parentContainerId, raidPlan, onClose) => {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: parentContainerId,
        backgroundColor: '#0f172a',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 }, // Top down logic, no gravity
                debug: false
            }
        },
        scene: [BootScene, RaidScene]
    };

    const game = new Phaser.Game(config);

    // Pass data to the scene immediately
    game.scene.start('BootScene');

    // We can't easily pass data to BootScene via start here because the Scene Manager isn't ready immediately sync.
    // Instead we attach it to the registry or use a delayed start.
    // Better yet, let BootScene start RaidScene, but how do we get the plan in?
    // We'll attach it to the game instance safely.
    game.raidPlan = raidPlan;
    game.onExternalClose = onClose;

    // Hacky but effective: Override BootScene start to pass data
    game.events.on('ready', () => {
        // game.scene.start('RaidScene', { plan: raidPlan });
        // Actually BootScene runs first.
    });

    // Let's modify BootScene to look for game.raidPlan

    return game;
}

export default StartGame;

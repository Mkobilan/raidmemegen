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
                gravity: { y: 0 },
                debug: false
            }
        },
        audio: {
            disableWebAudio: false,
            noAudio: false,
            context: null // Use default
        }
    };

    const game = new Phaser.Game(config);

    // Pass data directly to the first scene
    game.scene.add('BootScene', BootScene, true, {
        plan: raidPlan,
        onClose: onClose
    });

    // Add RaidScene but don't start it yet
    game.scene.add('RaidScene', RaidScene, false);

    return game;
}

export default StartGame;

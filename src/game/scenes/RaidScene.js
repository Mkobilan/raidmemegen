import { Scene } from 'phaser';
import { generateLevelFromPhase } from '../utils/LevelGenerator';

export class RaidScene extends Scene {
    constructor() {
        super('RaidScene');
        this.currentPhaseIndex = 0;
        this.score = 0;
        this.plan = null;
        this.isGameOver = false;
    }

    init(data) {
        this.plan = data.plan;
        this.currentPhaseIndex = data.phaseIndex || 0;
        this.score = data.score || 0;

        // Reset flags for fresh start on every phase
        this.isGameOver = false;
        this.isPlayerDead = false;
        this.isPhaseCompleting = false;
    }

    create() {
        if (!this.plan || !this.plan.phases) return;

        const phase = this.plan.phases[this.currentPhaseIndex];
        if (!phase) {
            this.winGame();
            return;
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Ensure physics is running
        this.physics.world.resume();
        this.physics.world.isPaused = false;
        this.physics.world.setBounds(0, 0, width, height);

        // --- Background ---
        this.add.tileSprite(0, 0, width, height, 'background').setOrigin(0).setAlpha(0.6);
        this.add.grid(width / 2, height / 2, width, height, 50, 50, 0x1f2937, 0).setAlpha(0.2);

        // --- UI ---
        this.add.text(20, 20, `Phase ${this.currentPhaseIndex + 1}: ${phase.name}`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Inter',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });

        this.objText = this.add.text(20, 50, 'Objectives Left: 0', {
            fontSize: '18px',
            fill: '#00ff88',
            fontFamily: 'Inter'
        });

        // --- Audio Setup ---
        if (this.cache.audio.exists('music')) {
            if (!this.sound.get('music')) {
                this.bgMusic = this.sound.add('music', { volume: 0.3, loop: true });
                this.bgMusic.play();
            } else {
                this.bgMusic = this.sound.get('music');
            }
        }

        // --- Exit & Audio Buttons ---
        const audioBtn = this.add.text(width - 90, 20, this.sound.mute ? '🔇' : '🔊', {
            fontSize: '24px',
            backgroundColor: '#111827',
            padding: { x: 8, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        audioBtn.on('pointerdown', () => {
            this.sound.mute = !this.sound.mute;
            audioBtn.setText(this.sound.mute ? '🔇' : '🔊');
        });

        const exitBtn = this.add.text(width - 40, 20, 'X', {
            fontSize: '32px',
            fill: '#ff4444',
            fontFamily: 'Inter',
            fontWeight: 'bold',
            backgroundColor: '#111827',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        exitBtn.on('pointerover', () => exitBtn.setStyle({ fill: '#ffffff', backgroundColor: '#ef4444' }));
        exitBtn.on('pointerout', () => exitBtn.setStyle({ fill: '#ff4444', backgroundColor: '#111827' }));
        exitBtn.on('pointerdown', () => {
            if (this.game.onExternalClose) this.game.onExternalClose();
        });

        // --- Level Generation ---
        const levelData = generateLevelFromPhase(phase, width, height);

        // --- Particles ---
        this.particles = this.add.particles(0, 0, 'particle', {
            speed: 100,
            scale: { start: 0.1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500
        });

        this.deathParticles = this.add.particles(0, 0, 'red-particle', {
            speed: 200,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 800,
            yielding: true
        });

        // --- Player ---
        this.player = this.physics.add.sprite(levelData.entities.playerStart.x, levelData.entities.playerStart.y, 'player');
        this.player.setDisplaySize(60, 60);
        this.player.body.setSize(400, 400);
        this.player.body.setOffset(312, 312);
        this.player.setCollideWorldBounds(true);
        this.player.setDrag(1000);
        this.speed = 350;

        // --- Objectives ---
        this.objectives = this.physics.add.group();
        levelData.entities.objectives.forEach(obj => {
            const sprite = this.physics.add.sprite(obj.x, obj.y, 'objective');
            sprite.setDisplaySize(45, 45);
            sprite.body.setImmovable(true);
            this.objectives.add(sprite);

            const label = this.add.text(obj.x, obj.y - 35, obj.label, {
                fontSize: '12px',
                fill: '#00ff88',
                fontFamily: 'Inter',
                backgroundColor: '#11182788',
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5);
            sprite.label = label;

            this.tweens.add({
                targets: sprite,
                displayWidth: 55,
                displayHeight: 55,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // --- Hazards ---
        this.hazards = this.physics.add.group();
        levelData.entities.hazards.forEach(haz => {
            const sprite = this.physics.add.sprite(haz.x, haz.y, 'enemy');
            this.hazards.add(sprite);

            sprite.setDisplaySize(53, 53);
            sprite.body.setSize(400, 400);
            sprite.body.setOffset(312, 312);

            // Re-apply velocity after group addition
            sprite.body.setVelocity(haz.vx, haz.vy);
            sprite.body.setBounce(1, 1);
            sprite.body.setCollideWorldBounds(true);
            sprite.body.setAllowGravity(false);
            sprite.body.setImmovable(false);
        });

        // --- Controls ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // --- Collisions ---
        this.physics.add.overlap(this.player, this.objectives, this.collectObjective, null, this);
        this.physics.add.overlap(this.player, this.hazards, this.hitHazard, null, this);
    }

    update() {
        if (this.isGameOver) return;
        if (!this.player || this.isPlayerDead) return;

        // Update Labels and Orientation
        this.objectives.getChildren().forEach(obj => {
            if (obj.label) { obj.label.setPosition(obj.x, obj.y - 35); }
        });
        this.hazards.getChildren().forEach(haz => {
            // Face movement direction (Flipped 180 degrees to face forward)
            if (haz.body && (haz.body.velocity.x !== 0 || haz.body.velocity.y !== 0)) {
                const angle = Math.atan2(haz.body.velocity.y, haz.body.velocity.x);
                haz.setRotation(angle - Math.PI / 2);
            }
        });

        this.objText.setText(`Objectives Left: ${this.objectives.countActive(true)}`);

        if (this.objectives.countActive(true) === 0) {
            this.completePhase();
        }

        // Movement
        this.player.body.setVelocity(0);
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -this.speed;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = this.speed;

        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -this.speed;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = this.speed;

        if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
        }

        this.player.body.setVelocity(vx, vy);

        if (vx !== 0 || vy !== 0) {
            this.player.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
            this.particles.emitParticleAt(this.player.x, this.player.y);
        }
    }

    collectObjective(player, objective) {
        if (objective.label) objective.label.destroy();
        if (this.cache.audio.exists('collect')) {
            this.sound.play('collect', { volume: 0.5 });
        }
        this.particles.explode(20, objective.x, objective.y);
        objective.destroy();
        this.score += 100;
        this.cameras.main.flash(200, 0, 255, 136, 0.2);
    }

    hitHazard(player, hazard) {
        if (this.isPlayerDead) return;
        this.isPlayerDead = true;
        if (this.cache.audio.exists('death')) {
            this.sound.play('death', { volume: 0.6 });
        }
        this.deathParticles.explode(50, this.player.x, this.player.y);
        this.cameras.main.shake(500, 0.02);
        this.cameras.main.flash(500, 255, 0, 0, 0.5);
        this.player.setVisible(false);
        this.player.body.enable = false;

        const text = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'WASTED', {
            fontSize: '84px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 10,
            fontFamily: 'Inter'
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: text,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: text,
                alpha: 0,
                scale: 2,
                duration: 500,
                onComplete: () => {
                    text.destroy();
                    this.respawnPlayer();
                }
            });
        });
    }

    respawnPlayer() {
        this.isPlayerDead = false;
        const phase = this.plan.phases[this.currentPhaseIndex];
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const levelData = generateLevelFromPhase(phase, width, height);

        this.player.setPosition(levelData.entities.playerStart.x, levelData.entities.playerStart.y);
        this.player.setVisible(true);
        this.player.body.enable = true;
        this.player.setAlpha(0);
        this.player.clearTint();

        this.tweens.add({
            targets: this.player,
            alpha: 1,
            duration: 500
        });
    }

    completePhase() {
        if (this.isPhaseCompleting) return;
        this.isPhaseCompleting = true;
        this.physics.pause();
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'PHASE CLEARED', {
            fontSize: '64px',
            fill: '#00ff88',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            fontFamily: 'Inter'
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            if (this.currentPhaseIndex + 1 < this.plan.phases.length) {
                this.isPhaseCompleting = false;
                this.scene.start('RaidScene', {
                    plan: this.plan,
                    phaseIndex: this.currentPhaseIndex + 1,
                    score: this.score
                });
            } else {
                this.winGame();
            }
        });
    }

    winGame() {
        this.isGameOver = true;
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000).setOrigin(0).setAlpha(0.85);
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, `RAID COMPLETED!\nScore: ${this.score}`, {
            fontSize: '64px',
            fill: '#ffd700',
            align: 'center',
            fontStyle: 'bold',
            fontFamily: 'Inter',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
    }
}

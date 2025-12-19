export const generateLevelFromPhase = (phase, width, height) => {
    // 1. Parse Phase Data
    const { name, text, roles, quip } = phase;

    // Extract [Target] and [Hazard] from text if possible, otherwise use defaults
    // Text format ex: "[role] stands on [target] plate while dodging [hazard]. Meme: [quip]"

    // We can try to extract these via regex if they were preserved, but since text is already compiled,
    // we might need to rely on random selection from the original lists if available, 
    // OR just use generic "Objective" and "Danger" if we can't easily parse back.

    // BETTER APPROACH for MVP:
    // Just use the phase Name as the "Theme".
    // Create random objectives and hazards.

    // Generate Entities
    const entities = {
        playerStart: { x: width / 2, y: height / 2 },
        objectives: [],
        hazards: []
    };

    // 2. Generate Objectives (3-5 per level)
    const objectiveCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < objectiveCount; i++) {
        entities.objectives.push({
            x: Math.random() * (width - 100) + 50,
            y: Math.random() * (height - 100) + 50,
            id: `obj-${i}`,
            label: 'GOAL' // Could replace with specific target keyword if we had it
        });
    }

    // 3. Generate Hazards (5-8 per level)
    const hazardCount = 5 + Math.floor(Math.random() * 5);
    let attempts = 0;
    while (entities.hazards.length < hazardCount && attempts < 50) {
        attempts++;
        const x = Math.random() * (width - 100) + 50;
        const y = Math.random() * (height - 100) + 50;

        // Safe Zone Check (Distance from center)
        const dist = Math.sqrt(Math.pow(x - (width / 2), 2) + Math.pow(y - (height / 2), 2));
        if (dist < 150) continue; // 150px Safe Zone

        // Ensure min speed
        const speed = 100 + Math.random() * 150;
        const angle = Math.random() * Math.PI * 2;

        entities.hazards.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            id: `haz-${entities.hazards.length}`,
            label: 'DANGER'
        });
    }

    return {
        theme: name,
        quip: quip,
        entities
    };
};

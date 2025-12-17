import { useState } from 'react';
import seedrandom from 'seedrandom';
import jsPDF from 'jspdf';
import localMemes from '../data/memes.json';
import raidsData from '../data/raids.json';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

export const useRaidGen = (user, pro, gensCount, onLimitReached) => {
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState(null);

    const fetchMeme = async (query) => {
        // Pro check: Use API if key exists, otherwise fallback/local
        // Actually, plan said Giphy API.
        if (!GIPHY_API_KEY) {
            console.warn('No Giphy API Key found, using local memes');
            const randomMeme = localMemes[Math.floor(Math.random() * localMemes.length)];
            return randomMeme.gif;
        }

        try {
            const offset = Math.floor(Math.random() * 50);
            const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=1&offset=${offset}&rating=pg-13`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                return data.data[0].images.original.url;
            }
        } catch (error) {
            console.error('Giphy API Error:', error);
        }
        // Fallback
        return localMemes[Math.floor(Math.random() * localMemes.length)].gif;
    };

    const generateRaid = async ({ game, raid, squadSize, vibe, incrementGens }) => {
        if (!raid) return;
        if (!user) {
            // Caller should handle auth check, but double check
            throw new Error('User not logged in');
        }
        if (!pro && gensCount >= 3) {
            onLimitReached();
            return;
        }

        setLoading(true);
        try {
            const seed = seedrandom(`${raid}-${Date.now()}`);
            const selectedRaidData = raidsData.find(r => r.raid === raid);

            const phasesPromises = selectedRaidData.phases.map(async (phase) => {
                const role = phase.roles[Math.floor(seed() * phase.roles.length)];
                const action = phase.actions[Math.floor(seed() * phase.actions.length)];
                const target = phase.targets[Math.floor(seed() * phase.targets.length)];
                const hazard = phase.hazards[Math.floor(seed() * phase.hazards.length)];
                const quip = phase.quips[Math.floor(seed() * phase.quips.length)];

                const generatedText = phase.baseTemplate
                    .replace('[role]', role)
                    .replace('[action]', action)
                    .replace('[target]', target)
                    .replace('[hazard]', hazard)
                    .replace('[quip]', quip);

                // Fetch meme based on the "vibe" + phase context
                const memeQuery = `${game} ${vibe === 'Meme Chaos' ? 'fail' : 'epic'} ${phase.name}`;
                const memeUrl = await fetchMeme(memeQuery);

                return {
                    name: phase.name,
                    text: generatedText,
                    time: Math.floor(seed() * 10 + 5),
                    meme: memeUrl, // New field!
                    quip: quip
                };
            });

            const phases = await Promise.all(phasesPromises);
            const title = squadSize < 4 ? `Short Stack ${vibe} Mode – No Rezzes!` : `${vibe} Fireteam Plan`;

            const newPlan = { title, phases, squadSize, game, raid, vibe, createdAt: new Date() };
            setPlan(newPlan);

            return newPlan; // Return success

        } catch (error) {
            console.error('Gen logic error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = (currentPlan) => { // Accept plan as arg or use state
        const p = currentPlan || plan;
        if (!p) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;

        // Cyberpunk BG
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        doc.setFont('helvetica', 'bold'); // Orbitron not standard in jsPDF without importing font file, sticking to helvetica bold
        doc.setFontSize(22);
        doc.setTextColor(0, 255, 136); // raid-neon
        doc.text(p.title, margin, 20);

        let yPos = 35;

        p.phases.forEach((phase, index) => {
            if (yPos > 250) {
                doc.addPage();
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            doc.text(`${index + 1}. ${phase.name} (${phase.time} mins)`, margin, yPos);
            yPos += 7;

            doc.setFontSize(11);
            doc.setTextColor(200, 200, 200);
            const splitText = doc.splitTextToSize(phase.text, pageWidth - (margin * 2));
            doc.text(splitText, margin, yPos);

            yPos += (splitText.length * 5) + 10;
        });

        doc.save('raid-plan.pdf');
    };

    const clearPlan = () => setPlan(null);

    return {
        plan,
        setPlan, // exposed for loadSavedRaid
        loading,
        generateRaid,
        exportPDF,
        clearPlan
    };
};

let currentCase = null;
let currentScene = null;
const playerData = {
    name: 'Детектив',
    currentCase: null,
    collectedClues: [],
    interrogationLog: []
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadCaseData();
    document.getElementById('start-case-btn').addEventListener('click', startCase);
});

async function loadCaseData() {
    try {
        const response = await fetch('cases/free/hotel_murder.json?v=' + Date.now());
        currentCase = await response.json();
        document.getElementById('main-menu').style.display = 'block';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('ending-screen').style.display = 'none';
    } catch (error) {
        console.error('Ошибка загрузки дела:', error);
    }
}

function startCase() {
    playerData.collectedClues = [];
    playerData.interrogationLog = [];
    playerData.currentCase = currentCase.id;

    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('ending-screen').style.display = 'none';

    showScene(currentCase.startScene);
}

function showScene(sceneId) {
    const scene = currentCase.scenes[sceneId];
    if (!scene) {
        console.error(`Сцена ${sceneId} не найдена!`);
        return;
    }
    currentScene = sceneId;

    document.getElementById('case-title').textContent = currentCase.title;
    document.getElementById('scene-text').innerHTML = scene.text.replace(/{name}/g, playerData.name);

    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';

    if (scene.choices && scene.choices.length > 0) {
        scene.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.textContent = choice.text;

            button.addEventListener('click', () => {
                if (choice.clue && !playerData.collectedClues.includes(choice.clue)) {
                    playerData.collectedClues.push(choice.clue);
                }
                if (choice.next) {
                    showScene(choice.next);
                } else if (scene.final) {
                    showEnding(sceneId);
                }
            });

            choicesContainer.appendChild(button);
        });
    } else if (scene.final) {
        showEnding(sceneId);
    }

    updateCluesUI();
}

function updateCluesUI() {
    const totalClues = currentCase.cluesToSolve;
    const foundClues = playerData.collectedClues.length;
    document.getElementById('clue-counter').textContent = `🔍 Улик: ${foundClues}/${totalClues}`;
}

function showEnding(finalSceneId) {
    const ending = currentCase.scenes[finalSceneId];
    if (!ending) return;

    const endings = {
        good: ["Дело раскрыто!", "Вы нашли настоящего преступника!"],
        neutral: ["Частичный успех", "Вы ошиблись с подозреваемым, но преступление почти раскрыто"],
        bad: ["Провал", "Вы посадили невиновного, а преступник на свободе"]
    };

    const type = ending.result || 'bad';
    const [title, text] = endings[type];

    document.getElementById('ending-title').textContent = title;
    document.getElementById('ending-text').textContent = text;

    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'block';
}

function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

let currentCase = null;
let currentScene = null;
const playerData = {
    name: 'Детектив',
    currentCase: null,
    collectedClues: [],
    interrogationLog: []
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadCasesList();
});

async function loadCasesList() {
    try {
        const response = await fetch('cases/cases-list.json');
        const cases = await response.json();
        const casesList = document.getElementById('cases-list');
        casesList.innerHTML = '';

        cases.forEach(c => {
            const caseItem = document.createElement('div');
            caseItem.className = 'case-item';
            caseItem.innerHTML = `
                <h3>${c.title}</h3>
                <p>${c.description}</p>
                <button class="start-case-btn" data-case="${c.id}">🔍 Начать</button>
            `;
            casesList.appendChild(caseItem);
        });

        document.querySelectorAll('.start-case-btn').forEach(btn => {
            btn.addEventListener('click', () => startCase(btn.dataset.case));
        });

    } catch (e) {
        console.error('Ошибка загрузки списка дел:', e);
    }
}

async function startCase(caseId) {
    try {
        const response = await fetch(`cases/free/${caseId}.json`);
        currentCase = await response.json();

        playerData.collectedClues = [];
        playerData.interrogationLog = [];
        playerData.currentCase = currentCase.id;

        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('ending-screen').style.display = 'none';

        showScene(currentCase.startScene);

    } catch (e) {
        console.error('Ошибка загрузки дела:', e);
        alert('Не удалось загрузить дело. Попробуйте позже.');
    }
}

function showScene(sceneId) {
    const scene = currentCase.scenes[sceneId];
    if (!scene) return console.error('Сцена не найдена:', sceneId);

    currentScene = sceneId;

    document.getElementById('case-title').textContent = currentCase.title;
    document.getElementById('scene-text').innerHTML = scene.text.replace(/{name}/g, playerData.name);

    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';

    if (scene.choices && scene.choices.length > 0) {
        scene.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;

            btn.addEventListener('click', () => {
                if (choice.clue && !playerData.collectedClues.includes(choice.clue)) {
                    playerData.collectedClues.push(choice.clue);
                }

                if (choice.next) {
                    showScene(choice.next);
                } else if (scene.final) {
                    showEnding(sceneId);
                }
            });

            choicesContainer.appendChild(btn);
        });
    } else if (scene.final) {
        showEnding(sceneId);
    }

    updateCluesUI();
}

function updateCluesUI() {
    const totalClues = currentCase.cluesToSolve || 0;
    const foundClues = playerData.collectedClues.length;
    document.getElementById('clue-counter').textContent = `🔍 Улик: ${foundClues}/${totalClues}`;
}

function showEnding(finalSceneId) {
    const ending = currentCase.scenes[finalSceneId];
    if (!ending) return;

    let endingType = 'bad';
    if (ending.result === 'good') endingType = 'good';
    else if (ending.result === 'neutral') endingType = 'neutral';

    const endings = {
        good: ["Дело раскрыто!", "Вы нашли настоящего преступника!"],
        neutral: ["Частичный успех", "Вы ошиблись с подозреваемым, но преступление почти раскрыто"],
        bad: ["Провал", "Вы посадили невиновного, а преступник на свободе"]
    };

    const [title, text] = endings[endingType];

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

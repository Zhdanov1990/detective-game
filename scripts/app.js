let currentCase = null;
let currentScene = null;
const playerData = {
    name: 'Детектив',
    currentCase: null,
    collectedClues: [],
    interrogationLog: {} // {suspectId: [false, false]}
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadCases();
});

async function loadCases() {
    try {
        const response = await fetch('cases/free/hotel_murder.json');
        currentCase = await response.json();

        // Инициализация логов для подозреваемых
        currentCase.suspects.forEach(s => {
            if (!playerData.interrogationLog[s.id]) {
                playerData.interrogationLog[s.id] = Array(s.dialogs.length).fill(false);
            }
        });

        document.getElementById('main-menu').style.display = 'block';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('ending-screen').style.display = 'none';

        renderCasesList();
    } catch (error) {
        console.error('Ошибка загрузки дела:', error);
    }
}

function renderCasesList() {
    const casesList = document.getElementById('cases-list');
    casesList.innerHTML = `
        <div class="case-item" onclick="startCase()">
            <h3>${currentCase.title}</h3>
            <p>${currentCase.description}</p>
        </div>
    `;
}

function startCase() {
    playerData.collectedClues = [];
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('ending-screen').style.display = 'none';
    showScene(currentCase.startScene);
}

function showScene(sceneId) {
    const scene = currentCase.scenes[sceneId];
    if (!scene) return;

    currentScene = sceneId;

    document.getElementById('case-title').textContent = currentCase.title;
    document.getElementById('scene-text').innerHTML = scene.text.replace(/{name}/g, playerData.name);

    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';

    // Добавляем диалоги с подозреваемыми
    if (scene.suspects && scene.suspects.length > 0) {
        scene.suspects.forEach(suspectId => {
            const suspect = currentCase.suspects.find(s => s.id === suspectId);
            const doneAll = playerData.interrogationLog[suspectId].every(d => d);
            if (!doneAll) {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.textContent = `Допросить ${suspect.name}`;
                btn.addEventListener('click', () => showInterrogation(suspectId));
                choicesContainer.appendChild(btn);
            }
        });
    }

    // Продолжить по сюжету
    if (scene.next) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'choice-btn';
        nextBtn.textContent = '↪️ Продолжить';
        nextBtn.addEventListener('click', () => showScene(scene.next));
        choicesContainer.appendChild(nextBtn);
    }

    updateCluesUI();
}

function showInterrogation(suspectId) {
    const suspect = currentCase.suspects.find(s => s.id === suspectId);
    const done = playerData.interrogationLog[suspectId];

    const availableIndex = done.findIndex(d => !d);
    if (availableIndex === -1) return;

    showDialog(suspectId, availableIndex);
}

function showDialog(suspectId, index) {
    const suspect = currentCase.suspects.find(s => s.id === suspectId);
    const dialog = suspect.dialogs[index];

    document.getElementById('scene-text').innerHTML = dialog.text.replace(/{name}/g, playerData.name);

    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';

    // Сбор улик
    if (dialog.clue && !playerData.collectedClues.includes(dialog.clue)) {
        playerData.collectedClues.push(dialog.clue);
    }

    // Следующий диалог
    const nextBtn = document.createElement('button');
    nextBtn.className = 'choice-btn';
    nextBtn.textContent = '➡️ Следующий диалог';
    nextBtn.addEventListener('click', () => {
        playerData.interrogationLog[suspectId][index] = true;
        showInterrogation(suspectId);
    });
    choicesContainer.appendChild(nextBtn);

    // Назад к сцене
    const backBtn = document.createElement('button');
    backBtn.className = 'choice-btn';
    backBtn.textContent = '↩️ Вернуться к сцене';
    backBtn.addEventListener('click', () => showScene(currentScene));
    choicesContainer.appendChild(backBtn);

    updateCluesUI();
}

function updateCluesUI() {
    const totalClues = currentCase.cluesToSolve;
    const foundClues = playerData.collectedClues.length;
    document.getElementById('clue-counter').textContent = `🔍 Улик: ${foundClues}/${totalClues}`;
}

function showEnding(sceneId) {
    const ending = currentCase.scenes[sceneId];
    if (!ending) return;

    document.getElementById('ending-title').textContent = ending.title || 'Расследование завершено';
    document.getElementById('ending-text').textContent = ending.text || '';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'block';
}

function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

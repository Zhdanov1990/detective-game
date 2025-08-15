let currentCase = null;
let currentScene = null;
const playerData = {
    name: 'Детектив',
    stars: 50,
    unlockedCases: ['hotel_murder'],
    currentCase: null,
    collectedClues: [],
    interrogationLog: [],
    caseProgress: {}
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        playerData.name = window.Telegram.WebApp.initDataUnsafe.user.first_name || playerData.name;
    }
    
    const savedData = localStorage.getItem('detectiveSave');
    if (savedData) {
        try {
            Object.assign(playerData, JSON.parse(savedData));
        } catch (e) {
            console.error('Error loading save:', e);
        }
    }
    
    await loadCases();
    setupAboutModal();
    setupDonateButton();
});

async function loadCases() {
    try {
        const response = await fetch('cases/cases-list.json');
        const cases = await response.json();
        const casesList = document.getElementById('cases-list');
        casesList.innerHTML = '';

        cases.forEach(caseItem => {
            const isUnlocked = playerData.unlockedCases.includes(caseItem.id);
            const progress = playerData.caseProgress[caseItem.id]?.progress || 0;
            
            const caseElement = document.createElement('div');
            caseElement.className = `case-item ${isUnlocked ? '' : 'locked'}`;
            caseElement.innerHTML = `
                <div class="case-content">
                    <h3>${caseItem.title}</h3>
                    <p>${caseItem.description}</p>
                    ${progress > 0 ? `
                    <div class="progress-bar">
                        <div style="width:${progress}%"></div>
                    </div>` : ''}
                    <div class="case-buttons">
                        ${!isUnlocked ? `
                        <button class="unlock-btn" data-case="${caseItem.id}" data-price="${caseItem.price}">
                            🔓 Разблокировать (${caseItem.price} ⭐)
                        </button>` : ''}
                        <button class="play-btn" data-case="${caseItem.id}">
                            ${progress > 0 ? '↪️ Продолжить' : '🔍 Начать'}
                        </button>
                    </div>
                </div>
            `;
            
            casesList.appendChild(caseElement);
        });

        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', () => startCase(btn.dataset.case));
        });

        document.querySelectorAll('.unlock-btn').forEach(btn => {
            btn.addEventListener('click', () => unlockCase(btn.dataset.case, parseInt(btn.dataset.price)));
        });

        document.getElementById('stars-count').textContent = playerData.stars;
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

async function startCase(caseId) {
    try {
        const response = await fetch(`cases/free/${caseId}.json`);
        currentCase = await response.json();
        
        if (playerData.currentCase === caseId && playerData.caseProgress[caseId]) {
            playerData.collectedClues = playerData.caseProgress[caseId].clues || [];
            playerData.interrogationLog = playerData.caseProgress[caseId].log || [];
        } else {
            playerData.collectedClues = [];
            playerData.interrogationLog = [];
        }
        
        playerData.currentCase = caseId;
        saveGame();
        
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('ending-screen').style.display = 'none';
        
        const startScene = playerData.caseProgress[caseId]?.currentScene || currentCase.startScene;
        showScene(startScene);
    } catch (error) {
        console.error('Error loading case:', error);
        alert('Ошибка загрузки дела. Попробуйте позже.');
    }
}

function showScene(sceneId) {
    const scene = currentCase.scenes[sceneId];
    if (!scene) {
        console.error(`Scene ${sceneId} not found!`);
        returnToMenu();
        return;
    }
    
    currentScene = sceneId;
    saveGame();
    
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
                    updateCluesUI();
                }
                
                if (choice.ending) {
                    showEnding(choice.ending, sceneId);
                } else if (choice.next) {
                    showScene(choice.next);
                }
            });
            
            choicesContainer.appendChild(button);
        });
    }

    updateCluesUI();
}

function showEnding(endingType, sceneId) {
    const endingScenes = {
        good: ["Отличное расследование!", "Вы правильно вычислили преступника.", 30],
        neutral: ["Частичный успех", "Вы выбрали не совсем верного подозреваемого.", 15],
        bad: ["Провал", "Вы ошиблись, преступник остался на свободе.", 5]
    };

    const ending = endingScenes[endingType];

    document.getElementById('ending-title').textContent = ending[0];
    document.getElementById('ending-text').textContent = currentCase.scenes[sceneId]?.text || '';
    document.getElementById('ending-stats').innerHTML = `
        <p>🔍 Собрано улик: ${playerData.collectedClues.length}/${currentCase.cluesToSolve}</p>
        <p>👥 Допросов: ${playerData.interrogationLog.length}</p>
        <p>⭐ Получено звёзд: +${ending[2]}</p>
        <p>⚖️ Итог: ${ending[1]}</p>
    `;

    playerData.stars += ending[2];
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'block';

    playerData.currentCase = null;
    delete playerData.caseProgress[currentCase.id];
    saveGame();
}

function updateCluesUI() {
    const cluesCount = playerData.collectedClues.length;
    const totalClues = currentCase.cluesToSolve;
    document.getElementById('clue-counter').textContent = `🔍 Улик: ${cluesCount}/${totalClues}`;
    
    if (currentCase && playerData.currentCase) {
        const progress = Math.min(100, Math.round((cluesCount / totalClues) * 100));
        playerData.caseProgress[playerData.currentCase] = {
            progress,
            currentScene,
            clues: [...playerData.collectedClues],
            log: [...playerData.interrogationLog]
        };
        saveGame();
    }
}

function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    
    if (playerData.currentCase) {
        saveGame();
    }
    
    loadCases();
}

function saveGame() {
    localStorage.setItem('detectiveSave', JSON.stringify(playerData));
}

function setupAboutModal() {
    const modal = document.getElementById('about-modal');
    const btn = document.getElementById('about-btn');
    const closeBtn = modal.querySelector('.close-btn');

    btn.addEventListener('click', () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

function setupDonateButton() {
    document.getElementById('donate-btn').addEventListener('click', () => {
        playerData.stars += 50;
        saveGame();
        document.getElementById('stars-count').textContent = playerData.stars;
    });
}

async function unlockCase(caseId, price) {
    if (playerData.stars < price) {
        alert(`Недостаточно звёзд! Нужно: ${price}, у вас: ${playerData.stars}`);
        return;
    }
    
    playerData.stars -= price;
    playerData.unlockedCases.push(caseId);
    saveGame();
    loadCases();
    alert(`Сюжет "${caseId}" разблокирован!`);
}

let currentCase = null;
let currentScene = null;
let playerData = {
    name: 'Детектив',
    stars: 50,
    unlockedCases: ['hotel_murder'],
    currentCase: null,
    collectedClues: [],
    interrogationLog: [],
    caseProgress: {}
};

document.addEventListener('DOMContentLoaded', async () => {
    // Определяем пользователя Telegram
    if (window.Telegram.WebApp.initDataUnsafe.user) {
        playerData.name = window.Telegram.WebApp.initDataUnsafe.user.first_name || playerData.name;
    }
    
    // Проверяем сохраненные данные
    const savedData = localStorage.getItem('detectiveSave');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            playerData = {...playerData, ...parsedData};
        } catch (e) {
            console.error('Error parsing saved data:', e);
        }
    }
    
    await loadCases();
    setupDonateButton();
    setupAboutModal();
    setupCluesModal();
    
    // Если есть активное дело, показываем кнопку продолжения
    if (playerData.currentCase) {
        document.getElementById('continue-btn').style.display = 'block';
    }
    
    // Кнопка просмотра улик
    document.getElementById('clues-btn').addEventListener('click', showCluesModal);
});

async function loadCases() {
    try {
        const response = await fetch('cases/cases-list.json');
        const cases = await response.json();
        const casesList = document.getElementById('cases-list');
        casesList.innerHTML = '';

        for (const caseItem of cases) {
            const caseElement = document.createElement('div');
            caseElement.className = `case-item ${playerData.unlockedCases.includes(caseItem.id) ? '' : 'locked'}`;
            
            // Проверяем прогресс по этому делу
            const progress = playerData.caseProgress[caseItem.id] || 0;
            const progressBar = progress > 0 ? `<div class="progress-bar"><div style="width:${progress}%"></div></div>` : '';
            
            caseElement.innerHTML = `
                <div class="case-content">
                    <h3>${caseItem.title}</h3>
                    <p>${caseItem.description}</p>
                    ${progressBar}
                    <div class="case-buttons">
                        ${!playerData.unlockedCases.includes(caseItem.id) ? 
                        `<button class="unlock-btn" data-case="${caseItem.id}" 
                                data-price="${caseItem.price}">
                            🔓 Разблокировать (${caseItem.price} ⭐)
                        </button>` : ''}
                        <button class="play-btn" data-case="${caseItem.id}">
                            ${progress > 0 ? '↪️ Продолжить' : '🔍 Начать'}
                        </button>
                    </div>
                </div>
            `;
            
            casesList.appendChild(caseElement);
        }

        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const caseId = e.target.dataset.case;
                await startCase(caseId);
            });
        });

        document.querySelectorAll('.unlock-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const caseId = e.target.dataset.case;
                const price = parseInt(e.target.dataset.price);
                await unlockCase(caseId, price);
            });
        });
        
        // Обновляем счетчик звезд
        document.getElementById('stars-count').textContent = playerData.stars;
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

async function startCase(caseId) {
    try {
        const path = `cases/${caseId.includes('premium') ? 'premium' : 'free'}/${caseId}.json`;
        const response = await fetch(path);
        currentCase = await response.json();
        
        // Восстанавливаем прогресс если есть
        if (playerData.currentCase === caseId && playerData.caseProgress[caseId]) {
            playerData.collectedClues = playerData.caseProgress[caseId].clues || [];
            playerData.interrogationLog = playerData.caseProgress[caseId].log || [];
        } else {
            playerData.collectedClues = [];
            playerData.interrogationLog = [];
        }
        
        playerData.currentCase = caseId;
        
        // Сохраняем прогресс
        localStorage.setItem('detectiveSave', JSON.stringify(playerData));
        
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('ending-screen').style.display = 'none';
        
        // Загружаем сцену
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
        console.error(`Scene not found: ${sceneId}`);
        showEnding();
        return;
    }
    
    currentScene = sceneId;
    
    // Сохраняем текущую сцену в прогресс
    if (playerData.currentCase) {
        playerData.caseProgress[playerData.currentCase] = {
            currentScene: sceneId,
            clues: [...playerData.collectedClues],
            log: [...playerData.interrogationLog]
        };
        localStorage.setItem('detectiveSave', JSON.stringify(playerData));
    }
    
    document.getElementById('case-title').textContent = currentCase.title;
    
    // Обновленный блок с анимацией текста
    const sceneTextElement = document.getElementById('scene-text');
    sceneTextElement.innerHTML = scene.text.replace(/{name}/g, playerData.name);
    sceneTextElement.style.animation = 'none'; // Сбрасываем анимацию
    
    // Запускаем анимацию после небольшой задержки
    setTimeout(() => {
        sceneTextElement.style.animation = 'fadeIn 0.8s ease-out forwards';
    }, 10);
    
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    if (scene.choices) {
        scene.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.innerHTML = choice.text;
            
            // Проверяем, доступен ли выбор
            if (choice.requiredClue && !playerData.collectedClues.includes(choice.requiredClue)) {
                button.disabled = true;
                button.title = `Требуется улика: "${choice.requiredClue}"`;
                button.classList.add('disabled-choice');
            }
            
            button.onclick = () => {
                // Добавляем улику если она есть
                if (choice.clue) {
                    playerData.collectedClues.push(choice.clue);
                    updateCluesUI();
                    
                    // Анимируем новую улику
                    const cluesBtn = document.getElementById('clues-btn');
                    cluesBtn.classList.add('new-clue');
                    setTimeout(() => cluesBtn.classList.remove('new-clue'), 2000);
                }
                
                // Логируем допросы
                if (choice.text.includes('❓')) {
                    const characterMatch = scene.text.match(/<b>(.*?)<\/b>/);
                    const character = characterMatch ? characterMatch[1] : "Неизвестный";
                    
                    playerData.interrogationLog.push({
                        character: character,
                        question: choice.text.replace('❓', '').trim(),
                        answer: choice.response || "Ответ не записан"
                    });
                }
                
                // Сохраняем прогресс
                localStorage.setItem('detectiveSave', JSON.stringify(playerData));
                
                // Переходим к следующей сцене
                showScene(choice.next);
            };
            choicesContainer.appendChild(button);
        });
    } else if (scene.final) {
        showEnding(sceneId);
    } else {
        // Если нет выбора и это не финал - показываем ошибку
        console.error('No choices and not final scene:', sceneId);
        returnToMenu();
    }
    
    // Обновляем счетчик улик
    updateCluesUI();
}

function showEnding(endingScene = "bad_ending") {
    const ending = currentCase.scenes[endingScene];
    
    if (!ending) {
        console.error(`Ending scene not found: ${endingScene}`);
        returnToMenu();
        return;
    }
    
    document.getElementById('ending-title').textContent = 
        endingScene.includes('true') ? 'Дело раскрыто!' :
        endingScene.includes('good') ? 'Успех!' : 
        endingScene.includes('neutral') ? 'Компромисс' : 'Провал';
    
    // Анимация для текста концовки
    const endingTextElement = document.getElementById('ending-text');
    endingTextElement.innerHTML = ending.text;
    endingTextElement.style.animation = 'none';
    setTimeout(() => {
        endingTextElement.style.animation = 'fadeIn 0.8s ease-out forwards';
    }, 10);
    
    // Награда за прохождение
    let starsEarned = 0;
    if (endingScene.includes('true')) starsEarned = 30;
    else if (endingScene.includes('good')) starsEarned = 20;
    else if (endingScene.includes('neutral')) starsEarned = 10;
    
    if (starsEarned > 0) {
        playerData.stars += starsEarned;
        starsInfo = `<p>⭐ Получено звёзд: +${starsEarned}</p>`;
    }
    
    document.getElementById('ending-stats').innerHTML = `
        <p>🔍 Собрано улик: ${playerData.collectedClues.length}/${currentCase.cluesToSolve}</p>
        <p>👥 Проведено допросов: ${playerData.interrogationLog.length}</p>
        ${starsEarned > 0 ? `<p>⭐ Получено звёзд: +${starsEarned}</p>` : ''}
        <p>⚖️ Итог: ${endingScene.includes('true') ? 'Полная победа' : 
                      endingScene.includes('good') ? 'Успех' : 
                      endingScene.includes('neutral') ? 'Компромисс' : 'Провал'}</p>
    `;
    
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'block';
    
    // Очищаем текущее дело после завершения
    playerData.currentCase = null;
    delete playerData.caseProgress[currentCase.id];
    localStorage.setItem('detectiveSave', JSON.stringify(playerData));
    
    // Обновляем список дел
    setTimeout(loadCases, 1000);
}

function updateCluesUI() {
    document.getElementById('clues-count').textContent = playerData.collectedClues.length;
    document.getElementById('clue-counter').innerHTML = `🔍 Улик: ${playerData.collectedClues.length}/${currentCase.cluesToSolve}`;
    
    // Обновляем прогресс в общем списке дел
    if (currentCase && playerData.currentCase) {
        const progress = Math.min(100, Math.round((playerData.collectedClues.length / currentCase.cluesToSolve) * 100));
        playerData.caseProgress[playerData.currentCase] = {
            progress: progress,
            currentScene: currentScene,
            clues: [...playerData.collectedClues],
            log: [...playerData.interrogationLog]
        };
        localStorage.setItem('detectiveSave', JSON.stringify(playerData));
    }
}

function showCluesModal() {
    const modal = document.getElementById('clues-modal');
    const cluesList = document.getElementById('clues-list');
    cluesList.innerHTML = '';
    
    if (playerData.collectedClues.length === 0) {
        cluesList.innerHTML = '<li class="no-clues">Улик ещё не собрано. Продолжайте расследование!</li>';
    } else {
        playerData.collectedClues.forEach((clue, index) => {
            const clueItem = document.createElement('li');
            clueItem.className = 'clue-item';
            clueItem.innerHTML = `<span class="clue-number">${index + 1}.</span> ${clue}`;
            cluesList.appendChild(clueItem);
        });
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function setupCluesModal() {
    const modal = document.getElementById('clues-modal');
    const span = modal.querySelector('.close-btn');
    
    span.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    
    // Сохраняем прогресс при выходе
    if (playerData.currentCase) {
        playerData.caseProgress[playerData.currentCase] = {
            currentScene: currentScene,
            clues: [...playerData.collectedClues],
            log: [...playerData.interrogationLog],
            progress: Math.min(100, Math.round((playerData.collectedClues.length / currentCase.cluesToSolve) * 100))
        };
        localStorage.setItem('detectiveSave', JSON.stringify(playerData));
    }
    
    // Обновляем список дел
    loadCases();
}

function setupAboutModal() {
    const modal = document.getElementById('about-modal');
    const btn = document.getElementById('about-btn');
    const span = document.getElementsByClassName('close-btn')[0];

    // Открываем модальное окно при клике на кнопку
    btn.onclick = function() {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Закрываем при клике на крестик
    span.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Закрываем при клике вне окна
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    // Закрытие при нажатии Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

function setupDonateButton() {
    document.getElementById('donate-btn').addEventListener('click', () => {
        if (window.Telegram.WebApp.openInvoice) {
            const invoice = {
                title: "Поддержать автора",
                description: "Ваша поддержка поможет создавать новые детективные истории",
                currency: "USD",
                prices: [
                    { label: "50 звезд", amount: "5000" }, // $5.00
                    { label: "100 звезд", amount: "10000" } // $10.00
                ]
            };
            
            window.Telegram.WebApp.openInvoice(invoice, (status) => {
                if (status === 'paid') {
                    playerData.stars += 50;
                    localStorage.setItem('detectiveSave', JSON.stringify(playerData));
                    alert('Спасибо за вашу поддержку! +50 звёзд добавлено на ваш счёт.');
                    document.getElementById('stars-count').textContent = playerData.stars;
                }
            });
        } else {
            alert('Пожалуйста, откройте мини-приложение через Telegram');
        }
    });
}

async function unlockCase(caseId, price) {
    if (playerData.stars < price) {
        alert(`Недостаточно звёзд! Нужно: ${price}, у вас: ${playerData.stars}`);
        return;
    }
    
    if (window.Telegram.WebApp.openInvoice) {
        const invoice = {
            title: `Разблокировка сюжета "${caseId}"`,
            description: `Доступ к платному сюжету за ${price} звезд`,
            currency: "USD",
            prices: [{ label: `${price} звезд`, amount: (price * 100).toString() }]
        };
        
        window.Telegram.WebApp.openInvoice(invoice, async (status) => {
            if (status === 'paid') {
                playerData.stars -= price;
                playerData.unlockedCases.push(caseId);
                await loadCases();
                localStorage.setItem('detectiveSave', JSON.stringify(playerData));
                alert(`Сюжет "${caseId}" разблокирован!`);
            }
        });
    } else {
        // Режим разработки без Telegram
        playerData.stars -= price;
        playerData.unlockedCases.push(caseId);
        await loadCases();
        localStorage.setItem('detectiveSave', JSON.stringify(playerData));
        alert(`[DEV MODE] Сюжет "${caseId}" разблокирован!`);
    }
}
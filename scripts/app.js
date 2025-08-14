let currentCase = null;
let currentScene = null;
let playerData = {
    name: 'Детектив',
    stars: 0,
    cluesFound: 0,
    unlockedCases: ['hotel_murder'],
    choices: [],
    currentCase: null
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
    
    // Если есть активное дело, показываем кнопку продолжения
    if (playerData.currentCase) {
        document.getElementById('continue-btn').style.display = 'block';
    }
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
            
            caseElement.innerHTML = `
                <div class="case-content">
                    <h3>${caseItem.title}</h3>
                    <p>${caseItem.description}</p>
                    <div class="case-buttons">
                        ${!playerData.unlockedCases.includes(caseItem.id) ? 
                        `<button class="unlock-btn" data-case="${caseItem.id}" 
                                data-price="${caseItem.price}">
                            🔓 Разблокировать (${caseItem.price} ⭐)
                        </button>` : ''}
                        <button class="play-btn" data-case="${caseItem.id}">
                            🔍 Начать расследование
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
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

async function startCase(caseId) {
    try {
        const path = `cases/${caseId.includes('premium') ? 'premium' : 'free'}/${caseId}.json`;
        const response = await fetch(path);
        currentCase = await response.json();
        playerData.cluesFound = 0;
        playerData.choices = [];
        playerData.currentCase = caseId;
        
        // Сохраняем прогресс
        localStorage.setItem('detectiveSave', JSON.stringify(playerData));
        
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        document.getElementById('ending-screen').style.display = 'none';
        
        showScene(currentCase.startScene);
    } catch (error) {
        console.error('Error loading case:', error);
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
            button.onclick = () => {
                if (choice.clue) playerData.cluesFound++;
                playerData.choices.push(choice.next);
                
                // Сохраняем прогресс
                localStorage.setItem('detectiveSave', JSON.stringify(playerData));
                
                showScene(choice.next);
            };
            choicesContainer.appendChild(button);
        });
    } else {
        showEnding();
    }
    
    // Обновляем счетчик улик
    document.getElementById('clue-counter').innerHTML = `🔍 Улик найдено: ${playerData.cluesFound}/${currentCase.cluesToSolve}`;
}

function showEnding() {
    const endings = currentCase.endings;
    let endingType = "bad";
    
    if (endings.good && 
        playerData.cluesFound >= endings.good.requiredClues && 
        endings.good.requiredChoices.every(choice => playerData.choices.includes(choice))) {
        endingType = "good";
    } else if (endings.neutral && playerData.cluesFound >= endings.neutral.requiredClues) {
        endingType = "neutral";
    }
    
    const ending = endings[endingType];
    const endingScene = currentCase.scenes[ending.scene];
    
    document.getElementById('ending-title').textContent = 
        endingType === 'good' ? 'Дело раскрыто!' :
        endingType === 'neutral' ? 'Компромисс' : 'Провал';
    
    // Анимация для текста концовки
    const endingTextElement = document.getElementById('ending-text');
    endingTextElement.innerHTML = endingScene.text;
    endingTextElement.style.animation = 'none';
    setTimeout(() => {
        endingTextElement.style.animation = 'fadeIn 0.8s ease-out forwards';
    }, 10);
    
    document.getElementById('ending-stats').innerHTML = `
        <p>🔍 Найдено улик: ${playerData.cluesFound}/${currentCase.cluesToSolve}</p>
        <p>⚖️ Вердикт: ${endingType === 'good' ? 'Полный успех' : endingType === 'neutral' ? 'Частичный успех' : 'Провал'}</p>
    `;
    
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'block';
    
    // Очищаем текущее дело после завершения
    playerData.currentCase = null;
    localStorage.setItem('detectiveSave', JSON.stringify(playerData));
}

function returnToMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('ending-screen').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
}

function setupAboutModal() {
    const modal = document.getElementById('about-modal');
    const btn = document.getElementById('about-btn');
    const span = document.getElementsByClassName('close-btn')[0];

    // Открываем модальное окно при клике на кнопку
    btn.onclick = function() {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Блокируем скролл страницы
    }

    // Закрываем при клике на крестик
    span.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Возвращаем скролл
    }

    // Закрываем при клике вне окна
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Возвращаем скролл
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

// Для кнопки доната (должна быть в payment.js)
function setupDonateButton() {
    document.getElementById('donate-btn').addEventListener('click', () => {
        if (window.Telegram.WebApp.openInvoice) {
            const invoice = {
                title: "Поддержать автора",
                description: "Ваша поддержка поможет создавать новые детективные истории",
                currency: "USD",
                prices: [
                    { label: "50 звезд", amount: "500" },
                    { label: "100 звезд", amount: "1000" }
                ]
            };
            
            window.Telegram.WebApp.openInvoice(invoice, (status) => {
                if (status === 'paid') {
                    alert('Спасибо за вашу поддержку!');
                }
            });
        } else {
            alert('Пожалуйста, откройте мини-приложение через Telegram');
        }
    });
}

async function unlockCase(caseId, price) {
    if (window.Telegram.WebApp.openInvoice) {
        const invoice = {
            title: `Разблокировка сюжета "${caseId}"`,
            description: `Доступ к платному сюжету за ${price} звезд`,
            currency: "USD",
            prices: [{ label: `${price} звезд`, amount: (price * 10).toString() }]
        };
        
        window.Telegram.WebApp.openInvoice(invoice, async (status) => {
            if (status === 'paid') {
                playerData.unlockedCases.push(caseId);
                await loadCases();
                localStorage.setItem('detectiveSave', JSON.stringify(playerData));
            }
        });
    } else {
        alert('Пожалуйста, откройте мини-приложение через Telegram');
    }
}
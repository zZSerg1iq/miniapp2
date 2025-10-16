// Глобальные переменные
let tg;
let currentQuest = {
    title: "Название квеста",
    stages: []
};
let currentStageType = null;
let currentEditingStageId = null;
let map = null;
let marker = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    tg = window.Telegram.WebApp;
    tg.expand();
    
    // Инициализация данных
    initApp();
    
    // Настройка валидации форм
    setupFormValidation();
});

function initApp() {
    // Получаем начальные данные из Telegram
    const initData = tg.initDataUnsafe;
    
    if (initData.start_param) {
        loadQuestData(initData.start_param);
    } else {
        // Если нет данных, создаем новый квест
        renderStagesList();
    }
}

function loadQuestData(questId) {
    // Здесь будет запрос к бэкенду для загрузки данных квеста
    // Пока используем заглушку
    fetchQuestData(questId).then(data => {
        currentQuest = data;
        renderStagesList();
        updateQuestTitle();
    });
}

async function fetchQuestData(questId) {
    // Заглушка - в реальности здесь будет запрос к вашему бэкенду
    return {
        title: "Мой первый квест",
        stages: [
            { id: 1, name: "Приветственное сообщение", type: "message", order: 1 },
            { id: 2, name: "Гео-загадка", type: "geo", order: 2 },
            { id: 3, name: "Викторина про город", type: "quiz", order: 3 }
        ]
    };
}

function updateQuestTitle() {
    document.getElementById('questTitle').textContent = currentQuest.title;
}

function editQuestTitle() {
    const newTitle = prompt('Введите новое название квеста:', currentQuest.title);
    if (newTitle && newTitle.trim() !== '') {
        currentQuest.title = newTitle.trim();
        updateQuestTitle();
        // Здесь можно отправить обновление на бэкенд
    }
}

function renderStagesList() {
    const stagesList = document.getElementById('stagesList');
    stagesList.innerHTML = '';
    
    currentQuest.stages.sort((a, b) => a.order - b.order).forEach(stage => {
        const stageElement = document.createElement('div');
        stageElement.className = 'stage-item';
        stageElement.innerHTML = `
            <div class="stage-info">
                <span class="stage-number">${stage.order}.</span>
                <span class="stage-name">${stage.name}</span>
            </div>
            <div class="stage-actions">
                <button class="action-btn edit-stage" onclick="editStage(${stage.id})">✏️</button>
                <button class="action-btn delete-stage" onclick="deleteStage(${stage.id})">🗑️</button>
            </div>
        `;
        stagesList.appendChild(stageElement);
    });
}

function showStageTypeSelector() {
    document.getElementById('stageForm').classList.remove('hidden');
    document.getElementById('stageTypeSelector').classList.remove('hidden');
    hideAllStageForms();
    resetStageForm();
    currentEditingStageId = null;
}

function hideStageForm() {
    document.getElementById('stageForm').classList.add('hidden');
}

function selectStageType(type) {
    currentStageType = type;
    document.getElementById('stageTypeSelector').classList.add('hidden');
    document.getElementById('formTitle').textContent = getStageTypeName(type);
    
    hideAllStageForms();
    document.getElementById(`${type}Form`).classList.remove('hidden');
    
    if (type === 'geo') {
        initMap();
    }
    
    validateForm();
}

function getStageTypeName(type) {
    const names = {
        'message': 'Сообщение',
        'quiz': 'Викторина',
        'geo': 'Гео точка',
        'question': 'Ответить на вопрос'
    };
    return names[type] || 'Неизвестный тип';
}

function hideAllStageForms() {
    const forms = document.querySelectorAll('.stage-form-content');
    forms.forEach(form => form.classList.add('hidden'));
}

function resetStageForm() {
    document.getElementById('stageName').value = '';
    
    // Сброс всех форм
    const allInputs = document.querySelectorAll('#stageForms input, #stageForms textarea');
    allInputs.forEach(input => {
        if (input.type !== 'checkbox') {
            input.value = '';
        } else {
            input.checked = false;
        }
    });
    
    // Сброс карты
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
    document.getElementById('latitude').textContent = '-';
    document.getElementById('longitude').textContent = '-';
    
    // Сброс дополнительных сообщений
    const completionMessages = document.querySelectorAll('.completion-message');
    completionMessages.forEach(msg => msg.classList.add('hidden'));
    
    // Удаление дополнительных ответов
    const quizAnswers = document.getElementById('quizAnswers');
    while (quizAnswers.children.length > 2) {
        quizAnswers.removeChild(quizAnswers.lastChild);
    }
    
    const correctAnswers = document.getElementById('correctAnswers');
    while (correctAnswers.children.length > 1) {
        correctAnswers.removeChild(correctAnswers.lastChild);
    }
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([55.7558, 37.6173], 13); // Москва по умолчанию
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Получение текущей геолокации
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    map.setView([latitude, longitude], 13);
                    updateCoordinates(latitude, longitude);
                },
                error => {
                    console.log('Geolocation error:', error);
                }
            );
        }
        
        // Обработчик клика по карте
        map.on('click', function(e) {
            updateCoordinates(e.latlng.lat, e.latlng.lng);
            validateForm();
        });
    }
}

function updateCoordinates(lat, lng) {
    document.getElementById('latitude').textContent = lat.toFixed(6);
    document.getElementById('longitude').textContent = lng.toFixed(6);
    
    if (marker) {
        map.removeLayer(marker);
    }
    
    marker = L.marker([lat, lng]).addTo(map)
        .bindPopup('Выбранная точка')
        .openPopup();
}

function addQuizAnswer() {
    const quizAnswers = document.getElementById('quizAnswers');
    if (quizAnswers.children.length >= 10) {
        alert('Максимум 10 вариантов ответа');
        return;
    }
    
    const answerCount = quizAnswers.children.length + 1;
    const answerRow = document.createElement('div');
    answerRow.className = 'answer-row';
    answerRow.innerHTML = `
        <input type="text" placeholder="Вариант ответа ${answerCount}">
        <input type="checkbox" class="correct-answer">
        <label>Верный</label>
    `;
    quizAnswers.appendChild(answerRow);
}

function addCorrectAnswer() {
    const correctAnswers = document.getElementById('correctAnswers');
    const answerCount = correctAnswers.children.length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Правильный ответ ${answerCount}`;
    correctAnswers.appendChild(input);
}

function toggleCompletionMessage(type) {
    const completionDiv = document.getElementById(`${type}Completion`);
    completionDiv.classList.toggle('hidden');
}

function setupFormValidation() {
    const inputs = document.querySelectorAll('#stageForms input, #stageForms textarea, #stageName');
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });
}

function validateForm() {
    let isValid = true;
    const stageName = document.getElementById('stageName').value.trim();
    
    if (!stageName || !currentStageType) {
        isValid = false;
    } else {
        switch (currentStageType) {
            case 'message':
                isValid = document.getElementById('messageText').value.trim() !== '';
                break;
            case 'quiz':
                const quizQuestion = document.getElementById('quizQuestion').value.trim();
                const hasAnswers = Array.from(document.querySelectorAll('#quizAnswers input[type="text"]'))
                    .some(input => input.value.trim() !== '');
                const hasCorrect = Array.from(document.querySelectorAll('#quizAnswers .correct-answer'))
                    .some(checkbox => checkbox.checked);
                isValid = quizQuestion !== '' && hasAnswers && hasCorrect;
                break;
            case 'geo':
                isValid = document.getElementById('latitude').textContent !== '-';
                break;
            case 'question':
                const questionText = document.getElementById('questionText').value.trim();
                const hasCorrectAnswers = Array.from(document.querySelectorAll('#correctAnswers input'))
                    .some(input => input.value.trim() !== '');
                isValid = questionText !== '' && hasCorrectAnswers;
                break;
        }
    }
    
    document.getElementById('submitStageBtn').disabled = !isValid;
}

function submitStage() {
    const stageData = collectStageData();
    
    if (currentEditingStageId) {
        updateStageOnBackend(currentEditingStageId, stageData);
    } else {
        createStageOnBackend(stageData);
    }
}

function collectStageData() {
    const baseData = {
        name: document.getElementById('stageName').value.trim(),
        type: currentStageType,
        order: currentEditingStageId ? 
            currentQuest.stages.find(s => s.id === currentEditingStageId).order : 
            currentQuest.stages.length + 1
    };
    
    switch (currentStageType) {
        case 'message':
            baseData.content = {
                message: document.getElementById('messageText').value.trim(),
                completionMessage: document.getElementById('messageCompletionText').value.trim() || null
            };
            break;
            
        case 'quiz':
            const answers = Array.from(document.querySelectorAll('#quizAnswers .answer-row')).map((row, index) => {
                const textInput = row.querySelector('input[type="text"]');
                const correctCheckbox = row.querySelector('.correct-answer');
                return {
                    text: textInput.value.trim(),
                    correct: correctCheckbox.checked,
                    order: index + 1
                };
            }).filter(answer => answer.text !== '');
            
            baseData.content = {
                question: document.getElementById('quizQuestion').value.trim(),
                answers: answers,
                completionMessage: document.getElementById('quizCompletionText').value.trim() || null
            };
            break;
            
        case 'geo':
            baseData.content = {
                latitude: parseFloat(document.getElementById('latitude').textContent),
                longitude: parseFloat(document.getElementById('longitude').textContent),
                completionMessage: document.getElementById('geoCompletionText').value.trim() || null
            };
            break;
            
        case 'question':
            const correctAnswers = Array.from(document.querySelectorAll('#correctAnswers input'))
                .map(input => input.value.trim())
                .filter(answer => answer !== '');
                
            baseData.content = {
                question: document.getElementById('questionText').value.trim(),
                correctAnswers: correctAnswers,
                completionMessage: document.getElementById('questionCompletionText').value.trim() || null
            };
            break;
    }
    
    return baseData;
}

async function createStageOnBackend(stageData) {
    try {
        // Отправка данных на бэкенд
        const response = await sendToBackend('create_stage', stageData);
        
        if (response.success) {
            // Добавляем этап в локальный список
            stageData.id = response.stageId;
            currentQuest.stages.push(stageData);
            
            // Обновляем интерфейс
            renderStagesList();
            hideStageForm();
            
            // Показываем подтверждение
            tg.showPopup({
                title: 'Успех',
                message: 'Этап успешно создан!'
            });
        }
    } catch (error) {
        console.error('Error creating stage:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось создать этап'
        });
    }
}

async function editStage(stageId) {
    try {
        // Запрашиваем данные этапа с бэкенда
        const stageData = await fetchStageData(stageId);
        
        // Заполняем форму данными
        currentEditingStageId = stageId;
        document.getElementById('stageForm').classList.remove('hidden');
        document.getElementById('stageTypeSelector').classList.add('hidden');
        document.getElementById('formTitle').textContent = 'Редактирование этапа';
        
        // Заполняем общие поля
        document.getElementById('stageName').value = stageData.name;
        currentStageType = stageData.type;
        
        // Показываем соответствующую форму и заполняем её
        hideAllStageForms();
        document.getElementById(`${stageData.type}Form`).classList.remove('hidden');
        
        fillStageForm(stageData);
        validateForm();
        
    } catch (error) {
        console.error('Error loading stage for edit:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить данные этапа'
        });
    }
}

function fillStageForm(stageData) {
    const content = stageData.content;
    
    switch (stageData.type) {
        case 'message':
            document.getElementById('messageText').value = content.message || '';
            if (content.completionMessage) {
                document.getElementById('messageCompletionText').value = content.completionMessage;
                document.getElementById('messageCompletion').classList.remove('hidden');
            }
            break;
            
        case 'quiz':
            document.getElementById('quizQuestion').value = content.question || '';
            
            // Очищаем существующие ответы (оставляя первые два)
            const quizAnswers = document.getElementById('quizAnswers');
            while (quizAnswers.children.length > 2) {
                quizAnswers.removeChild(quizAnswers.lastChild);
            }
            
            // Заполняем ответы
            content.answers.forEach((answer, index) => {
                if (index >= 2) {
                    addQuizAnswer();
                }
                const row = quizAnswers.children[index];
                const textInput = row.querySelector('input[type="text"]');
                const correctCheckbox = row.querySelector('.correct-answer');
                textInput.value = answer.text;
                correctCheckbox.checked = answer.correct;
            });
            
            if (content.completionMessage) {
                document.getElementById('quizCompletionText').value = content.completionMessage;
                document.getElementById('quizCompletion').classList.remove('hidden');
            }
            break;
            
        case 'geo':
            if (content.latitude && content.longitude) {
                updateCoordinates(content.latitude, content.longitude);
                if (map) {
                    map.setView([content.latitude, content.longitude], 13);
                }
            }
            if (content.completionMessage) {
                document.getElementById('geoCompletionText').value = content.completionMessage;
                document.getElementById('geoCompletion').classList.remove('hidden');
            }
            break;
            
        case 'question':
            document.getElementById('questionText').value = content.question || '';
            
            // Очищаем существующие правильные ответы (оставляя первый)
            const correctAnswers = document.getElementById('correctAnswers');
            while (correctAnswers.children.length > 1) {
                correctAnswers.removeChild(correctAnswers.lastChild);
            }
            
            // Заполняем правильные ответы
            content.correctAnswers.forEach((answer, index) => {
                if (index >= 1) {
                    addCorrectAnswer();
                }
                correctAnswers.children[index].value = answer;
            });
            
            if (content.completionMessage) {
                document.getElementById('questionCompletionText').value = content.completionMessage;
                document.getElementById('questionCompletion').classList.remove('hidden');
            }
            break;
    }
}

async function updateStageOnBackend(stageId, stageData) {
    try {
        stageData.id = stageId;
        const response = await sendToBackend('update_stage', stageData);
        
        if (response.success) {
            // Обновляем локальные данные
            const stageIndex = currentQuest.stages.findIndex(s => s.id === stageId);
            if (stageIndex !== -1) {
                currentQuest.stages[stageIndex] = { ...currentQuest.stages[stageIndex], ...stageData };
            }
            
            // Обновляем интерфейс
            renderStagesList();
            hideStageForm();
            
            tg.showPopup({
                title: 'Успех',
                message: 'Этап успешно обновлен!'
            });
        }
    } catch (error) {
        console.error('Error updating stage:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось обновить этап'
        });
    }
}

async function deleteStage(stageId) {
    const confirmed = confirm('Вы уверены, что хотите удалить этот этап?');
    if (!confirmed) return;
    
    try {
        const response = await sendToBackend('delete_stage', { stageId });
        
        if (response.success) {
            // Удаляем этап из локального списка
            currentQuest.stages = currentQuest.stages.filter(s => s.id !== stageId);
            
            // Обновляем интерфейс
            renderStagesList();
            
            tg.showPopup({
                title: 'Успех',
                message: 'Этап успешно удален!'
            });
        }
    } catch (error) {
        console.error('Error deleting stage:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось удалить этап'
        });
    }
}

async function fetchStageData(stageId) {
    // Заглушка - в реальности запрос к бэкенду
    return {
        id: stageId,
        name: "Пример этапа",
        type: "message",
        order: 1,
        content: {
            message: "Пример сообщения",
            completionMessage: "Сообщение при завершении"
        }
    };
}

async function sendToBackend(action, data) {
    // Здесь реализация отправки данных на ваш бэкенд
    // Используем Telegram WebApp для отправки данных
    
    const payload = {
        action: action,
        data: data,
        userId: tg.initDataUnsafe.user?.id
    };
    
    // В реальном приложении здесь будет fetch запрос к вашему API
    console.log('Sending to backend:', payload);
    
    // Заглушка - имитируем успешный ответ
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                stageId: Math.floor(Math.random() * 1000) + 1
            });
        }, 500);
    });
}

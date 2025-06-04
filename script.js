// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');
const tagFilters = document.getElementById('tag-filters');
const futureMessage = document.getElementById('future-message');
const messageText = futureMessage.querySelector('.message-text');
const messageMeta = futureMessage.querySelector('.message-meta');
const closeMessageBtn = futureMessage.querySelector('.close-message');
const installBtn = document.getElementById('install-btn');

// State
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let selectedTag = null;
let deferredPrompt;

// Theme
const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);
updateThemeIcon();

// URL detection regex - matches URLs with or without protocol
const urlRegex = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

// Tag detection regex
const tagRegex = /#(\w+)/g;

// Popup functionality
const privacyBtn = document.getElementById('privacy-btn');
const termsBtn = document.getElementById('terms-btn');
const privacyPopup = document.getElementById('privacy-popup');
const termsPopup = document.getElementById('terms-popup');
const closeButtons = document.querySelectorAll('.close-popup');

// Future message templates
const futureMessages = [
    "Great job completing that task! Time for a well-deserved break 🎉",
    "You're making amazing progress! Keep up the good work 🌟",
    "Task completed! Remember to stay hydrated 💧",
    "Nice work! Maybe it's time for a quick stretch? 🧘‍♂️",
    "You're crushing it! Take a moment to celebrate 🎊",
    "Task done! How about a quick walk to refresh? 🚶‍♂️",
    "Excellent work! Don't forget to breathe and relax 😌",
    "You're on fire! Keep that momentum going 🔥",
    "Task completed! Time for a victory dance 💃",
    "Amazing job! You're one step closer to your goals 🎯"
];

// Functions
function formatTextWithLinks(text) {
    // Check if the text starts with ? for auto-complete search
    if (text.startsWith('?')) {
        const searchQuery = text.slice(1).trim();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&source=hp&ei=&gs_lcp=&oq=${encodeURIComponent(searchQuery)}`;
        return `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="auto-complete-link">${text}</a>`;
    }

    // Check if the text starts with @ for Google search
    if (text.startsWith('@')) {
        const searchQuery = text.slice(1).trim();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        return `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="google-search-link">${text}</a>`;
    }

    // Regular URL detection
    return text.replace(urlRegex, url => {
        try {
            const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
            const urlObj = new URL(urlWithProtocol);
            return `<a href="${urlObj.href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        } catch {
            return url;
        }
    });
}

function extractTags(text) {
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
        tags.push(match[1]);
    }
    return tags;
}

function cleanText(text) {
    return text.replace(tagRegex, '').trim();
}

function getAllTags() {
    const tagSet = new Set();
    todos.forEach(todo => {
        todo.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
}

function updateTagFilters() {
    const tags = getAllTags();
    tagFilters.innerHTML = tags.map(tag => `
        <button type="button" class="tag-filter ${selectedTag === tag ? 'active' : ''}" data-tag="${tag}">
            #${tag}
        </button>
    `).join('');

    // Show tag filters only when Tags filter is active and there are tags
    tagFilters.style.display = (currentFilter === 'tags' && tags.length > 0) ? 'flex' : 'none';

    // Add event listeners to tag filters
    tagFilters.querySelectorAll('.tag-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            // Toggle the active state of the button
            if (selectedTag === btn.dataset.tag) {
                selectedTag = null;
                btn.classList.remove('active');
            } else {
                selectedTag = btn.dataset.tag;
                tagFilters.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            renderTodos();
        });
    });
}

function addTodo(e) {
    e.preventDefault();
    const todoText = todoInput.value.trim();
    
    if (todoText) {
        const tags = extractTags(todoText);
        const cleanTodoText = cleanText(todoText);
        const todo = {
            id: Date.now(),
            text: cleanTodoText,
            completed: false,
            tags: tags
        };
        
        todos.push(todo);
        saveTodos();
        updateTagFilters();
        renderTodos();
        todoInput.value = '';
    }
}

function toggleTodo(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            const wasCompleted = todo.completed;
            const newCompleted = !wasCompleted;
            
            // Show future message when completing a task
            if (!wasCompleted && newCompleted) {
                showFutureMessage();
            }
            
            return { ...todo, completed: newCompleted };
        }
        return todo;
    });
    saveTodos();
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    updateTagFilters();
    renderTodos();
}

function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    updateTagFilters();
    renderTodos();
}

function renderTodos() {
    let filteredTodos = todos;
    
    // Apply filter based on current filter state
    if (currentFilter === 'active') {
        filteredTodos = filteredTodos.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.completed);
    } else if (currentFilter === 'tags') {
        // Show only todos that have tags
        filteredTodos = filteredTodos.filter(todo => todo.tags.length > 0);
    }
    
    // Apply tag filter if a tag is selected
    if (selectedTag) {
        filteredTodos = filteredTodos.filter(todo => todo.tags.includes(selectedTag));
    }

    todoList.innerHTML = '';
    
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;
        
        const tagsHtml = todo.tags.map(tag => 
            `<span class="tag" data-tag="${tag}">#${tag}</span>`
        ).join('');
        
        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <span>${formatTextWithLinks(todo.text)}</span>
            <div class="todo-tags">${tagsHtml}</div>
            <button class="delete-btn" aria-label="Delete todo">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const checkbox = li.querySelector('input[type="checkbox"]');
        const deleteBtn = li.querySelector('.delete-btn');
        const tagElements = li.querySelectorAll('.tag');
        
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
        
        // Add click event to tags in todo items
        tagElements.forEach(tag => {
            tag.addEventListener('click', () => {
                selectedTag = tag.dataset.tag;
                currentFilter = 'tags'; // Switch to tags filter when clicking a tag
                filterBtns.forEach(btn => btn.classList.remove('active'));
                filterBtns[2].classList.add('active'); // Activate the "Tags" filter
                updateTagFilters();
                renderTodos();
            });
        });
        
        todoList.appendChild(li);
    });
    
    updateItemsLeft();
}

function updateItemsLeft() {
    const activeTodos = todos.filter(todo => !todo.completed).length;
    itemsLeft.textContent = `${activeTodos} item${activeTodos !== 1 ? 's' : ''} left`;
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = themeToggle.querySelector('i');
    
    if (currentTheme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

function showFutureMessage() {
    const randomMessage = futureMessages[Math.floor(Math.random() * futureMessages.length)];
    const date = new Date();
    const timeAgo = "from Past You";
    
    messageText.textContent = randomMessage;
    messageMeta.textContent = timeAgo;
    futureMessage.classList.add('active');
}

function hideFutureMessage() {
    futureMessage.classList.remove('active');
}

// Event Listeners
todoForm.addEventListener('submit', addTodo);
clearCompletedBtn.addEventListener('click', clearCompleted);
themeToggle.addEventListener('click', toggleTheme);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        
        // Reset selected tag when changing filters
        selectedTag = null;
        
        // Update tag filters visibility
        updateTagFilters();
        
        // Render todos with new filter
        renderTodos();
    });
});

// Initial render
updateTagFilters();
renderTodos();

// Popup functionality
function openPopup(popup) {
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePopup(popup) {
    popup.classList.remove('active');
    document.body.style.overflow = '';
}

privacyBtn.addEventListener('click', () => openPopup(privacyPopup));
termsBtn.addEventListener('click', () => openPopup(termsPopup));

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const popup = button.closest('.popup');
        closePopup(popup);
    });
});

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('popup')) {
        closePopup(e.target);
    }
});

// Close popup with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activePopup = document.querySelector('.popup.active');
        if (activePopup) {
            closePopup(activePopup);
        }
    }
});

// Event Listeners
closeMessageBtn.addEventListener('click', hideFutureMessage);

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

// Install button click handler
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }
}); 
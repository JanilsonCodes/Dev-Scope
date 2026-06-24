
// ==================== CONFIGURAÇÃO ====================
const GITHUB_API = "https://api.github.com";
const INITIAL_USERS = [
    "torvalds", "gaearon", "yyx990803",
    "sindresorhus", "tj", "getify",
    "addyosmani", "evanw"
];

const LANGUAGE_COLORS = {
    "JavaScript": "#f1e05a",
    "TypeScript": "#3178c6",
    "Python": "#3572A5",
    "Go": "#00ADD8",
    "Rust": "#dea584",
    "Java": "#b07219",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "PHP": "#777bb4",
    "Ruby": "#701516",
    "C++": "#f34b7d",
    "C": "#555555",
    "Swift": "#ffac45"
};

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let favorites = JSON.parse(localStorage.getItem("devscope_favorites")) || [];
let history = JSON.parse(localStorage.getItem("devscope_history")) || [];

// ==================== FUNÇÕES AUXILIARES ====================
function saveFavorites() {
    localStorage.setItem("devscope_favorites", JSON.stringify(favorites));
}

function saveHistory() {
    localStorage.setItem("devscope_history", JSON.stringify(history));
}

function isFavorited(login) {
    return favorites.some(f => f.login === login);
}

function toggleFavorite(user) {
    if (isFavorited(user.login)) {
        favorites = favorites.filter(f => f.login !== user.login);
    } else {
        favorites.push({
            login: user.login,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
            public_repos: user.public_repos,
            followers: user.followers
        });
    }
    saveFavorites();
    renderFavorites();

    // Atualiza botão no perfil
    if (document.getElementById("profile-content").style.display !== "none") {
        renderProfileContent(currentUser, null, null);
    }
}

function addToHistory(username) {
    const lower = username.toLowerCase();
    history = history.filter(u => u.toLowerCase() !== lower);
    history.unshift(username);
    if (history.length > 6) history.pop();
    saveHistory();
    renderHistory();
}

// ==================== FETCH API ====================
async function fetchGitHub(endpoint) {
    const response = await fetch(`${GITHUB_API}${endpoint}`, {
        headers: {
            "Accept": "application/vnd.github.v3+json"
        }
    });

    if (!response.ok) {
        if (response.status === 404) throw new Error("Usuário não encontrado");
        throw new Error(`Erro ${response.status}`);
    }
    return response.json();
}

async function getUser(username) {
    return fetchGitHub(`/users/${username}`);
}

async function getRepos(username) {
    return fetchGitHub(`/users/${username}/repos?per_page=12&sort=updated&direction=desc`);
}

// ==================== CARDS INICIAIS E FAVORITOS ====================
async function loadInitialDevelopers() {
    const container = document.getElementById("explore-grid");
    container.innerHTML = "";

    const promises = INITIAL_USERS.map(async (user) => {
        try {
            const data = await getUser(user);
            return data;
        } catch (e) {
            console.warn(`Falha ao carregar ${user}`);
            return null;
        }
    });

    const users = (await Promise.all(promises)).filter(u => u !== null);

    users.forEach(user => {
        const card = createUserCard(user);
        container.appendChild(card);
    });
}

function createUserCard(user) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
                <img src="${user.avatar_url}" class="card-img" alt="${user.login}">
                <div class="card-body">
                    <div class="card-username">@${user.login}</div>
                    <div class="card-stats">
                        <span>📦 ${user.public_repos}</span>
                        <span>👥 ${user.followers}</span>
                    </div>
                    <button onclick="searchUser('${user.login}'); event.stopImmediatePropagation()" class="card-btn">
                        Ver Perfil
                    </button>
                </div>
            `;
    return card;
}

function renderFavorites() {
    const container = document.getElementById("favorites-grid");
    container.innerHTML = "";

    const noFav = document.getElementById("no-favorites");

    if (favorites.length === 0) {
        noFav.style.display = "block";
        return;
    }

    noFav.style.display = "none";

    favorites.forEach(user => {
        const card = createUserCard(user);
        container.appendChild(card);
    });
}

// ==================== HISTÓRICO ====================
function renderHistory() {
    const container = document.getElementById("history-container");
    container.innerHTML = `<span style="color:var(--text-secondary); font-size:0.85rem; margin-right:12px;">Histórico:</span>`;

    history.forEach(username => {
        const chip = document.createElement("div");
        chip.className = "history-chip";
        chip.textContent = `@${username}`;
        chip.onclick = () => searchUser(username);
        container.appendChild(chip);
    });
}

// ==================== RENDER PERFIL ====================
function renderProfileContent(user, repos, langStats) {
    currentUser = user;

    let html = `
                <div class="profile-header">
                    <img src="${user.avatar_url}" class="profile-avatar" alt="${user.login}">
                    
                    <div class="profile-info">
                        <div class="profile-name">${user.name || user.login}</div>
                        <div class="profile-login">@${user.login}</div>
                        ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
                        
                        <div class="profile-meta">
                            ${user.company ? `<span>🏢 ${user.company}</span>` : ''}
                            ${user.location ? `<span>📍 ${user.location}</span>` : ''}
                        </div>
                        
                        <div class="profile-stats">
                            <div class="stat-item">
                                <div class="stat-number">${user.followers}</div>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">Seguidores</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${user.following}</div>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">Seguindo</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${user.public_repos}</div>
                                <div style="font-size:0.8rem; color:var(--text-secondary);">Repositórios</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <a href="${user.html_url}" target="_blank" class="btn-github">
                            <span>🔗</span> Ver no GitHub
                        </a>
                        <button onclick="toggleFavorite(currentUser)" class="btn-favorite">
                            ${isFavorited(user.login) ? '⭐ Remover dos Favoritos' : '⭐ Favoritar'}
                        </button>
                    </div>
                </div>
            `;
    // Repositórios
    html += `
                <div class="repos-section">
                    <h3 class="section-title">📚 Repositórios Recentes</h3>
                    <div class="repo-grid">
            `;

    if (repos && repos.length > 0) {
        repos.forEach(repo => {
            const langColor = LANGUAGE_COLORS[repo.language] || "#58A6FF";
            html += `
                        <div class="repo-card">
                            <div class="repo-name">${repo.name}</div>
                            <div class="repo-desc">${repo.description || "Sem descrição"}</div>
                            <div class="repo-footer">
                                <div class="repo-lang">
                                    <span class="lang-dot" style="background:${langColor}"></span>
                                    ${repo.language || "N/A"}
                                </div>
                                <div class="repo-meta">
                                    <span>⭐ ${repo.stargazers_count}</span>
                                    <span>🍴 ${repo.forks_count}</span>
                                </div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">
                                    ${new Date(repo.updated_at).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                        </div>
                    `;
        });
    } else {
        html += `<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">Nenhum repositório público encontrado.</p>`;
    }

    html += `</div></div>`;

    // Linguagens
    if (langStats && langStats.length > 0) {
        html += `
                    <div class="langs-section">
                        <h3 class="section-title">📊 Linguagens Mais Usadas</h3>
                        <div class="lang-bars">
                `;

        langStats.forEach(item => {
            const color = LANGUAGE_COLORS[item.lang] || "#58A6FF";
            html += `
                        <div class="lang-bar-item">
                            <div class="lang-label">
                                <span class="lang-dot" style="background:${color}"></span>
                                ${item.lang}
                            </div>
                            <div class="lang-bar-container">
                                <div class="lang-bar" style="width:${item.percent}%; background:${color}"></div>
                            </div>
                            <div class="lang-percent">${item.percent}%</div>
                        </div>
                    `;
        });

        html += `</div></div>`;
    }

    document.getElementById("profile-content").innerHTML = html;
}

// ==================== BUSCA PRINCIPAL ====================
async function searchUser(username) {
    if (!username) return;

    // Limpa input
    document.getElementById("search-input").value = "";

    // Mostra view de perfil
    showView("profile");

    // Mostra loading
    document.getElementById("profile-loading").style.display = "flex";
    document.getElementById("profile-error").style.display = "none";
    document.getElementById("profile-content").style.display = "none";

    try {
        const user = await getUser(username);
        const repos = await getRepos(username);

        // Calcula estatísticas de linguagens
        const langCount = {};
        let total = 0;

        repos.forEach(repo => {
            if (repo.language) {
                langCount[repo.language] = (langCount[repo.language] || 0) + 1;
                total++;
            }
        });

        let langStats = [];
        if (total > 0) {
            langStats = Object.keys(langCount).map(lang => {
                return {
                    lang: lang,
                    percent: Math.round((langCount[lang] / total) * 100)
                };
            }).sort((a, b) => b.percent - a.percent).slice(0, 6);
        }

        // Renderiza
        renderProfileContent(user, repos, langStats);

        // Atualiza UI
        document.getElementById("profile-loading").style.display = "none";
        document.getElementById("profile-content").style.display = "block";

        // Adiciona ao histórico
        addToHistory(username);

        // Atualiza favoritos se necessário
        if (isFavorited(user.login)) {
            renderFavorites();
        }

    } catch (error) {
        console.error(error);
        document.getElementById("profile-loading").style.display = "none";
        document.getElementById("profile-error").style.display = "block";
        document.getElementById("error-message").textContent = error.message;
    }
}

// ==================== NAVEGAÇÃO ENTRE VIEWS ====================
function showView(view) {
    // Remove active de todos os botões
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    if (view === "explore") {
        document.getElementById("btn-explore").classList.add("active");
        document.getElementById("explore-view").classList.add("active");
        document.getElementById("favorites-view").classList.remove("active");
        document.getElementById("profile-view").classList.remove("active");
    }
    else if (view === "favorites") {
        document.getElementById("btn-favorites").classList.add("active");
        document.getElementById("explore-view").classList.remove("active");
        document.getElementById("favorites-view").classList.add("active");
        document.getElementById("profile-view").classList.remove("active");
    }
    else if (view === "profile") {
        document.getElementById("explore-view").classList.remove("active");
        document.getElementById("favorites-view").classList.remove("active");
        document.getElementById("profile-view").classList.add("active");
    }
}

// ==================== EVENTOS ====================
function setupEventListeners() {
    // Formulário de busca
    document.getElementById("search-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("search-input").value.trim();
        if (username) searchUser(username);
    });

    // Logo volta para explorar
    const logo = document.querySelector(".logo");
    logo.style.cursor = "pointer";
    logo.addEventListener("click", () => {
        showView("explore");
    });
}

// ==================== INICIALIZAÇÃO ====================
async function init() {
    // Renderiza histórico
    renderHistory();

    // Carrega desenvolvedores iniciais
    await loadInitialDevelopers();

    // Renderiza favoritos
    renderFavorites();

    // Configura eventos
    setupEventListeners();

    // Se tiver favoritos, mostra o botão ativo
    if (favorites.length > 0) {
        document.getElementById("btn-favorites").classList.add("active");
    }

    // Mensagem inicial
    console.log("%c✅ DevScope carregado com sucesso! 🎉", "color:#58A6FF; font-weight:600");
}

// Inicia a aplicação
window.onload = init;
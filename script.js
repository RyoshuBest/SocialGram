let currentUser = null;

function handleLogin() {
    const user = DB.getUsers().find(u => u.username === document.getElementById('username').value);
    if (user && user.password === document.getElementById('password').value) {
        currentUser = user;
        showFeed();
    } else { alert("Credenziali non valide!"); }
}

function handleRegister() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username && password) {
        if (DB.getUsers().some(u => u.username === username)) return alert("User già esistente");
        DB.saveUser({ username, password });
        alert("Registrazione completata! Ora puoi accedere.");
    }
}

function showFeed() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-feed').style.display = 'block';
    renderPosts();
}

function createPost() {
    const content = document.getElementById('post-content').value;
    if (content) {
        DB.savePost({ 
            user: currentUser.username, 
            content: content, 
            date: new Date().toLocaleString() 
        });
        document.getElementById('post-content').value = '';
        renderPosts();
    }
}

function renderPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = DB.getPosts().map(p => `
        <div class="post">
            <div class="post-user">@${p.user}</div>
            <div class="post-content">${p.content}</div>
            <small style="color: gray;">${p.date}</small>
        </div>
    `).join('');
}

function logout() { location.reload(); }

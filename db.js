const DB = {
    // Gestione Utenti
    getUsers: () => JSON.parse(localStorage.getItem('users')) || [],
    saveUser: (user) => {
        const users = DB.getUsers();
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
    },
    // Gestione Post
    getPosts: () => JSON.parse(localStorage.getItem('posts')) || [],
    savePost: (post) => {
        const posts = DB.getPosts();
        posts.unshift(post); // Aggiunge il post in cima (stile Twitter)
        localStorage.setItem('posts', JSON.stringify(posts));
    }
};

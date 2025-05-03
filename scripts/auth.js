// auth.js

// for all the authentication logic of the extension
// including login, logout, and account creation

document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("login-btn");
    const submitLoginBtn = document.getElementById("submit-login");
    const logoutBtn = document.getElementById("logout-btn");
    const loginStatus = document.getElementById("login-status");
    const loginForm = document.getElementById("login-form");

    const message = document.getElementById("response-msg");

    const createToggleBtn = document.getElementById("create-account-toggle");
    const createFormDiv = document.getElementById("create-account");
    const createAccountForm = document.getElementById("create-account-form");


    // Token Validation on Load Logic
    chrome.storage.local.get(["token", "username"], (result) => {
        validateToken(result.token, result.username);
    });

    async function validateToken(token, username) {
        if (!token) {
            setLoggedOutUI();
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/verify-token", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                loginStatus.textContent = `Logged in as ${username}`;
                loginStatus.style.color = "white";
                
                loginBtn.style.display = "none";
                createToggleBtn.style.display = "none";
                logoutBtn.style.display = "block";
                createAccountForm.style.display = "none";
                createFormDiv.style.display = "none";
            } else {
                chrome.storage.local.remove(["token", "username"], () => {
                    loginStatus.textContent = "Not logged in";
                    loginStatus.style.color = "red";
                    message.textContent = "Session expired. Please log in again.";
                    loginBtn.style.display = "block";
                    logoutBtn.style.display = "none";
                });
            }
        } catch (error) {
            console.error("Token validation error:", error);
            setLoggedOutUI();
        }
    }

    // 
    function setLoggedOutUI() {
        loginStatus.textContent = "Not logged in";
        loginStatus.style.color = "gray";

        // show
        loginForm.style.display = "block";
        loginBtn.style.display = "block";
        createToggleBtn.style.display = "block";

        // hide
        loginForm.style.display = "none";
        createFormDiv.style.display = "none";
        logoutBtn.style.display = "none";

        // clear values
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        document.getElementById("create-username").value = "";
        document.getElementById("create-password").value = "";
        document.getElementById("confirm-password").value = "";
    }

    // Login Logic
    submitLoginBtn.addEventListener("click", async () => {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
            message.style.color = "red";
            message.textContent = "Please enter username and password.";
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                chrome.storage.local.set({ token: data.token, username }, () => {
                    loginStatus.textContent = `Logged in as ${username}`;
                    loginStatus.style.color = "white";
                    loginBtn.style.display = "none";
                    logoutBtn.style.display = "block";
                    createToggleBtn.style.display = "none";
                    loginForm.style.display = "none";
                    createFormDiv.style.display = "none";
    
                    // chrome.runtime.sendMessage({ action: "syncData" });
    
                    createAccountForm.reset();
                    
                    setTimeout(() => {
                        message.textContent = "";
                    }, 4000);
                });
            } else {
                message.style.color = "red";
                message.textContent = data.message || "Login failed.";
            }
        } catch {
            message.textContent = "Login error.";
        }
    });

    // create account logic
    createAccountForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("create-username").value.trim();
        const password = document.getElementById("create-password").value.trim();
        const confirm = document.getElementById("confirm-password").value.trim();

        if (!username || !password || !confirm || password !== confirm) {
            message.style.color = "red";
            message.textContent = "Please fill in all fields and ensure passwords match.";
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/create-account", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                message.style.color = "green";
                message.textContent = "Account created successfully.";
                createAccountForm.reset();
                
                createFormDiv.setAttribute("style", "display: none !important;");
                loginForm.style.display = "block";
                message.textContent = "Account created";
            } else {
                message.style.color = "red";
                message.textContent = data.message || "Account creation failed.";
            }
        } catch (error) { 
            console.error("Account creation error:", error); // debug
        }

        setTimeout(() => {
            message.textContent = "";
        }, 4000);
    });

    //  Logout Logic
    logoutBtn.addEventListener("click", () => {
        chrome.storage.local.remove(["token", "username"], () => {
            setLoggedOutUI();
            message.style.color = "red";
            message.textContent = "Logged out successfully";


        });

        setTimeout(() => {
            message.textContent = "";
        }, 4000);
    });


    // dropdown visibility logic
    loginBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        loginForm.style.display = loginForm.style.display === "block" ? "none" : "block";
        createFormDiv.style.display = "none";
    });

    createToggleBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        createFormDiv.style.display = createFormDiv.style.display === "block" ? "none" : "block";
        loginForm.style.display = "none";
    });

    document.addEventListener("click", (event) => {
        const isLoginClick = loginForm.contains(event.target) || loginBtn.contains(event.target);
        const isCreateClick = createFormDiv.contains(event.target) || createToggleBtn.contains(event.target);

        if (!isLoginClick) {
            loginForm.style.display = "none";
        }
        if (!isCreateClick) {
            createFormDiv.style.display = "none";
        }
    });

});

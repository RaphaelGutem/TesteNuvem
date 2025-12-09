// script1.js — versão integrada ao MySQL + menu do usuário corrigido
(function () {
    'use strict';

    const API = "http://localhost:3000/api";

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    const onReady = (fn) => {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
        else fn();
    };

    /* ------------------ TOAST ------------------ */
    const toastRootId = "__ecoplay_toast";
    function ensureToastRoot() {
        let root = document.getElementById(toastRootId);
        if (!root) {
            root = document.createElement("div");
            root.id = toastRootId;
            root.className = "toast-wrapper";
            document.body.appendChild(root);
        }
        return root;
    }
    function showToast(msg, type = "info", timeout = 3000) {
        const root = ensureToastRoot();
        const t = document.createElement("div");
        t.className = `toast ${type}`;
        t.textContent = msg;
        root.appendChild(t);
        requestAnimationFrame(() => t.classList.add("show"));
        setTimeout(() => {
            t.classList.remove("show");
            setTimeout(() => t.remove(), 300);
        }, timeout);
    }

    /* ------------- SESSÃO NO NAVEGADOR ------------- */
    function saveSession(user) {
        localStorage.setItem("session_user", JSON.stringify(user));
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem("session_user"));
        } catch {
            return null;
        }
    }

    function clearSession() {
        localStorage.removeItem("session_user");
    }

    /* ------------- ATUALIZAR UI ------------- */
    function updateUI() {
        const user = getSession();
        const loginBtn = $("#loginBtn");
        const userWidget = $("#userWidget");
        const userNameDisplay = $("#userNameDisplay");

        if (user) {
            loginBtn.style.display = "none";
            userWidget.style.display = "inline-flex";
            userNameDisplay.textContent = user.name;

            const avatar = userWidget.querySelector(".user-avatar");
            avatar.textContent = getInitials(user.name);
        } else {
            loginBtn.style.display = "";
            userWidget.style.display = "none";
        }
    }

    function getInitials(name) {
        if (!name) return "";
        const p = name.trim().split(" ");
        if (p.length === 1) return p[0].substring(0, 2).toUpperCase();
        return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    }

    /* ------------------ MODAL LOGIN ------------------ */
    function setupAuth() {
        const loginBtn = $("#loginBtn");
        const authModal = $("#authModal");
        const authClose = $("#authClose");

        const tabLogin = $("#tabLogin");
        const tabRegister = $("#tabRegister");

        const loginPanel = $("#loginPanel");
        const registerPanel = $("#registerPanel");

        const authMessage = $("#authMessage");

        function openModal() {
            authModal.classList.add("open");
            authModal.querySelector("input")?.focus();
        }
        function closeModal() {
            authModal.classList.remove("open");
        }

        loginBtn.addEventListener("click", openModal);
        authClose.addEventListener("click", closeModal);

        tabLogin.addEventListener("click", () => switchTab("login"));
        tabRegister.addEventListener("click", () => switchTab("register"));

        function switchTab(tab) {
            [tabLogin, tabRegister].forEach(t => t.classList.remove("active"));
            [loginPanel, registerPanel].forEach(p => p.classList.remove("active"));

            if (tab === "login") {
                tabLogin.classList.add("active");
                loginPanel.classList.add("active");
            } else {
                tabRegister.classList.add("active");
                registerPanel.classList.add("active");
            }
            authMessage.textContent = "";
        }

        /* -------- LOGIN -------- */
        loginPanel.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = loginPanel.querySelector("input[name=email]").value;
            const password = loginPanel.querySelector("input[name=password]").value;

            const res = await fetch(`${API}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (data.error) {
                authMessage.textContent = data.error;
                authMessage.className = "auth-message error";
                return;
            }

            saveSession(data.user);
            updateUI();
            showToast("Login realizado!", "success");
            closeModal();
        });

        /* -------- CADASTRO -------- */
        registerPanel.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = registerPanel.querySelector("input[name=name]").value;
            const email = registerPanel.querySelector("input[name=email]").value;
            const password = registerPanel.querySelector("input[name=password]").value;
            const cPassword = registerPanel.querySelector("input[name=passwordConfirm]").value;

            if (password !== cPassword) {
                authMessage.textContent = "As senhas não coincidem";
                authMessage.className = "auth-message error";
                return;
            }

            const res = await fetch(`${API}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            if (data.error) {
                authMessage.textContent = data.error;
                authMessage.className = "auth-message error";
                return;
            }

            // auto-login
            const login = await fetch(`${API}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const loginData = await login.json();
            saveSession(loginData.user);
            updateUI();
            showToast("Cadastro feito!", "success");
            closeModal();
        });

        /* -------- LOGOUT -------- */
        $("#logoutBtn").addEventListener("click", () => {
            clearSession();
            updateUI();
            showToast("Você saiu da sua conta", "info");
        });

        /* -------- MENU DO USUÁRIO (CORREÇÃO IMPORTANTE) -------- */
        const userToggle = $("#userToggle");
        const userMenu = $("#userMenu");

        userToggle.addEventListener("click", () => {
            const isOpen = userMenu.classList.toggle("open");
            userToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        // Fechar se clicar fora
        document.addEventListener("click", (e) => {
            if (!userMenu.contains(e.target) && !userToggle.contains(e.target)) {
                userMenu.classList.remove("open");
                userToggle.setAttribute("aria-expanded", "false");
            }
        });

        updateUI();
    }

    /* ------------------ SALVAR PONTOS (GAME) ------------------ */
    window.savePoints = async function (newPoints) {
        const user = getSession();
        if (!user) {
            showToast("Faça login para salvar pontos!", "warn");
            return;
        }

        const res = await fetch(`${API}/save-points`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, points: newPoints })
        });

        const data = await res.json();
        if (data.success) {
            user.points = newPoints;
            saveSession(user);
            showToast("Pontos salvos!", "success");
        }
    };

    /* ------------------ INIT ------------------ */
    onReady(() => {
        updateUI();
        setupAuth();
        ensureToastRoot();
    });
/* ------------------ ANIMAÇÃO DOS NÚMEROS ------------------ */
function animateNumbers() {
    const numbers = document.querySelectorAll(".number");

    numbers.forEach(num => {
        const target = +num.getAttribute("data-target");
        const speed = 50; // velocidade da animação

        const update = () => {
            const current = +num.innerText;
            const increment = Math.ceil(target / speed);

            if (current < target) {
                num.innerText = current + increment;
                requestAnimationFrame(update);
            } else {
                num.innerText = target;
            }
        };

        update();
    });
}

/* Rodar a animação assim que a página carregar */
onReady(() => {
    animateNumbers();
});


})();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexão MySQL Railway
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// ---------------------- CADASTRO ----------------------
app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.json({ error: "Preencha todos os campos" });

    const hash = bcrypt.hashSync(password, 10);

    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hash], (err) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.json({ error: "Email já cadastrado" });
            }
            return res.json({ error: "Erro ao cadastrar" });
        }
        return res.json({ success: true });
    });
});

// ---------------------- LOGIN ----------------------
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.json({ error: "Preencha todos os campos" });

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) return res.json({ error: "Erro no servidor" });

        if (result.length === 0)
            return res.json({ error: "Email ou senha incorretos" });

        const user = result[0];

        const match = bcrypt.compareSync(password, user.password);
        if (!match)
            return res.json({ error: "Email ou senha incorretos" });

        return res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                points: user.points
            }
        });
    });
});

// ---------------------- SALVAR PONTOS ----------------------
app.post("/api/save-points", (req, res) => {
    const { userId, points } = req.body;

    if (!userId || points === undefined)
        return res.json({ error: "Dados insuficientes" });

    const sql = "UPDATE users SET points = ? WHERE id = ?";
    db.query(sql, [points, userId], (err) => {
        if (err) return res.json({ error: "Erro ao salvar pontos" });

        return res.json({ success: true });
    });
});

// ---------------------- PEGAR PONTOS ----------------------
app.get("/api/get-points/:id", (req, res) => {
    const userId = req.params.id;

    db.query("SELECT points FROM users WHERE id = ?", [userId], (err, result) => {
        if (err) return res.json({ error: "Erro no servidor" });

        if (result.length === 0)
            return res.json({ error: "Usuário não encontrado" });

        return res.json({ points: result[0].points });
    });
});

// Railway exige usar PORT da env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Servidor rodando na porta ${PORT}`)
);

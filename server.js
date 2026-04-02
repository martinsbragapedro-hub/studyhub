const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve a sua pasta public onde está o index.html

// Configuração do Banco de Dados usando variáveis de ambiente do Railway
const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
});

// Criar (Registrar) Usuário
app.post('/api/register', async (req, res) => {
    const { id, name, email, password } = req.body;
    try {
        await pool.query('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)', [id, name, email, password]);
        res.status(201).json({ message: 'Usuário criado' });
    } catch (error) {
        res.status(400).json({ error: 'E-mail já cadastrado ou erro no servidor' });
    }
});

// Fazer Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT id, name, email FROM users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(401).json({ error: 'Credenciais inválidas' });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Buscar Dados do Usuário (Tarefas e Provas)
app.get('/api/data/:userId', async (req, res) => {
    try {
        const [tasks] = await pool.query('SELECT * FROM tasks WHERE user_id = ?', [req.params.userId]);
        const [exams] = await pool.query('SELECT * FROM exams WHERE user_id = ?', [req.params.userId]);
        
        // Formatar datas para o formato do HTML
        tasks.forEach(t => {
            t.completed = t.completed === 1;
            if(t.deadline) t.deadline = t.deadline.toISOString().split('T')[0];
            if(t.start_date) t.start = t.start_date.toISOString().split('T')[0];
        });
        exams.forEach(e => {
            if(e.exam_date) e.date = e.exam_date.toISOString().split('T')[0];
        });

        res.json({ tasks, exams });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dados' });
    }
});

// Salvar / Atualizar Tarefa
app.post('/api/tasks', async (req, res) => {
    const { id, user_id, subject, description, deadline, start, duration, priority, completed } = req.body;
    try {
        await pool.query(
            'REPLACE INTO tasks (id, user_id, subject, description, deadline, start_date, duration, priority, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, user_id, subject, description, deadline, start || null, duration || 0, priority, completed ? 1 : 0]
        );
        res.json({ message: 'Tarefa salva' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar tarefa' });
    }
});

// Deletar Tarefa
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Tarefa deletada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
});

// Salvar / Atualizar Prova
app.post('/api/exams', async (req, res) => {
    const { id, user_id, subject, date, materials, content } = req.body;
    try {
        await pool.query(
            'REPLACE INTO exams (id, user_id, subject, exam_date, materials, content) VALUES (?, ?, ?, ?, ?, ?)',
            [id, user_id, subject, date, materials, content]
        );
        res.json({ message: 'Prova salva' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar prova' });
    }
});

// Deletar Prova
app.delete('/api/exams/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM exams WHERE id = ?', [req.params.id]);
        res.json({ message: 'Prova deletada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar prova' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

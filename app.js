require("dotenv").config();
const express = require('express');
const sequelize = require("./config/sequelize");
const app = express();
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const filePath = path.join(__dirname, 'RostosConhecidos.txt');
const labels = [];
const { exec } = require('child_process');
const Pessoa = require("./models/Pessoa");
const bodyParser = require('body-parser');
const port = 3000;
const { validationResult } = require('express-validator');

app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.raw({ type: 'image/jpeg', limit: '2mb' }));

//CONEXÃO SERVIDOR E BANCO
console.log("Tentando conectar ao banco de dados...");
sequelize
  .authenticate()
  .then(() => {
    console.log("Conexão com o banco de dados estabelecida.");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco de dados:", err);
  });
console.log("Tentando sincronizar os modelos com o banco de dados...");
sequelize
  .sync()
  .then(() => {
    console.log("Modelos sincronizados com o banco de dados.");
    app.listen(port, () => {
      console.log(`Servidor em execução na porta ${port}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao sincronizar os modelos com o banco de dados:", err);
  });

//LER NOMES CONHECIDOS
app.get('/obter-nomes', (req, res) => {
  res.json(labels);
});

//LER ARQUIVO ROSTOS
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Erro ao ler o arquivo RostosConhecidos.txt:', err);
    return;
  }

  const lines = data.trim().split('\n');

  lines.forEach(line => {
    labels.push(line.trim());
  });

  console.log('Nomes carregados:', labels);
});

/// Função para processar o cadastro
async function cadastrarPessoa(req, res) {
  const { nome, cpf, tipo } = req.body;

  try {
    const createdUser = await Pessoa.create({
      nome,
      cpf,
      tipo,
    });

    res.status(200).json({ message: "Cadastro realizado com sucesso." });
  } catch (err) {
    console.error("Erro ao inserir os dados: ", err);
    res.status(500).json({ error: "Erro ao realizar o cadastro." });
  }
}

// ROTA SALVAR IMAGEM
app.post('/salvar-imagem', (req, res) => {
  const nome = req.headers.nome;

  if (!nome) {
      return res.status(400).send('Nome não fornecido.');
  }

  const imageData = req.body;

  const pastaDestino = path.join(__dirname, 'assets', 'lib', 'face-api', 'labels', nome);
  if (!fs.existsSync(pastaDestino)) {
      fs.mkdirSync(pastaDestino, { recursive: true });
  }

  const caminhoImagem = path.join(pastaDestino, '1.jpg');
  fs.writeFileSync(caminhoImagem, imageData);

  fs.appendFileSync(filePath, '\n' + nome);

  res.status(200).send('Imagem e nome salvos com sucesso.');

  exec('npm start', (error, stdout, stderr) => {
      if (error) {
          console.error('Erro ao reiniciar o servidor:', error);
      }
  });
});

//ROTA CADASTRO
app.post(
  "/cadastro",
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, cpf, tipo, ativo } = req.body;

    try {
      const createdUser = await Pessoa.create({
        nome,
        cpf,
        tipo,
        ativo,
      });

      res.status(200).json({ message: "Cadastro realizado com sucesso." });
    } catch (err) {
      console.error("Erro ao inserir os dados: ", err);
      res.status(500).json({ error: "Erro ao realizar o cadastro." });
    }
  }
);



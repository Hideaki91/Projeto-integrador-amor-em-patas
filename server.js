const express = require('express');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
app.use(express.json());

// Conexão com o Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Importando as rotas e injetando o cliente do Supabase
const animaisRoutes = require('./routes/animais')(supabase);
const adotantesRoutes = require('./routes/adotantes')(supabase);
const solicitacoesRoutes = require('./routes/solicitacoes')(supabase);

// Definindo os endpoints da API
app.use('/animais', animaisRoutes);
app.use('/adotantes', adotantesRoutes);
app.use('/solicitacoes', solicitacoesRoutes);

app.get('/', (req, res) => {
  res.send('API do Amor em Patas está online! 🐾');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
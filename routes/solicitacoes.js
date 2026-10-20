const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase.from('solicitacoes_adocao').select(`
        id, status, mensagem, created_at,
        animais (id, nome, especie, status),
        adotantes (id, nome, email, telefone)
      `);
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { animal_id, adotante_id, mensagem } = req.body;
      const { data, error } = await supabase.from('solicitacoes_adocao').insert([{ animal_id, adotante_id, mensagem, status: 'pendente' }]).select();
      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { data, error } = await supabase.from('solicitacoes_adocao').update({ status }).eq('id', id).select();
      if (error) throw error;

      if (status === 'aprovada' && data[0]) {
        await supabase.from('animais').update({ status: 'adotado' }).eq('id', data[0].animal_id);
      }

      return res.json(data[0]);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  return router;
};
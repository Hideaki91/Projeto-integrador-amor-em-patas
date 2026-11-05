const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase.from('animais').select('*').eq('status', 'disponivel');
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

router.post('/', async (req, res) => {
    try {
      const { nome, especie, porte, idade, descricao, foto_url } = req.body;

      // Se vier uma lista de fotos, junta todas separadas por vírgula para salvar no banco
      const fotosParaSalvar = Array.isArray(foto_url) ? foto_url.join(',') : foto_url;

      const { data, error } = await supabase
        .from('animais')
        .insert([{ nome, especie, porte, idade, descricao, foto_url: fotosParaSalvar }])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const { data, error } = await supabase.from('animais').update(updates).eq('id', id).select();
      if (error) throw error;
      return res.json(data[0]);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('animais').delete().eq('id', id);
      if (error) throw error;
      return res.json({ mensagem: 'Animal removido com sucesso!' });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  return router;
};

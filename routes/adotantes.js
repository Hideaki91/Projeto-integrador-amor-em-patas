const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase.from('adotantes').select('*');
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { nome, email, telefone, cidade } = req.body;
      const { data, error } = await supabase.from('adotantes').insert([{ nome, email, telefone, cidade }]).select();
      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  });

  return router;
};
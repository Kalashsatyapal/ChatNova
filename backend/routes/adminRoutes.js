const express = require('express');
const router = express.Router();
const adminCheck = require('../middleware/adminCheck');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get all users
router.get('/admin/users', adminCheck, async (req, res) => {
  const { data, error } = await supabase.from('auth.users').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// Get all chat sessions
router.get('/admin/chat-sessions', adminCheck, async (req, res) => {
  const { data, error } = await supabase.from('chat_sessions').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// Delete a chat session
router.delete('/admin/chat-sessions/:id', adminCheck, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
  if (error) return res.status(500).json({ error });
  res.json({ message: 'Deleted' });
});

module.exports = router;

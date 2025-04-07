const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function adminCheck(req, res, next) {
  const userId = req.headers['x-user-id']; // or from JWT decoded data

  if (!userId) return res.status(401).json({ error: 'User ID required' });

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data || data.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }

  next();
}

module.exports = adminCheck;

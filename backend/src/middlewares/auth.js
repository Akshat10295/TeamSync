const { supabase, supabaseAdmin } = require('../config/supabase');

async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
      const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          user_id: user.id.substring(0, 8),
          name,
          email: user.email,
          avatar
        })
        .select()
        .single();

      if (createError) {
        console.error('Auto-create profile error:', createError);
        return res.status(500).json({ error: 'Failed to create profile' });
      }
      profile = newProfile;
    }

    req.user = {
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { auth };

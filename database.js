const { createClient } = require('@supabase/supabase-js');

function criarSupabase(token) {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        }
    );
}

module.exports = criarSupabase;

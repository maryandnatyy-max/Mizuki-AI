let supabaseClient;
let usuarioAtual;

async function iniciarAutenticacao() {
    const resposta = await fetch('/api/config');

    if (!resposta.ok) {
        throw new Error('Não foi possível carregar a configuração.');
    }

    const config = await resposta.json();

    supabaseClient = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseKey
    );

    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    if (error) throw error;

    if (session) {
        usuarioAtual = session.user;
        return session;
    }

    const { data, error: loginError } =
        await supabaseClient.auth.signInAnonymously();

    if (loginError) throw loginError;

    usuarioAtual = data.user;
    return data.session;
}

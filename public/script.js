const entrada = document.getElementById('entrada');
const mensagens = document.getElementById('mensagens');
const boasVindas = document.getElementById('boas-vindas');
const formulario = document.getElementById('formulario');

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const historico = document.getElementById('historico');

const abrirMenu = document.getElementById('abrir-menu');
const fecharMenu = document.getElementById('fechar-menu');
const botaoNovaConversa = document.getElementById('nova-conversa');
const botaoEnviar = document.getElementById('enviar');
const botaoAnexarImagem = document.getElementById('anexar-imagem');
const seletorImagem = document.getElementById('imagem');

botaoAnexarImagem.addEventListener('click', () => {
    seletorImagem.click();
});

seletorImagem.addEventListener('change', async () => {
    const arquivo = seletorImagem.files[0];
    if (!arquivo) return;
    await enviarImagem(arquivo);
    seletorImagem.value = '';
});
let conversas = [];
let conversaAtual = null;

function abrirSidebar() {
    sidebar.classList.add('aberto');
    overlay.classList.add('ativo');
}

function fecharSidebar() {
    sidebar.classList.remove('aberto');
    overlay.classList.remove('ativo');
}

abrirMenu.addEventListener('click', abrirSidebar);
fecharMenu.addEventListener('click', fecharSidebar);
overlay.addEventListener('click', fecharSidebar);

async function carregarConversas() {
    const { data, error } = await supabaseClient
        .from('conversas')
        .select('*')
        .eq('usuario_id', usuarioAtual.id)
        .order('criada_em', { ascending: false });

    if (error) throw error;

    const ids = data.map(c => c.id);
    let mensagensSalvas = [];

    if (ids.length > 0) {
        const resultado = await supabaseClient
            .from('mensagens')
            .select('*')
            .in('conversa_id', ids)
            .order('criada_em', { ascending: true });

        if (resultado.error) throw resultado.error;
        mensagensSalvas = resultado.data;
    }

    conversas = data.map(c => ({
        id: c.id,
        titulo: c.titulo,
        mensagens: mensagensSalvas
            .filter(m => m.conversa_id === c.id)
            .map(m => ({
                remetente: m.remetente,
                conteudo: m.conteudo
            }))
    }));

    conversaAtual = conversas.length ? conversas[0].id : null;

    renderizarHistorico();
    renderizarMensagens();
}

async function criarConversa() {
    const id = crypto.randomUUID();

    const { error } = await supabaseClient
        .from('conversas')
        .insert({
            id,
            usuario_id: usuarioAtual.id,
            titulo: 'Nova conversa'
        });

    if (error) {
        console.error('Erro ao criar conversa:', error);
        alert('Erro ao criar: ' + error.message);
        return;
    }

    conversas.unshift({
        id,
        titulo: 'Nova conversa',
        mensagens: []
    });

    conversaAtual = id;

    renderizarHistorico();
    renderizarMensagens();
    fecharSidebar();
    entrada.focus();
}

function renderizarHistorico() {
    historico.innerHTML = '';

    conversas.forEach(conversa => {
        const item = document.createElement('div');
        item.className = 'history-item';

        if (conversa.id === conversaAtual) {
            item.classList.add('active');
        }

        const titulo = document.createElement('button');
        titulo.className = 'history-title';
        titulo.textContent = conversa.titulo;

        titulo.addEventListener('click', () => {
            selecionarConversa(conversa.id);
        });

        const acoes = document.createElement('div');
        acoes.className = 'history-actions';

        const renomear = document.createElement('button');
        renomear.textContent = '✎';
        renomear.title = 'Renomear conversa';

        renomear.addEventListener('click', event => {
            event.stopPropagation();
            renomearConversa(conversa.id);
        });

        const excluir = document.createElement('button');
        excluir.textContent = '×';
        excluir.title = 'Excluir conversa';

        excluir.addEventListener('click', event => {
            event.stopPropagation();
            excluirConversa(conversa.id);
        });

        acoes.append(renomear, excluir);
        item.append(titulo, acoes);
        historico.appendChild(item);
    });
}

function selecionarConversa(id) {
    conversaAtual = id;
    renderizarHistorico();
    renderizarMensagens();
    fecharSidebar();
}

async function renomearConversa(id) {
    const conversa = conversas.find(c => c.id === id);
    if (!conversa) return;

    const novoTitulo = prompt('Qual será o novo título?', conversa.titulo);
    if (!novoTitulo || !novoTitulo.trim()) return;

    const titulo = novoTitulo.trim().slice(0, 45);

    const { error } = await supabaseClient
        .from('conversas')
        .update({ titulo })
        .eq('id', id);

    if (error) {
        console.error(error);
        alert('Não consegui renomear: ' + error.message);
        return;
    }

    conversa.titulo = titulo;
    renderizarHistorico();
}

async function excluirConversa(id) {
    if (!confirm('Deseja excluir esta conversa?')) return;

    const { error } = await supabaseClient
        .from('conversas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(error);
        alert('Não consegui excluir: ' + error.message);
        return;
    }

    conversas = conversas.filter(c => c.id !== id);

    if (conversaAtual === id) {
        conversaAtual = conversas.length ? conversas[0].id : null;
    }

    renderizarHistorico();
    renderizarMensagens();
}

function renderizarMensagens() {
    mensagens.innerHTML = '';

    const conversa = conversas.find(c => c.id === conversaAtual);

    boasVindas.style.display =
        !conversa || conversa.mensagens.length === 0 ? 'flex' : 'none';

    if (!conversa) return;

    conversa.mensagens.forEach(mensagem => {
        const elemento = document.createElement('div');

        elemento.className =
            mensagem.remetente === 'user'
                ? 'mensagem usuario'
                : 'mensagem assistente';

        elemento.textContent = mensagem.conteudo;
        mensagens.appendChild(elemento);
    });

    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
}

function mostrarPensamento() {
    const indicador = document.createElement('div');
    indicador.id = 'mizuki-pensando';
    indicador.className = 'mizuki-pensando';
    indicador.innerHTML = '<span>Mizuki está pensando</span><div class="pontinhos"><span></span><span></span><span></span></div>';
    mensagens.appendChild(indicador);

    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
}

function esconderPensamento() {
    const indicador = document.getElementById('mizuki-pensando');
    if (indicador) indicador.remove();
}

function gerarTitulo(texto) {
    const limpo = texto.trim().replace(/\s+/g, ' ');

    return limpo.length > 32
        ? limpo.slice(0, 32).trim() + '...'
        : limpo;
}

async function salvarMensagem(conversaId, remetente, conteudo) {
    const { error } = await supabaseClient
        .from('mensagens')
        .insert({
            conversa_id: conversaId,
            remetente,
            conteudo
        });

    if (error) throw error;
}

async function enviarMensagem(event) {
    event.preventDefault();

    const texto = entrada.value.trim();
    if (!texto || !conversaAtual) return;

    const conversa = conversas.find(c => c.id === conversaAtual);
    if (!conversa) return;

    botaoEnviar.disabled = true;

    try {
        if (conversa.mensagens.length === 0) {
            const titulo = gerarTitulo(texto);

            const { error } = await supabaseClient
                .from('conversas')
                .update({ titulo })
                .eq('id', conversa.id);

            if (error) throw error;

            conversa.titulo = titulo;
        }

        await salvarMensagem(conversa.id, 'user', texto);

        conversa.mensagens.push({
            remetente: 'user',
            conteudo: texto
        });

        entrada.value = '';
        entrada.style.height = 'auto';

        renderizarHistorico();
        renderizarMensagens();
        mostrarPensamento();

        const { data: { session }, error: erroSessao } =
            await supabaseClient.auth.getSession();

        if (erroSessao || !session) {
            throw new Error('Sua sessão expirou. Atualize a página.');
        }

        const resposta = await fetch('https://mizuki-ai.onrender.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                mensagem: texto,
                conversaId: conversa.id
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Erro ao conversar com a Mizuki.');
        }

        await salvarMensagem(conversa.id, 'assistant', dados.resposta);

        conversa.mensagens.push({
            remetente: 'assistant',
            conteudo: dados.resposta
        });

    } catch (erro) {
        console.error('Erro no chat:', erro);

        conversa.mensagens.push({
            remetente: 'assistant',
            conteudo: `Erro: ${erro.message}`
        });
    }

    esconderPensamento();
    botaoEnviar.disabled = false;
    renderizarHistorico();
    renderizarMensagens();
}

botaoNovaConversa.addEventListener('click', criarConversa);
formulario.addEventListener('submit', enviarMensagem);

entrada.addEventListener('input', () => {
    entrada.style.height = 'auto';
    entrada.style.height = Math.min(entrada.scrollHeight, 130) + 'px';
});

entrada.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        formulario.requestSubmit();
    }
});


async function enviarImagem(arquivo) {
    const conversa = conversas.find(c => c.id === conversaAtual);

    if (!conversa) {
        alert('Crie uma conversa antes de enviar uma imagem.');
        return;
    }

    if (!arquivo.type.startsWith('image/')) {
        alert('Escolha um arquivo de imagem.');
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        alert('A imagem precisa ter até 5 MB.');
        return;
    }

    const prompt = entrada.value.trim() ||
        'Analise a imagem e, se houver alguma questão ou atividade, resolva-a e explique a resposta.';

    const mensagemSalva = '📷 Imagem enviada';

    botaoEnviar.disabled = true;

    try {
        const imagemBase64 = await new Promise((resolve, reject) => {
            const leitor = new FileReader();

            leitor.onload = () => {
                resolve(String(leitor.result).split(',')[1]);
            };

            leitor.onerror = () => {
                reject(new Error('Não consegui ler a imagem.'));
            };

            leitor.readAsDataURL(arquivo);
        });

        await salvarMensagem(conversa.id, 'user', mensagemSalva);

        conversa.mensagens.push({
            remetente: 'user',
            conteudo: mensagemSalva
        });

        entrada.value = '';
        entrada.style.height = 'auto';
        renderizarMensagens();
        mostrarPensamento();

        const { data: { session }, error } =
            await supabaseClient.auth.getSession();

        if (error || !session) {
            throw new Error('Sua sessão expirou. Atualize a página.');
        }

        const resposta = await fetch('https://mizuki-ai.onrender.com/api/analisar-imagem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token
            },
            body: JSON.stringify({
                mensagem: prompt,
                conversaId: conversa.id,
                imagemBase64,
                mimeType: arquivo.type
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Falha ao analisar a imagem.');
        }

        await salvarMensagem(conversa.id, 'assistant', dados.resposta);

        conversa.mensagens.push({
            remetente: 'assistant',
            conteudo: dados.resposta
        });

    } catch (erro) {
        console.error('Erro ao analisar imagem:', erro);

        conversa.mensagens.push({
            remetente: 'assistant',
            conteudo: 'Erro: ' + erro.message
        });
    }

    esconderPensamento();
    botaoEnviar.disabled = false;
    renderizarHistorico();
    renderizarMensagens();
}

async function iniciarMizuki() {
    botaoEnviar.disabled = true;

    try {
        await iniciarAutenticacao();
        await carregarConversas();
        console.log('Mizuki conectada ao Supabase! 💙');
    } catch (erro) {
        console.error('Erro ao iniciar Mizuki:', erro);
        alert('Erro: ' + (erro.message || JSON.stringify(erro)));
    }

    botaoEnviar.disabled = false;
}

iniciarMizuki();

// Fechar tela inicial de boas-vindas
const telaBoasVindas = document.getElementById('tela-boas-vindas');
const fecharBoasVindas = document.getElementById('fechar-boas-vindas');

fecharBoasVindas.addEventListener('click', () => {
    telaBoasVindas.style.display = 'none';
});

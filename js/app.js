(() => {
  'use strict';

  const STORAGE_KEY = 'guincho_registros_v1';
  const STORAGE_KEY_SEGURADORAS = 'guincho_seguradoras_v1';
  const STORAGE_KEY_CLIENTES = 'guincho_clientes_v1';

  // ---------- Persistência ----------

  function getRegistros() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler registros', e);
      return [];
    }
  }

  function setRegistros(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }

  function getClientes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CLIENTES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler clientes', e);
      return [];
    }
  }

  function setClientes(lista) {
    localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(lista));
  }

  function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Antes existiam cadastros separados de "Seguradoras" e nomes de "Particulares" — agora
  // é um único cadastro de Clientes. Na primeira execução após a atualização, junta os dois
  // cadastros antigos (mais os nomes já usados em serviços) numa lista única, sem duplicar.
  function migrarParaClientesUnificado() {
    if (localStorage.getItem(STORAGE_KEY_CLIENTES) !== null) return;

    const nomesVistos = new Set();
    const clientes = [];
    const adicionar = (nome) => {
      const chave = (nome || '').trim().toLowerCase();
      if (!chave || nomesVistos.has(chave)) return;
      nomesVistos.add(chave);
      clientes.push({ id: gerarId(), nome: nome.trim() });
    };

    let seguradorasAntigas = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SEGURADORAS);
      seguradorasAntigas = raw ? JSON.parse(raw) : [];
    } catch (e) { /* ignora cadastro antigo corrompido */ }
    seguradorasAntigas.forEach(s => adicionar(s.nome));

    getRegistros().forEach(r => adicionar(r.nome));

    setClientes(clientes);
  }

  // ---------- Formatação ----------

  function formatarMoeda(valor) {
    return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Máscara de moeda: os dígitos digitados são sempre lidos como centavos (da direita pra esquerda).
  function formatarCentavos(centavos) {
    return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function valorMascaradoParaNumero(valorMascarado) {
    const digitos = (valorMascarado || '').replace(/\D/g, '');
    return digitos ? parseInt(digitos, 10) / 100 : 0;
  }

  function aplicarMascaraMoeda(input) {
    input.addEventListener('input', () => {
      const digitos = input.value.replace(/\D/g, '');
      const centavos = parseInt(digitos || '0', 10);
      input.value = centavos ? formatarCentavos(centavos) : '';
    });
  }

  function formatarDataHora(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function agoraParaDataInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function agoraParaHoraInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(11, 16);
  }

  function dataHoraInputParaIso(dataValor, horaValor) {
    // dataValor "YYYY-MM-DD", horaValor "HH:mm", ambos em horário local
    if (!dataValor) return new Date().toISOString();
    return new Date(`${dataValor}T${horaValor || '00:00'}`).toISOString();
  }

  function isoParaDataInput(iso) {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function isoParaHoraInput(iso) {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(11, 16);
  }

  // ---------- Elementos ----------

  const form = document.getElementById('form-registro');
  const inputEditingId = document.getElementById('editingId');
  const inputDataRegistro = document.getElementById('dataRegistro');
  const inputHoraRegistro = document.getElementById('horaRegistro');
  const inputPlacaVeiculo = document.getElementById('placaVeiculo');
  const inputValorFrete = document.getElementById('valorFrete');
  const inputLocalOrigem = document.getElementById('localOrigem');
  const inputLocalOrigemNumero = document.getElementById('localOrigemNumero');
  const inputLocalDestino = document.getElementById('localDestino');
  const inputLocalDestinoNumero = document.getElementById('localDestinoNumero');
  const clienteSelect = document.getElementById('clienteSelect');
  const linhaNovoCliente = document.getElementById('linhaNovoCliente');
  const inputClienteNomeNovo = document.getElementById('clienteNomeNovo');
  const inputNumeroProtocolo = document.getElementById('numeroProtocolo');
  const inputDescricao = document.getElementById('descricao');
  const btnSalvar = document.getElementById('btnSalvar');
  const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
  const btnExcluirRegistro = document.getElementById('btnExcluirRegistro');

  const buscaLista = document.getElementById('buscaLista');
  const listaRegistros = document.getElementById('listaRegistros');
  const listaVazia = document.getElementById('listaVazia');
  const periodoLista = document.getElementById('periodoLista');
  const seguradoraLista = document.getElementById('seguradoraLista');
  const linhaPersonalizadoLista = document.getElementById('linhaPersonalizadoLista');
  const dataDeLista = document.getElementById('dataDeLista');
  const dataAteLista = document.getElementById('dataAteLista');
  const valorMinLista = document.getElementById('valorMinLista');
  const valorMaxLista = document.getElementById('valorMaxLista');

  const periodoRelatorio = document.getElementById('periodoRelatorio');
  const clienteFiltroRelatorio = document.getElementById('clienteFiltroRelatorio');
  const clienteFiltroRelatorioBtn = document.getElementById('clienteFiltroRelatorioBtn');
  const clienteFiltroRelatorioLabel = document.getElementById('clienteFiltroRelatorioLabel');
  const clienteFiltroRelatorioMenu = document.getElementById('clienteFiltroRelatorioMenu');
  const linhaPersonalizadoRelatorio = document.getElementById('linhaPersonalizadoRelatorio');
  const dataDeRelatorio = document.getElementById('dataDeRelatorio');
  const dataAteRelatorio = document.getElementById('dataAteRelatorio');
  const valorMinRelatorio = document.getElementById('valorMinRelatorio');
  const valorMaxRelatorio = document.getElementById('valorMaxRelatorio');
  const relatorioResumo = document.getElementById('relatorioResumo');
  const relatorioGrupos = document.getElementById('relatorioGrupos');
  const relatorioVazio = document.getElementById('relatorioVazio');
  const btnGerarMensagem = document.getElementById('btnGerarMensagem');
  const btnExportarExcel = document.getElementById('btnExportarExcel');
  const btnExportarPdf = document.getElementById('btnExportarPdf');

  const periodoDashboard = document.getElementById('periodoDashboard');
  const dashboardStats = document.getElementById('dashboardStats');
  const dashboardGrafico = document.getElementById('dashboardGrafico');
  const dashboardRanking = document.getElementById('dashboardRanking');
  const dashboardVazio = document.getElementById('dashboardVazio');

  const formCliente = document.getElementById('form-cliente');
  const inputNovoClienteNome = document.getElementById('novoClienteNome');
  const listaClientesEl = document.getElementById('listaClientes');
  const clientesVazio = document.getElementById('clientesVazio');

  const toastEl = document.getElementById('toast');

  // ---------- Toast ----------

  let toastTimer = null;
  function mostrarToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  // ---------- Navegação entre telas ----------

  const views = {
    nova: document.getElementById('view-nova'),
    lista: document.getElementById('view-lista'),
    dashboard: document.getElementById('view-dashboard'),
    relatorio: document.getElementById('view-relatorio'),
    clientes: document.getElementById('view-clientes'),
  };
  const tabButtons = document.querySelectorAll('.tab-btn');

  function irParaView(nome) {
    Object.entries(views).forEach(([key, el]) => { el.hidden = key !== nome; });
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === nome));
    if (nome === 'lista') { popularFiltroCliente(seguradoraLista); renderLista(); }
    if (nome === 'dashboard') renderDashboard();
    if (nome === 'relatorio') { renderFiltroClienteRelatorio(); renderRelatorio(); }
    if (nome === 'clientes') renderListaClientes();
    if (nome === 'nova' && !inputEditingId.value) {
      inputDataRegistro.value = agoraParaDataInput();
      inputHoraRegistro.value = agoraParaHoraInput();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => irParaView(btn.dataset.view));
  });

  // ---------- Seleção de cliente (cadastrado ou novo) ----------

  function renderClienteSelect(valorSelecionado) {
    const clientes = getClientes().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const valorAtual = valorSelecionado !== undefined ? valorSelecionado : clienteSelect.value;
    let opcoes = '<option value="">Selecione...</option>'
      + '<option value="__novo__">+ Novo cliente</option>'
      + clientes.map(c => `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join('');
    // Preserva o valor de registros antigos mesmo que o cliente tenha sido removido do cadastro
    if (valorAtual && valorAtual !== '__novo__' && !clientes.some(c => c.nome === valorAtual)) {
      opcoes += `<option value="${escapeHtml(valorAtual)}">${escapeHtml(valorAtual)}</option>`;
    }
    clienteSelect.innerHTML = opcoes;
    clienteSelect.value = valorAtual || '';
  }

  function atualizarLinhaNovoCliente() {
    linhaNovoCliente.hidden = clienteSelect.value !== '__novo__';
    if (!linhaNovoCliente.hidden) inputClienteNomeNovo.focus();
  }

  clienteSelect.addEventListener('change', atualizarLinhaNovoCliente);

  // ---------- Filtro por cliente (usado em Serviços) ----------

  function popularFiltroCliente(selectEl) {
    const atual = selectEl.value;
    const clientes = getClientes().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    selectEl.innerHTML = '<option value="">Todos</option>'
      + clientes.map(c => `<option value="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</option>`).join('');
    selectEl.value = atual;
  }

  function passaFiltroCliente(registro, valorFiltro) {
    if (!valorFiltro) return true;
    return registro.nome === valorFiltro;
  }

  // ---------- Filtro por cliente com múltipla seleção (Relatório) ----------
  // Nenhum selecionado = Todos (padrão, sem precisar escolher nada).

  let clientesFiltroRelatorio = [];

  function renderFiltroClienteRelatorio() {
    const clientes = getClientes().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    clientesFiltroRelatorio = clientesFiltroRelatorio.filter(nome => clientes.some(c => c.nome === nome));
    const todosMarcado = clientesFiltroRelatorio.length === 0;

    clienteFiltroRelatorioMenu.innerHTML = `
      <label class="multi-select-opcao multi-select-todos">
        <input type="checkbox" value="" ${todosMarcado ? 'checked' : ''}>
        <span>Todos</span>
      </label>
    ` + clientes.map(c => `
      <label class="multi-select-opcao">
        <input type="checkbox" value="${escapeHtml(c.nome)}" ${clientesFiltroRelatorio.includes(c.nome) ? 'checked' : ''}>
        <span>${escapeHtml(c.nome)}</span>
      </label>
    `).join('');

    clienteFiltroRelatorioLabel.textContent = todosMarcado
      ? 'Todos'
      : clientesFiltroRelatorio.length === 1
        ? clientesFiltroRelatorio[0]
        : `${clientesFiltroRelatorio.length} selecionados`;
  }

  function fecharFiltroClienteRelatorio() {
    clienteFiltroRelatorioMenu.hidden = true;
    clienteFiltroRelatorioBtn.setAttribute('aria-expanded', 'false');
  }

  clienteFiltroRelatorioBtn.addEventListener('click', () => {
    const abrindo = clienteFiltroRelatorioMenu.hidden;
    clienteFiltroRelatorioMenu.hidden = !abrindo;
    clienteFiltroRelatorioBtn.setAttribute('aria-expanded', String(abrindo));
  });

  document.addEventListener('click', (e) => {
    if (!clienteFiltroRelatorio.contains(e.target)) fecharFiltroClienteRelatorio();
  });

  clienteFiltroRelatorioMenu.addEventListener('change', (e) => {
    const checkbox = e.target;
    if (checkbox.type !== 'checkbox') return;
    if (checkbox.value === '') {
      clientesFiltroRelatorio = [];
    } else if (checkbox.checked) {
      clientesFiltroRelatorio.push(checkbox.value);
    } else {
      clientesFiltroRelatorio = clientesFiltroRelatorio.filter(nome => nome !== checkbox.value);
    }
    renderFiltroClienteRelatorio();
    renderRelatorio();
  });

  function passaFiltroClienteMultiplo(registro, valoresFiltro) {
    if (!valoresFiltro || valoresFiltro.length === 0) return true;
    return valoresFiltro.includes(registro.nome);
  }

  function passaFiltroPeriodo(dataHoraIso, periodo, dataDe, dataAte) {
    const d = new Date(dataHoraIso);
    if (periodo === 'personalizado') {
      if (dataDe && d < new Date(dataDe + 'T00:00:00')) return false;
      if (dataAte && d > new Date(dataAte + 'T23:59:59')) return false;
      return true;
    }
    if (periodo === 'tudo') return true;
    const agora = new Date();
    if (periodo === 'mesAtual') {
      return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
    }
    if (periodo === 'mesPassado') {
      const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      return d.getFullYear() === mesPassado.getFullYear() && d.getMonth() === mesPassado.getMonth();
    }
    return true;
  }

  function passaFiltroValor(valorFrete, min, max) {
    if (min !== null && valorFrete < min) return false;
    if (max !== null && valorFrete > max) return false;
    return true;
  }

  // ---------- Cadastro de clientes ----------

  function renderListaClientes() {
    const clientes = getClientes().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    clientesVazio.hidden = clientes.length > 0;
    listaClientesEl.innerHTML = clientes.map(c => `
      <div class="seguradora-item" data-id="${c.id}">
        <span>${escapeHtml(c.nome)}</span>
        <button type="button" class="btn-remover" data-id="${c.id}" title="Remover"><svg class="icon"><use href="#icon-x"></use></svg></button>
      </div>
    `).join('');

    listaClientesEl.querySelectorAll('.btn-remover').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const restantes = getClientes().filter(c => c.id !== id);
        setClientes(restantes);
        renderListaClientes();
        mostrarToast('Cliente removido.');
      });
    });
  }

  function adicionarClienteSeNovo(nome) {
    const clientes = getClientes();
    const jaExiste = clientes.some(c => c.nome.toLowerCase() === nome.toLowerCase());
    if (jaExiste) return;
    clientes.push({ id: gerarId(), nome });
    setClientes(clientes);
  }

  formCliente.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = inputNovoClienteNome.value.trim();
    if (!nome) return;

    const clientes = getClientes();
    const jaExiste = clientes.some(c => c.nome.toLowerCase() === nome.toLowerCase());
    if (jaExiste) {
      mostrarToast('Esse cliente já está cadastrado.');
      return;
    }
    clientes.push({ id: gerarId(), nome });
    setClientes(clientes);
    inputNovoClienteNome.value = '';
    renderListaClientes();
    mostrarToast('Cliente cadastrado!');
  });

  // ---------- Máscara de moeda ----------

  aplicarMascaraMoeda(inputValorFrete);
  aplicarMascaraMoeda(valorMinLista);
  aplicarMascaraMoeda(valorMaxLista);
  aplicarMascaraMoeda(valorMinRelatorio);
  aplicarMascaraMoeda(valorMaxRelatorio);

  // ---------- Salvar / editar / excluir ----------

  function limparFormulario() {
    form.reset();
    inputEditingId.value = '';
    inputDataRegistro.value = agoraParaDataInput();
    inputHoraRegistro.value = agoraParaHoraInput();
    esconderSugestoes(listaOrigem);
    esconderSugestoes(listaDestino);
    btnCancelarEdicao.hidden = true;
    btnExcluirRegistro.hidden = true;
    btnSalvar.textContent = 'Salvar serviço';
    renderClienteSelect('');
    atualizarLinhaNovoCliente();
  }

  function carregarParaEdicao(id) {
    const registro = getRegistros().find(r => r.id === id);
    if (!registro) return;

    inputEditingId.value = registro.id;
    inputDataRegistro.value = isoParaDataInput(registro.dataHora);
    inputHoraRegistro.value = isoParaHoraInput(registro.dataHora);
    inputPlacaVeiculo.value = registro.placa || '';
    inputValorFrete.value = registro.valorFrete ? formatarCentavos(Math.round(registro.valorFrete * 100)) : '';
    inputLocalOrigem.value = registro.localOrigem || '';
    inputLocalOrigemNumero.value = registro.localOrigemNumero || '';
    inputLocalDestino.value = registro.localDestino || '';
    inputLocalDestinoNumero.value = registro.localDestinoNumero || '';
    inputNumeroProtocolo.value = registro.protocolo || '';
    inputDescricao.value = registro.descricao || '';

    renderClienteSelect(registro.nome);
    atualizarLinhaNovoCliente();

    btnCancelarEdicao.hidden = false;
    btnExcluirRegistro.hidden = false;
    btnSalvar.textContent = 'Salvar alterações';

    irParaView('nova');
    window.scrollTo(0, 0);
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const nome = clienteSelect.value === '__novo__'
      ? inputClienteNomeNovo.value.trim()
      : clienteSelect.value.trim();
    if (!nome) return;

    const registros = getRegistros();
    const id = inputEditingId.value || gerarId();
    const dados = {
      id,
      dataHora: dataHoraInputParaIso(inputDataRegistro.value, inputHoraRegistro.value),
      placa: inputPlacaVeiculo.value.trim().toUpperCase(),
      valorFrete: valorMascaradoParaNumero(inputValorFrete.value),
      localOrigem: inputLocalOrigem.value.trim(),
      localOrigemNumero: inputLocalOrigemNumero.value.trim(),
      localDestino: inputLocalDestino.value.trim(),
      localDestinoNumero: inputLocalDestinoNumero.value.trim(),
      nome,
      protocolo: inputNumeroProtocolo.value.trim(),
      descricao: inputDescricao.value.trim(),
    };

    adicionarClienteSeNovo(nome);

    const index = registros.findIndex(r => r.id === id);
    if (index >= 0) {
      registros[index] = dados;
    } else {
      registros.push(dados);
    }
    setRegistros(registros);

    mostrarToast(index >= 0 ? 'Serviço atualizado!' : 'Serviço salvo!');
    limparFormulario();
    irParaView('lista');
  });

  btnCancelarEdicao.addEventListener('click', () => {
    limparFormulario();
  });

  let confirmandoExclusao = false;
  btnExcluirRegistro.addEventListener('click', () => {
    if (!confirmandoExclusao) {
      confirmandoExclusao = true;
      btnExcluirRegistro.textContent = 'Confirmar exclusão?';
      setTimeout(() => {
        confirmandoExclusao = false;
        btnExcluirRegistro.textContent = 'Excluir serviço';
      }, 3000);
      return;
    }
    const id = inputEditingId.value;
    const registros = getRegistros().filter(r => r.id !== id);
    setRegistros(registros);
    confirmandoExclusao = false;
    btnExcluirRegistro.textContent = 'Excluir serviço';
    mostrarToast('Serviço excluído.');
    limparFormulario();
    irParaView('lista');
  });

  // ---------- Utilidades compartilhadas ----------

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatarLocalComNumero(local, numero) {
    if (!local) return '';
    return numero ? `${local}, ${numero}` : local;
  }

  function agruparPorNome(registros) {
    const grupos = new Map();
    registros.forEach(r => {
      const chave = r.nome.toLowerCase();
      if (!grupos.has(chave)) {
        grupos.set(chave, { nome: r.nome, total: 0, qtd: 0 });
      }
      const g = grupos.get(chave);
      g.total += r.valorFrete;
      g.qtd += 1;
    });
    return [...grupos.values()].sort((a, b) => b.total - a.total);
  }

  // ---------- Compartilhar (WhatsApp) ----------

  async function compartilharTexto(texto) {
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
      } catch (e) {
        if (e.name !== 'AbortError') mostrarToast('Não foi possível compartilhar.');
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(texto);
        mostrarToast('Texto copiado! Cole no WhatsApp.');
      } catch (e) {
        mostrarToast('Não foi possível copiar o texto.');
      }
      return;
    }
    mostrarToast('Compartilhamento não suportado neste navegador.');
  }

  function montarTextoCompartilhamento(r) {
    const linhas = ['*Serviço de Guincho – J Batista*', ''];
    linhas.push(`📅 ${formatarDataHora(r.dataHora)}`);
    if (r.protocolo) linhas.push(`🔖 Protocolo: ${r.protocolo}`);
    if (r.placa) linhas.push(`🚗 Placa: ${r.placa}`);
    if (r.localOrigem) linhas.push(`📍 Retirada: ${formatarLocalComNumero(r.localOrigem, r.localOrigemNumero)}`);
    if (r.localDestino) linhas.push(`📍 Entrega: ${formatarLocalComNumero(r.localDestino, r.localDestinoNumero)}`);
    linhas.push(`💰 Valor do frete: ${formatarMoeda(r.valorFrete)}`);
    if (r.descricao) {
      linhas.push('');
      linhas.push('📝 Observações:');
      linhas.push(r.descricao);
    }
    return linhas.join('\n');
  }

  async function compartilharRegistro(r) {
    await compartilharTexto(montarTextoCompartilhamento(r));
  }

  // ---------- Compartilhar/baixar arquivos (Excel/PDF) ----------

  let logoBytesPromise = null;
  function obterLogoBytes() {
    if (!logoBytesPromise) {
      logoBytesPromise = fetch('images/logo-jbatista-completo.png')
        .then(resp => (resp.ok ? resp.arrayBuffer() : Promise.reject(new Error('logo indisponível'))))
        .then(buf => new Uint8Array(buf))
        .catch(() => null);
    }
    return logoBytesPromise;
  }

  async function compartilharOuBaixarArquivo(blob, nomeArquivo, tituloCompartilhamento, mensagemDownload) {
    if (navigator.canShare) {
      const arquivo = new File([blob], nomeArquivo, { type: blob.type });
      if (navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], title: tituloCompartilhamento });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
          // se o compartilhamento falhar por outro motivo, cai para o download abaixo
        }
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast(mensagemDownload);
  }

  async function gerarPdfServico(r) {
    const campos = [{ label: 'Cliente', valor: r.nome }, { label: 'Data e hora', valor: formatarDataHora(r.dataHora) }];
    if (r.protocolo) campos.push({ label: 'Nº do protocolo', valor: r.protocolo });
    if (r.placa) campos.push({ label: 'Placa', valor: r.placa });
    const origem = formatarLocalComNumero(r.localOrigem, r.localOrigemNumero);
    if (origem) campos.push({ label: 'Onde pegou', valor: origem });
    const destino = formatarLocalComNumero(r.localDestino, r.localDestinoNumero);
    if (destino) campos.push({ label: 'Onde deixou', valor: destino });

    const logoBytes = await obterLogoBytes();
    const bytes = await PdfExport.gerarBytesServico({
      logoBytes,
      subtitulo: `Gerado em ${new Date().toLocaleString('pt-BR')}`,
      campos,
      descricaoTexto: r.descricao || null,
      valorLabel: 'Valor do frete',
      valorTexto: formatarMoeda(r.valorFrete),
    });

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const nomeBase = (r.placa || r.nome || 'servico').toString().trim().toLowerCase().replace(/\s+/g, '-');
    await compartilharOuBaixarArquivo(blob, `servico-guincho-${nomeBase}.pdf`, 'Serviço de Guincho', 'PDF baixado!');
  }

  // ---------- Lista de serviços ----------

  let idConfirmandoExclusaoLista = null;
  let timerConfirmacaoLista = null;

  function tratarCliqueExcluirCard(id) {
    if (idConfirmandoExclusaoLista !== id) {
      idConfirmandoExclusaoLista = id;
      clearTimeout(timerConfirmacaoLista);
      timerConfirmacaoLista = setTimeout(() => {
        idConfirmandoExclusaoLista = null;
        renderLista();
      }, 3000);
      renderLista();
      return;
    }
    clearTimeout(timerConfirmacaoLista);
    idConfirmandoExclusaoLista = null;
    setRegistros(getRegistros().filter(r => r.id !== id));
    mostrarToast('Serviço excluído.');
    renderLista();
  }

  function obterRegistrosFiltradosLista() {
    const termo = buscaLista.value.trim().toLowerCase();
    const periodo = periodoLista.value;
    const clienteFiltro = seguradoraLista.value;
    const valorMin = valorMinLista.value ? valorMascaradoParaNumero(valorMinLista.value) : null;
    const valorMax = valorMaxLista.value ? valorMascaradoParaNumero(valorMaxLista.value) : null;

    return getRegistros()
      .filter(r => !termo
        || r.nome.toLowerCase().includes(termo)
        || (r.descricao || '').toLowerCase().includes(termo)
        || (r.placa || '').toLowerCase().includes(termo)
        || (r.localOrigem || '').toLowerCase().includes(termo)
        || (r.localDestino || '').toLowerCase().includes(termo))
      .filter(r => passaFiltroPeriodo(r.dataHora, periodo, dataDeLista.value, dataAteLista.value))
      .filter(r => passaFiltroCliente(r, clienteFiltro))
      .filter(r => passaFiltroValor(r.valorFrete, valorMin, valorMax))
      .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }

  function renderLista() {
    const registros = obterRegistrosFiltradosLista();

    listaVazia.hidden = registros.length > 0;
    listaRegistros.innerHTML = registros.map(r => `
      <div class="registro-card" data-id="${r.id}">
        <div class="linha-topo">
          <span class="nome">${escapeHtml(r.nome)}</span>
          <span class="valor">${formatarMoeda(r.valorFrete)}</span>
        </div>
        <div class="data">${formatarDataHora(r.dataHora)}${r.placa ? ` · ${escapeHtml(r.placa)}` : ''}${r.protocolo ? ` · Protocolo: ${escapeHtml(r.protocolo)}` : ''}</div>
        ${(r.localOrigem || r.localDestino) ? `
        <div class="trajeto">
          ${r.localOrigem ? `<div><span class="rotulo">Pegou em:</span> ${escapeHtml(formatarLocalComNumero(r.localOrigem, r.localOrigemNumero))}</div>` : ''}
          ${r.localDestino ? `<div><span class="rotulo">Deixou em:</span> ${escapeHtml(formatarLocalComNumero(r.localDestino, r.localDestinoNumero))}</div>` : ''}
        </div>` : ''}
        ${r.descricao ? `<div class="descricao">${escapeHtml(r.descricao)}</div>` : ''}
        <div class="card-acoes">
          <button type="button" class="btn-acao btn-editar" data-id="${r.id}"><svg class="icon"><use href="#icon-edit"></use></svg> Editar</button>
          <button type="button" class="btn-acao btn-compartilhar" data-id="${r.id}"><svg class="icon"><use href="#icon-share"></use></svg> Compartilhar</button>
          <button type="button" class="btn-acao btn-pdf-servico" data-id="${r.id}"><svg class="icon"><use href="#icon-file-text"></use></svg> PDF</button>
          <button type="button" class="btn-acao btn-excluir-card${idConfirmandoExclusaoLista === r.id ? ' confirmando' : ''}" data-id="${r.id}">${idConfirmandoExclusaoLista === r.id ? 'Confirmar exclusão?' : '<svg class="icon"><use href="#icon-trash"></use></svg> Excluir'}</button>
        </div>
      </div>
    `).join('');

    listaRegistros.querySelectorAll('.registro-card').forEach(card => {
      card.addEventListener('click', () => carregarParaEdicao(card.dataset.id));
    });
    listaRegistros.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); carregarParaEdicao(btn.dataset.id); });
    });
    listaRegistros.querySelectorAll('.btn-compartilhar').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const registro = getRegistros().find(r => r.id === btn.dataset.id);
        if (registro) compartilharRegistro(registro);
      });
    });
    listaRegistros.querySelectorAll('.btn-pdf-servico').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const registro = getRegistros().find(r => r.id === btn.dataset.id);
        if (registro) gerarPdfServico(registro);
      });
    });
    listaRegistros.querySelectorAll('.btn-excluir-card').forEach(btn => {
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); tratarCliqueExcluirCard(btn.dataset.id); });
    });
  }

  buscaLista.addEventListener('input', renderLista);
  periodoLista.addEventListener('change', () => {
    linhaPersonalizadoLista.hidden = periodoLista.value !== 'personalizado';
    renderLista();
  });
  seguradoraLista.addEventListener('change', renderLista);
  dataDeLista.addEventListener('change', renderLista);
  dataAteLista.addEventListener('change', renderLista);
  valorMinLista.addEventListener('input', renderLista);
  valorMaxLista.addEventListener('input', renderLista);

  // ---------- Relatório ----------

  function obterRegistrosFiltradosRelatorio() {
    const periodo = periodoRelatorio.value;
    const valorMin = valorMinRelatorio.value ? valorMascaradoParaNumero(valorMinRelatorio.value) : null;
    const valorMax = valorMaxRelatorio.value ? valorMascaradoParaNumero(valorMaxRelatorio.value) : null;

    return getRegistros()
      .filter(r => passaFiltroPeriodo(r.dataHora, periodo, dataDeRelatorio.value, dataAteRelatorio.value))
      .filter(r => passaFiltroClienteMultiplo(r, clientesFiltroRelatorio))
      .filter(r => passaFiltroValor(r.valorFrete, valorMin, valorMax));
  }

  function renderRelatorio() {
    const registros = obterRegistrosFiltradosRelatorio();

    relatorioVazio.hidden = registros.length > 0;
    if (registros.length === 0) {
      relatorioResumo.innerHTML = '';
      relatorioGrupos.innerHTML = '';
      return;
    }

    const totalGeral = registros.reduce((soma, r) => soma + r.valorFrete, 0);
    relatorioResumo.innerHTML = `
      <div class="total-valor">${formatarMoeda(totalGeral)}</div>
      <div class="total-label">${registros.length} serviço${registros.length !== 1 ? 's' : ''} no período</div>
    `;

    const gruposOrdenados = agruparPorNome(registros);

    relatorioGrupos.innerHTML = gruposOrdenados.map(g => `
      <div class="grupo-card">
        <div>
          <div class="grupo-nome">${escapeHtml(g.nome)}</div>
          <div class="grupo-qtd">${g.qtd} serviço${g.qtd !== 1 ? 's' : ''}</div>
        </div>
        <div class="grupo-valor">${formatarMoeda(g.total)}</div>
      </div>
    `).join('');
  }

  periodoRelatorio.addEventListener('change', () => {
    linhaPersonalizadoRelatorio.hidden = periodoRelatorio.value !== 'personalizado';
    renderRelatorio();
  });
  dataDeRelatorio.addEventListener('change', renderRelatorio);
  dataAteRelatorio.addEventListener('change', renderRelatorio);
  valorMinRelatorio.addEventListener('input', renderRelatorio);
  valorMaxRelatorio.addEventListener('input', renderRelatorio);

  // ---------- Relatório: mensagem consolidada e exportação ----------

  function montarTextoRelatorio(registros) {
    const totalGeral = registros.reduce((soma, r) => soma + r.valorFrete, 0);
    const ordenados = [...registros].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    const linhas = ['*Relatório de Serviços – J Batista*', ''];
    ordenados.forEach(r => {
      const data = new Date(r.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const identificacao = r.placa ? `${r.nome} (${r.placa})` : r.nome;
      linhas.push(`${data} — ${identificacao}: ${formatarMoeda(r.valorFrete)}`);
      const origem = formatarLocalComNumero(r.localOrigem, r.localOrigemNumero);
      const destino = formatarLocalComNumero(r.localDestino, r.localDestinoNumero);
      if (origem) linhas.push(`   📍 Retirada: ${origem}`);
      if (destino) linhas.push(`   📍 Destino: ${destino}`);
    });
    linhas.push('');
    linhas.push(`💰 *Total: ${formatarMoeda(totalGeral)}* (${registros.length} serviço${registros.length !== 1 ? 's' : ''})`);
    return linhas.join('\n');
  }

  btnGerarMensagem.addEventListener('click', () => {
    const registros = obterRegistrosFiltradosRelatorio();
    if (!registros.length) {
      mostrarToast('Nada para gerar no período selecionado.');
      return;
    }
    compartilharTexto(montarTextoRelatorio(registros));
  });

  const COLUNAS_EXCEL = [
    { titulo: 'Data', largura: 11 },
    { titulo: 'Hora', largura: 7 },
    { titulo: 'Cliente', largura: 24 },
    { titulo: 'Protocolo', largura: 14 },
    { titulo: 'Placa', largura: 10 },
    { titulo: 'Valor', largura: 13 },
    { titulo: 'Origem', largura: 30 },
    { titulo: 'Nº Origem', largura: 9 },
    { titulo: 'Destino', largura: 30 },
    { titulo: 'Nº Destino', largura: 9 },
    { titulo: 'Descrição', largura: 40 },
  ];
  const INDICE_COLUNA_VALOR_EXCEL = 5;

  function montarLinhasExcel(registros) {
    return registros.map(r => {
      const d = new Date(r.dataHora);
      return [
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        r.nome,
        r.protocolo || '',
        r.placa || '',
        r.valorFrete,
        r.localOrigem || '',
        r.localOrigemNumero || '',
        r.localDestino || '',
        r.localDestinoNumero || '',
        r.descricao || '',
      ];
    });
  }

  // Calcula a largura de cada coluna com base no maior conteúdo (cabeçalho ou dado),
  // para nenhuma coluna cortar texto na exportação.
  function calcularLargurasExcel(colunas, linhas, colunaValor) {
    return colunas.map((coluna, indice) => {
      let maiorTamanho = coluna.titulo.length;
      linhas.forEach(linha => {
        const valor = linha[indice];
        const texto = indice === colunaValor ? formatarMoeda(valor) : String(valor == null ? '' : valor);
        if (texto.length > maiorTamanho) maiorTamanho = texto.length;
      });
      return Math.min(Math.max(maiorTamanho + 2, 8), 60);
    });
  }

  function periodoDescricaoRelatorio() {
    const rotulos = { tudo: 'Todo o período', mesAtual: 'Mês atual', mesPassado: 'Mês passado' };
    if (periodoRelatorio.value === 'personalizado') {
      const de = dataDeRelatorio.value ? new Date(dataDeRelatorio.value + 'T00:00:00').toLocaleDateString('pt-BR') : '...';
      const ate = dataAteRelatorio.value ? new Date(dataAteRelatorio.value + 'T00:00:00').toLocaleDateString('pt-BR') : '...';
      return `Período: ${de} a ${ate}`;
    }
    return `Período: ${rotulos[periodoRelatorio.value] || periodoRelatorio.value}`;
  }

  async function compartilharOuBaixarExcel(registros) {
    if (!registros.length) {
      mostrarToast('Nada para exportar.');
      return;
    }
    const totalGeral = registros.reduce((soma, r) => soma + r.valorFrete, 0);
    const ordenados = [...registros].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
    const linhasExcel = montarLinhasExcel(ordenados);
    const larguras = calcularLargurasExcel(COLUNAS_EXCEL, linhasExcel, INDICE_COLUNA_VALOR_EXCEL);
    const colunasAjustadas = COLUNAS_EXCEL.map((c, i) => ({ titulo: c.titulo, largura: larguras[i] }));

    const bytes = XlsxLite.gerarBytes({
      titulo: 'J Batista — Relatório de Serviços de Guincho',
      subtitulo: `${periodoDescricaoRelatorio()}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      colunas: colunasAjustadas,
      linhas: linhasExcel,
      colunaValor: INDICE_COLUNA_VALOR_EXCEL,
      totalValor: totalGeral,
      totalRotulo: `TOTAL (${registros.length} serviço${registros.length !== 1 ? 's' : ''})`,
    });
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const nomeArquivo = `relatorio-guincho-${new Date().toISOString().slice(0, 10)}.xlsx`;
    await compartilharOuBaixarArquivo(blob, nomeArquivo, 'Relatório de Serviços', 'Excel baixado!');
  }

  btnExportarExcel.addEventListener('click', () => {
    compartilharOuBaixarExcel(obterRegistrosFiltradosRelatorio());
  });

  const COLUNAS_PDF_RELATORIO = [
    { titulo: 'Data', largura: 60 },
    { titulo: 'Cliente', largura: 140 },
    { titulo: 'Protocolo', largura: 80 },
    { titulo: 'Placa', largura: 60 },
    { titulo: 'Origem', largura: 159 },
    { titulo: 'Destino', largura: 160 },
    { titulo: 'Valor', largura: 110 },
  ];
  const INDICE_COLUNA_VALOR_PDF = 6;

  function montarLinhasPdfRelatorio(registros) {
    return registros.map(r => [
      new Date(r.dataHora).toLocaleDateString('pt-BR'),
      r.nome,
      r.protocolo || '',
      r.placa || '',
      formatarLocalComNumero(r.localOrigem, r.localOrigemNumero),
      formatarLocalComNumero(r.localDestino, r.localDestinoNumero),
      formatarMoeda(r.valorFrete),
    ]);
  }

  async function compartilharOuBaixarPdfRelatorio(registros) {
    if (!registros.length) {
      mostrarToast('Nada para exportar.');
      return;
    }
    const totalGeral = registros.reduce((soma, r) => soma + r.valorFrete, 0);
    const ordenados = [...registros].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
    const logoBytes = await obterLogoBytes();

    const bytes = await PdfExport.gerarBytesRelatorio({
      logoBytes,
      subtitulo: `${periodoDescricaoRelatorio()}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      colunas: COLUNAS_PDF_RELATORIO,
      linhas: montarLinhasPdfRelatorio(ordenados),
      colunaValor: INDICE_COLUNA_VALOR_PDF,
      totalTexto: formatarMoeda(totalGeral),
      totalRotulo: `TOTAL (${registros.length} serviço${registros.length !== 1 ? 's' : ''})`,
    });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const nomeArquivo = `relatorio-guincho-${new Date().toISOString().slice(0, 10)}.pdf`;
    await compartilharOuBaixarArquivo(blob, nomeArquivo, 'Relatório de Serviços', 'PDF baixado!');
  }

  btnExportarPdf.addEventListener('click', () => {
    compartilharOuBaixarPdfRelatorio(obterRegistrosFiltradosRelatorio());
  });

  // ---------- Dashboard ----------

  function registrosDoPeriodoDashboard() {
    const periodo = periodoDashboard.value;
    const agora = new Date();

    if (periodo === 'hoje') {
      return getRegistros().filter(r => new Date(r.dataHora).toDateString() === agora.toDateString());
    }
    if (periodo === 'semana') {
      const seteDiasAtras = new Date(agora);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
      seteDiasAtras.setHours(0, 0, 0, 0);
      return getRegistros().filter(r => {
        const d = new Date(r.dataHora);
        return d >= seteDiasAtras && d <= agora;
      });
    }
    const periodoEquivalente = periodo === 'mes' ? 'mesAtual' : periodo;
    return getRegistros().filter(r => passaFiltroPeriodo(r.dataHora, periodoEquivalente));
  }

  // Lista de dias (um por coluna do gráfico) correspondente ao período escolhido.
  function intervaloDiasDashboard() {
    const periodo = periodoDashboard.value;
    const agora = new Date();

    if (periodo === 'semana') {
      const dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(agora);
        d.setDate(d.getDate() - i);
        dias.push(d);
      }
      return dias;
    }
    // 'mes' e 'mesPassado' seguem pelo mês correspondente inteiro
    const base = periodo === 'mesPassado' ? new Date(agora.getFullYear(), agora.getMonth() - 1, 1) : agora;
    const totalDias = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const dias = [];
    for (let i = 1; i <= totalDias; i++) dias.push(new Date(base.getFullYear(), base.getMonth(), i));
    return dias;
  }

  // ---------- Gráficos do dashboard (Chart.js) ----------

  let chartFaturamento = null;
  let chartRanking = null;

  function corDoTema(variavel) {
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
  }

  // Plugin do Chart.js: escreve o valor de cada barra do ranking ao lado dela.
  const pluginRotuloRanking = {
    id: 'rotuloRanking',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = corDoTema('--text-dark');
      ctx.font = "700 12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      meta.data.forEach((barra, i) => {
        const valor = chart.data.datasets[0].data[i];
        ctx.fillText(formatarMoeda(valor), barra.x + 6, barra.y);
      });
      ctx.restore();
    },
  };

  function renderGraficoDashboard(registros) {
    const dias = periodoDashboard.value === 'hoje' ? [] : intervaloDiasDashboard();
    if (!dias.length) {
      dashboardGrafico.hidden = true;
      dashboardGrafico.innerHTML = '';
      if (chartFaturamento) { chartFaturamento.destroy(); chartFaturamento = null; }
      return;
    }

    const totais = dias.map(d => registros
      .filter(r => new Date(r.dataHora).toDateString() === d.toDateString())
      .reduce((soma, r) => soma + r.valorFrete, 0));

    const agora = new Date();
    const hojeStr = agora.toDateString();
    const indiceHoje = dias.findIndex(d => d.toDateString() === hojeStr);
    const temHoje = indiceHoje !== -1;
    const usaDiaDaSemana = dias.length <= 8;

    const corBase = corDoTema('--chart-navy');
    const corDestaque = corDoTema('--gold-500');
    const corGrade = corDoTema('--chart-grid');
    const corMuted = corDoTema('--text-muted');

    const rotulos = dias.map(d => usaDiaDaSemana
      ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
      : String(d.getDate()));
    const cores = dias.map((d, i) => i === indiceHoje ? corDestaque : corBase);

    dashboardGrafico.hidden = false;
    dashboardGrafico.innerHTML = `
      <div class="grafico-cabecalho">
        <span class="grafico-titulo">Faturamento por dia</span>
        ${temHoje ? '<span class="grafico-legenda"><span class="ponto"></span>hoje</span>' : ''}
      </div>
      <div class="grafico-canvas-wrap"><canvas id="canvasFaturamento"></canvas></div>
      <div class="grafico-caption" id="graficoCaption">&nbsp;</div>
    `;

    const mostrarCaption = (i) => {
      const label = dias[i].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      document.getElementById('graficoCaption').innerHTML =
        `<strong>${escapeHtml(label)}</strong> — ${escapeHtml(formatarMoeda(totais[i]))}`;
    };

    const ctx = document.getElementById('canvasFaturamento').getContext('2d');
    if (chartFaturamento) chartFaturamento.destroy();
    chartFaturamento = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rotulos,
        datasets: [{ data: totais, backgroundColor: cores, borderRadius: 4, borderSkipped: false, maxBarThickness: 22 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        onClick: (evt, elems) => { if (elems.length) mostrarCaption(elems[0].index); },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => dias[items[0].dataIndex].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              label: (item) => formatarMoeda(item.parsed.y),
            },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: corMuted, font: { size: 10 }, autoSkip: true, maxRotation: 0 } },
          y: { display: false, beginAtZero: true, grid: { color: corGrade } },
        },
      },
    });

    mostrarCaption(temHoje ? indiceHoje : totais.indexOf(Math.max(...totais)));
  }

  function renderRankingDashboard(registros) {
    const grupos = agruparPorNome(registros).slice(0, 8);

    if (!grupos.length) {
      dashboardRanking.innerHTML = '';
      if (chartRanking) { chartRanking.destroy(); chartRanking = null; }
      return;
    }

    const altura = grupos.length * 34 + 16;
    dashboardRanking.innerHTML = `<div class="ranking-chart-wrap" style="height:${altura}px"><canvas id="canvasRanking"></canvas></div>`;

    const cor = corDoTema('--chart-navy');
    const corTexto = corDoTema('--text-dark');
    const maiorValor = grupos[0].total;

    const ctx = document.getElementById('canvasRanking').getContext('2d');
    if (chartRanking) chartRanking.destroy();
    chartRanking = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: grupos.map(g => g.nome),
        datasets: [{ data: grupos.map(g => g.total), backgroundColor: cor, borderRadius: 4, borderSkipped: false, maxBarThickness: 20 }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (item) => formatarMoeda(item.parsed.x) } },
        },
        scales: {
          x: { display: false, suggestedMax: maiorValor * 1.35 },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: corTexto, font: { size: 12, weight: '600' } } },
        },
      },
      plugins: [pluginRotuloRanking],
    });
  }

  function renderDashboard() {
    const registros = registrosDoPeriodoDashboard();

    dashboardVazio.hidden = registros.length > 0;
    if (!registros.length) {
      dashboardStats.innerHTML = '';
      dashboardGrafico.hidden = true;
      dashboardGrafico.innerHTML = '';
      dashboardRanking.innerHTML = '';
      if (chartFaturamento) { chartFaturamento.destroy(); chartFaturamento = null; }
      if (chartRanking) { chartRanking.destroy(); chartRanking = null; }
      return;
    }

    const total = registros.reduce((soma, r) => soma + r.valorFrete, 0);
    const ticketMedio = total / registros.length;

    dashboardStats.innerHTML = `
      <div class="stat-tile"><div class="stat-valor">${formatarMoeda(total)}</div><div class="stat-label">Faturado</div></div>
      <div class="stat-tile"><div class="stat-valor">${registros.length}</div><div class="stat-label">Serviços</div></div>
      <div class="stat-tile"><div class="stat-valor">${formatarMoeda(ticketMedio)}</div><div class="stat-label">Ticket médio</div></div>
    `;

    renderGraficoDashboard(registros);
    renderRankingDashboard(registros);
  }

  periodoDashboard.addEventListener('change', renderDashboard);

  // ---------- Autocomplete de endereço (busca online via OpenStreetMap/Nominatim) ----------
  // Só funciona com internet disponível; sem conexão, o campo continua digitável normalmente.
  // A busca é priorizada (não restrita) para o litoral centro-norte de SC através de um "viewbox",
  // e o resultado exibido/salvo é resumido para "Rua, Cidade - UF" em vez do endereço completo.

  // Cobre a faixa do litoral onde a empresa opera (Tijucas até Bombinhas). Como bounded=0, é só
  // uma preferência: buscas em outras regiões continuam funcionando normalmente.
  const LITORAL_VIEWBOX = '-48.75,-26.85,-48.45,-27.40'; // lon_min,lat_max,lon_max,lat_min

  // Cidades do litoral centro-norte de SC que devem aparecer primeiro nas sugestões.
  // Itapema tem prioridade máxima (0); as demais vêm logo em seguida (1); o resto fica por último (2).
  const PRIORIDADE_CIDADES = new Map([
    ['itapema', 0],
    ['balneario camboriu', 1], ['camboriu', 1], ['itajai', 1], ['navegantes', 1],
    ['tijucas', 1], ['porto belo', 1], ['bombinhas', 1], ['governador celso ramos', 1],
  ]);

  function normalizarTexto(str) {
    return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  const SIGLAS_ESTADOS = {
    'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
    'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
    'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
    'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
  };

  function formatarEnderecoResumido(addr) {
    if (!addr) return '';
    const rua = addr.road || addr.pedestrian || addr.residential || addr.suburb || '';
    const cidade = addr.city || addr.town || addr.village || addr.municipality || '';
    const uf = SIGLAS_ESTADOS[addr.state] || '';
    const cidadeUf = [cidade, uf].filter(Boolean).join(' - ');
    return [rua, cidadeUf].filter(Boolean).join(', ');
  }

  const listaOrigem = document.getElementById('listaOrigem');
  const listaDestino = document.getElementById('listaDestino');
  const statusOrigem = document.getElementById('statusOrigem');
  const statusDestino = document.getElementById('statusDestino');

  function esconderSugestoes(listaEl) {
    listaEl.hidden = true;
    listaEl.innerHTML = '';
  }

  async function buscarEnderecos(termo, signal) {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8'
      + '&countrycodes=br&accept-language=pt-BR&viewbox=' + LITORAL_VIEWBOX + '&bounded=0'
      + '&q=' + encodeURIComponent(termo);
    const resp = await fetch(url, { signal });
    if (!resp.ok) throw new Error('Falha na busca de endereço');
    return resp.json();
  }

  function configurarAutocomplete(input, statusEl, listaEl, numeroInput) {
    let debounceTimer = null;
    let abortController = null;

    input.addEventListener('input', () => {
      const termo = input.value.trim();
      clearTimeout(debounceTimer);
      if (abortController) abortController.abort();
      esconderSugestoes(listaEl);

      if (termo.length < 4) {
        statusEl.textContent = '';
        return;
      }
      if (!navigator.onLine) {
        statusEl.textContent = 'Sem internet — digite o endereço manualmente';
        return;
      }

      statusEl.textContent = 'Buscando endereço...';
      debounceTimer = setTimeout(async () => {
        abortController = new AbortController();
        try {
          const resultados = await buscarEnderecos(termo, abortController.signal);
          if (input.value.trim() !== termo) return; // usuário já digitou algo novo

          const opcoes = resultados
            .map(r => {
              const cidade = normalizarTexto(r.address && (r.address.city || r.address.town || r.address.village || r.address.municipality));
              return {
                texto: formatarEnderecoResumido(r.address),
                numero: (r.address && r.address.house_number) || '',
                prioridade: PRIORIDADE_CIDADES.has(cidade) ? PRIORIDADE_CIDADES.get(cidade) : 2,
              };
            })
            .filter(o => o.texto)
            .sort((a, b) => a.prioridade - b.prioridade)
            .slice(0, 5);

          if (!opcoes.length) {
            statusEl.textContent = 'Nenhum endereço encontrado';
            return;
          }
          statusEl.textContent = '';
          listaEl.innerHTML = opcoes.map((o, i) =>
            `<button type="button" data-i="${i}">${escapeHtml(o.texto)}</button>`
          ).join('');
          listaEl.hidden = false;
          listaEl.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              const opcao = opcoes[Number(btn.dataset.i)];
              input.value = opcao.texto;
              if (opcao.numero && !numeroInput.value) numeroInput.value = opcao.numero;
              esconderSugestoes(listaEl);
              statusEl.textContent = '';
            });
          });
        } catch (e) {
          if (e.name === 'AbortError') return;
          statusEl.textContent = 'Não foi possível buscar agora';
        }
      }, 600);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => esconderSugestoes(listaEl), 150);
    });
  }

  configurarAutocomplete(inputLocalOrigem, statusOrigem, listaOrigem, inputLocalOrigemNumero);
  configurarAutocomplete(inputLocalDestino, statusDestino, listaDestino, inputLocalDestinoNumero);

  // ---------- Placa em maiúsculas ----------

  inputPlacaVeiculo.addEventListener('input', () => {
    const pos = inputPlacaVeiculo.selectionStart;
    inputPlacaVeiculo.value = inputPlacaVeiculo.value.toUpperCase();
    inputPlacaVeiculo.setSelectionRange(pos, pos);
  });

  // ---------- Inicialização ----------

  migrarParaClientesUnificado();
  limparFormulario();
  irParaView('nova');

  if ('serviceWorker' in navigator) {
    const jaControlado = !!navigator.serviceWorker.controller;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(e => console.error('Falha ao registrar service worker', e));
    });
    let recarregandoPorAtualizacao = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!jaControlado || recarregandoPorAtualizacao) return;
      recarregandoPorAtualizacao = true;
      window.location.reload();
    });
  }
})();

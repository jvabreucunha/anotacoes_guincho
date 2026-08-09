(() => {
  'use strict';

  const STORAGE_KEY = 'guincho_registros_v1';
  const STORAGE_KEY_SEGURADORAS = 'guincho_seguradoras_v1';

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

  function getSeguradoras() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SEGURADORAS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler seguradoras', e);
      return [];
    }
  }

  function setSeguradoras(lista) {
    localStorage.setItem(STORAGE_KEY_SEGURADORAS, JSON.stringify(lista));
  }

  function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

  function agoraParaInputLocal() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function inputLocalParaIso(valorInput) {
    // valorInput vem no formato "YYYY-MM-DDTHH:mm" já em horário local
    return new Date(valorInput).toISOString();
  }

  function isoParaInputLocal(iso) {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  // ---------- Elementos ----------

  const form = document.getElementById('form-registro');
  const inputEditingId = document.getElementById('editingId');
  const inputDataHora = document.getElementById('dataHora');
  const inputPlacaVeiculo = document.getElementById('placaVeiculo');
  const inputValorFrete = document.getElementById('valorFrete');
  const inputLocalOrigem = document.getElementById('localOrigem');
  const inputLocalOrigemNumero = document.getElementById('localOrigemNumero');
  const inputLocalDestino = document.getElementById('localDestino');
  const inputLocalDestinoNumero = document.getElementById('localDestinoNumero');
  const campoSeguradoraSelect = document.getElementById('campoSeguradoraSelect');
  const seguradoSelect = document.getElementById('seguradoSelect');
  const campoClienteNome = document.getElementById('campoClienteNome');
  const inputClienteNome = document.getElementById('clienteNome');
  const datalistClientes = document.getElementById('clientesList');
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
  const seguradoraRelatorio = document.getElementById('seguradoraRelatorio');
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

  const periodoDashboard = document.getElementById('periodoDashboard');
  const linhaPersonalizadoDashboard = document.getElementById('linhaPersonalizadoDashboard');
  const dataDeDashboard = document.getElementById('dataDeDashboard');
  const dataAteDashboard = document.getElementById('dataAteDashboard');
  const dashboardStats = document.getElementById('dashboardStats');
  const dashboardGrafico = document.getElementById('dashboardGrafico');
  const dashboardTipos = document.getElementById('dashboardTipos');
  const dashboardRanking = document.getElementById('dashboardRanking');
  const dashboardVazio = document.getElementById('dashboardVazio');

  const formSeguradora = document.getElementById('form-seguradora');
  const inputNovaSeguradoraNome = document.getElementById('novaSeguradoraNome');
  const listaSeguradorasEl = document.getElementById('listaSeguradoras');
  const seguradorasVazio = document.getElementById('seguradorasVazio');

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
    seguradoras: document.getElementById('view-seguradoras'),
  };
  const tabButtons = document.querySelectorAll('.tab-btn');

  function irParaView(nome) {
    Object.entries(views).forEach(([key, el]) => { el.hidden = key !== nome; });
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === nome));
    if (nome === 'lista') { popularFiltroSeguradora(seguradoraLista); renderLista(); }
    if (nome === 'dashboard') renderDashboard();
    if (nome === 'relatorio') { popularFiltroSeguradora(seguradoraRelatorio); renderRelatorio(); }
    if (nome === 'seguradoras') renderListaSeguradoras();
    if (nome === 'nova' && !inputEditingId.value) {
      inputDataHora.value = agoraParaInputLocal();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => irParaView(btn.dataset.view));
  });

  // ---------- Tipo de segurado (seguradora / particular) ----------

  function tipoSelecionado() {
    return form.querySelector('input[name="tipoSegurado"]:checked').value;
  }

  function atualizarCampoNome() {
    const tipo = tipoSelecionado();
    const ehSeguradora = tipo === 'seguradora';
    campoSeguradoraSelect.hidden = !ehSeguradora;
    campoClienteNome.hidden = ehSeguradora;
    seguradoSelect.required = ehSeguradora;
    inputClienteNome.required = !ehSeguradora;
    if (ehSeguradora) {
      renderSeguradoraSelect();
    } else {
      atualizarDatalistClientes();
    }
  }

  function renderSeguradoraSelect(valorSelecionado) {
    const seguradoras = getSeguradoras().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const valorAtual = valorSelecionado !== undefined ? valorSelecionado : seguradoSelect.value;
    let opcoes = '<option value="">Selecione...</option>'
      + seguradoras.map(s => `<option value="${escapeHtml(s.nome)}">${escapeHtml(s.nome)}</option>`).join('');
    // Preserva o valor de registros antigos mesmo que a seguradora tenha sido removida do cadastro
    if (valorAtual && !seguradoras.some(s => s.nome === valorAtual)) {
      opcoes += `<option value="${escapeHtml(valorAtual)}">${escapeHtml(valorAtual)}</option>`;
    }
    seguradoSelect.innerHTML = opcoes;
    seguradoSelect.value = valorAtual || '';
  }

  function atualizarDatalistClientes() {
    const nomes = [...new Set(
      getRegistros().filter(r => r.tipo === 'particular').map(r => r.nome)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    datalistClientes.innerHTML = nomes.map(n => `<option value="${escapeHtml(n)}">`).join('');
  }

  form.querySelectorAll('input[name="tipoSegurado"]').forEach(radio => {
    radio.addEventListener('change', atualizarCampoNome);
  });

  // ---------- Filtro por seguradora (usado em Serviços e Relatório) ----------

  function popularFiltroSeguradora(selectEl) {
    const atual = selectEl.value;
    const seguradoras = getSeguradoras().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    selectEl.innerHTML = '<option value="">Todos</option><option value="__particular__">Particulares</option>'
      + seguradoras.map(s => `<option value="${escapeHtml(s.nome)}">${escapeHtml(s.nome)}</option>`).join('');
    selectEl.value = atual;
  }

  function passaFiltroSeguradora(registro, valorFiltro) {
    if (!valorFiltro) return true;
    if (valorFiltro === '__particular__') return registro.tipo === 'particular';
    return registro.tipo === 'seguradora' && registro.nome === valorFiltro;
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

  // ---------- Cadastro de seguradoras ----------

  function renderListaSeguradoras() {
    const seguradoras = getSeguradoras().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    seguradorasVazio.hidden = seguradoras.length > 0;
    listaSeguradorasEl.innerHTML = seguradoras.map(s => `
      <div class="seguradora-item" data-id="${s.id}">
        <span>${escapeHtml(s.nome)}</span>
        <button type="button" class="btn-remover" data-id="${s.id}" title="Remover"><svg class="icon"><use href="#icon-x"></use></svg></button>
      </div>
    `).join('');

    listaSeguradorasEl.querySelectorAll('.btn-remover').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const restantes = getSeguradoras().filter(s => s.id !== id);
        setSeguradoras(restantes);
        renderListaSeguradoras();
        mostrarToast('Seguradora removida.');
      });
    });
  }

  formSeguradora.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = inputNovaSeguradoraNome.value.trim();
    if (!nome) return;

    const seguradoras = getSeguradoras();
    const jaExiste = seguradoras.some(s => s.nome.toLowerCase() === nome.toLowerCase());
    if (jaExiste) {
      mostrarToast('Essa seguradora já está cadastrada.');
      return;
    }
    seguradoras.push({ id: gerarId(), nome });
    setSeguradoras(seguradoras);
    inputNovaSeguradoraNome.value = '';
    renderListaSeguradoras();
    mostrarToast('Seguradora cadastrada!');
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
    inputDataHora.value = agoraParaInputLocal();
    esconderSugestoes(listaOrigem);
    esconderSugestoes(listaDestino);
    btnCancelarEdicao.hidden = true;
    btnExcluirRegistro.hidden = true;
    btnSalvar.textContent = 'Salvar serviço';
    atualizarCampoNome();
  }

  function carregarParaEdicao(id) {
    const registro = getRegistros().find(r => r.id === id);
    if (!registro) return;

    inputEditingId.value = registro.id;
    inputDataHora.value = isoParaInputLocal(registro.dataHora);
    inputPlacaVeiculo.value = registro.placa || '';
    inputValorFrete.value = registro.valorFrete ? formatarCentavos(Math.round(registro.valorFrete * 100)) : '';
    inputLocalOrigem.value = registro.localOrigem || '';
    inputLocalOrigemNumero.value = registro.localOrigemNumero || '';
    inputLocalDestino.value = registro.localDestino || '';
    inputLocalDestinoNumero.value = registro.localDestinoNumero || '';
    form.querySelector(`input[name="tipoSegurado"][value="${registro.tipo}"]`).checked = true;
    inputDescricao.value = registro.descricao || '';

    atualizarCampoNome();
    if (registro.tipo === 'seguradora') {
      renderSeguradoraSelect(registro.nome);
    } else {
      inputClienteNome.value = registro.nome;
    }

    btnCancelarEdicao.hidden = false;
    btnExcluirRegistro.hidden = false;
    btnSalvar.textContent = 'Salvar alterações';

    irParaView('nova');
    window.scrollTo(0, 0);
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const tipo = tipoSelecionado();
    const nome = tipo === 'seguradora' ? seguradoSelect.value.trim() : inputClienteNome.value.trim();
    if (!nome) return;

    const registros = getRegistros();
    const id = inputEditingId.value || gerarId();
    const dados = {
      id,
      dataHora: inputLocalParaIso(inputDataHora.value),
      placa: inputPlacaVeiculo.value.trim().toUpperCase(),
      valorFrete: valorMascaradoParaNumero(inputValorFrete.value),
      localOrigem: inputLocalOrigem.value.trim(),
      localOrigemNumero: inputLocalOrigemNumero.value.trim(),
      localDestino: inputLocalDestino.value.trim(),
      localDestinoNumero: inputLocalDestinoNumero.value.trim(),
      tipo,
      nome,
      descricao: inputDescricao.value.trim(),
    };

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
      const chave = r.tipo + '::' + r.nome.toLowerCase();
      if (!grupos.has(chave)) {
        grupos.set(chave, { nome: r.nome, tipo: r.tipo, total: 0, qtd: 0 });
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
    const seguradoraFiltro = seguradoraLista.value;
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
      .filter(r => passaFiltroSeguradora(r, seguradoraFiltro))
      .filter(r => passaFiltroValor(r.valorFrete, valorMin, valorMax))
      .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }

  function renderLista() {
    const registros = obterRegistrosFiltradosLista();

    listaVazia.hidden = registros.length > 0;
    listaRegistros.innerHTML = registros.map(r => `
      <div class="registro-card" data-id="${r.id}">
        <div class="linha-topo">
          <span class="nome">${escapeHtml(r.nome)}<span class="tag ${r.tipo === 'particular' ? 'tag-particular' : 'tag-seguradora'}">${r.tipo === 'particular' ? 'Particular' : 'Seguradora'}</span></span>
          <span class="valor">${formatarMoeda(r.valorFrete)}</span>
        </div>
        <div class="data">${formatarDataHora(r.dataHora)}${r.placa ? ` · ${escapeHtml(r.placa)}` : ''}</div>
        ${(r.localOrigem || r.localDestino) ? `
        <div class="trajeto">
          ${r.localOrigem ? `<div><span class="rotulo">Pegou em:</span> ${escapeHtml(formatarLocalComNumero(r.localOrigem, r.localOrigemNumero))}</div>` : ''}
          ${r.localDestino ? `<div><span class="rotulo">Deixou em:</span> ${escapeHtml(formatarLocalComNumero(r.localDestino, r.localDestinoNumero))}</div>` : ''}
        </div>` : ''}
        ${r.descricao ? `<div class="descricao">${escapeHtml(r.descricao)}</div>` : ''}
        <div class="card-acoes">
          <button type="button" class="btn-acao btn-editar" data-id="${r.id}"><svg class="icon"><use href="#icon-edit"></use></svg> Editar</button>
          <button type="button" class="btn-acao btn-compartilhar" data-id="${r.id}"><svg class="icon"><use href="#icon-share"></use></svg> Compartilhar</button>
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
    const seguradoraFiltro = seguradoraRelatorio.value;
    const valorMin = valorMinRelatorio.value ? valorMascaradoParaNumero(valorMinRelatorio.value) : null;
    const valorMax = valorMaxRelatorio.value ? valorMascaradoParaNumero(valorMaxRelatorio.value) : null;

    return getRegistros()
      .filter(r => passaFiltroPeriodo(r.dataHora, periodo, dataDeRelatorio.value, dataAteRelatorio.value))
      .filter(r => passaFiltroSeguradora(r, seguradoraFiltro))
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
          <div class="grupo-nome">${escapeHtml(g.nome)}<span class="tag ${g.tipo === 'particular' ? 'tag-particular' : 'tag-seguradora'}">${g.tipo === 'particular' ? 'Particular' : 'Seguradora'}</span></div>
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
  seguradoraRelatorio.addEventListener('change', renderRelatorio);
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
    { titulo: 'Tipo', largura: 12 },
    { titulo: 'Seguradora/Cliente', largura: 24 },
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
        r.tipo === 'particular' ? 'Particular' : 'Seguradora',
        r.nome,
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

    const bytes = XlsxLite.gerarBytes({
      titulo: 'J Batista — Relatório de Serviços de Guincho',
      subtitulo: `${periodoDescricaoRelatorio()}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      colunas: COLUNAS_EXCEL,
      linhas: montarLinhasExcel(ordenados),
      colunaValor: INDICE_COLUNA_VALOR_EXCEL,
      totalValor: totalGeral,
      totalRotulo: `TOTAL (${registros.length} serviço${registros.length !== 1 ? 's' : ''})`,
    });
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const nomeArquivo = `relatorio-guincho-${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (navigator.canShare) {
      const arquivo = new File([blob], nomeArquivo, { type: blob.type });
      if (navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], title: 'Relatório de Serviços' });
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
    mostrarToast('Excel baixado!');
  }

  btnExportarExcel.addEventListener('click', () => {
    compartilharOuBaixarExcel(obterRegistrosFiltradosRelatorio());
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
    if (periodo === 'personalizado' && (!dataDeDashboard.value || !dataAteDashboard.value)) {
      return [];
    }
    const periodoEquivalente = periodo === 'mes' ? 'mesAtual' : periodo;
    return getRegistros().filter(r => passaFiltroPeriodo(r.dataHora, periodoEquivalente, dataDeDashboard.value, dataAteDashboard.value));
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
    if (periodo === 'personalizado') {
      if (!dataDeDashboard.value || !dataAteDashboard.value) return [];
      const fim = new Date(dataAteDashboard.value + 'T00:00:00');
      const dias = [];
      const cursor = new Date(dataDeDashboard.value + 'T00:00:00');
      while (cursor <= fim && dias.length < 62) {
        dias.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
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

  // Caminho SVG de uma barra com cantos arredondados só no topo (base reta, encostada no eixo).
  function caminhoBarraArredondada(x, y, largura, altura, raio) {
    const r = Math.min(raio, largura / 2, altura);
    const base = y + altura;
    if (r <= 0.5) {
      return `M${x},${base} L${x},${y} L${x + largura},${y} L${x + largura},${base} Z`;
    }
    return `M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} `
      + `L${x + largura - r},${y} Q${x + largura},${y} ${x + largura},${y + r} L${x + largura},${base} Z`;
  }

  // Monta o SVG do gráfico "faturamento por dia" e devolve junto o índice em destaque por padrão.
  function montarGraficoSvg(dias, totais, indiceDestaque) {
    const barW = 14, gap = 5, plotH = 92, topPad = 6, labelH = 16;
    const n = dias.length;
    const totalW = n * (barW + gap) - gap;
    const totalH = topPad + plotH + labelH;
    const maiorValor = Math.max(...totais, 1);
    const usaDiaDaSemana = n <= 8;

    const grade = [0, 1].map(frac => {
      const y = topPad + plotH * (1 - frac);
      return `<line class="grade" x1="0" y1="${y}" x2="${totalW}" y2="${y}"></line>`;
    }).join('');

    let marcas = '';
    dias.forEach((d, i) => {
      const valor = totais[i];
      const alturaUtil = valor > 0 ? Math.max((valor / maiorValor) * plotH, 3) : 1;
      const x = i * (barW + gap);
      const yTopo = topPad + plotH - alturaUtil;
      const destaque = i === indiceDestaque ? ' destaque' : '';
      const dataLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const valorLabel = formatarMoeda(valor);
      const mostraRotulo = usaDiaDaSemana || d.getDate() === 1 || d.getDate() % 5 === 0 || i === n - 1;
      const rotuloEixo = !mostraRotulo ? ''
        : usaDiaDaSemana ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
        : String(d.getDate());

      marcas += `<path class="barra${destaque}" data-index="${i}" d="${caminhoBarraArredondada(x, yTopo, barW, alturaUtil, 4)}"></path>`;
      marcas += `<rect class="barra-hit" data-index="${i}" data-data-label="${escapeHtml(dataLabel)}" data-valor-label="${escapeHtml(valorLabel)}" `
        + `x="${x - gap / 2}" y="0" width="${barW + gap}" height="${totalH}"></rect>`;
      if (rotuloEixo) {
        marcas += `<text class="eixo-label" x="${x + barW / 2}" y="${totalH - 3}" text-anchor="middle">${escapeHtml(rotuloEixo)}</text>`;
      }
    });

    return `<svg class="grafico-svg" viewBox="0 0 ${totalW} ${totalH}">${grade}${marcas}</svg>`;
  }

  function renderGraficoDashboard(registros) {
    const dias = periodoDashboard.value === 'hoje' ? [] : intervaloDiasDashboard();
    if (!dias.length) {
      dashboardGrafico.hidden = true;
      dashboardGrafico.innerHTML = '';
      return;
    }

    const totais = dias.map(d => registros
      .filter(r => new Date(r.dataHora).toDateString() === d.toDateString())
      .reduce((soma, r) => soma + r.valorFrete, 0));

    const agora = new Date();
    const hojeStr = agora.toDateString();
    let indiceInicial = dias.findIndex(d => d.toDateString() === hojeStr);
    const temHoje = indiceInicial !== -1;
    if (!temHoje) indiceInicial = totais.indexOf(Math.max(...totais));

    const svg = montarGraficoSvg(dias, totais, indiceInicial);
    const dataLabelInicial = dias[indiceInicial].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    dashboardGrafico.hidden = false;
    dashboardGrafico.innerHTML = `
      <div class="grafico-cabecalho">
        <span class="grafico-titulo">Faturamento por dia</span>
        ${temHoje ? '<span class="grafico-legenda"><span class="ponto"></span>hoje</span>' : ''}
      </div>
      ${svg}
      <div class="grafico-caption"><strong>${escapeHtml(dataLabelInicial)}</strong> — ${escapeHtml(formatarMoeda(totais[indiceInicial]))}</div>
    `;

    dashboardGrafico.querySelectorAll('.barra-hit').forEach(hit => {
      hit.addEventListener('click', () => {
        const idx = hit.dataset.index;
        dashboardGrafico.querySelectorAll('.barra').forEach(b => b.classList.toggle('destaque', b.dataset.index === idx));
        const legenda = dashboardGrafico.querySelector('.grafico-caption');
        if (legenda) legenda.innerHTML = `<strong>${escapeHtml(hit.dataset.dataLabel)}</strong> — ${escapeHtml(hit.dataset.valorLabel)}`;
      });
    });
  }

  function renderDashboard() {
    const registros = registrosDoPeriodoDashboard();

    dashboardVazio.hidden = registros.length > 0;
    if (!registros.length) {
      dashboardStats.innerHTML = '';
      dashboardGrafico.hidden = true;
      dashboardGrafico.innerHTML = '';
      dashboardTipos.innerHTML = '';
      dashboardRanking.innerHTML = '';
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

    const totalSeguradora = registros.filter(r => r.tipo === 'seguradora').reduce((s, r) => s + r.valorFrete, 0);
    const totalParticular = registros.filter(r => r.tipo === 'particular').reduce((s, r) => s + r.valorFrete, 0);
    const maiorTipo = Math.max(totalSeguradora, totalParticular, 1);
    const pctSeguradora = total > 0 ? Math.round((totalSeguradora / total) * 100) : 0;
    const pctParticular = total > 0 ? Math.round((totalParticular / total) * 100) : 0;
    dashboardTipos.innerHTML = `
      <div class="tipo-card seguradora">
        <div class="tipo-nome"><span>Seguradora</span><span class="tipo-pct">${pctSeguradora}%</span></div>
        <div class="tipo-barra-fundo"><div class="tipo-barra" style="width:${(totalSeguradora / maiorTipo) * 100}%"></div></div>
        <div class="tipo-valor">${formatarMoeda(totalSeguradora)}</div>
      </div>
      <div class="tipo-card particular">
        <div class="tipo-nome"><span>Particular</span><span class="tipo-pct">${pctParticular}%</span></div>
        <div class="tipo-barra-fundo"><div class="tipo-barra" style="width:${(totalParticular / maiorTipo) * 100}%"></div></div>
        <div class="tipo-valor">${formatarMoeda(totalParticular)}</div>
      </div>
    `;

    const grupos = agruparPorNome(registros).slice(0, 8);
    const maiorGrupo = grupos.length ? grupos[0].total : 1;
    dashboardRanking.innerHTML = grupos.map(g => `
      <div class="ranking-item">
        <div class="ranking-topo">
          <span>${escapeHtml(g.nome)}</span>
          <span>${formatarMoeda(g.total)}</span>
        </div>
        <div class="ranking-barra-fundo"><div class="ranking-barra" style="width:${(g.total / maiorGrupo) * 100}%"></div></div>
      </div>
    `).join('');
  }

  periodoDashboard.addEventListener('change', () => {
    linhaPersonalizadoDashboard.hidden = periodoDashboard.value !== 'personalizado';
    renderDashboard();
  });
  dataDeDashboard.addEventListener('change', renderDashboard);
  dataAteDashboard.addEventListener('change', renderDashboard);

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

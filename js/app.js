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

  // Valor total do serviço = frete + pedágio. Registros antigos não têm pedágio (conta como 0).
  function valorTotal(r) {
    return (Number(r.valorFrete) || 0) + (Number(r.valorPedagio) || 0);
  }

  function valorPedagio(r) {
    return Number(r.valorPedagio) || 0;
  }

  // Soma frete, pedágio e total de uma lista de serviços (para relatórios e exportações)
  function somarValores(registros) {
    const somas = registros.reduce((soma, r) => {
      soma.frete += Number(r.valorFrete) || 0;
      soma.pedagio += valorPedagio(r);
      soma.total += valorTotal(r);
      return soma;
    }, { frete: 0, pedagio: 0, total: 0 });
    const centavos = v => Math.round(v * 100) / 100;
    return { frete: centavos(somas.frete), pedagio: centavos(somas.pedagio), total: centavos(somas.total) };
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
  const inputValorPedagio = document.getElementById('valorPedagio');
  const totalForm = document.getElementById('totalForm');
  const inputServicoPago = document.getElementById('servicoPago');
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
  const pagoRelatorio = document.getElementById('pagoRelatorio');
  const relatorioResumo = document.getElementById('relatorioResumo');
  const relatorioGrupos = document.getElementById('relatorioGrupos');
  const relatorioVazio = document.getElementById('relatorioVazio');
  const btnGerarMensagem = document.getElementById('btnGerarMensagem');
  const btnExportarExcel = document.getElementById('btnExportarExcel');
  const btnExportarPdf = document.getElementById('btnExportarPdf');

  const periodoDashboard = document.getElementById('periodoDashboard');
  const pagoDashboard = document.getElementById('pagoDashboard');
  const dashboardStats = document.getElementById('dashboardStats');
  const dashboardGrafico = document.getElementById('dashboardGrafico');
  const dashboardRanking = document.getElementById('dashboardRanking');
  const dashboardVazio = document.getElementById('dashboardVazio');
  const dashboardSemana = document.getElementById('dashboardSemana');

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

  function passaFiltroPago(registro, valorFiltro) {
    if (!valorFiltro) return true;
    return valorFiltro === 'sim' ? !!registro.pago : !registro.pago;
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
  aplicarMascaraMoeda(inputValorPedagio);

  function atualizarTotalForm() {
    totalForm.textContent = formatarMoeda(
      valorMascaradoParaNumero(inputValorFrete.value) + valorMascaradoParaNumero(inputValorPedagio.value)
    );
  }
  inputValorFrete.addEventListener('input', atualizarTotalForm);
  inputValorPedagio.addEventListener('input', atualizarTotalForm);
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
    inputValorPedagio.value = '0,00';
    atualizarTotalForm();
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
    inputValorPedagio.value = formatarCentavos(Math.round((Number(registro.valorPedagio) || 0) * 100));
    atualizarTotalForm();
    inputServicoPago.checked = !!registro.pago;
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
      // A hora não é mais digitada: serviço novo usa a hora do momento em que salvou,
      // edição mantém a hora que já estava gravada.
      dataHora: dataHoraInputParaIso(
        inputDataRegistro.value,
        inputEditingId.value ? inputHoraRegistro.value : agoraParaHoraInput()
      ),
      placa: inputPlacaVeiculo.value.trim().toUpperCase(),
      valorFrete: valorMascaradoParaNumero(inputValorFrete.value),
      valorPedagio: valorMascaradoParaNumero(inputValorPedagio.value),
      pago: inputServicoPago.checked,
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
        grupos.set(chave, { nome: r.nome, total: 0, frete: 0, pedagio: 0, qtd: 0 });
      }
      const g = grupos.get(chave);
      g.total += valorTotal(r);
      g.frete += Number(r.valorFrete) || 0;
      g.pedagio += valorPedagio(r);
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
    linhas.push(`🚚 Frete: ${formatarMoeda(r.valorFrete)}`);
    linhas.push(`🛣️ Pedágio: ${formatarMoeda(valorPedagio(r))}`);
    linhas.push(`💰 *Total: ${formatarMoeda(valorTotal(r))}*`);
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

  function baixarArquivo(blob, nomeArquivo, mensagemDownload) {
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
    baixarArquivo(blob, nomeArquivo, mensagemDownload);
  }

  async function gerarPdfServico(r) {
    const campos = [{ label: 'Cliente', valor: r.nome }, { label: 'Data e hora', valor: formatarDataHora(r.dataHora) }];
    if (r.protocolo) campos.push({ label: 'Nº do protocolo', valor: r.protocolo });
    if (r.placa) campos.push({ label: 'Placa', valor: r.placa });
    const origem = formatarLocalComNumero(r.localOrigem, r.localOrigemNumero);
    if (origem) campos.push({ label: 'Onde pegou', valor: origem });
    const destino = formatarLocalComNumero(r.localDestino, r.localDestinoNumero);
    if (destino) campos.push({ label: 'Onde deixou', valor: destino });
    campos.push({ label: 'Valor do frete', valor: formatarMoeda(r.valorFrete) });
    campos.push({ label: 'Pedágio', valor: formatarMoeda(valorPedagio(r)) });

    const logoBytes = await obterLogoBytes();
    const bytes = await PdfExport.gerarBytesServico({
      logoBytes,
      subtitulo: `Gerado em ${new Date().toLocaleString('pt-BR')}`,
      campos,
      descricaoTexto: r.descricao || null,
      valorLabel: 'Valor total',
      valorTexto: formatarMoeda(valorTotal(r)),
    });

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const nomeBase = (r.placa || r.nome || 'servico').toString().trim().toLowerCase().replace(/\s+/g, '-');
    baixarArquivo(blob, `servico-guincho-${nomeBase}.pdf`, 'PDF baixado!');
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
      .filter(r => passaFiltroValor(valorTotal(r), valorMin, valorMax))
      .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }

  function renderLista() {
    const registros = obterRegistrosFiltradosLista();

    listaVazia.hidden = registros.length > 0;
    listaRegistros.innerHTML = registros.map(r => `
      <div class="registro-card" data-id="${r.id}">
        <div class="linha-topo">
          <span class="nome">${escapeHtml(r.nome)}</span>
          <span class="valor">${formatarMoeda(valorTotal(r))}</span>
        </div>
        <div class="valores-detalhe">Frete ${formatarMoeda(r.valorFrete)} · Pedágio ${formatarMoeda(valorPedagio(r))}</div>
        <div class="data">${formatarDataHora(r.dataHora)}${r.placa ? ` · ${escapeHtml(r.placa)}` : ''}${r.protocolo ? ` · Protocolo: ${escapeHtml(r.protocolo)}` : ''} · <button type="button" class="badge-pago btn-toggle-pago ${r.pago ? 'pago' : 'nao-pago'}" data-id="${r.id}">${r.pago ? 'Pago' : 'Não pago'}</button></div>
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
    listaRegistros.querySelectorAll('.btn-toggle-pago').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const registros = getRegistros();
        const registro = registros.find(r => r.id === btn.dataset.id);
        if (!registro) return;
        registro.pago = !registro.pago;
        setRegistros(registros);
        renderLista();
        mostrarToast(registro.pago ? 'Marcado como pago.' : 'Marcado como não pago.');
      });
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
      .filter(r => passaFiltroValor(valorTotal(r), valorMin, valorMax))
      .filter(r => passaFiltroPago(r, pagoRelatorio.value));
  }

  function renderRelatorio() {
    const registros = obterRegistrosFiltradosRelatorio();

    relatorioVazio.hidden = registros.length > 0;
    if (registros.length === 0) {
      relatorioResumo.innerHTML = '';
      relatorioGrupos.innerHTML = '';
      return;
    }

    const somas = somarValores(registros);
    relatorioResumo.innerHTML = `
      <div class="total-valor">${formatarMoeda(somas.total)}</div>
      <div class="total-label">${registros.length} serviço${registros.length !== 1 ? 's' : ''} no período</div>
      <div class="total-detalhe">
        <div><span>Frete</span><strong>${formatarMoeda(somas.frete)}</strong></div>
        <div><span>Pedágio</span><strong>${formatarMoeda(somas.pedagio)}</strong></div>
      </div>
    `;

    const gruposOrdenados = agruparPorNome(registros);

    relatorioGrupos.innerHTML = gruposOrdenados.map(g => `
      <div class="grupo-card">
        <div>
          <div class="grupo-nome">${escapeHtml(g.nome)}</div>
          <div class="grupo-qtd">${g.qtd} serviço${g.qtd !== 1 ? 's' : ''}</div>
          <div class="grupo-detalhe">Frete ${formatarMoeda(g.frete)} · Pedágio ${formatarMoeda(g.pedagio)}</div>
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
  pagoRelatorio.addEventListener('change', renderRelatorio);

  // ---------- Relatório: mensagem consolidada e exportação ----------

  function montarTextoRelatorio(registros) {
    const somas = somarValores(registros);
    const ordenados = [...registros].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    const linhas = ['*Relatório de Serviços – J Batista*', ''];
    ordenados.forEach(r => {
      const data = new Date(r.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const identificacao = r.placa ? `${r.nome} (${r.placa})` : r.nome;
      linhas.push(`${data} — ${identificacao}: ${formatarMoeda(valorTotal(r))}`);
      linhas.push(`   Frete ${formatarMoeda(r.valorFrete)} + Pedágio ${formatarMoeda(valorPedagio(r))}`);
      const origem = formatarLocalComNumero(r.localOrigem, r.localOrigemNumero);
      const destino = formatarLocalComNumero(r.localDestino, r.localDestinoNumero);
      if (origem) linhas.push(`   📍 Retirada: ${origem}`);
      if (destino) linhas.push(`   📍 Destino: ${destino}`);
    });
    linhas.push('');
    linhas.push(`🚚 Frete: ${formatarMoeda(somas.frete)}`);
    linhas.push(`🛣️ Pedágio: ${formatarMoeda(somas.pedagio)}`);
    linhas.push(`💰 *Total: ${formatarMoeda(somas.total)}* (${registros.length} serviço${registros.length !== 1 ? 's' : ''})`);
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
    { titulo: 'Frete', largura: 13 },
    { titulo: 'Pedágio', largura: 12 },
    { titulo: 'Total', largura: 13 },
    { titulo: 'Origem', largura: 30 },
    { titulo: 'Nº Origem', largura: 9 },
    { titulo: 'Destino', largura: 30 },
    { titulo: 'Nº Destino', largura: 9 },
    { titulo: 'Descrição', largura: 40 },
  ];
  const COLUNAS_VALOR_EXCEL = [5, 6, 7]; // Frete, Pedágio, Total

  function montarLinhasExcel(registros) {
    return registros.map(r => {
      const d = new Date(r.dataHora);
      return [
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        r.nome,
        r.protocolo || '',
        r.placa || '',
        Number(r.valorFrete) || 0,
        valorPedagio(r),
        valorTotal(r),
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
  function calcularLargurasExcel(colunas, linhas, colunasValor) {
    return colunas.map((coluna, indice) => {
      let maiorTamanho = coluna.titulo.length;
      linhas.forEach(linha => {
        const valor = linha[indice];
        const texto = colunasValor.includes(indice) ? formatarMoeda(valor) : String(valor == null ? '' : valor);
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
    const somas = somarValores(registros);
    const ordenados = [...registros].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
    const linhasExcel = montarLinhasExcel(ordenados);
    const larguras = calcularLargurasExcel(COLUNAS_EXCEL, linhasExcel, COLUNAS_VALOR_EXCEL);
    const colunasAjustadas = COLUNAS_EXCEL.map((c, i) => ({ titulo: c.titulo, largura: larguras[i] }));

    const bytes = XlsxLite.gerarBytes({
      titulo: 'J Batista — Relatório de Serviços de Guincho',
      subtitulo: `${periodoDescricaoRelatorio()}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      colunas: colunasAjustadas,
      linhas: linhasExcel,
      colunasValor: COLUNAS_VALOR_EXCEL,
      totaisValor: [somas.frete, somas.pedagio, somas.total],
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
    { titulo: 'Data', largura: 54 },
    { titulo: 'Cliente', largura: 92 },
    { titulo: 'Protocolo', largura: 58 },
    { titulo: 'Placa', largura: 54 },
    { titulo: 'Origem', largura: 100 },
    { titulo: 'Destino', largura: 100 },
    { titulo: 'Descrição', largura: 81.89 },
    { titulo: 'Frete', largura: 76 },
    { titulo: 'Pedágio', largura: 70 },
    { titulo: 'Total', largura: 84 },
  ];
  const COLUNAS_VALOR_PDF = [7, 8, 9]; // Frete, Pedágio, Total

  function montarLinhasPdfRelatorio(registros) {
    return registros.map(r => [
      new Date(r.dataHora).toLocaleDateString('pt-BR'),
      r.nome,
      r.protocolo || '',
      r.placa || '',
      formatarLocalComNumero(r.localOrigem, r.localOrigemNumero),
      formatarLocalComNumero(r.localDestino, r.localDestinoNumero),
      r.descricao || '',
      formatarMoeda(r.valorFrete),
      formatarMoeda(valorPedagio(r)),
      formatarMoeda(valorTotal(r)),
    ]);
  }

  async function compartilharOuBaixarPdfRelatorio(registros) {
    if (!registros.length) {
      mostrarToast('Nada para exportar.');
      return;
    }
    const somas = somarValores(registros);
    const ordenados = [...registros].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
    const logoBytes = await obterLogoBytes();

    const bytes = await PdfExport.gerarBytesRelatorio({
      logoBytes,
      subtitulo: `${periodoDescricaoRelatorio()}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      colunas: COLUNAS_PDF_RELATORIO,
      linhas: montarLinhasPdfRelatorio(ordenados),
      colunasValor: COLUNAS_VALOR_PDF,
      totaisTexto: [formatarMoeda(somas.frete), formatarMoeda(somas.pedagio), formatarMoeda(somas.total)],
      totalRotulo: `TOTAL (${registros.length} serviço${registros.length !== 1 ? 's' : ''})`,
    });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const nomeArquivo = `relatorio-guincho-${new Date().toISOString().slice(0, 10)}.pdf`;
    baixarArquivo(blob, nomeArquivo, 'PDF baixado!');
  }

  btnExportarPdf.addEventListener('click', () => {
    compartilharOuBaixarPdfRelatorio(obterRegistrosFiltradosRelatorio());
  });

  // ---------- Dashboard ----------

  function registrosDoPeriodoDashboard() {
    const periodo = periodoDashboard.value;
    const agora = new Date();

    let registros;
    if (periodo === 'hoje') {
      registros = getRegistros().filter(r => new Date(r.dataHora).toDateString() === agora.toDateString());
    } else if (periodo === 'semana') {
      const seteDiasAtras = new Date(agora);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
      seteDiasAtras.setHours(0, 0, 0, 0);
      registros = getRegistros().filter(r => {
        const d = new Date(r.dataHora);
        return d >= seteDiasAtras && d <= agora;
      });
    } else {
      const periodoEquivalente = periodo === 'mes' ? 'mesAtual' : periodo;
      registros = getRegistros().filter(r => passaFiltroPeriodo(r.dataHora, periodoEquivalente));
    }
    return registros.filter(r => passaFiltroPago(r, pagoDashboard.value));
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

  function corDoTema(variavel) {
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
  }

  function formatarMoedaCurta(valor) {
    if (valor >= 1000) {
      return 'R$ ' + (valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    }
    return 'R$ ' + Math.round(valor).toLocaleString('pt-BR');
  }

  // Monta as colunas do gráfico: um dia por coluna (semana/mês) ou um mês por coluna (todo o período).
  function colunasGraficoDashboard(registros) {
    const periodo = periodoDashboard.value;
    if (periodo === 'hoje') return null;

    if (periodo === 'tudo') {
      if (!registros.length) return null;
      const datas = registros.map(r => new Date(r.dataHora));
      const fim = new Date(Math.max(...datas));
      let inicio = new Date(Math.min(...datas));
      // no máximo os últimos 12 meses com movimento
      const limite = new Date(fim.getFullYear(), fim.getMonth() - 11, 1);
      if (inicio < limite) inicio = limite;
      const colunas = [];
      for (let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1); d <= fim; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const chave = `${d.getFullYear()}-${d.getMonth()}`;
        colunas.push({
          chave,
          rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          titulo: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          pertence: (r) => { const x = new Date(r.dataHora); return `${x.getFullYear()}-${x.getMonth()}` === chave; },
          atual: false,
        });
      }
      return { titulo: 'Faturamento por mês', colunas };
    }

    const dias = intervaloDiasDashboard();
    const hoje = new Date().toDateString();
    const usaDiaDaSemana = dias.length <= 8;
    return {
      titulo: 'Faturamento por dia',
      colunas: dias.map(d => ({
        rotulo: usaDiaDaSemana ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : String(d.getDate()),
        titulo: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
        pertence: (r) => new Date(r.dataHora).toDateString() === d.toDateString(),
        atual: d.toDateString() === hoje,
      })),
    };
  }

  function renderGraficoDashboard(registros) {
    const estrutura = colunasGraficoDashboard(registros);
    if (!estrutura) {
      dashboardGrafico.hidden = true;
      dashboardGrafico.innerHTML = '';
      if (chartFaturamento) { chartFaturamento.destroy(); chartFaturamento = null; }
      return;
    }

    const { colunas } = estrutura;
    const dados = colunas.map(c => {
      const doDia = registros.filter(c.pertence);
      const somas = somarValores(doDia);
      return { ...somas, qtd: doDia.length };
    });
    const fretes = dados.map(d => d.frete);
    const pedagios = dados.map(d => d.pedagio);
    const indiceAtual = colunas.findIndex(c => c.atual);

    const corFrete = corDoTema('--chart-navy');
    const corPedagio = corDoTema('--gold-500');
    const corGrade = corDoTema('--chart-grid');
    const corMuted = corDoTema('--text-muted');
    const corTexto = corDoTema('--text-dark');
    const superficie = '#ffffff';

    dashboardGrafico.hidden = false;
    dashboardGrafico.innerHTML = `
      <div class="card-cabecalho">
        <div class="card-titulo">${escapeHtml(estrutura.titulo)}</div>
        <div class="legenda">
          <span><i style="background:${corFrete}"></i>Frete</span>
          <span><i style="background:${corPedagio}"></i>Pedágio</span>
        </div>
      </div>
      <div class="grafico-canvas-wrap"><canvas id="canvasFaturamento" aria-label="${escapeHtml(estrutura.titulo)}"></canvas></div>
      <div class="grafico-caption" id="graficoCaption">&nbsp;</div>
    `;

    const mostrarCaption = (i) => {
      const d = dados[i];
      const titulo = colunas[i].titulo.charAt(0).toUpperCase() + colunas[i].titulo.slice(1);
      document.getElementById('graficoCaption').innerHTML =
        `<div class="caption-titulo"><span>${escapeHtml(titulo)}</span><strong>${formatarMoeda(d.total)}</strong></div>`;
    };

    const ctx = document.getElementById('canvasFaturamento').getContext('2d');
    if (chartFaturamento) chartFaturamento.destroy();
    chartFaturamento = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: colunas.map(c => c.rotulo),
        datasets: [
          {
            label: 'Frete',
            data: fretes,
            backgroundColor: corFrete,
            // só arredonda o topo quando não tem pedágio empilhado em cima
            borderRadius: (c) => (pedagios[c.dataIndex] > 0 ? 0 : { topLeft: 4, topRight: 4 }),
            borderSkipped: false,
            maxBarThickness: 18,
            stack: 'valor',
          },
          {
            label: 'Pedágio',
            data: pedagios,
            backgroundColor: corPedagio,
            borderColor: superficie,
            // 2px de respiro entre frete e pedágio
            borderWidth: (c) => (pedagios[c.dataIndex] > 0 ? { bottom: 2, top: 0, left: 0, right: 0 } : 0),
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: false,
            maxBarThickness: 18,
            stack: 'valor',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        onClick: (evt, elems) => { if (elems.length) mostrarCaption(elems[0].index); },
        onHover: (evt, elems) => { if (elems.length) mostrarCaption(elems[0].index); },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: corDoTema('--navy-900'),
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              title: (items) => colunas[items[0].dataIndex].titulo,
              label: (item) => `${item.dataset.label}: ${formatarMoeda(item.parsed.y)}`,
              footer: (items) => {
                const d = dados[items[0].dataIndex];
                return `Total: ${formatarMoeda(d.total)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { color: corGrade },
            ticks: {
              autoSkip: true,
              maxRotation: 0,
              color: (c) => (c.index === indiceAtual ? corTexto : corMuted),
              font: (c) => ({ size: 10, weight: c.index === indiceAtual ? '800' : '400' }),
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            border: { display: false },
            grid: { color: corGrade, drawTicks: false },
            ticks: { color: corMuted, font: { size: 10 }, maxTicksLimit: 4, padding: 6, callback: (v) => formatarMoedaCurta(v) },
          },
        },
      },
    });

    let inicial = indiceAtual;
    if (inicial === -1 || !dados[inicial].qtd) {
      const totais = dados.map(d => d.total);
      inicial = totais.indexOf(Math.max(...totais));
    }
    mostrarCaption(inicial);
  }

  // Ranking de clientes em HTML: barras horizontais, uma cor só, maior primeiro.
  function renderRankingDashboard(registros) {
    const todos = agruparPorNome(registros);
    if (!todos.length) {
      dashboardRanking.innerHTML = '';
      return;
    }
    let grupos = todos.slice(0, 5);
    const resto = todos.slice(5);
    if (resto.length) {
      grupos = grupos.concat([{
        nome: `Outros (${resto.length})`,
        total: resto.reduce((s, g) => s + g.total, 0),
        qtd: resto.reduce((s, g) => s + g.qtd, 0),
      }]);
    }
    const maior = Math.max(...grupos.map(g => g.total)) || 1;

    dashboardRanking.innerHTML = `
      <div class="card-cabecalho">
        <div class="card-titulo">Por cliente</div>
      </div>
      <div class="ranking-lista">
        ${grupos.map(g => `
          <div class="ranking-item" title="${escapeHtml(g.nome)}: ${escapeHtml(formatarMoeda(g.total))}">
            <div class="ranking-linha">
              <span class="ranking-nome">${escapeHtml(g.nome)}</span>
              <span class="ranking-valor">${formatarMoeda(g.total)}</span>
            </div>
            <div class="ranking-trilho"><div class="ranking-barra" style="width:${Math.max(2, (g.total / maior) * 100)}%"></div></div>
          </div>`).join('')}
      </div>
    `;
  }

  // Faturamento por dia da semana. O dia mais forte fica em destaque.
  function renderSemanaDashboard(registros) {
    if (periodoDashboard.value === 'hoje' || registros.length < 2) {
      dashboardSemana.hidden = true;
      dashboardSemana.innerHTML = '';
      return;
    }
    const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const nomesLongos = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const contagem = [0, 0, 0, 0, 0, 0, 0];
    const valores = [0, 0, 0, 0, 0, 0, 0];
    registros.forEach(r => {
      const dia = new Date(r.dataHora).getDay();
      contagem[dia] += 1;
      valores[dia] += valorTotal(r);
    });
    const ordem = [1, 2, 3, 4, 5, 6, 0]; // semana começando na segunda
    const maior = Math.max(...valores);
    const diaTop = valores.indexOf(maior);
    const valorCurto = (v) => {
      if (!v) return '';
      if (v >= 1000) return (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
      return Math.round(v).toLocaleString('pt-BR');
    };

    dashboardSemana.hidden = false;
    dashboardSemana.innerHTML = `
      <div class="card-cabecalho">
        <div class="card-titulo">Faturamento por dia da semana</div>
      </div>
      <div class="semana-colunas">
        ${ordem.map(i => `
          <div class="semana-coluna${i === diaTop ? ' destaque' : ''}" title="${nomesLongos[i]}: ${escapeHtml(formatarMoeda(valores[i]))} · ${contagem[i]} serviço${contagem[i] !== 1 ? 's' : ''}">
            <span class="semana-qtd">${valorCurto(valores[i])}</span>
            <div class="semana-trilho"><div class="semana-barra" style="height:${maior ? (valores[i] / maior) * 100 : 0}%"></div></div>
            <span class="semana-nome">${nomes[i]}</span>
          </div>`).join('')}
      </div>
    `;
  }

  function renderDashboard() {
    const registros = registrosDoPeriodoDashboard();

    dashboardVazio.hidden = registros.length > 0;
    if (!registros.length) {
      dashboardStats.innerHTML = '';
      dashboardGrafico.hidden = true;
      dashboardGrafico.innerHTML = '';
      dashboardRanking.innerHTML = '';
      dashboardSemana.hidden = true;
      dashboardSemana.innerHTML = '';
      if (chartFaturamento) { chartFaturamento.destroy(); chartFaturamento = null; }
      return;
    }

    const somas = somarValores(registros);
    const ticketMedio = somas.total / registros.length;
    const pagos = registros.filter(r => r.pago);
    const recebido = somarValores(pagos).total;
    const aReceber = Math.round((somas.total - recebido) * 100) / 100;
    const pctRecebido = somas.total ? (recebido / somas.total) * 100 : 0;

    dashboardStats.innerHTML = `
      <div class="hero-faturado">
        <div class="hero-rotulo">Faturado</div>
        <div class="hero-valor">${formatarMoeda(somas.total)}</div>
        <div class="recebimento">
          <div class="recebimento-barra" role="img" aria-label="Recebido ${Math.round(pctRecebido)}%">
            ${recebido > 0 ? `<span class="seg-recebido" style="flex-grow:${recebido}"></span>` : ''}
            ${aReceber > 0 ? `<span class="seg-areceber" style="flex-grow:${aReceber}"></span>` : ''}
          </div>
          <div class="recebimento-legenda">
            <span><i class="seg-recebido"></i>Recebido <strong>${formatarMoeda(recebido)}</strong></span>
            <span><i class="seg-areceber"></i>A receber <strong>${formatarMoeda(aReceber)}</strong></span>
          </div>
        </div>
        <div class="hero-kpis">
          <div>
            <div class="hero-kpi-rotulo">Serviços</div>
            <div class="hero-kpi-valor">${registros.length}</div>
          </div>
          <div>
            <div class="hero-kpi-rotulo">Ticket médio</div>
            <div class="hero-kpi-valor">${formatarMoeda(ticketMedio)}</div>
          </div>
          <div>
            <div class="hero-kpi-rotulo">Pedágio</div>
            <div class="hero-kpi-valor">${formatarMoeda(somas.pedagio)}</div>
          </div>
        </div>
      </div>
    `;

    renderGraficoDashboard(registros);
    renderRankingDashboard(registros);
    renderSemanaDashboard(registros);
  }

  periodoDashboard.addEventListener('change', renderDashboard);
  pagoDashboard.addEventListener('change', renderDashboard);

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

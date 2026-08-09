// Gerador de planilhas .xlsx sem dependências externas (funciona 100% offline).
// Constrói o pacote OOXML (zip + XML) na mão: cabeçalho com nome da empresa,
// coluna de valores em moeda e uma linha de total. Não faz fórmulas nem múltiplas abas.
(() => {
  'use strict';

  // ---------- ZIP (método STORED, sem compressão — mais simples e suficiente aqui) ----------

  let tabelaCrc32 = null;
  function crc32(bytes) {
    if (!tabelaCrc32) {
      tabelaCrc32 = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        tabelaCrc32[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ tabelaCrc32[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function concatenarBytes(partes) {
    const total = partes.reduce((soma, p) => soma + p.length, 0);
    const resultado = new Uint8Array(total);
    let offset = 0;
    partes.forEach(p => { resultado.set(p, offset); offset += p.length; });
    return resultado;
  }

  function construirZip(arquivos) {
    const encoder = new TextEncoder();
    const locais = [];
    const centrais = [];
    let offset = 0;

    arquivos.forEach(({ nome, conteudo }) => {
      const nomeBytes = encoder.encode(nome);
      const crc = crc32(conteudo);
      const tamanho = conteudo.length;

      const header = new Uint8Array(30 + nomeBytes.length);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true); // sem compressão
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0x21, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, tamanho, true);
      dv.setUint32(22, tamanho, true);
      dv.setUint16(26, nomeBytes.length, true);
      dv.setUint16(28, 0, true);
      header.set(nomeBytes, 30);

      locais.push(header, conteudo);

      const central = new Uint8Array(46 + nomeBytes.length);
      const cdv = new DataView(central.buffer);
      cdv.setUint32(0, 0x02014b50, true);
      cdv.setUint16(4, 20, true);
      cdv.setUint16(6, 20, true);
      cdv.setUint16(8, 0, true);
      cdv.setUint16(10, 0, true);
      cdv.setUint16(12, 0, true);
      cdv.setUint16(14, 0x21, true);
      cdv.setUint32(16, crc, true);
      cdv.setUint32(20, tamanho, true);
      cdv.setUint32(24, tamanho, true);
      cdv.setUint16(28, nomeBytes.length, true);
      cdv.setUint16(30, 0, true);
      cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true);
      cdv.setUint16(36, 0, true);
      cdv.setUint32(38, 0, true);
      cdv.setUint32(42, offset, true);
      central.set(nomeBytes, 46);

      centrais.push(central);
      offset += header.length + conteudo.length;
    });

    const inicioCentral = offset;
    const tamanhoCentral = centrais.reduce((s, c) => s + c.length, 0);

    const fim = new Uint8Array(22);
    const fdv = new DataView(fim.buffer);
    fdv.setUint32(0, 0x06054b50, true);
    fdv.setUint16(4, 0, true);
    fdv.setUint16(6, 0, true);
    fdv.setUint16(8, arquivos.length, true);
    fdv.setUint16(10, arquivos.length, true);
    fdv.setUint32(12, tamanhoCentral, true);
    fdv.setUint32(16, inicioCentral, true);
    fdv.setUint16(20, 0, true);

    return concatenarBytes([...locais, ...centrais, fim]);
  }

  // ---------- Helpers XML/planilha ----------

  function escaparXml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    }[c]));
  }

  function colunaParaLetra(indice) {
    let n = indice + 1;
    let letra = '';
    while (n > 0) {
      const resto = (n - 1) % 26;
      letra = String.fromCharCode(65 + resto) + letra;
      n = Math.floor((n - 1) / 26);
    }
    return letra;
  }

  function refCelula(colIndice, linha) {
    return colunaParaLetra(colIndice) + linha;
  }

  // s = índice de estilo (ver styles.xml abaixo)
  function celulaTexto(colIndice, linha, texto, s) {
    return `<c r="${refCelula(colIndice, linha)}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`;
  }

  function celulaNumero(colIndice, linha, valor, s) {
    return `<c r="${refCelula(colIndice, linha)}"${s ? ` s="${s}"` : ''}><v>${Number(valor) || 0}</v></c>`;
  }

  const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  const CONTENT_TYPES = XML_HEADER
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
    + '</Types>';

  const RELS_RAIZ = XML_HEADER
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
    + '</Relationships>';

  const WORKBOOK_RELS = XML_HEADER
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>';

  const WORKBOOK = XML_HEADER
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets>'
    + '</workbook>';

  function docPropsCore(titulo) {
    const agora = new Date().toISOString();
    return XML_HEADER
      + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${escaparXml(titulo)}</dc:title>`
      + '<dc:creator>Anotações Guincho</dc:creator>'
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created>`
      + '</cp:coreProperties>';
  }

  const DOC_PROPS_APP = XML_HEADER
    + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
    + '<Application>Anotações Guincho</Application>'
    + '</Properties>';

  // Estilos: 0 padrão · 1 título (grande, bold, navy) · 2 subtítulo (cinza) ·
  // 3 cabeçalho de coluna (bold, branco sobre navy) · 4 célula de texto com borda ·
  // 5 célula de moeda com borda · 6 rótulo do total (bold, borda no topo) ·
  // 7 valor do total (bold, moeda, borda no topo)
  const STYLES = XML_HEADER
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts>'
    + '<fonts count="5">'
    + '<font><sz val="11"/><name val="Calibri"/></font>'
    + '<font><b/><sz val="16"/><color rgb="FF0A1830"/><name val="Calibri"/></font>'
    + '<font><sz val="10"/><color rgb="FF5C6B80"/><name val="Calibri"/></font>'
    + '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
    + '<font><b/><sz val="11"/><color rgb="FF0A1830"/><name val="Calibri"/></font>'
    + '</fonts>'
    + '<fills count="3">'
    + '<fill><patternFill patternType="none"/></fill>'
    + '<fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FF0A1830"/><bgColor indexed="64"/></patternFill></fill>'
    + '</fills>'
    + '<borders count="3">'
    + '<border><left/><right/><top/><bottom/><diagonal/></border>'
    + '<border><left style="thin"><color rgb="FFE2E7EE"/></left><right style="thin"><color rgb="FFE2E7EE"/></right><top style="thin"><color rgb="FFE2E7EE"/></top><bottom style="thin"><color rgb="FFE2E7EE"/></bottom><diagonal/></border>'
    + '<border><left/><right/><top style="thin"><color rgb="FF0A1830"/></top><bottom/><diagonal/></border>'
    + '</borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="8">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
    + '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
    + '<xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>'
    + '<xf numFmtId="164" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>'
    + '</cellXfs>'
    + '</styleSheet>';

  /**
   * Gera os bytes (Uint8Array) de um .xlsx com uma única aba.
   * @param {object} dados
   * @param {string} dados.titulo - título principal (nome da empresa + relatório)
   * @param {string} dados.subtitulo - linha secundária (período, data de geração)
   * @param {{titulo:string, largura:number}[]} dados.colunas
   * @param {Array<Array<string|number>>} dados.linhas - uma linha por serviço
   * @param {number} dados.colunaValor - índice (0-based) da coluna de valor (moeda)
   * @param {number} dados.totalValor - soma a exibir na linha de total
   * @param {string} dados.totalRotulo - rótulo da linha de total (ex: "TOTAL (12 serviços)")
   */
  function gerarBytes(dados) {
    const { titulo, subtitulo, colunas, linhas, colunaValor, totalValor, totalRotulo } = dados;
    const numColunas = colunas.length;
    const ultimaColuna = colunaParaLetra(numColunas - 1);

    const linhaTitulo = 1;
    const linhaSubtitulo = 2;
    const linhaCabecalho = 4;
    const primeiraLinhaDados = linhaCabecalho + 1;
    const linhaTotal = primeiraLinhaDados + linhas.length;
    const ultimaLinha = linhaTotal;

    const partesLinhas = [];

    partesLinhas.push(`<row r="${linhaTitulo}">${celulaTexto(0, linhaTitulo, titulo, 1)}</row>`);
    partesLinhas.push(`<row r="${linhaSubtitulo}">${celulaTexto(0, linhaSubtitulo, subtitulo, 2)}</row>`);

    const cabecalhoCelulas = colunas.map((c, i) => celulaTexto(i, linhaCabecalho, c.titulo, 3)).join('');
    partesLinhas.push(`<row r="${linhaCabecalho}">${cabecalhoCelulas}</row>`);

    linhas.forEach((linha, idx) => {
      const numeroLinha = primeiraLinhaDados + idx;
      const celulas = linha.map((valor, colIdx) => {
        if (colIdx === colunaValor) return celulaNumero(colIdx, numeroLinha, valor, 5);
        return celulaTexto(colIdx, numeroLinha, valor == null ? '' : String(valor), 4);
      }).join('');
      partesLinhas.push(`<row r="${numeroLinha}">${celulas}</row>`);
    });

    const celulasTotal = [celulaTexto(0, linhaTotal, totalRotulo, 6)];
    for (let i = 1; i < numColunas; i++) {
      if (i === colunaValor) celulasTotal.push(celulaNumero(i, linhaTotal, totalValor, 7));
      else celulasTotal.push(`<c r="${refCelula(i, linhaTotal)}" s="6"/>`);
    }
    partesLinhas.push(`<row r="${linhaTotal}">${celulasTotal.join('')}</row>`);

    const cols = '<cols>' + colunas.map((c, i) =>
      `<col min="${i + 1}" max="${i + 1}" width="${c.largura}" customWidth="1"/>`
    ).join('') + '</cols>';

    const merges = `<mergeCells count="2">`
      + `<mergeCell ref="A${linhaTitulo}:${ultimaColuna}${linhaTitulo}"/>`
      + `<mergeCell ref="A${linhaSubtitulo}:${ultimaColuna}${linhaSubtitulo}"/>`
      + `</mergeCells>`;

    const sheet = XML_HEADER
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + `<dimension ref="A1:${ultimaColuna}${ultimaLinha}"/>`
      + '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
      + cols
      + `<sheetData>${partesLinhas.join('')}</sheetData>`
      + merges
      + '</worksheet>';

    const encoder = new TextEncoder();
    const arquivos = [
      { nome: '[Content_Types].xml', conteudo: encoder.encode(CONTENT_TYPES) },
      { nome: '_rels/.rels', conteudo: encoder.encode(RELS_RAIZ) },
      { nome: 'docProps/core.xml', conteudo: encoder.encode(docPropsCore(titulo)) },
      { nome: 'docProps/app.xml', conteudo: encoder.encode(DOC_PROPS_APP) },
      { nome: 'xl/workbook.xml', conteudo: encoder.encode(WORKBOOK) },
      { nome: 'xl/_rels/workbook.xml.rels', conteudo: encoder.encode(WORKBOOK_RELS) },
      { nome: 'xl/styles.xml', conteudo: encoder.encode(STYLES) },
      { nome: 'xl/worksheets/sheet1.xml', conteudo: encoder.encode(sheet) },
    ];

    return construirZip(arquivos);
  }

  const XlsxLite = { gerarBytes };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = XlsxLite;
  } else {
    window.XlsxLite = XlsxLite;
  }
})();

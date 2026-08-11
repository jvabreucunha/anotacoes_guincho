// Geração de PDFs (recibo de serviço e relatório) usando a biblioteca pdf-lib
// (js/vendor/pdf-lib.min.js). Este módulo só desenha: quem chama já entrega
// os textos formatados (datas, moeda) prontos para impressão.
(() => {
  'use strict';

  function cores(rgb) {
    return {
      navy900: rgb(10 / 255, 24 / 255, 48 / 255),
      gold500: rgb(198 / 255, 154 / 255, 61 / 255),
      gold400: rgb(221 / 255, 186 / 255, 113 / 255),
      textDark: rgb(10 / 255, 24 / 255, 48 / 255),
      textMuted: rgb(92 / 255, 107 / 255, 128 / 255),
      textOnDarkMuted: rgb(159 / 255, 176 / 255, 199 / 255),
      bgLight: rgb(242 / 255, 245 / 255, 250 / 255),
      branco: rgb(1, 1, 1),
    };
  }

  // Quebra um texto (respeitando quebras de linha já existentes) em linhas que
  // cabem em `larguraMax` pontos, para desenhar parágrafos com drawText linha a linha.
  function quebrarTexto(font, texto, tamanhoFonte, larguraMax) {
    const linhasFinais = [];
    String(texto).split('\n').forEach(linhaOriginal => {
      const palavras = linhaOriginal.split(/\s+/).filter(Boolean);
      if (palavras.length === 0) { linhasFinais.push(''); return; }
      let atual = '';
      palavras.forEach(palavra => {
        const tentativa = atual ? `${atual} ${palavra}` : palavra;
        if (atual && font.widthOfTextAtSize(tentativa, tamanhoFonte) > larguraMax) {
          linhasFinais.push(atual);
          atual = palavra;
        } else {
          atual = tentativa;
        }
      });
      if (atual) linhasFinais.push(atual);
    });
    return linhasFinais;
  }

  // Corta um texto de uma linha só (célula de tabela) adicionando "..." no fim,
  // pra nunca estourar a largura da coluna.
  function truncar(font, texto, tamanhoFonte, larguraMax) {
    if (larguraMax <= 0) return '';
    if (font.widthOfTextAtSize(texto, tamanhoFonte) <= larguraMax) return texto;
    let t = texto;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, tamanhoFonte) > larguraMax) {
      t = t.slice(0, -1);
    }
    return t.length <= 1 ? t : `${t}...`;
  }

  /**
   * Gera o PDF de um único serviço (recibo/orçamento), em A4 retrato.
   * @param {object} dados
   * @param {Uint8Array|null} dados.logoBytes - PNG da logo (opcional)
   * @param {string} dados.subtitulo - ex: "Gerado em 10/08/2026 14:32"
   * @param {{label:string, valor:string}[]} dados.campos - já filtrados (sem campos vazios)
   * @param {string|null} dados.descricaoTexto
   * @param {string} dados.valorLabel - ex: "Valor do frete"
   * @param {string} dados.valorTexto - ex: "R$ 250,00"
   */
  async function gerarBytesServico(dados) {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const CORES = cores(rgb);
    const { logoBytes, subtitulo, campos, descricaoTexto, valorLabel, valorTexto } = dados;

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoImage = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;

    const largura = 595.28;
    const altura = 841.89;
    const margem = 44;
    const larguraConteudo = largura - margem * 2;
    const page = pdfDoc.addPage([largura, altura]);

    const alturaCabecalho = 96;
    page.drawRectangle({ x: 0, y: altura - alturaCabecalho, width: largura, height: alturaCabecalho, color: CORES.navy900 });
    page.drawRectangle({ x: 0, y: altura - alturaCabecalho - 4, width: largura, height: 4, color: CORES.gold500 });

    let logoLargura = 0;
    if (logoImage) {
      const alturaLogo = 56;
      logoLargura = (logoImage.width / logoImage.height) * alturaLogo;
      page.drawImage(logoImage, { x: margem, y: altura - alturaCabecalho / 2 - alturaLogo / 2, width: logoLargura, height: alturaLogo });
    }
    const xTitulo = margem + logoLargura + (logoImage ? 14 : 0);
    page.drawText('J BATISTA', { x: xTitulo, y: altura - 46, size: 20, font: fontBold, color: CORES.branco });
    page.drawText('GUINCHO 24 HORAS', { x: xTitulo, y: altura - 64, size: 9, font: fontBold, color: CORES.gold400 });

    let y = altura - alturaCabecalho - 36;
    page.drawText('Serviço de Guincho', { x: margem, y, size: 17, font: fontBold, color: CORES.navy900 });
    y -= 16;
    page.drawText(subtitulo, { x: margem, y, size: 9, font: fontRegular, color: CORES.textMuted });
    y -= 30;

    campos.forEach(campo => {
      page.drawText(campo.label.toUpperCase(), { x: margem, y, size: 8, font: fontBold, color: CORES.textMuted });
      y -= 14;
      page.drawText(String(campo.valor), { x: margem, y, size: 12, font: fontRegular, color: CORES.textDark });
      y -= 22;
    });

    if (descricaoTexto) {
      y -= 4;
      page.drawText('OBSERVAÇÕES', { x: margem, y, size: 8, font: fontBold, color: CORES.textMuted });
      y -= 15;
      quebrarTexto(fontRegular, descricaoTexto, 11, larguraConteudo).forEach(linha => {
        page.drawText(linha, { x: margem, y, size: 11, font: fontRegular, color: CORES.textDark });
        y -= 15;
      });
      y -= 8;
    }

    const alturaCaixa = 60;
    y -= 6;
    page.drawRectangle({ x: margem, y: y - alturaCaixa, width: larguraConteudo, height: alturaCaixa, color: CORES.navy900 });
    page.drawText(valorLabel.toUpperCase(), { x: margem + 18, y: y - 24, size: 10, font: fontBold, color: CORES.textOnDarkMuted });
    page.drawText(valorTexto, { x: margem + 18, y: y - 47, size: 24, font: fontBold, color: CORES.gold400 });

    page.drawText('Documento gerado automaticamente pelo app Anotações Guincho — J Batista.', {
      x: margem, y: 30, size: 8, font: fontRegular, color: CORES.textMuted,
    });

    return pdfDoc.save();
  }

  /**
   * Gera o PDF de um relatório (vários serviços), em A4 paisagem, com paginação
   * automática, cabeçalho de tabela repetido e linha de total no final.
   * @param {object} dados
   * @param {Uint8Array|null} dados.logoBytes
   * @param {string} dados.subtitulo - ex: "Período: Mês atual · Gerado em 10/08/2026 14:32"
   * @param {{titulo:string, largura:number}[]} dados.colunas - largura em pontos (pt)
   * @param {Array<Array<string>>} dados.linhas - células já formatadas como texto
   * @param {number} dados.colunaValor - índice (0-based) da coluna alinhada à direita
   * @param {string} dados.totalTexto - ex: "R$ 3.347,00"
   * @param {string} dados.totalRotulo - ex: "TOTAL (13 serviços)"
   */
  async function gerarBytesRelatorio(dados) {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const CORES = cores(rgb);
    const { logoBytes, subtitulo, colunas, linhas, colunaValor, totalTexto, totalRotulo } = dados;

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoImage = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;

    const largura = 841.89;
    const altura = 595.28;
    const margem = 36;
    const larguraConteudo = largura - margem * 2;
    const alturaLinha = 20;
    const alturaCabecalhoTabela = 22;
    const rodapeReservado = 30;

    const xColunas = [];
    let acumulado = margem;
    colunas.forEach(c => { xColunas.push(acumulado); acumulado += c.largura; });

    let paginaAtual = null;
    let y = 0;

    function desenharCabecalhoTabela() {
      paginaAtual.drawRectangle({ x: margem, y: y - alturaCabecalhoTabela, width: larguraConteudo, height: alturaCabecalhoTabela, color: CORES.navy900 });
      colunas.forEach((c, i) => {
        const texto = truncar(fontBold, c.titulo, 9, c.largura - 10);
        const direita = i === colunaValor;
        const xTexto = direita
          ? xColunas[i] + c.largura - 6 - fontBold.widthOfTextAtSize(texto, 9)
          : xColunas[i] + 6;
        paginaAtual.drawText(texto, { x: xTexto, y: y - alturaCabecalhoTabela + 7, size: 9, font: fontBold, color: CORES.branco });
      });
      y -= alturaCabecalhoTabela;
    }

    function novaPagina(comCabecalhoPrincipal) {
      paginaAtual = pdfDoc.addPage([largura, altura]);
      if (comCabecalhoPrincipal) {
        const alturaTopo = 78;
        paginaAtual.drawRectangle({ x: 0, y: altura - alturaTopo, width: largura, height: alturaTopo, color: CORES.navy900 });
        paginaAtual.drawRectangle({ x: 0, y: altura - alturaTopo - 3, width: largura, height: 3, color: CORES.gold500 });

        let logoLargura = 0;
        if (logoImage) {
          const alturaLogo = 42;
          logoLargura = (logoImage.width / logoImage.height) * alturaLogo;
          paginaAtual.drawImage(logoImage, { x: margem, y: altura - alturaTopo / 2 - alturaLogo / 2, width: logoLargura, height: alturaLogo });
        }
        const xTitulo = margem + logoLargura + (logoImage ? 12 : 0);
        paginaAtual.drawText('J BATISTA — Relatório de Serviços', { x: xTitulo, y: altura - 32, size: 15, font: fontBold, color: CORES.branco });
        paginaAtual.drawText(subtitulo, { x: xTitulo, y: altura - 48, size: 9, font: fontRegular, color: CORES.gold400 });

        y = altura - alturaTopo - 24;
      } else {
        paginaAtual.drawText('Relatório de Serviços (continuação)', { x: margem, y: altura - 28, size: 10, font: fontBold, color: CORES.textMuted });
        y = altura - 46;
      }
      desenharCabecalhoTabela();
    }

    novaPagina(true);

    linhas.forEach((linha, indice) => {
      if (y - alturaLinha < margem + rodapeReservado) novaPagina(false);

      if (indice % 2 === 1) {
        paginaAtual.drawRectangle({ x: margem, y: y - alturaLinha, width: larguraConteudo, height: alturaLinha, color: CORES.bgLight });
      }
      linha.forEach((valor, i) => {
        const c = colunas[i];
        const texto = truncar(fontRegular, valor == null ? '' : String(valor), 9, c.largura - 10);
        const direita = i === colunaValor;
        const xTexto = direita
          ? xColunas[i] + c.largura - 6 - fontRegular.widthOfTextAtSize(texto, 9)
          : xColunas[i] + 6;
        paginaAtual.drawText(texto, { x: xTexto, y: y - alturaLinha + 6, size: 9, font: fontRegular, color: CORES.textDark });
      });
      y -= alturaLinha;
    });

    const alturaTotal = 26;
    if (y - alturaTotal < margem + rodapeReservado) novaPagina(false);

    paginaAtual.drawRectangle({ x: margem, y: y - alturaTotal, width: larguraConteudo, height: alturaTotal, color: CORES.navy900 });
    paginaAtual.drawText(totalRotulo, { x: margem + 10, y: y - alturaTotal + 8, size: 10, font: fontBold, color: CORES.branco });
    const colValor = colunas[colunaValor];
    const larguraTotalTexto = fontBold.widthOfTextAtSize(totalTexto, 12);
    paginaAtual.drawText(totalTexto, {
      x: xColunas[colunaValor] + colValor.largura - 6 - larguraTotalTexto,
      y: y - alturaTotal + 7,
      size: 12,
      font: fontBold,
      color: CORES.gold400,
    });

    const paginas = pdfDoc.getPages();
    paginas.forEach((p, i) => {
      p.drawText('Anotações Guincho — J Batista', { x: margem, y: margem - 16, size: 8, font: fontRegular, color: CORES.textMuted });
      const rotuloPagina = `Página ${i + 1} de ${paginas.length}`;
      p.drawText(rotuloPagina, {
        x: largura - margem - fontRegular.widthOfTextAtSize(rotuloPagina, 8),
        y: margem - 16,
        size: 8,
        font: fontRegular,
        color: CORES.textMuted,
      });
    });

    return pdfDoc.save();
  }

  const PdfExport = { gerarBytesServico, gerarBytesRelatorio };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PdfExport;
  } else {
    window.PdfExport = PdfExport;
  }
})();

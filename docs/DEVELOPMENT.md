# Desenvolvimento

[← Voltar ao Caderninho](../README.md)

O Caderninho usa Electron, HTML, CSS e JavaScript. O processo principal mantém o banco SQLite e o armazenamento local de mídia; o renderer apresenta os cadernos e o editor.

## Executar o projeto

Com Node.js e npm instalados:

```sh
npm ci
npm start
```

## Validar alterações

```sh
npm test
npm run test:app
```

Os testes do aplicativo usam uma pasta temporária de dados, separada dos cadernos pessoais. Eles incluem persistência, editor, seleção, mídia, categorias, calendário, lembretes e desfazer/refazer.

Para executar apenas os cenários com teclado e mouse nativos:

```sh
npm run test:app -- --native-only
```

Para validar apenas ações ligadas a trechos e mídias:

```sh
npm run test:app -- --source-only
```

## Gerar o pacote

```sh
npm run package
```

Veja [Instalação no macOS](INSTALLATION.md) para copiar e abrir o aplicativo gerado.

## Atualizar as imagens do README

Para regenerar o logo PNG e o ícone do aplicativo a partir de `assets/icon.svg`:

```sh
npm run icon
```

No macOS, esse comando também gera `assets/icon.icns` para o pacote instalado.

Para atualizar as capturas:

```sh
npx electron scripts/capture-readme.cjs
```

Para gerar somente as capturas de ações vinculadas e colagem:

```sh
npx electron scripts/capture-readme.cjs --features-only
```

O script usa o renderer real com dados fictícios em um banco temporário. As capturas são gravadas em `docs/images/`; a pasta temporária é removida ao terminar. Nenhuma nota pessoal é acessada.

As funcionalidades ainda não implementadas ficam registradas em [ROADMAP.md](../ROADMAP.md).

## Conexões locais

O cálculo é separado da apresentação:

- `related-config.cjs`: pesos de categorias/léxico/semântica, limiar, quantidade máxima e versão fixa do modelo. Os pesos são normalizados; os valores iniciais ainda precisam de calibração com exemplos reais.
- `related-engine.cjs`: documentos pesquisáveis, comparação dos sinais e ranking restrito ao mesmo caderno. A distância no grafo representa a afinidade combinada.
- `related-service.cjs`: fila após o salvamento, cache por conteúdo/modelo no SQLite, descarte de vetores antigos e extração de texto de imagens.
- `related-worker.cjs`: EmbeddingGemma Q4 em CPU fora da thread da interface. Notas longas são divididas e seus vetores combinados. Usa o prompt simétrico de similaridade.
- `related-ui.js`: rodapé e modal, sem exibir pontuações. O grafo mostra até oito conexões diretas à página atual; clicar abre a página de origem.
- `native/ocr.swift`: OCR do Apple Vision em português/inglês. `prestart` e `prepackage` compilam o helper; o aplicativo distribuído inclui o executável e não exige Swift instalado.

O primeiro processamento baixa os arquivos do modelo para `userData/models`. Nenhum texto ou imagem é enviado para inferência remota. Depois do download, o processamento funciona offline. As tabelas `related_vectors` e `related_ocr` são caches derivados; o conteúdo original permanece nas tabelas existentes.

Validação opcional com o modelo real, incluindo um par português/inglês e um assunto diferente:

```sh
node scripts/check-embedding.cjs
npx electron . --smoke-test --related-only
```

O segundo comando valida o grafo com vetores determinísticos em um banco temporário; não mede a qualidade semântica. Para gerar o aplicativo no macOS, a máquina de desenvolvimento precisa das ferramentas de linha de comando da Apple (`swiftc`).

Para validar a exportação de notas, listas e lembretes em PDF com dados fictícios:

```sh
npx electron . --smoke-test --pdf-only
```

Os PDFs de teste ficam em `artifacts/pdf/`; incluem imagens grandes e cartões de links com e sem capa. A exportação usa um WebContentsView isolado sem janela visível e um arquivo HTML temporário com mídias locais incorporadas, sem carregar recursos da rede.

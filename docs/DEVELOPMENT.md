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

## Gerar o pacote

```sh
npm run package
```

Veja [Instalação no macOS](INSTALLATION.md) para copiar e abrir o aplicativo gerado.

## Atualizar as imagens do README

```sh
npx electron scripts/capture-readme.cjs
```

O script usa o renderer real com dados fictícios em um banco temporário. As capturas são gravadas em `docs/images/`; a pasta temporária é removida ao terminar. Nenhuma nota pessoal é acessada.

As funcionalidades ainda não implementadas ficam registradas em [ROADMAP.md](../ROADMAP.md).

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

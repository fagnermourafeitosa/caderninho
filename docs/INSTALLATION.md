# Instalação no macOS

[← Voltar ao Caderninho](../README.md)

O aplicativo é distribuído aqui como código-fonte. Para gerar o pacote localmente, você precisa de Node.js e npm instalados.

## Gerar o aplicativo

Baixe ou clone este projeto e, na pasta do Caderninho, execute:

```sh
npm ci
npm run package
```

O pacote é gerado para a arquitetura do Mac utilizado. Em um Mac com Apple Silicon, o resultado fica em:

```text
dist/Caderninho-darwin-arm64/Caderninho.app
```

## Instalar e abrir

Feche a versão anterior antes de substituí-la. Em um Mac com Apple Silicon:

```sh
mkdir -p ~/Applications
ditto dist/Caderninho-darwin-arm64/Caderninho.app ~/Applications/Caderninho.app
open ~/Applications/Caderninho.app
```

Em um Mac Intel, use a pasta `Caderninho-darwin-x64` no lugar de `Caderninho-darwin-arm64`.

Atualizar o aplicativo preserva a pasta local de dados. A instalação não precisa de conta ou cadastro.

## Primeiros passos

1. Abra o Caderninho para consultar a Página do dia.
2. Crie seus cadernos em **Cadernos**.
3. Abra **Notas**, **Tarefas** ou **Lembretes** para criar uma página.
4. Aguarde a confirmação de salvamento antes de fechar o aplicativo.

Consulte o [guia de uso](USER_GUIDE.md) para aprender os atalhos e configurar lembretes.

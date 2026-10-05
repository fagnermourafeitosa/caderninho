# Instalação no macOS

[← Voltar ao Caderninho](../README.md)

O app é distribuído aqui como código-fonte. Para gerar o pacote no seu Mac, você precisa ter o Node.js e o npm instalados.

## Gerar o app

Baixe ou clone este projeto e, na pasta do Caderninho, rode:

```sh
npm ci
npm run package
```

O pacote é gerado para a arquitetura do Mac em uso. Num Mac com Apple Silicon, o resultado fica em:

```text
dist/Caderninho-darwin-arm64/Caderninho.app
```

## Instalar e abrir

Feche a versão anterior antes de substituí-la. Num Mac com Apple Silicon:

```sh
mkdir -p ~/Applications
ditto dist/Caderninho-darwin-arm64/Caderninho.app ~/Applications/Caderninho.app
open ~/Applications/Caderninho.app
```

Num Mac Intel, use a pasta `Caderninho-darwin-x64` no lugar de `Caderninho-darwin-arm64`.

Atualizar o app preserva a pasta de dados local. A instalação não pede conta nem cadastro.

## Primeiros passos

1. Abra o Caderninho para ver a página do dia.
2. Crie seus cadernos em **Cadernos**.
3. Abra **Notas**, **Tarefas** ou **Lembretes** para criar uma página.
4. As mudanças são salvas automaticamente no seu Mac; se algo falhar, o app mostra um aviso.

Veja o [guia de uso](USER_GUIDE.md) para conhecer os atalhos e configurar lembretes.

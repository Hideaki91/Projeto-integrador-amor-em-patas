# Amor em Patas — versão Python

Esta versão substitui o servidor Node.js/Express por Python/Flask e mantém a interface web existente. O banco SQLite `adocao.db` e as fotos existentes em `public/uploads/` foram preservados para manter os cadastros atuais.

## O que foi mantido
- Página e estilos originais em `public/`.
- Endpoints de animais, doadores, adotantes e solicitações de adoção.
- Login administrativo por sessão.
- Upload de fotos de animais.
- Banco SQLite existente com os registros atuais.

## Como executar no Windows
1. Instale Python 3.10 ou mais recente.
2. Extraia todos os arquivos para uma pasta no computador.
3. Execute `iniciar_windows.bat` uma vez para criar o ambiente e instalar dependências.
4. Abra o arquivo `.env` e substitua a senha de exemplo por uma senha nova e forte. Defina também `FLASK_SECRET_KEY` com uma chave aleatória longa.
5. Execute `iniciar_windows.bat` novamente.
6. Abra `http://127.0.0.1:5000` no navegador.

## Executar manualmente
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# Crie .env com base em .env.example e defina credenciais seguras
python app.py
```

## Dados existentes e segurança
- O banco incluído é uma cópia consistente do banco enviado, incluindo os registros existentes no momento da conversão.
- Faça cópia de segurança de `adocao.db` e `public/uploads/` antes de usar ou alterar os dados.
- O arquivo `.env` original com a senha antiga não foi incluído. Configure uma nova senha no `.env` local.
- O servidor está configurado para acesso local (`127.0.0.1`). Não o exponha à internet sem revisar segurança, HTTPS, CSRF e configuração de sessão.

# 🐾 Amor em Patas — Sistema de adoção de animais

Aplicação web responsiva para divulgar animais disponíveis para adoção e organizar o fluxo de adoção responsável. O projeto usa **Node.js**, **Express**, **SQLite** e uma interface em HTML, CSS e JavaScript.

## Visão geral do processo

O funcionamento do sistema foi organizado em duas áreas: a área pública, para conhecer os animais e enviar interesse em adoção, e a área administrativa, para manter os cadastros e analisar as solicitações.

### 1. Fluxo público de adoção

1. O visitante abre a página inicial e visualiza os animais cadastrados.
2. Cada cartão apresenta as informações disponíveis do animal, como nome, espécie, sexo, idade, descrição, foto e situação.
3. O visitante escolhe um animal com situação **Disponível** e vai ao formulário de adoção.
4. Preenche nome, e-mail, telefone, cidade e, opcionalmente, endereço e mensagem.
5. Ao enviar, o servidor valida os campos principais e verifica se o animal ainda está disponível.
6. O sistema localiza um adotante pelo e-mail. Se ainda não existir cadastro com aquele e-mail, cria um cadastro de adotante com os dados fornecidos.
7. A solicitação de adoção é registrada com situação **Pendente**, e o animal passa para **Em processo**.
8. A página informa o número da solicitação para referência futura.

O envio do formulário é público. A consulta da lista completa de adotantes e das solicitações, bem como as decisões sobre elas, é restrita à área administrativa.

### 2. Fluxo do administrador

1. O administrador seleciona **Acesso administrador** na página.
2. Informa o usuário e a senha definidos pelas variáveis de ambiente `ADMIN_USER` e `ADMIN_PASSWORD`.
3. O servidor valida as credenciais e cria uma sessão administrativa.
4. Após o login, ficam disponíveis os formulários de cadastro de animais e doadores, além da gestão das solicitações.
5. O administrador pode cadastrar animais, enviar uma foto, editar informações e excluir animais.
6. Também pode cadastrar doadores e consultar as solicitações de adoção.
7. Para cada solicitação, pode marcar o resultado como **Aprovada** ou **Recusada**. A aprovação altera o animal para **Adotado**; a recusa devolve o animal para **Disponível**.
8. Ao sair, a sessão é encerrada. A sessão expira após oito horas e também é perdida quando o servidor reinicia.

A proteção não depende apenas de esconder os formulários: as rotas administrativas da API também verificam a autenticação no servidor.

## Funcionalidades

- Página inicial responsiva em português.
- Listagem dos animais e exibição de suas situações.
- Cadastro de animais com nome, espécie, sexo, idade, porte, descrição e foto opcional.
- Upload de imagens JPG, PNG, WEBP ou GIF, limitado a 5 MB por arquivo.
- Edição e exclusão de animais, disponíveis para administrador.
- Cadastro e gestão de doadores na área administrativa.
- Registro de adotantes pelo fluxo público de solicitação.
- Criação e acompanhamento administrativo das solicitações de adoção.
- Estados de solicitação: **Pendente**, **Aprovada** e **Recusada**.
- Banco de dados SQLite criado automaticamente na primeira execução.

## Tecnologias utilizadas

- **Node.js** — ambiente de execução do servidor.
- **Express** — servidor web e API HTTP.
- **better-sqlite3 / SQLite** — persistência dos dados.
- **Multer** — recebimento e armazenamento de fotos enviadas.
- **dotenv** — leitura de configurações locais no arquivo `.env`.
- **HTML, CSS e JavaScript** — interface no diretório `public/`.

## Estrutura principal

```text
amor-em-patas/
├── server.js           # Servidor Express, banco de dados e API
├── package.json        # Dependências e comandos npm
├── .env.example        # Modelo de configuração local
├── .gitignore          # Arquivos locais que não devem ser versionados
└── public/
    ├── index.html      # Página e formulários
    ├── app.js          # Comunicação com a API e interações
    ├── style.css       # Layout e estilos responsivos
    └── uploads/        # Fotos enviadas (geradas localmente)
```

## Como instalar e executar

**Requisitos:** Node.js 18 ou superior e npm.

1. Clone o repositório e entre na pasta do projeto:

   ```bash
   git clone https://github.com/Hideaki91/amor-em-patas.git
   cd amor-em-patas
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie o arquivo de exemplo para criar sua configuração local.

   **Linux/macOS:**
   ```bash
   cp .env.example .env
   ```

   **PowerShell do Windows:**
   ```powershell
   Copy-Item .env.example .env
   ```

4. Abra o arquivo `.env` e altere pelo menos `ADMIN_USER` e `ADMIN_PASSWORD` para credenciais fortes e exclusivas. Mantenha esse arquivo privado.

   Exemplo de configuração:
   ```dotenv
   ADMIN_USER=admin
   ADMIN_PASSWORD=coloque_uma_senha_forte
   PORT=3000
   ```

5. Inicie o servidor:

   ```bash
   npm start
   ```

   Para desenvolvimento com reinício automático ao alterar arquivos:
   ```bash
   npm run dev
   ```

6. Abra [http://localhost:3000](http://localhost:3000) no navegador. Para acessar os formulários administrativos, use **Acesso administrador** e as credenciais configuradas.

## Dados e arquivos locais

- O banco `adocao.db` é criado automaticamente quando o servidor inicia.
- As tabelas armazenam animais, doadores, adotantes e solicitações de adoção.
- As fotos enviadas são armazenadas em `public/uploads/`.
- O `.gitignore` exclui `.env`, o banco SQLite, arquivos auxiliares do banco, `node_modules/` e os uploads locais. Isso evita versionar credenciais e dados pessoais por acidente.
- Como o banco e os uploads ficam na instalação local, planeje backups seguros se usar o sistema com dados reais.

## Rotas principais da API

| Método | Rota | Finalidade | Acesso |
|---|---|---|---|
| `POST` | `/api/auth/login` | Entrar como administrador | Público, com credenciais |
| `GET` | `/api/auth/me` | Verificar a sessão atual | Público |
| `POST` | `/api/auth/logout` | Encerrar a sessão | Público |
| `GET` | `/api/animals` | Listar animais | Público |
| `POST` | `/api/animals` | Cadastrar animal | Administrador |
| `PUT` | `/api/animals/:id` | Editar animal | Administrador |
| `DELETE` | `/api/animals/:id` | Excluir animal | Administrador |
| `GET` | `/api/donors` | Listar doadores | Administrador |
| `POST` | `/api/donors` | Cadastrar doador | Administrador |
| `GET` | `/api/adopters` | Listar adotantes | Administrador |
| `POST` | `/api/adopters` | Cadastrar adotante | Público |
| `GET` | `/api/adoptions` | Consultar solicitações | Administrador |
| `POST` | `/api/adoptions` | Enviar solicitação de adoção | Público |
| `PATCH` | `/api/adoptions/:id` | Atualizar resultado da solicitação | Administrador |
| `DELETE` | `/api/adoptions/:id` | Excluir solicitação | Administrador |

## Segurança e privacidade

- Nunca envie o arquivo `.env` ou credenciais reais ao GitHub.
- Não publique o banco de dados com informações pessoais nem fotos privadas.
- Em produção, utilize HTTPS, segredos configurados no ambiente de hospedagem, backups protegidos e controles adicionais contra tentativas repetidas de login.
- A sessão administrativa é mantida em memória; reiniciar o servidor encerra as sessões existentes.
- Se o sistema for usado com pessoas reais, informe como os dados serão utilizados e protegidos e observe a legislação de privacidade aplicável, incluindo a LGPD.

## Estado do projeto

Este repositório contém a aplicação e suas funcionalidades descritas acima. Antes de utilizar em produção, faça testes de ponta a ponta, revise as medidas de segurança e configure o ambiente de hospedagem.


## Modelo e processos do banco de dados

O sistema utiliza o **SQLite** para guardar os dados em `adocao.db`. O arquivo é criado automaticamente quando o servidor inicia. A estrutura definida em `server.js` possui quatro tabelas: `animals`, `adopters`, `donors` e `adoptions`.

### 1. Tabelas e dados armazenados

#### `animals` — Animais
Armazena os animais cadastrados para adoção:

- `id`: identificador único (chave primária).
- `name`, `species`, `sex`, `age` e `size`: informações básicas do animal.
- `description`: descrição complementar.
- `photo`: caminho da foto enviada.
- `status`: situação do animal; o valor inicial é **Disponível**.
- `donor_id`: identificador do doador relacionado, quando informado.
- `created_at`: data e hora do cadastro, preenchida por padrão com `CURRENT_TIMESTAMP`.

#### `adopters` — Adotantes
Guarda os dados das pessoas interessadas em adotar:

- `id`: identificador único.
- `name`, `email`, `phone` e `city`: dados de contato.
- `address` e `experience`: informações adicionais, quando fornecidas.
- `created_at`: data e hora do cadastro.

Ao receber uma solicitação, o servidor procura um adotante pelo e-mail, sem diferenciar letras maiúsculas e minúsculas. Se não encontrar, cria um cadastro. **O esquema atual não define uma restrição SQL `UNIQUE` para o e-mail.**

#### `donors` — Doadores
Armazena os dados de quem está associado à doação de animais ou apoia o projeto:

- `id`: identificador único.
- `name`, `email`, `phone` e `city`: dados de contato.
- `notes`: observações opcionais.
- `created_at`: data e hora do cadastro.

#### `adoptions` — Solicitações de adoção
Registra os pedidos enviados pelo formulário público:

- `id`: identificador único.
- `animal_id`: animal relacionado à solicitação.
- `adopter_id`: adotante que enviou o pedido.
- `message`: mensagem ou observação do interessado.
- `status`: situação da solicitação; começa como **Pendente**.
- `created_at`: data e hora do pedido.

### 2. Relacionamentos entre as tabelas

O modelo lógico relaciona as tabelas desta forma:

- **Doadores → Animais:** `animals.donor_id` aponta para o doador associado ao animal. Um doador pode estar associado a vários animais.
- **Adotantes → Solicitações:** `adoptions.adopter_id` identifica o adotante de cada solicitação. Um adotante pode realizar solicitações ao longo do tempo.
- **Animais → Solicitações:** `adoptions.animal_id` identifica o animal pretendido. Um animal pode aparecer em solicitações ao longo do tempo.

Uma relação **1:N (um para muitos)** significa que um registro de uma tabela pode estar associado a vários registros de outra tabela. Os campos acima são usados pelo código para relacionar os dados nas consultas. **A definição SQL atual não declara explicitamente restrições `FOREIGN KEY`**, por isso esses vínculos são aplicados pela lógica da aplicação e não por restrições de chave estrangeira do SQLite.

### 3. Fluxo de uma solicitação de adoção

1. A pessoa escolhe um animal exibido como **Disponível** e preenche nome, e-mail, telefone e cidade.
2. O servidor verifica se os campos obrigatórios foram enviados e consulta o animal para confirmar que ele ainda está disponível.
3. O servidor procura o adotante pelo e-mail. Se não houver cadastro correspondente, cria um registro em `adopters`.
4. O pedido é inserido em `adoptions`, com o status inicial **Pendente** e a mensagem enviada.
5. O status do animal é atualizado para **Em processo**, e o sistema devolve o número da solicitação.
6. Na área administrativa, o administrador pode atualizar a solicitação para **Aprovada**, **Recusada** ou **Pendente**. O animal passa para **Adotado** quando aprovada, volta a **Disponível** quando recusada ou fica **Em processo** quando pendente.

### 4. Chaves, tipos e valores padrão

- **PK (chave primária):** identifica exclusivamente cada registro, como o campo `id` de cada tabela.
- **Referências entre tabelas:** campos como `donor_id`, `animal_id` e `adopter_id` conectam registros relacionados.
- **INTEGER:** usado para identificadores e idade.
- **TEXT:** usado para nomes, contatos, descrições, caminhos de fotos e status.
- **CURRENT_TIMESTAMP:** valor padrão utilizado para registrar data e hora de criação.

### 5. Arquivos e armazenamento

- O banco de dados fica no arquivo local `adocao.db).
- As fotos enviadas são gravadas em `public/uploads/`; a tabela de animais guarda o caminho da foto no campo `photo`.
- O banco e as imagens locais são ignorados pelo Git conforme as regras do `.gitignore`, evitando o envio acidental de dados e arquivos locais ao repositório.
- Para uso real, mantenha backups seguros e proteja os dados pessoais armazenados.

> **Nota sobre o diagrama:** a imagem do banco de dados é uma representação visual para facilitar a compreensão. Os nomes e campos descritos nesta seção seguem o esquema atualmente criado em `server.js`; por isso, alguns nomes diferem dos rótulos em português exibidos no diagrama.

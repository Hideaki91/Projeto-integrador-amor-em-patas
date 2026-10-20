import os
import hmac
import secrets
from functools import wraps
from pathlib import Path
from flask import Flask, jsonify, request, session, send_from_directory
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from supabase import create_client, Client

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

PUBLIC_DIR = BASE_DIR / 'public'
UPLOAD_DIR = PUBLIC_DIR / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# Conexão com o Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL e SUPABASE_KEY precisam estar configurados no .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__, static_folder='public', static_url_path='')
app.secret_key = os.environ.get('FLASK_SECRET_KEY') or secrets.token_hex(32)
app.config.update(
    MAX_CONTENT_LENGTH=MAX_UPLOAD_BYTES + 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
    SESSION_COOKIE_SECURE=os.environ.get('FLASK_ENV') == 'production',
    PERMANENT_SESSION_LIFETIME=8 * 60 * 60,
)


def error(message, status=400):
    return jsonify({'error': message}), status


def admin_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get('admin'):
            return error('Acesso restrito. Entre como administrador.', 401)
        session.permanent = True
        return fn(*args, **kwargs)
    return wrapped


def body_data():
    return request.get_json(silent=True) or request.form.to_dict()


def allowed_image(file):
    return bool(file and Path(secure_filename(file.filename)).suffix.lower() in ALLOWED_EXTENSIONS)


def save_upload(file):
    """
    Envia a foto para o Supabase Storage (bucket 'animals').
    Se falhar, faz o salvamento local na pasta /uploads/.
    """
    if not file or not file.filename:
        return None
    if not allowed_image(file):
        raise ValueError('Envie uma imagem JPG, PNG, WEBP ou GIF.')
    
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_UPLOAD_BYTES:
        raise ValueError('A imagem deve ter no máximo 5 MB.')
    
    ext = Path(secure_filename(file.filename)).suffix.lower()
    filename = f'{secrets.token_hex(12)}{ext}'

    # Tenta enviar para o Supabase Storage
    try:
        content_type = file.content_type or 'image/jpeg'
        file_bytes = file.read()
        supabase.storage.from_('animals').upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        return supabase.storage.from_('animals').get_public_url(filename)
    except Exception:
        # Fallback local se o bucket não estiver disponível
        file.seek(0)
        file.save(UPLOAD_DIR / filename)
        return f'/uploads/{filename}'


# ==========================================================
# ROTAS PÚBLICAS / FRONTEND
# ==========================================================
@app.get('/')
def home():
    return send_from_directory(PUBLIC_DIR, 'index.html')


# ==========================================================
# AUTENTICAÇÃO (ADMIN)
# ==========================================================
@app.post('/api/auth/login')
def login():
    data = body_data()
    username = os.environ.get('ADMIN_USER')
    password = os.environ.get('ADMIN_PASSWORD')
    if not username or not password:
        return error('Configure ADMIN_USER e ADMIN_PASSWORD no arquivo .env antes de iniciar o sistema.', 503)
    
    if not hmac.compare_digest(str(data.get('username', '')), username) or not hmac.compare_digest(str(data.get('password', '')), password):
        return error('Usuário ou senha incorretos.', 401)
    
    session.clear()
    session['admin'] = True
    session.permanent = True
    return jsonify({'ok': True, 'role': 'admin'})


@app.get('/api/auth/me')
def auth_me():
    authenticated = bool(session.get('admin'))
    return jsonify({'authenticated': authenticated, 'role': 'admin' if authenticated else None})


@app.post('/api/auth/logout')
def logout():
    session.clear()
    return jsonify({'ok': True})


# ==========================================================
# ANIMAIS (animals)
# ==========================================================
@app.get('/api/animals')
def get_animals():
    res = supabase.table('animals').select('*, donors(name)').order('id', desc=True).execute()
    data = res.data or []
    # Mantém compatibilidade com donor_name esperado pelo app.js
    for item in data:
        donor = item.get('donors')
        item['donor_name'] = donor.get('name') if isinstance(donor, dict) else None
    return jsonify(data)


@app.post('/api/animals')
@admin_required
def create_animal():
    data = body_data()
    name, species, sex, age, size = (data.get(k) for k in ('name', 'species', 'sex', 'age', 'size'))
    if not name or not species or not sex or age in (None, '') or not size:
        return error('Preencha os campos obrigatórios.')
    try:
        age = int(age)
        photo = save_upload(request.files.get('photo'))
    except (ValueError, TypeError) as exc:
        return error(str(exc) or 'Idade inválida.')

    payload = {
        'name': str(name).strip(),
        'species': species,
        'sex': sex,
        'age': age,
        'size': size,
        'description': data.get('description') or '',
        'photo': photo or '',
        'donor_id': int(data['donor_id']) if data.get('donor_id') else None
    }
    res = supabase.table('animals').insert(payload).execute()
    return jsonify(res.data[0]), 201


@app.route('/api/animals/<int:item_id>', methods=['PUT', 'DELETE'])
@admin_required
def animal_detail(item_id):
    res_old = supabase.table('animals').select('*').eq('id', item_id).execute()
    if not res_old.data:
        return error('Registro não encontrado.', 404)
    old = res_old.data[0]

    if request.method == 'DELETE':
        supabase.table('adoptions').delete().eq('animal_id', item_id).execute()
        supabase.table('animals').delete().eq('id', item_id).execute()
        if old.get('photo', '').startswith('/uploads/'):
            try:
                (PUBLIC_DIR / old['photo'].lstrip('/')).unlink(missing_ok=True)
            except OSError:
                pass
        return jsonify({'ok': True})

    data = body_data()
    try:
        photo = save_upload(request.files.get('photo')) or old.get('photo')
        age = int(data.get('age', old['age']))
    except (ValueError, TypeError) as exc:
        return error(str(exc) or 'Idade inválida.')

    donor_id = old['donor_id']
    if 'donor_id' in data:
        donor_id = int(data['donor_id']) if data.get('donor_id') else None

    payload = {
        'name': data.get('name', old['name']),
        'species': data.get('species', old['species']),
        'sex': data.get('sex', old['sex']),
        'age': age,
        'size': data.get('size', old['size']),
        'description': data.get('description', old['description']),
        'photo': photo,
        'donor_id': donor_id,
        'status': data.get('status', old['status'])
    }
    updated = supabase.table('animals').update(payload).eq('id', item_id).execute()
    return jsonify(updated.data[0])


# ==========================================================
# DOADORES E ADOTANTES (donors / adopters)
# ==========================================================
def register_person_routes(table, fields, public_create=False):
    @app.get(f'/api/{table}', endpoint=f'list_{table}')
    @admin_required
    def list_people(_table=table):
        res = supabase.table(_table).select('*').order('id', desc=True).execute()
        return jsonify(res.data or [])

    def create_person(_table=table, _fields=fields, _public=public_create):
        data = body_data()
        if any(not str(data.get(field) or '').strip() for field in _fields):
            return error('Preencha todos os campos obrigatórios.')
        
        cols = list(_fields) + (['address', 'experience'] if _table == 'adopters' else ['notes'])
        payload = {col: data.get(col) or '' for col in cols}
        res = supabase.table(_table).insert(payload).execute()
        return jsonify(res.data[0]), 201

    app.add_url_rule(f'/api/{table}', endpoint=f'create_{table}', view_func=create_person, methods=['POST'])
    if not public_create:
        app.view_functions[f'create_{table}'] = admin_required(app.view_functions[f'create_{table}'])

    @app.route(f'/api/{table}/<int:item_id>', methods=['PUT', 'DELETE'], endpoint=f'detail_{table}')
    @admin_required
    def person_detail(item_id, _table=table, _fields=fields):
        res_old = supabase.table(_table).select('*').eq('id', item_id).execute()
        if not res_old.data:
            return error('Registro não encontrado.', 404)
        old = res_old.data[0]

        if request.method == 'DELETE':
            try:
                supabase.table(_table).delete().eq('id', item_id).execute()
                return jsonify({'ok': True})
            except Exception:
                return error('Não é possível excluir: existem registros relacionados.', 409)

        data = body_data()
        cols = list(_fields) + (['address', 'experience'] if _table == 'adopters' else ['notes'])
        payload = {col: data.get(col, old.get(col)) for col in cols}
        updated = supabase.table(_table).update(payload).eq('id', item_id).execute()
        return jsonify(updated.data[0])


register_person_routes('donors', ['name', 'email', 'phone', 'city'])
register_person_routes('adopters', ['name', 'email', 'phone', 'city'], public_create=True)


# ==========================================================
# ADOÇÕES (adoptions)
# ==========================================================
@app.get('/api/adoptions')
@admin_required
def get_adoptions():
    res = supabase.table('adoptions').select('*, animals(name), adopters(name)').order('id', desc=True).execute()
    data = res.data or []
    for item in data:
        an = item.get('animals')
        ad = item.get('adopters')
        item['animal_name'] = an.get('name') if isinstance(an, dict) else ''
        item['adopter_name'] = ad.get('name') if isinstance(ad, dict) else ''
    return jsonify(data)


@app.post('/api/adoptions')
def create_adoption():
    data = body_data()
    animal_id = data.get('animal_id')
    if not animal_id:
        return error('Selecione um animal válido.')

    res_animal = supabase.table('animals').select('*').eq('id', int(animal_id)).execute()
    if not res_animal.data:
        return error('Selecione um animal válido.')
    animal = res_animal.data[0]

    if animal['status'] != 'Disponível':
        return error('Este animal não está disponível no momento.', 409)

    adopter = None
    if data.get('adopter_id'):
        res_adopter = supabase.table('adopters').select('*').eq('id', int(data['adopter_id'])).execute()
        if res_adopter.data:
            adopter = res_adopter.data[0]
    else:
        required = ('name', 'email', 'phone', 'city')
        if any(not str(data.get(k) or '').strip() for k in required):
            return error('Preencha nome, e-mail, telefone e cidade para solicitar a adoção.')
        
        email_clean = str(data['email']).strip()
        res_adopter = supabase.table('adopters').select('*').ilike('email', email_clean).execute()
        if res_adopter.data:
            adopter = res_adopter.data[0]
        else:
            new_adopter_data = {
                'name': str(data['name']).strip(),
                'email': email_clean,
                'phone': str(data['phone']).strip(),
                'city': str(data['city']).strip(),
                'address': str(data.get('address') or '').strip(),
                'experience': str(data.get('experience') or '').strip()
            }
            res_new = supabase.table('adopters').insert(new_adopter_data).execute()
            if res_new.data:
                adopter = res_new.data[0]

    if not adopter:
        return error('Não foi possível validar o cadastro do adotante.')

    # Cria a adoção
    res_adoption = supabase.table('adoptions').insert({
        'animal_id': int(animal_id),
        'adopter_id': adopter['id'],
        'message': data.get('message') or ''
    }).execute()

    # Atualiza status do animal para 'Em processo'
    supabase.table('animals').update({'status': 'Em processo'}).eq('id', int(animal_id)).execute()

    created_id = res_adoption.data[0]['id']
    return jsonify({
        'ok': True,
        'request_id': created_id,
        'status': 'Pendente',
        'message': 'Solicitação registrada. Guarde o número da solicitação para referência.'
    }), 201


@app.route('/api/adoptions/<int:item_id>', methods=['PATCH', 'DELETE'])
@admin_required
def adoption_detail(item_id):
    data = body_data()
    res = supabase.table('adoptions').select('*').eq('id', item_id).execute()
    if not res.data:
        return error('Registro não encontrado.', 404)
    adoption = res.data[0]

    if request.method == 'PATCH':
        status = data.get('status')
        if status not in ('Pendente', 'Aprovada', 'Recusada'):
            return error('Status inválido.')
        
        supabase.table('adoptions').update({'status': status}).eq('id', item_id).execute()
        animal_status = 'Adotado' if status == 'Aprovada' else ('Disponível' if status == 'Recusada' else 'Em processo')
        supabase.table('animals').update({'status': animal_status}).eq('id', adoption['animal_id']).execute()
        return jsonify({'ok': True})

    # DELETE
    supabase.table('adoptions').delete().eq('id', item_id).execute()
    if adoption['status'] != 'Aprovada':
        supabase.table('animals').update({'status': 'Disponível'}).eq('id', adoption['animal_id']).execute()
    return jsonify({'ok': True})


# ==========================================================
# TRATAMENTO DE ERROS
# ==========================================================
@app.errorhandler(413)
def too_large(_exc):
    return error('O arquivo enviado é muito grande.', 413)


@app.errorhandler(Exception)
def handle_error(exc):
    from werkzeug.exceptions import HTTPException
    if isinstance(exc, HTTPException):
        return exc
    if app.testing:
        raise exc
    app.logger.exception('Erro ao processar requisição', exc_info=exc)
    return error('Não foi possível processar a solicitação.', 500)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    app.run(host='127.0.0.1', port=port, debug=False)
@echo off
cd /d "%~dp0"
if not exist .venv (
  py -m venv .venv
)
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist .env copy .env.example .env
 echo.
 echo IMPORTANTE: edite o arquivo .env e defina uma senha administrativa forte antes de usar.
 echo Depois, execute novamente este arquivo para iniciar o sistema.
 pause
if exist .env (
  findstr /C:"coloque-uma-senha-forte-aqui" .env >nul
  if not errorlevel 1 (
    echo Edite .env e troque a senha de exemplo antes de iniciar.
    pause
    exit /b 1
  )
)
python app.py
pause

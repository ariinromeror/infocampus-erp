import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url  # <-- AGREGADO PARA NEON

# 1. CARGA DE BÓVEDA
load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent

# 2. SEGURIDAD (Desde .env)
SECRET_KEY = os.getenv('SECRET_KEY', 'clave-de-emergencia-por-si-falla-el-env')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

# 3. APLICACIONES
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Librerías externas
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders', 
    # Tu aplicación
    'portal',
]

# 4. MIDDLEWARE (CorsMiddleware siempre arriba)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# 5. BASE DE DATOS
# Modificado para que use DATABASE_URL en Render o sqlite localmente
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600
    )
}

# 6. MODELO DE USUARIO PERSONALIZADO
AUTH_USER_MODEL = 'portal.Usuario'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# 7. INTERNACIONALIZACIÓN
LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Caracas'
USE_I18N = True
USE_TZ = True

# 8. ARCHIVOS ESTÁTICOS Y MEDIA
STATIC_URL = 'static/'
# Agregado para que Render pueda servir archivos estáticos correctamente
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles') 
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 9. CONFIGURACIÓN DE CORS
CORS_ALLOW_ALL_ORIGINS = True 
CORS_ALLOW_CREDENTIALS = True
# Agregado para permitir peticiones desde tu dominio de Vercel
CSRF_TRUSTED_ORIGINS = [
    "https://ariinromeror-infocampus-erp.vercel.app",
]

# 10. DJANGO REST FRAMEWORK (Configuración para Token)
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', 
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
}

APPEND_SLASH = True
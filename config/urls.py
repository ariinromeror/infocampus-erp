from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    # 1. Si alguien entra a la raíz (http://127.0.0.1:8000/), lo manda al Admin
    path('', lambda request: redirect('admin/', permanent=False)),
    
    # 2. El panel de administración
    path('admin/', admin.site.urls),
    
    # 3. La "Puerta de Enlace" para React. 
    # Todo lo que React pida con /api/... lo resolverá el archivo portal/urls.py
    path('api/', include('portal.urls')),
]
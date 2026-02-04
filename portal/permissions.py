from rest_framework import permissions

class EsDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'director'

class EsCoordinador(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['director', 'coordinador']

class EsStaff(permissions.BasePermission):
    """Secretarias, Coordinadores y Directores (Personal Administrativo)"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['director', 'coordinador', 'secretaria']
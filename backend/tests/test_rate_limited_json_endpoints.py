"""
Regresion: endpoints decorados con `@limiter.limit(...)` que devuelven un
dict (no un `Response`/`StreamingResponse`) DEBEN declarar un parametro
`response: Response` en la firma. SlowAPI usa ese parametro para inyectar
las cabeceras de rate limit cuando el valor de retorno no es ya un
`Response`; si falta, `Limiter._inject_headers` lanza una excepcion y el
endpoint devuelve 500 en *cada* llamada exitosa (bug real detectado al
probar `/api/reportes/boletines/lote` end-to-end contra Postgres/Redis
reales, que tambien afectaba a `/api/ia/chat`).

Estos tests ejercitan el camino de "respuesta exitosa" end-to-end via
TestClient para que este bug no pueda reintroducirse silenciosamente.
"""
import pytest
from fastapi.testclient import TestClient

import auth.dependencies as auth_deps
import main
import routers.ia_context as ia_context_router
import routers.reportes as reportes_router


@pytest.fixture()
def client():
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    yield
    for mod in (ia_context_router, reportes_router):
        try:
            mod.limiter.reset()
        except Exception:
            pass


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    main.app.dependency_overrides.clear()


def _override_current_user(rol="director"):
    async def _fake_current_user():
        return {"id": 1, "cedula": "0102030405", "rol": rol, "first_name": "Ana", "last_name": "Directora"}

    main.app.dependency_overrides[auth_deps.get_current_user] = _fake_current_user


class _FakeArqJob:
    job_id = "test-job-id-123"


class _FakeArqPool:
    def __init__(self):
        self.enqueued_with = None

    async def enqueue_job(self, function_name, *args, **kwargs):
        self.enqueued_with = (function_name, args)
        return _FakeArqJob()

    async def aclose(self):
        pass


def test_encolar_boletines_lote_no_crashea_por_slowapi_response_bug(client, monkeypatch):
    """
    Camino exitoso completo: si `response: Response` no estuviera declarado
    en `encolar_boletines_lote`, esta llamada devolveria 500 en vez de 200
    (ver docstring del modulo).
    """
    _override_current_user(rol="director")
    fake_pool = _FakeArqPool()
    monkeypatch.setattr(reportes_router, "get_arq_pool", lambda: _async_return(fake_pool))

    response = client.post("/api/reportes/boletines/lote", params={"periodo_id": 7})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["job_id"] == "test-job-id-123"
    assert body["status"] == "encolado"
    assert fake_pool.enqueued_with == ("generar_boletines_lote", (7,))


def test_encolar_boletines_lote_sin_redis_configurado_devuelve_503(client, monkeypatch):
    _override_current_user(rol="director")
    monkeypatch.setattr(reportes_router, "get_arq_pool", lambda: _async_return(None))

    response = client.post("/api/reportes/boletines/lote", params={"periodo_id": 7})

    assert response.status_code == 503


def test_chat_ia_no_crashea_por_slowapi_response_bug(client, monkeypatch):
    """
    Mismo bug de SlowAPI, aplicado a `/api/ia/chat`: verifica el camino
    exitoso completo (contexto + llamada a Groq) sin tocar Postgres/Groq
    reales.
    """
    _override_current_user(rol="estudiante")
    monkeypatch.setattr(ia_context_router.settings, "GROQ_API_KEY", "fake-key-for-test")

    async def _fake_obtener_contexto(current_user):
        return {"perfil": {}}

    monkeypatch.setattr(ia_context_router, "obtener_contexto", _fake_obtener_contexto)

    class _FakeChoice:
        def __init__(self, content):
            self.message = type("M", (), {"content": content})()

    class _FakeCompletion:
        def __init__(self, content):
            self.choices = [_FakeChoice(content)]

    class _FakeChatCompletions:
        async def create(self, **kwargs):
            return _FakeCompletion("Respuesta simulada de Eva.")

    class _FakeChat:
        def __init__(self):
            self.completions = _FakeChatCompletions()

    class _FakeAsyncGroq:
        def __init__(self, api_key=None):
            self.chat = _FakeChat()

    monkeypatch.setattr(ia_context_router, "AsyncGroq", _FakeAsyncGroq)

    response = client.post("/api/ia/chat", json={"message": "Hola Eva", "history": []})

    assert response.status_code == 200, response.text
    assert response.json()["response"] == "Respuesta simulada de Eva."


async def _async_return(value):
    return value

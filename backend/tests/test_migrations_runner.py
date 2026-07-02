"""
Tests del runner de migraciones (backend/migrations_runner.py).

No requieren una base de datos real: se usan un FakeConnection asyncpg
(reutilizando tests/fakes.py) y un doble minimo de conexion psycopg2 para
ejercitar la logica de descubrimiento/aplicacion de migraciones.
"""
import pytest

from migrations_runner import (
    MIGRATION_FILENAME_RE,
    list_migration_files,
    pending_migrations,
    read_migration_sql,
    apply_pending_migrations_async,
    apply_pending_migrations_sync,
)

from tests.fakes import FakeConnection, fake_get_db


# ─── Descubrimiento de archivos (logica pura) ───────────────────────────────


class TestMigrationFilenameRegex:
    def test_accepts_valid_names(self):
        assert MIGRATION_FILENAME_RE.match("000_schema_inicial.sql")
        assert MIGRATION_FILENAME_RE.match("001_revoked_tokens.sql")
        assert MIGRATION_FILENAME_RE.match("123_add_indices.sql")

    def test_rejects_invalid_names(self):
        assert not MIGRATION_FILENAME_RE.match("1_too_short.sql")
        assert not MIGRATION_FILENAME_RE.match("readme.md")
        assert not MIGRATION_FILENAME_RE.match("001-dash-not-allowed.sql")
        assert not MIGRATION_FILENAME_RE.match("no_number_prefix.sql")


class TestListMigrationFiles:
    def test_returns_sorted_valid_files_only(self, tmp_path):
        (tmp_path / "010_second.sql").write_text("SELECT 1;")
        (tmp_path / "000_first.sql").write_text("SELECT 1;")
        (tmp_path / "README.md").write_text("no es una migracion")
        (tmp_path / "1_bad_name.sql").write_text("SELECT 1;")

        result = list_migration_files(str(tmp_path))

        assert result == ["000_first.sql", "010_second.sql"]

    def test_returns_empty_list_for_missing_dir(self, tmp_path):
        missing = tmp_path / "does_not_exist"
        assert list_migration_files(str(missing)) == []


class TestPendingMigrations:
    def test_filters_already_applied_preserving_order(self):
        all_files = ["000_a.sql", "001_b.sql", "002_c.sql"]
        applied = {"000_a.sql"}

        assert pending_migrations(all_files, applied) == ["001_b.sql", "002_c.sql"]

    def test_all_pending_when_none_applied(self):
        all_files = ["000_a.sql", "001_b.sql"]
        assert pending_migrations(all_files, set()) == all_files

    def test_none_pending_when_all_applied(self):
        all_files = ["000_a.sql", "001_b.sql"]
        assert pending_migrations(all_files, set(all_files)) == []


class TestReadMigrationSql:
    def test_reads_file_contents(self, tmp_path):
        migration = tmp_path / "000_test.sql"
        migration.write_text("CREATE TABLE IF NOT EXISTS foo (id INT);")

        assert read_migration_sql("000_test.sql", str(tmp_path)) == (
            "CREATE TABLE IF NOT EXISTS foo (id INT);"
        )


# ─── Aplicacion async (asyncpg, usado por FastAPI startup) ──────────────────


class TestApplyPendingMigrationsAsync:
    @pytest.mark.asyncio
    async def test_applies_only_pending_migrations_in_order(self, tmp_path):
        (tmp_path / "000_first.sql").write_text("CREATE TABLE a (id INT);")
        (tmp_path / "001_second.sql").write_text("CREATE TABLE b (id INT);")

        conn = FakeConnection(fetch_results=[[{"version": "000_first.sql"}]])
        applied = await apply_pending_migrations_async(fake_get_db(conn), str(tmp_path))

        assert applied == ["001_second.sql"]
        # Se ejecuto: crear tabla schema_migrations, el SQL de la migracion
        # pendiente y el INSERT de registro -> al menos 3 llamadas a execute.
        assert conn.execute.await_count >= 3

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_nothing_pending(self, tmp_path):
        (tmp_path / "000_first.sql").write_text("CREATE TABLE a (id INT);")

        conn = FakeConnection(fetch_results=[[{"version": "000_first.sql"}]])
        applied = await apply_pending_migrations_async(fake_get_db(conn), str(tmp_path))

        assert applied == []

    @pytest.mark.asyncio
    async def test_applies_all_when_none_previously_applied(self, tmp_path):
        (tmp_path / "000_first.sql").write_text("CREATE TABLE a (id INT);")
        (tmp_path / "001_second.sql").write_text("CREATE TABLE b (id INT);")

        conn = FakeConnection(fetch_results=[[]])
        applied = await apply_pending_migrations_async(fake_get_db(conn), str(tmp_path))

        assert applied == ["000_first.sql", "001_second.sql"]


# ─── Aplicacion sync (psycopg2, usado por populate.py y el CLI) ─────────────


class _FakeSyncCursor:
    def __init__(self, applied_versions):
        self._applied_versions = applied_versions
        self.executed: list[str] = []

    def execute(self, sql, params=None):
        self.executed.append(sql)

    def fetchall(self):
        return [(v,) for v in self._applied_versions]

    def close(self):
        pass


class _FakeSyncConnection:
    def __init__(self, applied_versions=None):
        self._cursor = _FakeSyncCursor(applied_versions or [])
        self.commit_count = 0

    def cursor(self):
        return self._cursor

    def commit(self):
        self.commit_count += 1


class TestApplyPendingMigrationsSync:
    def test_applies_pending_and_records_them(self, tmp_path):
        (tmp_path / "000_first.sql").write_text("CREATE TABLE a (id INT);")
        (tmp_path / "001_second.sql").write_text("CREATE TABLE b (id INT);")

        conn = _FakeSyncConnection(applied_versions=["000_first.sql"])
        applied = apply_pending_migrations_sync(conn, str(tmp_path))

        assert applied == ["001_second.sql"]
        assert conn.commit_count >= 2  # tabla de control + 1 migracion aplicada

    def test_no_pending_returns_empty_list(self, tmp_path):
        (tmp_path / "000_first.sql").write_text("CREATE TABLE a (id INT);")

        conn = _FakeSyncConnection(applied_versions=["000_first.sql"])
        applied = apply_pending_migrations_sync(conn, str(tmp_path))

        assert applied == []

import os
import django
import sys

# Configurar el entorno de Django para acceder a los modelos
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def run_script(script_name):
    print(f"⌛ Procesando: {script_name}...")
    try:
        with open(script_name, 'r', encoding='utf-8') as f:
            code = f.read()
            exec(code, globals())
        print(f"✅ Finalizado con éxito: {script_name}")
    except FileNotFoundError:
        print(f"❌ Error: El archivo {script_name} no se encontró en la raíz.")
    except Exception as e:
        print(f"❌ Error al ejecutar {script_name}: {e}")
        # Detener la ejecución si un archivo falla para evitar inconsistencias
        sys.exit(1)

if __name__ == "__main__":
    print("\n🚀 INICIANDO CARGA MASIVA DE DATOS PARA INFOCAMPUS ERP")
    print("-" * 50)
    
    scripts = [
        '1_malla.py',
        '2_secciones.py',
        '3_poblacion.py',
        '4_actividad.py'
    ]

    for script in scripts:
        run_script(script)
        
    print("-" * 50)
    print("🎉 CARGA COMPLETADA. EL SISTEMA ESTÁ LISTO.\n")
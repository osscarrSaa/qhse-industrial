# SIGEC - Sistema de Gestión de Incidentes, Calidad y CAPA (QHSE)

¡Bienvenido al repositorio de **SIGEC** (Sistema de Gestión Industrial)! Esta aplicación es una solución integral diseñada para el monitoreo, registro y análisis analítico de incidentes de seguridad laboral, reportes de desviaciones de calidad y la ejecución de Acciones Correctivas y Preventivas (CAPA).

El proyecto está diseñado bajo una **arquitectura desacoplada de microservicios** orquestada completamente mediante contenedores, lo que garantiza portabilidad, escalabilidad y un entorno de desarrollo idéntico a producción.

---

## 🏗️ Arquitectura del Sistema y Flujo de Datos

El sistema se compone de cuatro microservicios independientes que se comunican de forma segura a través de una red virtual interna aislada:

1. **Frontend (React + Vite):** Interfaz de usuario SPA (Single Page Application) que consume de forma asíncrona los servicios del backend.
2. **Backend (FastAPI + SQLAlchemy):** REST API de alto rendimiento encargada de la lógica de negocio, validaciones de datos y el puente ORM con la base de datos.
3. **Database (PostgreSQL):** Motor de base de datos relacional robusto para la persistencia de datos a nivel empresarial.
4. **Database Administration (pgAdmin 4):** Entorno gráfico web para la auditoría, optimización y gestión del motor PostgreSQL.

### Diagrama de Infraestructura (Docker Network)

```text
  [ Navegador Web ] (Host Machine)
     │       │
     │5173   │5050 (HTTP)
     ▼       ▼
┌───────────────┐       ┌───────────────┐
│   frontend    │       │    pgadmin    │
│ (React/Vite)  │       │  (Web Admin)  │
└───────┬───────┘       └───────┬───────┘
        │                       │
        │8000 (REST API)        │5432 (Internal)
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│    backend    │──────▶│  postgres_db  │ (Volumen Persistente)
│   (FastAPI)   │5432   │ (PostgreSQL)  │
└───────────────┘       └───────────────┘
  ▲
  │ (SQLAlchemy ORM)
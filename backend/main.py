import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from enum import Enum
from typing import List, Optional
# Agregamos 'status' en la importación de fastapi
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
# Mantengo tu pool_db por si lo usás en otro lado, aunque acá manejamos la sesión local
try:
    from pool_db import *
except ImportError:
    pass


# =====================================================================
# 1. CONFIGURACIÓN DE LA BASE DE DATOS LOCAL / DOCKER
# =====================================================================
# Buscamos la variable de entorno que inyecta Docker. Si no existe, usa SQLite por defecto.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./qhse_industrial.db")

# Ajustamos la conexión según el motor de base de datos
if DATABASE_URL.startswith("sqlite"):
    # SQLite necesita el argumento check_same_thread para hilos en FastAPI
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL maneja los hilos de manera nativa, no necesita conectores adicionales
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================================================
# 2. MODELOS DE BASE DE DATOS (SQLAlchemy)
# =====================================================================
class SectorDB(Base):
    __tablename__ = "sectores"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    activo = Column(Boolean, default=True)

class IncidenteDB(Base):
    __tablename__ = "incidentes_seguridad"
    id = Column(Integer, primary_key=True, index=True)
    sector_id = Column(Integer, ForeignKey("sectores.id"), nullable=False)
    tipo_evento = Column(String, nullable=False)
    gravedad = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha_ocurrencia = Column(DateTime, default=datetime.utcnow)
    estado = Column(String, default="Abierto")
    responsable = Column(String, default="No Asignado")
    accion_correctiva = Column(String, default="")

class ReporteCalidadDB(Base):
    __tablename__ = "reportes_calidad"
    id = Column(Integer, primary_key=True, index=True)
    sector_id = Column(Integer, ForeignKey("sectores.id"), nullable=False)
    origen = Column(String, nullable=False)
    tipo_defecto = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    cantidad_afectada = Column(Integer, default=0)
    fecha_deteccion = Column(DateTime, default=datetime.utcnow)
    estado = Column(String, default="Abierto")
    responsable = Column(String, default="No Asignado")
    accion_correctiva = Column(String, default="")

class AccionCorrectivaDB(Base):
    __tablename__ = "acciones_correctivas"
    id = Column(Integer, primary_key=True, index=True)
    origen_tipo = Column(String, nullable=False)
    origen_id = Column(Integer, nullable=False)
    descripcion_solucion = Column(Text, nullable=False)
    responsable = Column(String, nullable=False)
    fecha_limite = Column(DateTime, nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    eficaz = Column(Boolean, nullable=True)

# =====================================================================
# 3. ESQUEMAS DE VALIDACIÓN (Pydantic)
# =====================================================================
class SectorBase(BaseModel):
    nombre: str = Field(..., example="Línea de Armado A")

class SectorCreate(SectorBase):
    pass

class SectorResponse(SectorBase):
    id: int
    activo: bool
    class Config:
        from_attributes = True

class IncidenteCreate(BaseModel):
    sector_id: int
    tipo_evento: str
    gravedad: str
    descripcion: str
    # Permitimos valores por defecto opcionales al crear para que React no falle
    estado: Optional[str] = "Abierto"
    responsable: Optional[str] = "No Asignado"
    accion_correctiva: Optional[str] = ""

class IncidenteResponse(IncidenteCreate):
    id: int
    fecha_ocurrencia: datetime  # <-- CORREGIDO: Tenía doble 'c' (fecha_occurrencia)
    class Config:
        from_attributes = True

class ReporteCalidadCreate(BaseModel):
    sector_id: int
    origen: str
    tipo_defecto: str
    descripcion: str
    cantidad_afectada: Optional[int] = 0
    estado: Optional[str] = "Abierto"
    responsable: Optional[str] = "No Asignado"
    accion_correctiva: Optional[str] = ""

class ReporteCalidadResponse(ReporteCalidadCreate):
    id: int
    fecha_deteccion: datetime
    class Config:
        from_attributes = True

class AccionCorrectivaCreate(BaseModel):
    origen_tipo: str
    origen_id: int
    descripcion_solucion: str
    responsable: str
    fecha_limite: datetime

class AccionCorrectivaResponse(AccionCorrectivaCreate):
    id: int
    fecha_cierre: Optional[datetime] = None
    eficaz: Optional[bool] = None
    class Config:
        from_attributes = True

class AccionCorrectivaCierre(BaseModel):
    eficaz: bool

class ActualizarGestion(BaseModel):
    estado: str
    responsable: str
    accion_correctiva: Optional[str] = ""

# =====================================================================
# 4. INICIALIZACIÓN DE FASTAPI Y ENDPOINTS
# =====================================================================
app = FastAPI(title="SIGEC API", version="1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# --- SECTORES ---
@app.post("/api/v1/sectores", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
def crear_sector(sector: SectorCreate, db: Session = Depends(get_db)):
    db_sector = db.query(SectorDB).filter(SectorDB.nombre == sector.nombre).first()
    if db_sector:
        raise HTTPException(status_code=400, detail="El sector ya existe")
    nuevo_sector = SectorDB(nombre=sector.nombre)
    db.add(nuevo_sector)
    db.commit()
    db.refresh(nuevo_sector)
    return nuevo_sector

@app.get("/api/v1/sectores", response_model=List[SectorResponse])
def listar_sectores(db: Session = Depends(get_db)):
    # Si la base de datos está vacía al inicio, creamos sectores por defecto para que funcione el frontend
    sectores_actuales = db.query(SectorDB).filter(SectorDB.activo == True).all()
    if not sectores_actuales:
        defectos = ["Inyección", "Armado y Ensamble", "Calderas", "Logística y Despacho", "Mantenimiento"]
        for nombre in defectos:
            db.add(SectorDB(nombre=nombre))
        db.commit()
        sectores_actuales = db.query(SectorDB).filter(SectorDB.activo == True).all()
    return sectores_actuales

# --- SEGURIDAD ---
@app.post("/api/v1/seguridad/incidentes", response_model=IncidenteResponse, status_code=status.HTTP_201_CREATED)
def registrar_incidente(incidente: IncidenteCreate, db: Session = Depends(get_db)):
    sector_existe = db.query(SectorDB).filter(SectorDB.id == incidente.sector_id).first()
    if not sector_existe:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    nuevo_incidente = IncidenteDB(**incidente.model_dump())
    db.add(nuevo_incidente)
    db.commit()
    db.refresh(nuevo_incidente)
    return nuevo_incidente

@app.get("/api/v1/seguridad/incidentes", response_model=List[IncidenteResponse])
def listar_incidentes(sector_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(IncidenteDB)
    if sector_id:
        query = query.filter(IncidenteDB.sector_id == sector_id)
    return query.all()

@app.put("/api/v1/seguridad/incidentes/{id}")
def actualizar_incidente_local(id: int, data: ActualizarGestion, db: Session = Depends(get_db)):
    db_incidente = db.query(IncidenteDB).filter(IncidenteDB.id == id).first()
    if not db_incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    db_incidente.estado = data.estado
    db_incidente.responsable = data.responsable
    db_incidente.accion_correctiva = data.accion_correctiva
    
    db.commit()
    db.refresh(db_incidente)
    return {"status": "success", "message": f"Incidente {id} actualizado con éxito", "data": db_incidente}

# --- CALIDAD ---
@app.post("/api/v1/calidad/reportes", response_model=ReporteCalidadResponse, status_code=status.HTTP_201_CREATED)
def registrar_reporte_calidad(reporte: ReporteCalidadCreate, db: Session = Depends(get_db)):
    sector_existe = db.query(SectorDB).filter(SectorDB.id == reporte.sector_id).first()
    if not sector_existe:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    nuevo_reporte = ReporteCalidadDB(**reporte.model_dump())
    db.add(nuevo_reporte)
    db.commit()
    db.refresh(nuevo_reporte)
    return nuevo_reporte

@app.get("/api/v1/calidad/reportes", response_model=List[ReporteCalidadResponse])
def listar_reportes_calidad(db: Session = Depends(get_db)):
    return db.query(ReporteCalidadDB).all()

@app.put("/api/v1/calidad/reportes/{id}")
def actualizar_calidad_local(id: int, data: ActualizarGestion, db: Session = Depends(get_db)):
    db_reporte = db.query(ReporteCalidadDB).filter(ReporteCalidadDB.id == id).first()
    if not db_reporte:
        raise HTTPException(status_code=404, detail="Reporte de calidad no encontrado")
    
    db_reporte.estado = data.estado
    db_reporte.responsable = data.responsable
    db_reporte.accion_correctiva = data.accion_correctiva
    
    db.commit()
    db.refresh(db_reporte)
    return {"status": "success", "message": f"Reporte {id} actualizado con éxito", "data": db_reporte}

# --- ACCIONES CORRECTIVAS (CAPA) ---
@app.post("/api/v1/acciones-correctivas", response_model=AccionCorrectivaResponse, status_code=status.HTTP_201_CREATED)
def crear_accion_correctiva(accion: AccionCorrectivaCreate, db: Session = Depends(get_db)):
    if accion.origen_tipo == "Seguridad":
        registro_origen = db.query(IncidenteDB).filter(IncidenteDB.id == accion.origen_id).first()
    elif accion.origen_tipo == "Calidad":
        registro_origen = db.query(ReporteCalidadDB).filter(ReporteCalidadDB.id == accion.origen_id).first()
    else:
        raise HTTPException(status_code=400, detail="Tipo de origen inválido")
        
    if not registro_origen:
        raise HTTPException(status_code=404, detail=f"No se encontró origen con ID {accion.origen_id}")

    nueva_accion = AccionCorrectivaDB(**accion.model_dump())
    db.add(nueva_accion)
    registro_origen.estado = "En Proceso"
    db.commit()
    db.refresh(nueva_accion)
    return nueva_accion

# =====================================================================
# 5. ENDPOINTS ANALÍTICOS (DATOS PARA GRÁFICOS)
# =====================================================================
@app.get("/api/v1/analytics/seguridad/por-tipo")
def metricas_seguridad_por_tipo(db: Session = Depends(get_db)):
    resultado = db.query(
        IncidenteDB.tipo_evento, 
        func.count(IncidenteDB.id).label("total")
    ).group_by(IncidenteDB.tipo_evento).all()
    return {tipo: total for tipo, total in resultado}

@app.get("/api/v1/analytics/seguridad/por-sector")
def metricas_seguridad_por_sector(db: Session = Depends(get_db)):
    # CORREGIDO: Se cambió por outerjoin para que liste los sectores incluso con 0 incidentes
    resultado = db.query(
        SectorDB.nombre, 
        func.count(IncidenteDB.id).label("total")
    ).outerjoin(IncidenteDB, SectorDB.id == IncidenteDB.sector_id)\
     .group_by(SectorDB.nombre)\
     .order_by(func.count(IncidenteDB.id).desc()).all()
    return [{"sector": sector, "cantidad": total} for sector, total in resultado]

@app.get("/api/v1/analytics/calidad/resumen")
def metricas_calidad_resumen(db: Session = Depends(get_db)):
    origenes = db.query(
        ReporteCalidadDB.origen, 
        func.count(ReporteCalidadDB.id).label("total")
    ).group_by(ReporteCalidadDB.origen).all()
    
    estados = db.query(
        ReporteCalidadDB.estado, 
        func.count(ReporteCalidadDB.id).label("total")
    ).group_by(ReporteCalidadDB.estado).all()
    
    return {
        "por_origen": {origen: total for origen, total in origenes},
        "por_estado": {estado: total for estado, total in estados}
    }
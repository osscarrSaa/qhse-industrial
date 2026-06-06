# 1. Usamos una imagen oficial de Python liviana
FROM python:3.11-slim

# 2. Definimos la carpeta de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiamos el archivo de requerimientos para instalar las librerías
COPY requirements.txt .

# 4. Instalamos las dependencias sin guardar basura en el caché
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiamos todo el resto del código del backend adentro del contenedor
COPY . .

# 6. Exponemos el puerto 8000 (el que usa FastAPI)
EXPOSE 8000

# 7. Comando para arrancar Uvicorn apuntando a tu main.py
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
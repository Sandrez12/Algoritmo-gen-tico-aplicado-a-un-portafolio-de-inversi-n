# Algoritmo genético aplicado a un portafolio de inversión

Aplicación de escritorio que usa un **algoritmo genético** para encontrar la distribución de un portafolio de 10 activos que maximiza la relación rendimiento/riesgo, y que permite observar cómo mejora la población generación tras generación.

![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?logo=numpy&logoColor=white)
![Matplotlib](https://img.shields.io/badge/Matplotlib-11557C)

## Cómo funciona

| Elemento | Implementación |
|---|---|
| **Individuo** | Vector de 10 pesos que suman 100 %, repartidos en bloques de 5 % |
| **Datos** | Serie histórica de los 10 activos; se calculan el vector de medias (`mu`) y la matriz de covarianza (`Sigma`) |
| **Fitness** | `rendimiento / riesgo`, con rendimiento = `w·mu` y riesgo = `sqrt(wᵀ Σ w)` (similar a un ratio de Sharpe) |
| **Selección** | Ruleta proporcional al fitness |
| **Cruza** | Un punto, con renormalización a bloques de 5 % |
| **Mutación** | Se mueve un bloque de 5 % de un activo a otro con probabilidad configurable |
| **Elitismo** | Los mejores individuos pasan directamente a la siguiente generación |

La interfaz (Tkinter) permite ajustar el tamaño de la población, el número de generaciones, la probabilidad de mutación y el elitismo. Al ejecutar, muestra el mejor portafolio con su rendimiento, riesgo y fitness, y grafica el **mejor fitness por generación** con Matplotlib.

## Ejecución

```bash
pip install -r requirements.txt
python programaVER2.py
```

Tkinter viene incluido con la instalación estándar de Python (en Linux: `sudo apt install python3-tk`).

## Valores por defecto

Población: 50 · Generaciones: 100 (editables desde la interfaz).

## Tecnologías

Python, NumPy, Matplotlib, Tkinter.

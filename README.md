# Algoritmo genético aplicado a un portafolio de inversión

Un algoritmo genético que busca la distribución de un portafolio de 10 activos con la mejor relación **rendimiento / riesgo**, y que permite ver cómo evoluciona la población generación tras generación.

**Pruébalo en el navegador:** https://sandrez12.github.io/Algoritmo-gen-tico-aplicado-a-un-portafolio-de-inversi-n/

![Tests](https://github.com/Sandrez12/Algoritmo-gen-tico-aplicado-a-un-portafolio-de-inversi-n/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-sin_dependencias-F7DF1E?logo=javascript&logoColor=black)

## Qué incluye

| Parte | Descripción |
|---|---|
| `web/` | Versión web interactiva (HTML + CSS + JS, sin dependencias): parámetros, reproductor de generaciones, gráfica de fitness, dispersión riesgo/rendimiento y pesos del mejor portafolio. |
| `ga.py` | Núcleo del algoritmo en Python (NumPy), sin interfaz, con validación de parámetros y semilla reproducible. |
| `programaVER2.py` | Interfaz de escritorio con Tkinter y Matplotlib. |
| `tests/` y `web/ga.test.js` | Pruebas del núcleo en Python (pytest) y en JavaScript (`node --test`). |

## Cómo funciona

| Elemento | Implementación |
|---|---|
| **Individuo** | 10 pesos que suman 100 %, repartidos en bloques de 5 % |
| **Datos** | 11 observaciones de 10 activos; se calculan el vector de medias y la matriz de covarianza |
| **Fitness** | `rendimiento / riesgo`, con rendimiento = `w·μ` y riesgo = `√(wᵀ Σ w)` (similar a un ratio de Sharpe) |
| **Selección** | Ruleta proporcional al fitness |
| **Cruza** | De un punto; el hijo se *repara* con el método del mayor resto para sumar exactamente 20 bloques |
| **Mutación** | Se mueve un bloque de 5 % de un activo a otro con probabilidad configurable |
| **Elitismo** | Los mejores individuos pasan intactos a la siguiente generación |

> Mejora respecto a la versión inicial: antes la cruza renormalizaba los pesos y podía producir porcentajes que no eran múltiplos de 5 %. Ahora todos los individuos son siempre válidos, y hay pruebas que lo verifican.

Los valores de la serie se usan tal como vienen (no se transforman en rendimientos porcentuales).

## Ejecución local

**Versión web:** abre `web/index.html` en el navegador, o sirve la carpeta:

```bash
python -m http.server --directory web 8000
```

**Versión de escritorio:**

```bash
pip install -r requirements.txt
python programaVER2.py
```

Tkinter viene con Python (en Linux: `sudo apt install python3-tk`).

**Como librería:**

```python
import ga

resultado = ga.ejecutar(tam_pob=50, generaciones=100, prob_mut=0.1, elitismo=2, semilla=42)
print(resultado.mejor, resultado.fitness)
```

## Pruebas

```bash
pip install pytest && python -m pytest   # núcleo en Python
node --test web/ga.test.js               # núcleo en JavaScript
```

## Despliegue

La carpeta `web/` es un sitio estático. Cada push a `main` lo publica en GitHub Pages mediante `.github/workflows/pages.yml`.

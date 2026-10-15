"""Núcleo del algoritmo genético para optimizar un portafolio de 10 activos.

Cada individuo es un vector de pesos que suma 100 %, repartidos en bloques de 5 %.
El fitness es rendimiento / riesgo (similar a un ratio de Sharpe).
Sin dependencias de interfaz, para poder probarlo y reutilizarlo.
"""
from dataclasses import dataclass, field

import numpy as np

BLOQUE = 0.05
N_BLOQUES = 20  # 20 bloques de 5 % = 100 %

DATOS = np.array([
    [64.59, 26.26, 101.18, 244.22, 6.5, 69.27, 67.51, 68.9, 281.82, 27.89],
    [69.73, 22.09, 103.06, 219.59, 6.66, 67.06, 69.41, 66.32, 243.55, 28.79],
    [77.37, 20.89, 96.98, 229.00, 6.66, 70.19, 67.83, 68.99, 213.53, 27.52],
    [74.69, 16.21, 97.98, 234.11, 7.03, 68.76, 74.56, 67.89, 192.86, 24.32],
    [71.04, 15.16, 97.78, 219.39, 7.20, 74.32, 70.42, 70.75, 177.39, 26.03],
    [60.59, 15.25, 98.72, 205.01, 7.20, 70.28, 71.36, 72.10, 172.85, 26.38],
    [56.40, 18.89, 97.25, 184.42, 7.50, 65.84, 71.25, 72.55, 160.89, 26.00],
    [63.48, 26.12, 87.79, 190.26, 7.50, 65.25, 71.16, 71.62, 156.23, 25.39],
    [79.43, 26.51, 98.61, 212.28, 7.26, 71.05, 67.91, 71.21, 172.22, 25.04],
    [76.90, 31.59, 98.16, 237.68, 7.26, 88.58, 69.23, 63.48, 205.60, 22.01],
    [75.67, 32.02, 90.35, 219.39, 6.98, 85.35, 69.14, 62.26, 190.44, 21.16],
])

MU = np.mean(DATOS, axis=0)
SIGMA = np.cov(DATOS, rowvar=False)
N_ACTIVOS = DATOS.shape[1]


def generar_individuo(rng, n_activos=N_ACTIVOS):
    """Reparte los 20 bloques de 5 % entre los activos al azar."""
    bloques = rng.integers(0, n_activos, size=N_BLOQUES)
    return np.bincount(bloques, minlength=n_activos) * BLOQUE


def generar_poblacion(rng, tamano):
    return np.array([generar_individuo(rng) for _ in range(tamano)])


def reparar(pesos):
    """Redondea a bloques de 5 % garantizando que sumen exactamente 100 %.

    Usa el método del mayor resto: así el resultado siempre tiene 20 bloques,
    algo que un simple redondeo + renormalización no asegura.
    """
    escala = pesos / pesos.sum() * N_BLOQUES
    bloques = np.floor(escala).astype(int)
    faltan = N_BLOQUES - bloques.sum()
    if faltan > 0:
        orden = np.argsort(-(escala - bloques))
        bloques[orden[:faltan]] += 1
    return bloques * BLOQUE


def rendimiento(pesos):
    return float(np.dot(pesos, MU))


def riesgo(pesos):
    return float(np.sqrt(pesos @ SIGMA @ pesos))


def fitness(pesos):
    r = riesgo(pesos)
    return 0.0 if r == 0 else rendimiento(pesos) / r


def seleccion_ruleta(rng, poblacion, fitness_pob):
    probabilidades = fitness_pob / fitness_pob.sum()
    return poblacion[rng.choice(len(poblacion), p=probabilidades)]


def cruza(rng, padre1, padre2):
    punto = int(rng.integers(1, len(padre1)))
    return reparar(np.concatenate([padre1[:punto], padre2[punto:]]))


def mutacion(rng, individuo, prob_mutacion):
    hijo = individuo.copy()
    if rng.random() < prob_mutacion:
        quitar = rng.choice(np.flatnonzero(hijo > 0))
        agregar = int(rng.integers(0, len(hijo)))
        hijo[quitar] -= BLOQUE
        hijo[agregar] += BLOQUE
    return np.round(hijo / BLOQUE) * BLOQUE


def nueva_generacion(rng, poblacion, elitismo, prob_mutacion):
    fit = np.array([fitness(ind) for ind in poblacion])
    orden = np.argsort(fit)[::-1]
    nueva = [poblacion[i] for i in orden[:elitismo]]
    while len(nueva) < len(poblacion):
        p1 = seleccion_ruleta(rng, poblacion, fit)
        p2 = seleccion_ruleta(rng, poblacion, fit)
        nueva.append(mutacion(rng, cruza(rng, p1, p2), prob_mutacion))
    return np.array(nueva)


@dataclass
class Resultado:
    mejor: np.ndarray
    fitness: float
    rendimiento: float
    riesgo: float
    mejor_por_generacion: list = field(default_factory=list)
    promedio_por_generacion: list = field(default_factory=list)


def validar(tam_pob, generaciones, prob_mut, elitismo):
    if tam_pob < 2:
        raise ValueError("La población debe tener al menos 2 individuos.")
    if generaciones < 1:
        raise ValueError("Debe haber al menos 1 generación.")
    if not 0 <= prob_mut <= 1:
        raise ValueError("La probabilidad de mutación debe estar entre 0 y 1.")
    if not 0 <= elitismo < tam_pob:
        raise ValueError("El elitismo debe ser menor que el tamaño de la población.")


def ejecutar(tam_pob=50, generaciones=100, prob_mut=0.1, elitismo=2, semilla=None):
    """Corre el algoritmo y devuelve el mejor portafolio y su evolución."""
    validar(tam_pob, generaciones, prob_mut, elitismo)
    rng = np.random.default_rng(semilla)
    poblacion = generar_poblacion(rng, tam_pob)
    mejores, promedios = [], []
    for _ in range(generaciones):
        poblacion = nueva_generacion(rng, poblacion, elitismo, prob_mut)
        fit = np.array([fitness(ind) for ind in poblacion])
        mejores.append(float(fit.max()))
        promedios.append(float(fit.mean()))
    fit = np.array([fitness(ind) for ind in poblacion])
    mejor = poblacion[int(np.argmax(fit))]
    return Resultado(mejor, float(fit.max()), rendimiento(mejor), riesgo(mejor), mejores, promedios)

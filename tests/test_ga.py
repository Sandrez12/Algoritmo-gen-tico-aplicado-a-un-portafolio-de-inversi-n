import numpy as np
import pytest

import ga


def es_valido(pesos):
    bloques = pesos / ga.BLOQUE
    return np.isclose(pesos.sum(), 1.0) and np.allclose(bloques, np.round(bloques)) and (pesos >= 0).all()


def test_individuos_suman_100_por_ciento():
    rng = np.random.default_rng(1)
    assert all(es_valido(ga.generar_individuo(rng)) for _ in range(200))


def test_reparar_siempre_devuelve_20_bloques():
    rng = np.random.default_rng(2)
    for _ in range(200):
        crudo = rng.random(ga.N_ACTIVOS)
        assert es_valido(ga.reparar(crudo))


def test_cruza_y_mutacion_conservan_validez():
    rng = np.random.default_rng(3)
    a, b = ga.generar_individuo(rng), ga.generar_individuo(rng)
    for _ in range(200):
        hijo = ga.mutacion(rng, ga.cruza(rng, a, b), 1.0)
        assert es_valido(hijo)


def test_el_elitismo_evita_que_el_mejor_empeore():
    r = ga.ejecutar(tam_pob=30, generaciones=40, prob_mut=0.2, elitismo=2, semilla=7)
    mejores = r.mejor_por_generacion
    assert all(b >= a - 1e-12 for a, b in zip(mejores, mejores[1:]))


def test_resultado_reproducible_con_semilla():
    a = ga.ejecutar(semilla=11)
    b = ga.ejecutar(semilla=11)
    assert np.array_equal(a.mejor, b.mejor)


def test_mejora_respecto_a_un_portafolio_aleatorio():
    r = ga.ejecutar(generaciones=60, semilla=5)
    assert r.fitness >= r.mejor_por_generacion[0] - 1e-12
    assert es_valido(r.mejor)


@pytest.mark.parametrize("args", [(1, 10, 0.1, 0), (10, 0, 0.1, 0), (10, 10, 1.5, 0), (10, 10, 0.1, 10)])
def test_parametros_invalidos(args):
    with pytest.raises(ValueError):
        ga.ejecutar(*args)

import numpy as np
import random
import tkinter as tk
from tkinter import ttk, messagebox
import matplotlib.pyplot as plt

datos = np.array([
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
    [75.67, 32.02, 90.35, 219.39, 6.98, 85.35, 69.14, 62.26, 190.44, 21.16]
])

mu = np.mean(datos, axis=0)
Sigma = np.cov(datos, rowvar=False)

def generar_individuo(num_activos=10):

    # Crear vector vacío
    individuo = np.zeros(num_activos)

    # Tenemos 20 bloques de 5%
    bloques = 20

    # Repartir bloques uno por uno
    for _ in range(bloques):

        # Elegir un activo aleatorio
        activo = random.randint(0, num_activos - 1)

        # Agregar 5% a ese activo
        individuo[activo] += 0.05

    return individuo


def generar_poblacion(tamano):

    poblacion = []

    for _ in range(tamano):
        poblacion.append(generar_individuo())

    return np.array(poblacion)


def fitness(individuo):

    rendimiento = np.dot(individuo, mu)

    varianza = np.dot(
        individuo.T,
        np.dot(Sigma, individuo)
    )

    riesgo = np.sqrt(varianza)

    if riesgo == 0:
        return 0

    return rendimiento / riesgo


def seleccion_ruleta(poblacion, fitness_pob):

    probabilidades = fitness_pob / np.sum(fitness_pob)

    indice = np.random.choice(
        len(poblacion),
        p=probabilidades
    )

    return poblacion[indice]


def cruza(padre1, padre2):

    punto = random.randint(1, len(padre1)-1)

    hijo = np.concatenate([
        padre1[:punto],
        padre2[punto:]
    ])

    hijo = hijo / np.sum(hijo)

    hijo = np.round(hijo / 0.05) * 0.05

    hijo = hijo / np.sum(hijo)

    return hijo


def mutacion(individuo, prob_mutacion):

    hijo = individuo.copy()

    if random.random() < prob_mutacion:

        indices = np.where(hijo > 0)[0]

        quitar = random.choice(indices)

        agregar = random.randint(0, len(hijo)-1)

        hijo[quitar] -= 0.05
        hijo[agregar] += 0.05

    return hijo


def nueva_generacion(
    poblacion,
    elitismo,
    prob_mutacion
):

    fitness_pob = np.array([
        fitness(ind)
        for ind in poblacion
    ])

    indices = np.argsort(fitness_pob)[::-1]

    nueva_pob = []

    # ELITISMO
    for i in range(elitismo):
        nueva_pob.append(poblacion[indices[i]])

    # RESTO
    while len(nueva_pob) < len(poblacion):

        padre1 = seleccion_ruleta(
            poblacion,
            fitness_pob
        )

        padre2 = seleccion_ruleta(
            poblacion,
            fitness_pob
        )

        hijo = cruza(padre1, padre2)

        hijo = mutacion(
            hijo,
            prob_mutacion
        )

        nueva_pob.append(hijo)

    return np.array(nueva_pob)

def ejecutar_algoritmo():

    try:

        tam_pob = int(entry_poblacion.get())
        generaciones = int(entry_generaciones.get())
        prob_mut = float(entry_mutacion.get())
        elitismo = int(entry_elitismo.get())

        poblacion = generar_poblacion(tam_pob)

        mejores_fitness = []

        for _ in range(generaciones):

            poblacion = nueva_generacion(
                poblacion,
                elitismo,
                prob_mut
            )

            fitness_pob = np.array([
                fitness(ind)
                for ind in poblacion
            ])

            mejor_gen = np.max(fitness_pob)

            mejores_fitness.append(mejor_gen)

        fitness_final = np.array([
            fitness(ind)
            for ind in poblacion
        ])

        mejor_idx = np.argmax(fitness_final)

        mejor = poblacion[mejor_idx]

        mejor_fit = fitness_final[mejor_idx]

        rendimiento = np.dot(mejor, mu)

        riesgo = np.sqrt(
            np.dot(
                mejor.T,
                np.dot(Sigma, mejor)
            )
        )

        texto_resultado = (
            f"MEJOR PORTAFOLIO\n\n"
            f"{mejor}\n\n"
            f"Fitness: {mejor_fit:.4f}\n"
            f"Rendimiento: {rendimiento:.4f}\n"
            f"Riesgo: {riesgo:.4f}"
        )

        resultado_label.config(
            text=texto_resultado
        )

        plt.figure(figsize=(8,5))

        plt.plot(
            range(1, generaciones + 1),
            mejores_fitness,
            marker='o'
        )

        plt.title(
            "Mejor Fitness por Generación"
        )

        plt.xlabel("Generación")

        plt.ylabel("Fitness")

        plt.grid(True)

        plt.show()

    except Exception as e:

        messagebox.showerror(
            "Error",
            str(e)
        )

ventana = tk.Tk()

ventana.title(
    "Algoritmo Genético - Portafolio"
)

ventana.geometry("700x600")

titulo = tk.Label(
    ventana,
    text="Optimización de Portafolio con AG",
    font=("Arial", 16, "bold")
)

titulo.pack(pady=10)

tk.Label(
    ventana,
    text="Tamaño de población:"
).pack()

entry_poblacion = tk.Entry(ventana)
entry_poblacion.pack()
entry_poblacion.insert(0, "50")

tk.Label(
    ventana,
    text="Número de generaciones:"
).pack()

entry_generaciones = tk.Entry(ventana)
entry_generaciones.pack()
entry_generaciones.insert(0, "100")

tk.Label(
    ventana,
    text="Probabilidad de mutación:"
).pack()

entry_mutacion = tk.Entry(ventana)
entry_mutacion.pack()
entry_mutacion.insert(0, "0.1")

tk.Label(
    ventana,
    text="Número de individuos elitistas:"
).pack()

entry_elitismo = tk.Entry(ventana)
entry_elitismo.pack()
entry_elitismo.insert(0, "2")

boton = tk.Button(
    ventana,
    text="Ejecutar Algoritmo",
    command=ejecutar_algoritmo,
    bg="green",
    fg="white",
    font=("Arial", 12, "bold")
)

boton.pack(pady=20)

resultado_label = tk.Label(
    ventana,
    text="",
    justify="left",
    font=("Courier", 10)
)

resultado_label.pack(pady=10)

ventana.mainloop()
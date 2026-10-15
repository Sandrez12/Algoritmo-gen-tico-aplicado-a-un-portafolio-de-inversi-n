"""Interfaz de escritorio (Tkinter) para el algoritmo genético de portafolio.

Ejecutar:  python programaVER2.py
La lógica del algoritmo vive en ga.py.
"""
import tkinter as tk
from tkinter import messagebox, ttk

import matplotlib.pyplot as plt

import ga

CAMPOS = [
    ("Tamaño de población", "50", int),
    ("Número de generaciones", "100", int),
    ("Probabilidad de mutación (0 a 1)", "0.1", float),
    ("Individuos elitistas", "2", int),
]


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Algoritmo genético · Portafolio de inversión")
        self.geometry("560x520")
        self.minsize(520, 480)

        ttk.Label(self, text="Optimización de portafolio con algoritmo genético",
                  font=("Segoe UI", 14, "bold")).pack(pady=(14, 4))
        ttk.Label(self, text="Maximiza rendimiento / riesgo repartiendo el capital en bloques de 5 %.",
                  foreground="#555").pack()

        formulario = ttk.Frame(self, padding=14)
        formulario.pack(fill="x")
        formulario.columnconfigure(1, weight=1)
        self.entradas = []
        for fila, (etiqueta, defecto, _) in enumerate(CAMPOS):
            ttk.Label(formulario, text=etiqueta).grid(row=fila, column=0, sticky="w", pady=4)
            entrada = ttk.Entry(formulario, width=12, justify="right")
            entrada.insert(0, defecto)
            entrada.grid(row=fila, column=1, sticky="e", pady=4)
            self.entradas.append(entrada)

        self.boton = ttk.Button(self, text="Ejecutar algoritmo", command=self.ejecutar)
        self.boton.pack(pady=8)
        self.bind("<Return>", lambda _e: self.ejecutar())

        self.resultado = tk.Text(self, height=13, font=("Consolas", 10), state="disabled", relief="flat",
                                 background="#f4f4f4")
        self.resultado.pack(fill="both", expand=True, padx=14, pady=(4, 14))

    def leer_parametros(self):
        try:
            return [tipo(e.get().strip()) for e, (_, _, tipo) in zip(self.entradas, CAMPOS)]
        except ValueError:
            raise ValueError("Revisa los valores: usa números válidos en todos los campos.")

    def ejecutar(self):
        try:
            tam_pob, generaciones, prob_mut, elitismo = self.leer_parametros()
            res = ga.ejecutar(tam_pob, generaciones, prob_mut, elitismo)
        except ValueError as error:
            messagebox.showerror("Parámetros inválidos", str(error))
            return

        lineas = ["MEJOR PORTAFOLIO", ""]
        lineas += [f"  Activo {i + 1:>2}: {peso * 100:5.0f} %" for i, peso in enumerate(res.mejor)]
        lineas += ["", f"Fitness:      {res.fitness:.4f}",
                   f"Rendimiento:  {res.rendimiento:.4f}", f"Riesgo:        {res.riesgo:.4f}"]
        self.resultado.configure(state="normal")
        self.resultado.delete("1.0", "end")
        self.resultado.insert("1.0", "\n".join(lineas))
        self.resultado.configure(state="disabled")
        self.graficar(res)

    @staticmethod
    def graficar(res):
        x = range(1, len(res.mejor_por_generacion) + 1)
        plt.figure(figsize=(8, 5))
        plt.plot(x, res.mejor_por_generacion, label="Mejor", linewidth=2)
        plt.plot(x, res.promedio_por_generacion, label="Promedio", linestyle="--")
        plt.title("Fitness por generación")
        plt.xlabel("Generación")
        plt.ylabel("Fitness (rendimiento / riesgo)")
        plt.grid(True, alpha=0.3)
        plt.legend()
        plt.show()


if __name__ == "__main__":
    App().mainloop()

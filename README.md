# Gopher al Rescate

Juego de misiones para practicar arrays, slices y maps en Go.

## Misiones

Cada misión sube la dificultad:

| Misión | Tema | Emergencia |
|---|---|---|
| 1 | Arrays: índices, valor cero y `len` | Cortes de luz |
| 2 | Recorrer con `for range`: contador, promedio, menor y copia de un array | Calidad del aire |
| 3 | Slices: `append`, `make`, `len` y `cap` | Sala de emergencias |
| 4 | Cortes `s[ini:fin]` y datos compartidos | Tramo cerrado del metro |
| 5 | Maps: búsqueda, «coma ok», `delete` y map `nil` | Banco de sangre |
| 6 | Misión final: slice + map y cuándo usar cada estructura | Ataque a las contraseñas |

Los retos son de cuatro tipos: tocar la casilla que lee el código, predecir la salida, encontrar la línea que falla y elegir entre array, slice o map. Si la respuesta es incorrecta, el juego explica por qué esa elección no sirve y se vuelve a intentar; el puntaje cuenta el primer intento. Al acertar se ve la explicación, la salida real de Go, el mensaje real del error y cómo queda la memoria. Todos los códigos se compilaron y ejecutaron con Go 1.27.

Todo el contenido va cifrado y en cadena: cada reto se abre solo después de resolver bien el anterior.

Al terminar las seis misiones, el jugador descarga un certificado con su nombre, aciertos al primer intento y nivel alcanzado. Solo se pide nombre y apellido; el progreso se guarda en el propio dispositivo.

## Ejecutar en local

Es un sitio estático. Desde la carpeta del repositorio:

```
python -m http.server 8000
```

y abrir `http://localhost:8000`.

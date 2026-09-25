# Informe de balance P4

Fecha de revisión: 2026-09-25  
Muestra: 120 campañas deterministas, 2–4 comandantes, tres mapas, modos clásico/terreno y dificultad normal/difícil.  
Script reproducible: `node tests/balance-analysis.mjs`

## Umbrales de control

| Indicador | Zona saludable propuesta | Resultado | Estado |
|---|---:|---:|---|
| Victoria del líder territorial temprano (ronda 8) | ≤ 75% | 89,2% | Fuera de rango |
| Remontadas después de ronda 8 | ≥ 25% | 10,8% | Fuera de rango |
| Correlación territorios tempranos/victoria | ≤ 0,60 | 0,80 | Fuera de rango |
| Duración mediana | 12–24 rondas | 8 rondas | Demasiado corta |
| Variedad de condiciones de victoria | Ninguna > 80% | Influencia 100% | Fuera de rango |

## Diagnóstico

La ventaja territorial temprana no hace la victoria matemáticamente inevitable, pero sí demasiado predecible. En la ronda 8, el líder medio controla 15,8 territorios frente a 5,0 del resto, produce 51,2 frente a 12,1, recibe 11,4 refuerzos frente a 4,1 y acumula 141,5 puntos de Influencia frente a 46,4. La conquista está otorgando al mismo tiempo presencia, producción, refuerzos, regiones e Influencia; esos multiplicadores explican la bola de nieve.

La composición media de la Influencia ganadora fue: 36,2 por territorios, 26,2 por regiones, 62,3 por producción, 8,2 por tropas y 33,9 por objetivos. La producción es la fuente individual dominante y vuelve a premiar el mismo avance territorial. Los objetivos aportan una ruta secundaria relevante, pero no compensan la pérdida simultánea de territorio, economía y refuerzos.

Una primera simulación contrafactual redujo el peso de territorios a 1,5 puntos, producción a 0,75 y aumentó objetivos un 25%, con una compensación ligera al rezagado. No cambió el líder final en la muestra (0%); un ajuste lineal pequeño no basta. No se aplicaron estos valores al juego principal.

Las tasas brutas por comandante no son todavía una comparación causal: la asignación actual de doctrinas a posiciones de IA no está completamente balanceada entre muestras. Aun así, el rango observado —Diplomático 5%, Conquistador 24%, Guardián 56%— justifica una simulación factorial que rote doctrina, posición inicial, mapa y número de jugadores antes de retocar doctrinas.

## Próxima iteración recomendada

1. Separar la Influencia económica de la expansión: limitar el aporte de producción o usar una escala decreciente en vez de una relación 1:1.
2. Retrasar la victoria por Influencia para que no cierre sistemáticamente alrededor de la ronda 8.
3. Añadir fuentes no territoriales verificables: objetivos de recuperación, estabilización de Frentes, uso eficiente de cartas y especialización regional sin control total.
4. Reforzar al rezagado mediante opciones, no mediante dados: ofertas de recuperación, objetivos adaptativos y bonificación por estabilizar fronteras bajo presión.
5. Ejecutar una matriz factorial de al menos 600 campañas antes de modificar comandantes.

Conclusión: P4 detectó una bola de nieve real. La instrumentación y los umbrales quedan preparados, pero el balance numérico no debe considerarse cerrado hasta que una variante consiga al menos 25% de remontadas y reduzca la correlación por debajo de 0,60 sin alargar la mediana más allá de 24 rondas.

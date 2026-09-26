# Informe de balance P4

Fecha de revisión: 2026-09-26
Muestra: 600 campañas deterministas, 2–4 comandantes, tres mapas, modos clásico/terreno y perfiles Diplomático/Bélico.
Script reproducible: `$env:BALANCE_GAMES='600'; node tests/balance-analysis.mjs`

## Umbrales de control

| Indicador | Zona saludable propuesta | Resultado | Estado |
|---|---:|---:|---|
| Victoria del líder territorial temprano (ronda 8) | ≤ 75% | 84,7% | Fuera de rango |
| Remontadas después de ronda 8 | ≥ 25% | 15,3% | Fuera de rango |
| Correlación territorios tempranos/victoria | ≤ 0,60 | 0,77 | Fuera de rango |
| Duración mediana | 12–24 rondas | 10 rondas | Demasiado corta |
| Variedad de condiciones de victoria | Ninguna > 80% | Dominio 54,5%, Influencia 45,5% | En rango |

## Diagnóstico

El rediseño de Influencia v2 eliminó producción y tropas de la puntuación, limitó la presencia a 8 puntos por territorios y 9 por regiones, y trasladó el peso a misiones elegibles. En la ronda 8, el líder medio obtiene 42,4 puntos de Influencia frente a 22,4 del resto; la diferencia sigue siendo importante, pero ya no reproduce de forma directa la brecha económica de 45,5 frente a 11,4 de producción.

La composición media de la Influencia ganadora fue: 7,9 por territorios, 8,1 por regiones, 0 por producción, 0 por tropas y 39,7 por objetivos. Los objetivos son la fuente principal y existen rutas de posición, táctica, logística, economía, inteligencia, defensa y recuperación. Con el umbral provisional de 60 y sus dos requisitos, la duración mediana es de 10 rondas y la Hegemonía representa el 45,5% de los finales.

La nueva economía por conexiones mejora la lectura del valor territorial, pero no cierra la bola de nieve militar. El líder territorial temprano gana el 84,7% de las veces y el 54,5% de las campañas termina por Dominio total. La duración continúa demasiado corta: mediana de 10 rondas frente al rango objetivo de 12–24. La causa estructural restante sigue en la capacidad operativa de quien conquista.

Las tasas brutas por comandante no son todavía una comparación causal: la asignación actual de doctrinas a posiciones de IA no está completamente balanceada entre muestras. El rango observado —Diplomático 32/100, Conquistador 192/600, Guardián 207/500— sigue justificando una simulación factorial completamente cruzada antes de retocar doctrinas.

## Próxima iteración recomendada

1. Conservar Influencia v2 y medir elecciones reales de objetivos mediante la telemetría local.
2. Profundizar la misión de recuperación para que aparezca con mayor prioridad al jugador rezagado.
3. Reducir el multiplicador operativo de la expansión revisando producción regional y refuerzos, sin devolver esos valores a Influencia.
4. Ejecutar la matriz factorial del objetivo 8 rotando mapa, posición, comandante y cantidad de jugadores antes de fijar definitivamente el umbral de 60.
5. Repetir la matriz de 600 campañas después de cualquier cambio económico y antes de modificar comandantes.

Conclusión: la Hegemonía provisional a 60 mantiene equilibrados los tipos de victoria, pero las remontadas bajan a 15,3% tras la nueva economía y distribución. Faltan 9,7 puntos porcentuales para el objetivo de remontadas, reducir la correlación territorial de 0,77 a 0,60 y recuperar al menos dos rondas de duración mediana. El próximo ajuste debe centrarse en mecanismos de recuperación y no en volver a puntuar producción o tropas.

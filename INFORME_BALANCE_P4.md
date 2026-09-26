# Informe de balance P4

Fecha de revisión: 2026-09-26
Muestra: 600 campañas deterministas, 2–4 comandantes, tres mapas, modos clásico/terreno y dificultad normal/difícil.
Script reproducible: `$env:BALANCE_GAMES='600'; node tests/balance-analysis.mjs`

## Umbrales de control

| Indicador | Zona saludable propuesta | Resultado | Estado |
|---|---:|---:|---|
| Victoria del líder territorial temprano (ronda 8) | ≤ 75% | 84,5% | Fuera de rango |
| Remontadas después de ronda 8 | ≥ 25% | 15,5% | Fuera de rango |
| Correlación territorios tempranos/victoria | ≤ 0,60 | 0,75 | Fuera de rango |
| Duración mediana | 12–24 rondas | 12 rondas | En rango |
| Variedad de condiciones de victoria | Ninguna > 80% | Dominio 78,5%, Influencia 21,5% | En rango |

## Diagnóstico

El rediseño de Influencia v2 eliminó producción y tropas de la puntuación, limitó la presencia a 8 puntos por territorios y 9 por regiones, y trasladó el peso a misiones elegibles. En la ronda 8, el líder medio obtiene 41,5 puntos de Influencia frente a 22,3 del resto; la diferencia sigue siendo importante, pero ya no reproduce de forma directa la brecha económica de 59,5 frente a 12,9 de producción.

La composición media de la Influencia ganadora fue: 8,0 por territorios, 8,7 por regiones, 0 por producción, 0 por tropas y 40,7 por objetivos. Los objetivos son ahora la fuente principal y existen rutas de posición, táctica, logística, economía, inteligencia, defensa y recuperación. Con combate opcional y Sondeo, la duración mediana queda en 12 rondas y la distribución no está monopolizada por Hegemonía.

La mejora no cierra por sí sola la bola de nieve militar. El líder territorial temprano gana el 84,5% de las veces y el 78,5% de las campañas termina por Dominio total. Permitir ataques opcionales evita tiradas malas, pero también hace más eficiente al líder que ya dispone de ventaja. La causa restante está en la capacidad operativa: quien conquista sigue recibiendo mucha más producción y refuerzos, aunque esos recursos ya no puntúen directamente.

Las tasas brutas por comandante no son todavía una comparación causal: la asignación actual de doctrinas a posiciones de IA no está completamente balanceada entre muestras. Aun así, el rango observado —Diplomático 28/100, Conquistador 183/600, Guardián 220/500— justifica una simulación factorial que rote doctrina, posición inicial, mapa y número de jugadores antes de retocar doctrinas.

## Próxima iteración recomendada

1. Conservar Influencia v2 y medir elecciones reales de objetivos mediante la telemetría local.
2. Profundizar la misión de recuperación para que aparezca con mayor prioridad al jugador rezagado.
3. Reducir el multiplicador operativo de la expansión revisando producción regional y refuerzos, sin devolver esos valores a Influencia.
4. Medir si los Frentes regionales y el Sondeo generan decisiones distintas o solo hacen más eficiente la expansión del líder.
5. Repetir la matriz de 600 campañas después de cualquier cambio económico y antes de modificar comandantes.

Conclusión: Influencia v2 corrige la fuente de puntuación dominante y lleva duración y variedad de victoria a la zona saludable. El balance general todavía no está cerrado: faltan 9,5 puntos porcentuales de remontadas y reducir la correlación territorial de 0,75 a 0,60 o menos. El combate opcional mejora la agencia, pero la IA confirma que beneficia especialmente a quien ya lidera. El siguiente cuello de botella es la economía y los refuerzos que alimentan el Dominio total.

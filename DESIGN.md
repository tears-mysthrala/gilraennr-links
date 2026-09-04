# Decisiones de diseño

## Jerarquía

La página responde a tres preguntas en este orden:

1. **¿De quién es esta página?** Avatar, nombre y una descripción corta establecen la identidad sin ocupar toda la primera pantalla.
2. **¿Qué debería abrir ahora?** Un único panel destacado concentra la acción principal. Puede cambiarse desde `featuredLinkId` sin tocar HTML.
   Si hay un directo confirmado, una píldora verde compacta junto al identificador lo comunica sin competir con el CTA.
3. **¿Qué más hay?** Directos y vídeos, apoyo, redes y partners se agrupan por intención. No compiten como una lista de botones idénticos.

En móvil, el recorrido es lineal y los objetivos táctiles son amplios. En escritorio, la cabecera de perfil y el destino principal comparten la primera vista; las secciones usan una cuadrícula de hasta tres columnas.

## Identidad visual

La base berenjena conserva una relación con el Linktree anterior sin copiarlo. Orquídea, coral, ámbar, azul cartográfico y verde musgo recogen los tonos del avatar y de las miniaturas recientes. En los bordes aparecen curvas topográficas, una ruta de nodos y correspondencia dibujada con líneas tenues: referencias a la exploración de `Resonance`, los diagramas de `Masterplan Tycoon` y los sobres de `Cat Mail Co`. El centro se mantiene limpio para no comprometer la lectura.

El pequeño recorrido de nodos del panel principal sustituye la señal de audio genérica. Las tarjetas recuperan parte de la presencia visual de Linktree con superficies más luminosas, una arista de color y las señales cromáticas reconocibles de cada plataforma, pero mantienen secciones y descripciones para conservar la jerarquía de una página de creadora.

La tipografía usa la familia variable del sistema para evitar descargas y cambios de layout. El nombre tiene peso y escala propios; el resto se mantiene sobrio para que enlaces y descripciones sigan siendo fáciles de leer.

## Por qué funciona mejor que un clon de Linktree

- Un solo CTA deja clara la prioridad actual.
- La estructura por intención reduce la búsqueda visual.
- Patreon no se confunde con una red social.
- Los enlaces afiliados tienen tratamiento y declaración propios.
- El ancho de escritorio se aprovecha sin convertir la página en una columna de teléfono ampliada.
- El JSON separa contenido y presentación, de modo que una edición editorial no exige reconstruir el sitio.
- El fallback conserva una página útil cuando GitHub Raw falla.

## Límites deliberados

El estado “en directo” solo aparece con una comprobación positiva reciente y caduca automáticamente. No hay embeds, contadores, fuentes externas, vídeo de fondo ni seguimiento. Estas decisiones reducen carga, distracciones, superficie de privacidad y puntos de fallo.

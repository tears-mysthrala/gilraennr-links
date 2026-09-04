# Decisiones de diseño

## Jerarquía

La página responde a tres preguntas en este orden:

1. **¿De quién es esta página?** Avatar, nombre y una descripción corta establecen la identidad sin ocupar toda la primera pantalla.
2. **¿Qué debería abrir ahora?** Un único panel destacado concentra la acción principal. Puede cambiarse desde `featuredLinkId` sin tocar HTML.
   Si hay un directo confirmado, una píldora verde compacta junto al identificador lo comunica sin competir con el CTA.
3. **¿Qué más hay?** Directos y vídeos, apoyo, redes y partners se agrupan por intención. No compiten como una lista de botones idénticos.

En móvil, el recorrido es lineal y los objetivos táctiles son amplios. En escritorio, la cabecera de perfil y el destino principal comparten la primera vista; las secciones usan una cuadrícula de hasta tres columnas.

## Identidad visual

La base berenjena conserva una relación con el Linktree anterior sin copiarlo. Orquídea, coral y blanco cálido recogen los tonos del avatar. La cuadrícula tenue y la señal vertical del panel principal sugieren una emisión nocturna; son referencias al streaming, no ornamentos de plantilla esports.

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

No hay estado “en directo” automático: una etiqueta estática de ese tipo podría mentir cuando no se actualiza. Tampoco hay embeds, contadores, fuentes externas, vídeo de fondo ni seguimiento. Estas decisiones reducen carga, distracciones, superficie de privacidad y puntos de fallo.

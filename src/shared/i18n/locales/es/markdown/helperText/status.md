# Estado

La etiqueta de **Estado** muestra el estado actual de la obra.

- **Próxima publicación**: la obra está en preparación y se prevé su publicación. Este es el estado habitual de una obra que aún no ha sido publicada pero está planificada para su distribución.
- **Activa**: la obra está publicada y actualmente disponible. Este estado indica que la obra ha sido publicada oficialmente.
- **Retirada**: la obra ha sido retirada de la publicación y será eliminada de todos los canales de distribución. Este estado indica que la obra ya no está disponible para su venta o distribución y dejará de ser accesible.
- **Sustituida**: la obra ha sido reemplazada por una nueva edición, considerándose la edición anterior desactualizada.
- **Pospuesta indefinidamente**: la publicación de la obra se ha retrasado indefinidamente. Puede retomarse en un momento posterior, pero actualmente no se ha establecido ninguna fecha de publicación.
- **Cancelada**: la obra ha sido cancelada de forma permanente y no será publicada.

Al hacer clic en el botón de edición, se mostrarán las acciones de cambio de estado disponibles según el estado actual, siguiendo este diagrama de flujo:

[insertar diagrama de flujo]

Una vez que el Estado de una obra se establece como Activa en Thoth, se considera publicada. Para los suscriptores de [Thoth Obelisk](https://thoth.pub/), [Sphinx](https://thoth.pub/) y [Pyramid](https://thoth.pub/), una vez que una obra está publicada, todos los cambios en los metadatos se distribuyen automáticamente a Crossref como parte del servicio de [registro de DOI](https://thoth.pub/) de Thoth. Por este motivo, Thoth aplica el diagrama de flujo de Estado mostrado anteriormente, y las obras publicadas no pueden despublicarse ni eliminarse posteriormente. Las obras solo deben establecerse como Activas cuando hayan sido publicadas oficialmente y estén listas para su distribución en otras plataformas.

Como se muestra en el diagrama de flujo anterior, las obras publicadas (es decir, Activas) en Thoth solo pueden establecerse como Retiradas o Sustituidas. No pueden establecerse como Pospuestas indefinidamente ni Canceladas.

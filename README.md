# LegalRun UI replica (demo)

Réplica independiente de la interfaz de las principales secciones observadas en
la sesión autorizada de preproducción. Se implementó desde cero con React/Vite
y una API SQLite propia; no copia assets, APIs ni registros reales de LegalRun.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173`. El comando levanta el frontend y una API local
en `127.0.0.1:3001`. La base SQLite se crea en `data/legalrun.sqlite` y no se
incluye en Git. En el primer uso, crea una cuenta local con una contraseña de al
menos 12 caracteres; luego ingresa con esa cuenta. La ruta de un expediente de
ejemplo es `#/client/searchinf/detail/demo-10482`.

## Alcance actual

- Shell de navegación para casos, agenda, inbox, novedades, reportes,
  administración y catálogos de configuración.
- API propia con autenticación local, sesiones HTTP-only y SQLite en loopback.
- Cambio de contraseña con verificación de la clave actual, mínimo de 12
  caracteres y revocación de las otras sesiones.
- Copia de seguridad JSON de casos, módulos, auditoría y archivos adjuntos; no
  incluye credenciales, se descarga sin cifrar y se puede combinar sin sobrescribir
  los registros existentes (proteger el archivo).
- Registro e inicio de sesión locales; alta, búsqueda y edición de casos,
  seguimiento, movimientos, contactos, gastos, honorarios, documentos adjuntos,
  acuerdos con partes, monto, cuotas, vencimiento y estado, mensajes y notas
  quedan guardados en SQLite y se pueden editar.
  Admite archivos locales de hasta 5 MB en PDF, PNG/JPG, TXT y Word.
- Importación CSV de casos con deduplicación por número, actualización masiva por
  ID o número, previsualización y plantillas descargables.
- Búsqueda de casos con filtros por estado/portfolio, ordenamiento y exportación
  CSV.
- Seguimiento reúne casos marcados con estrella, permite quitarlos desde la
  lista y exportar resultados a CSV.
- Solicitudes de baja con motivo y seguimiento de estado; la solicitud no borra
  ni modifica el caso asociado.
- Nuevos juicios funciona como bandeja de revisión: permite incorporar o asociar
  propuestas y descartar sin borrar; los números duplicados se rechazan.
- La ficha permite asignar un responsable y guardar el cambio; el campo también
  está disponible en altas e importaciones CSV.
- Los formularios de casos, gastos y honorarios consumen los catálogos locales
  de estados y tipos; los valores inactivos no se ofrecen en nuevas altas.
- Nuevos juicios y Agenda reutilizan los catálogos de portfolio, jurisdicción y
  responsables para mantener las asignaciones consistentes.
- Los subestados se filtran por estado judicial según el catálogo configurado.
- Los campos comodines activos del catálogo aparecen en ficha y alta de casos y
  guardan sus valores junto al expediente; sus encabezados se incluyen en las
  plantillas de importación/actualización y en el CSV de búsqueda.
- Búsqueda, orden por fecha y exportación CSV en las pestañas del expediente;
  contactos, seguimiento extrajudicial, gastos y honorarios con campos
  estructurados; tableros de stock (altas y solicitudes), estado procesal,
  actividad e impulso calculados desde SQLite.
- Los reportes guardados conservan sus filtros y una copia exportable del
  resultado al momento de guardarlos.
- El constructor de reportes filtra por estado, tipo, portfolio, jurisdicción y
  fecha de alta; incluye selector de columnas con el catálogo amplio (direcciones
  de las partes, año, subestados, juzgado, abogado/usuario designado, últimos
  proveídos y Comodín 1 a 6), selección total, campos comodines en CSV y en
  snapshots guardados.
- Catálogos y módulos permiten altas, edición, bajas, búsqueda y exportación CSV.
- Agenda separa actividades atrasadas, del día y próximos vencimientos, con
  vínculo opcional a expedientes y actualización de estado.
- Inicio presenta actividades próximas y atrasadas desde la Agenda local.
- Inbox permite asociar mensajes a expedientes, actualizar su estado y filtrar
  por nuevos, leídos, respondidos o archivados.
- Novedades consolida movimientos de todos los casos; permite registrar y
  revisar movimientos, abrir la ficha asociada y exportar CSV. Reproduce las
  pestañas Notificaciones, Proveídos, Causas sin Movimiento, Documentos
  Presentados y Documentos no presentados, con sus estados y columnas principales.
- Las cargas masivas de Actualización masiva, Baja de juicios masivo y Nuevos
  juicios usan wizards con descarga de plantilla, drag & drop, validación y carga
  de CSV UTF-8; Nuevos juicios además conserva el paso de tipo de documento y
  template. Los lotes de actualización indican el límite de 4000 registros.
- El topbar local incluye Ayuda, Asistente IA, selector de portfolio, cliente,
  usuario, rol, notificaciones y perfil, con datos ficticios.
- Estado de documentos agrega adjuntos y presentaciones, permite filtrar por
  portal, fecha, proceso, estado, momento y carátula, descargar archivos y
  cambiar el estado desde una vista central.
- El arranque del backend completa automáticamente el caso demo local con
  documentos y presentaciones ficticias si faltan, para que los filtros de
  portal, proceso, momento y carátula tengan opciones útiles sin tocar datos
  reales.
- El backend también siembra, si faltan, expedientes demo adicionales,
  movimientos con distintas antigüedades, solicitudes de baja, agenda, inbox y
  reportes guardados, para que los dashboards locales (estado procesal, sin
  movimientos, impulso procesal, stock, finanzas) muestren distribuciones más
  realistas desde el primer arranque.
- El tablero financiero consolida gastos y honorarios, vencimientos y estados de
  pago, con filtros, actualización de estado y exportación CSV.
- Historial de mantenimiento registra acciones de casos, movimientos y módulos,
  sin copiar el texto sensible de notas o mensajes; incluye paginador con
  navegación por páginas y selector de filas por página.
- Impresión y exportación de fichas funcionan localmente. IA, Drive, correo y
  fórmulas de cálculo legal requieren configurar integraciones y no están activas.
- Las exportaciones CSV neutralizan valores que podrían interpretarse como
  fórmulas de planilla.
- Todo usa registros ficticios. No se conecta a LegalRun, a sus APIs ni a
  expedientes reales. La API escucha solo en localhost y no es un despliegue
  multiusuario/producción.

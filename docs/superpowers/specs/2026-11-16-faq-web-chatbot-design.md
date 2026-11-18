# Diseño corto: chatbot FAQ web con n8n

## Intención y por qué

Agregar a la app React/Vite existente un chatbot web simple para preguntas frecuentes, donde la persona usuaria solo vea el chat y consulte información previamente cargada en n8n.

## Objetivos

- Reutilizar la app actual como contenedor del chatbot.
- Conectar la UI a n8n sin exponer directamente el webhook en el navegador.
- Mantener una experiencia simple: abrir, escribir, recibir respuesta.

## No objetivos

- No crear un panel público para subir documentos.
- No mover la gestión del conocimiento fuera de n8n.
- No reemplazar el flujo RAG de n8n dentro de este repositorio.

## Restricciones

- El proyecto actual usa React 19, Vite y un backend Node local en `server/index.mjs`.
- La integración debe funcionar con configuración por variables de entorno.
- La implementación debe ser consistente con la navegación y estilos ya presentes.

## Enfoques considerados

1. **Web separada para el chat**  
   Más aislada, pero duplica estructura y despliegue.

2. **Usar solo el chat público de n8n**  
   Más rápido, pero menos personalizable y deja la experiencia fuera de la app.

3. **Integrar el chat en la app actual y usar un proxy local hacia n8n**  
   Elegido. Reutiliza la base existente, permite personalizar la UI y evita exponer la URL del webhook en el frontend.

## Decisiones técnicas

- Crear una vista/página de chat dentro de la app actual.
- Agregar un endpoint local `POST /api/faq/chat` que reciba el mensaje y reenvíe la consulta a n8n.
- Configurar la URL del webhook de n8n por variable de entorno.
- Dejar la carga y mantenimiento de documentos del lado administrador/n8n.

## Lo que queda al implementador

- Definir la ubicación exacta del acceso al chat dentro de la navegación actual.
- Manejar estados de carga, error y respuesta vacía.
- Documentar la variable de entorno necesaria para conectar n8n.

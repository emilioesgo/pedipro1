# PediPro: checklist para pasar a produccion

Este documento define el camino para pasar de prototipo funcional a produccion controlada. Las reglas `firestore.rules` y `storage.rules` son una meta de produccion: no deben desplegarse hasta completar la migracion de autenticacion.

## 1. Bloqueador principal: autenticacion real

Estado actual:
- El registro nuevo ya crea usuarios en Firebase Authentication con email/password.
- El login principal intenta primero Firebase Authentication y conserva compatibilidad temporal con cuentas antiguas en Firestore.
- Los roles nuevos ya se crean como usuarios de Firebase Authentication y se guardan en `usuariosRoles/{uid}`.
- La eliminacion de roles en dashboard ya usa `deleteStaffRole` para borrar tambien el acceso en Firebase Authentication cuando Cloud Functions este desplegado.
- La sesion de dashboard todavia se guarda en `localStorage` para no romper el flujo actual.
- Los roles antiguos pueden seguir existiendo con ids automaticos y `clave` hasheada hasta migrarlos.

Para produccion:
- Migrar cuentas antiguas que solo tienen `correo` y `clave` en Firestore.
- Confirmar que cada documento nuevo y migrado en `restaurantes` tenga `authUid`.
- Migrar roles antiguos con ids automaticos a Firebase Auth y `usuariosRoles/{uid}`.
- Cambiar el dashboard para depender de `onAuthStateChanged`, no de `localStorage` como prueba de acceso.
- Migrar o eliminar el campo `clave` en Firestore.

## 2. Reglas de Firebase

Archivos agregados:
- `firestore.rules`
- `storage.rules`
- `firebase.json`
- `.firebaserc`
- `package.json`
- `docs/despliegue-produccion.md`

Antes de desplegar:
- Confirmar que cada restaurante tiene `authUid`.
- Confirmar que cada usuario de rol tiene documento `usuariosRoles/{uid}`.
- `menu.html` y `menumesa.html` ya intentan resolver alias mediante `slugs/{slug}` antes de usar la consulta legacy por `restaurantes.slug`.
- Migrar aliases existentes creando documentos `slugs/{slug}` para todos los restaurantes que ya tengan slug.
- Despues de migrar aliases, eliminar el fallback legacy por `restaurantes.slug` en `menu.html` y `menumesa.html`.
- Ajustar la consulta publica de estado de pedido para usar un token de seguimiento o endpoint, no una lectura abierta de pedidos por telefono.
- Activar App Check.

## 3. Panel propietario

Estado actual:
- El PIN se valida en cliente contra hash en Firestore.
- El panel propietario ya pide correo/contrasena de Firebase y PIN antes de abrir.
- La eliminacion de cuentas ya se conecta a `deleteRestaurantAccount`, por lo que puede borrar Firestore, Storage, aliases, roles y Firebase Authentication cuando Cloud Functions este desplegado.
- Ya existe una base de Cloud Functions en `functions/` con `deleteRestaurantAccount` para borrar Firestore, Storage, aliases, roles y usuarios de Firebase Authentication desde Admin SDK.
- Ya existe `migrateRestaurantSlugs` para crear `slugs/{slug}` desde los restaurantes actuales.
- El panel propietario incluye un boton interno para ejecutar la migracion de aliases cuando las funciones esten desplegadas.

Para produccion:
- Instalar dependencias en `functions/` y desplegar Cloud Functions.
- Usar custom claims, por ejemplo `projectAdmin: true`.
- Marcar tu cuenta de Firebase Authentication como administradora con `npm run set-project-admin -- correo@dominio.com` dentro de `functions/`.
- Ejecutar `migrateRestaurantSlugs` una vez antes de quitar la consulta legacy por slug.
- Registrar auditoria de acciones criticas: eliminaciones, cambios de suscripcion y pagos.

## 4. Menus publicos

Riesgos actuales:
- `menu.html` y `menumesa.html` crean pedidos directo en Firestore.
- `menumesa.html` puede cambiar estado de mesa desde cliente publico.

Para produccion:
- Activar App Check.
- Validar estructura de pedidos en reglas o Cloud Functions.
- Agregar limite anti abuso por restaurante/IP/dispositivo si se pasa a backend.
- Usar token por mesa en QR para evitar que cualquiera manipule cualquier mesa.

## 5. PWA y hosting

Pendientes:
- Definir dominio oficial.
- Restringir Firebase API key al dominio oficial.
- Revisar `manifest.json`: nombre, iconos 192/512 reales y `start_url`.
- Mejorar `sw.js` para cache controlado de secciones y actualizaciones.
- Agregar pagina 404.
- Revisar que no existan URLs fijas de GitHub Pages en produccion.

## 6. Datos, pagos y operacion SaaS

Pendientes:
- Definir estados de suscripcion: prueba, activo, vencido, suspendido, cancelado.
- Integrar pagos reales o registrar comprobantes de forma controlada.
- Crear backups automaticos de Firestore.
- Definir politicas de privacidad, terminos y eliminacion de datos.
- Crear monitoreo de errores y eventos criticos.

## Orden recomendado

1. Migrar autenticacion a Firebase Auth.
2. Migrar roles a `usuariosRoles/{uid}`.
3. Desplegar Cloud Functions y ejecutar `migrateRestaurantSlugs`.
4. Activar App Check.
5. Desplegar reglas de Firestore/Storage.
6. Mover panel propietario a Cloud Functions/Admin SDK.
7. Configurar dominio, hosting, backups y monitoreo.

Guia operativa:
- Sigue `docs/despliegue-produccion.md` para instalar dependencias, marcar el administrador, desplegar funciones, migrar aliases, publicar hosting y desplegar reglas en orden.

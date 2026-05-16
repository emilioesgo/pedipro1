# Despliegue de produccion PediPro

Estos pasos preparan el proyecto sin desplegar reglas antes de que la migracion este lista.

## 1. Instalar dependencias de funciones

Desde la carpeta principal del proyecto:

```bash
npm run functions:install
```

## 2. Iniciar sesion con Firebase CLI

```bash
firebase login
firebase use pedipro-1853f
```

## 3. Dar permiso de administrador a tu cuenta

Este paso marca tu usuario de Firebase Authentication con el permiso `projectAdmin`.

Primero crea una llave privada de cuenta de servicio:

1. Entra a Firebase Console.
2. Ve a Configuracion del proyecto > Cuentas de servicio.
3. Haz clic en Generar nueva clave privada.
4. Guarda el archivo JSON fuera de la carpeta publica del sitio, por ejemplo en `C:\Users\es_go\firebase-keys\pedipro-admin.json`.

Despues ejecuta:

```bash
npm run functions:set-admin -- tu-correo@dominio.com true C:\Users\es_go\firebase-keys\pedipro-admin.json
```

El parametro `true` activa el permiso. Para quitarlo puedes usar `false`.

Despues de aplicar el permiso, cierra sesion y vuelve a entrar en el panel propietario para que Firebase actualice el token.

## 4. Desplegar funciones

```bash
npm run deploy:functions
```

## 5. Migrar aliases del menu

Entra a `panel-propietario.html`, inicia sesion con correo, contrasena y PIN, y usa el boton `Migrar aliases`.

## 6. Desplegar hosting

```bash
npm run deploy:hosting
```

## 7. Desplegar reglas

Haz este paso solo cuando las cuentas antiguas ya tengan `authUid`, los roles esten migrados a `usuariosRoles/{uid}` y los aliases esten creados en `slugs/{slug}`.

```bash
npm run deploy:rules
```

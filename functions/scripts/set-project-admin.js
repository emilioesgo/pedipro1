const admin = require("firebase-admin");
const path = require("path");

const email = process.argv[2];
const valor = process.argv[3] !== "false";
const serviceAccountPath = process.argv[4] || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "pedipro-1853f";

if (!email) {
  console.error("Uso: npm run set-project-admin -- correo@dominio.com [true|false] [ruta-service-account.json]");
  process.exit(1);
}

function crearCredencial() {
  if (!serviceAccountPath) return admin.credential.applicationDefault();

  const rutaAbsoluta = path.resolve(serviceAccountPath);
  const serviceAccount = require(rutaAbsoluta);
  return admin.credential.cert(serviceAccount);
}

admin.initializeApp({
  credential: crearCredencial(),
  projectId,
});

async function main() {
  const usuario = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(usuario.uid, {
    ...(usuario.customClaims || {}),
    projectAdmin: valor,
  });

  console.log(`projectAdmin=${valor} aplicado a ${email} (${usuario.uid}).`);
  console.log("Cierra sesion y vuelve a entrar para que Firebase actualice el permiso.");
}

main().catch((error) => {
  console.error(error);
  if (
    error.code === "app/invalid-credential"
    || String(error.message || "").includes("Could not load the default credentials")
    || String(error.message || "").includes("metadata.google.internal")
  ) {
    console.error("\nNo se encontraron credenciales locales de administrador.");
    console.error("Solucion recomendada:");
    console.error("1. Firebase Console > Configuracion del proyecto > Cuentas de servicio.");
    console.error("2. Genera una nueva clave privada JSON y guardala fuera de la carpeta publica del sitio.");
    console.error("3. Ejecuta:");
    console.error("   npm run functions:set-admin -- correo@dominio.com true C:\\\\ruta\\\\pedipro-admin.json");
  }
  process.exit(1);
});

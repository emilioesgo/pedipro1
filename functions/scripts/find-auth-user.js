const admin = require("firebase-admin");
const path = require("path");

const search = String(process.argv[2] || "").trim().toLowerCase();
const serviceAccountPath = process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "pedipro-1853f";

if (!search) {
  console.error("Uso: npm run find-auth-user -- texto-busqueda ruta-service-account.json");
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
  const encontrados = [];
  let nextPageToken;

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    result.users.forEach((user) => {
      const email = String(user.email || "").toLowerCase();
      const name = String(user.displayName || "").toLowerCase();
      if (email.includes(search) || name.includes(search) || user.uid === search) {
        encontrados.push({
          uid: user.uid,
          email: user.email || "",
          nombre: user.displayName || "",
          creado: user.metadata.creationTime,
        });
      }
    });
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  if (!encontrados.length) {
    console.log(`No se encontraron usuarios de Firebase Auth que coincidan con "${search}".`);
    return;
  }

  encontrados.forEach((user) => {
    console.log(`${user.email || "(sin correo)"} | ${user.uid} | ${user.nombre || "Sin nombre"} | ${user.creado}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

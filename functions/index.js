const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const FUNCTION_OPTIONS = {
  region: "us-central1",
  invoker: "public",
  cors: [
    "https://emilioesgo.github.io",
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^http:\/\/localhost:\d+$/,
  ],
};

const SUBCOLECCIONES_RESTAURANTE = [
  "productos",
  "pedidos",
  "mesas",
  "roles",
  "personalizaciones",
];

function exigirProjectAdmin(request) {
  if (!request.auth || request.auth.token.projectAdmin !== true) {
    throw new HttpsError("permission-denied", "Solo el administrador del proyecto puede ejecutar esta accion.");
  }
}

function exigirSesion(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  }
}

async function exigirPuedeGestionarRestaurante(request, restauranteId) {
  exigirSesion(request);

  if (request.auth.token.projectAdmin === true) return;

  const restauranteSnap = await db.collection("restaurantes").doc(restauranteId).get();
  if (!restauranteSnap.exists) {
    throw new HttpsError("not-found", "El restaurante no existe.");
  }

  const restaurante = restauranteSnap.data() || {};
  const authUid = restaurante.authUid || restaurante.firebaseAuthUid || restaurante.googleUid || "";
  if (authUid && authUid === request.auth.uid) return;

  throw new HttpsError("permission-denied", "No tienes permiso para administrar este restaurante.");
}

async function borrarQueryEnLotes(query) {
  const snap = await query.limit(400).get();
  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snap.size + await borrarQueryEnLotes(query);
}

async function borrarSubcoleccionesRestaurante(restauranteId) {
  let total = 0;
  for (const subcoleccion of SUBCOLECCIONES_RESTAURANTE) {
    const ref = db.collection("restaurantes").doc(restauranteId).collection(subcoleccion);
    total += await borrarQueryEnLotes(ref);
  }
  return total;
}

async function borrarStorageRestaurante(restauranteId) {
  const [archivos] = await bucket.getFiles({ prefix: `restaurantes/${restauranteId}/` });
  await Promise.all(archivos.map((archivo) => archivo.delete().catch(() => null)));
  return archivos.length;
}

function normalizarSlug(slug) {
  return String(slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

async function migrarSlugRestaurante(restauranteDoc) {
  const restaurante = restauranteDoc.data() || {};
  const slug = normalizarSlug(restaurante.slug);
  if (!slug) return { migrado: false, motivo: "sin-slug" };

  const slugRef = db.collection("slugs").doc(slug);
  const slugSnap = await slugRef.get();
  if (slugSnap.exists) {
    const slugData = slugSnap.data() || {};
    if (slugData.restauranteId && slugData.restauranteId !== restauranteDoc.id) {
      return { migrado: false, motivo: "slug-ocupado", slug };
    }
  }

  await slugRef.set({
    restauranteId: restauranteDoc.id,
    slug,
    activo: true,
    actualizado: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { migrado: true, slug };
}

exports.migrateRestaurantSlugs = onCall(FUNCTION_OPTIONS, async (request) => {
  exigirProjectAdmin(request);

  const restaurantesSnap = await db.collection("restaurantes").get();
  let migrados = 0;
  let sinSlug = 0;
  const conflictos = [];

  for (const restauranteDoc of restaurantesSnap.docs) {
    const resultado = await migrarSlugRestaurante(restauranteDoc);
    if (resultado.migrado) {
      migrados += 1;
    } else if (resultado.motivo === "slug-ocupado") {
      conflictos.push({
        restauranteId: restauranteDoc.id,
        slug: resultado.slug,
      });
    } else {
      sinSlug += 1;
    }
  }

  await db.collection("auditoria").add({
    accion: "migrateRestaurantSlugs",
    ejecutadoPor: request.auth.uid,
    revisados: restaurantesSnap.size,
    migrados,
    sinSlug,
    conflictos: conflictos.length,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    revisados: restaurantesSnap.size,
    migrados,
    sinSlug,
    conflictos,
  };
});

exports.deleteStaffRole = onCall(FUNCTION_OPTIONS, async (request) => {
  const restauranteId = String(request.data?.restauranteId || "").trim();
  const usuarioId = String(request.data?.usuarioId || "").trim();

  if (!restauranteId || !usuarioId) {
    throw new HttpsError("invalid-argument", "Falta restauranteId o usuarioId.");
  }

  await exigirPuedeGestionarRestaurante(request, restauranteId);

  const rolRef = db.collection("usuariosRoles").doc(usuarioId);
  const rolSnap = await rolRef.get();
  if (!rolSnap.exists) {
    throw new HttpsError("not-found", "El rol no existe.");
  }

  const rol = rolSnap.data() || {};
  if (rol.restauranteId !== restauranteId) {
    throw new HttpsError("permission-denied", "El rol no pertenece a este restaurante.");
  }

  const authUid = rol.authUid || rol.firebaseAuthUid || usuarioId;
  await rolRef.delete();

  let authEliminado = false;
  if (authUid) {
    authEliminado = await admin.auth().deleteUser(authUid)
      .then(() => true)
      .catch(() => false);
  }

  await db.collection("auditoria").add({
    accion: "deleteStaffRole",
    restauranteId,
    usuarioId,
    authUid,
    authEliminado,
    ejecutadoPor: request.auth.uid,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    usuarioId,
    authEliminado,
  };
});

exports.deleteRestaurantAccount = onCall(FUNCTION_OPTIONS, async (request) => {
  exigirProjectAdmin(request);

  const restauranteId = String(request.data?.restauranteId || "").trim();
  if (!restauranteId) {
    throw new HttpsError("invalid-argument", "Falta restauranteId.");
  }

  const restauranteRef = db.collection("restaurantes").doc(restauranteId);
  const restauranteSnap = await restauranteRef.get();
  if (!restauranteSnap.exists) {
    throw new HttpsError("not-found", "El restaurante no existe.");
  }

  const restaurante = restauranteSnap.data() || {};
  const authUid = restaurante.authUid || restaurante.firebaseAuthUid || restaurante.googleUid || "";

  const documentosBorrados = await borrarSubcoleccionesRestaurante(restauranteId);
  const archivosBorrados = await borrarStorageRestaurante(restauranteId);
  const slugActual = normalizarSlug(restaurante.slug);

  const rolesSnap = await db.collection("usuariosRoles").where("restauranteId", "==", restauranteId).get();
  const batchRoles = db.batch();
  const authUidsRoles = [];
  rolesSnap.forEach((doc) => {
    const rol = doc.data() || {};
    if (rol.authUid || rol.firebaseAuthUid) authUidsRoles.push(rol.authUid || rol.firebaseAuthUid);
    batchRoles.delete(doc.ref);
  });
  await batchRoles.commit();

  const slugsSnap = await db.collection("slugs").where("restauranteId", "==", restauranteId).get();
  const slugsABorrar = new Map();
  const batchSlugs = db.batch();
  slugsSnap.forEach((doc) => slugsABorrar.set(doc.ref.path, doc.ref));
  if (slugActual) {
    const slugRef = db.collection("slugs").doc(slugActual);
    slugsABorrar.set(slugRef.path, slugRef);
  }
  slugsABorrar.forEach((ref) => batchSlugs.delete(ref));
  await batchSlugs.commit();

  await restauranteRef.delete();

  const authUids = [authUid, ...authUidsRoles].filter(Boolean);
  const authEliminados = [];
  for (const uid of authUids) {
    await admin.auth().deleteUser(uid)
      .then(() => authEliminados.push(uid))
      .catch(() => null);
  }

  await db.collection("auditoria").add({
    accion: "deleteRestaurantAccount",
    restauranteId,
    ejecutadoPor: request.auth.uid,
    documentosBorrados,
    archivosBorrados,
    slugsBorrados: slugsABorrar.size,
    authEliminados: authEliminados.length,
    fecha: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    restauranteId,
    documentosBorrados,
    archivosBorrados,
    slugsBorrados: slugsABorrar.size,
    authEliminados: authEliminados.length,
  };
});

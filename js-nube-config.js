/* Rumbo · Configuración de la nube (Firebase).
   Mientras `apiKey` esté vacío, o la app se abra con file://, Rumbo funciona como siempre: solo en este navegador.
   Cómo llenarlo: docs/nube/paso-a-paso.md. Estos datos de Firebase no son secretos (quedan visibles en cualquier app web);
   lo que protege la casa son las reglas de Firestore y que solo existan las cuentas de ustedes dos. */
const NUBE_CONFIG = {
  firebase: {
    apiKey: 'AIzaSyCryL2V5_gyrj16zzzSfzoENVZaOpnqIEs',
    authDomain: 'rumbo-24d13.firebaseapp.com',
    projectId: 'rumbo-24d13',
    storageBucket: 'rumbo-24d13.firebasestorage.app',
    messagingSenderId: '111712782736',
    appId: '1:111712782736:web:656e71eb81981ca6988b15'
  },
  // Nombre del documento de la casa en Firestore (no cambiarlo después de empezar)
  casa: 'rumbo',
  // Correo con el que entra cada uno: así Rumbo sabe quién es quién. Deben ser los mismos de las reglas de Firestore.
  correos: {V: 'sha256:1a20618d8b75e392ec53f0a2b83eb56bd69dc0efde4914ef788276ac3f3434e5', D: 'sha256:29e040f0988f87c459d51733edba5aebac2a7f672bde55b8e8f84a0960e894ad'}
};
